"""Admin dashboard: one aggregated, query-efficient snapshot of people, attendance, approvals and accounts."""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    AccountAssignment, AccountConnection, AttendanceRecord, AuditLog, Department, Employee,
    InstagramAccount, LeaveRequest, ScheduledPost, Task,
)
from app.core.permissions import ROLE_LABELS
from app.services.employee_presenter import account_counts
from app.services.org_settings_service import OrgSettingsService

ACCOUNT_STATUSES = ("pending_connection", "connected", "pending_approval", "approved", "rejected")


def _aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class AdminOverviewService:
    def __init__(self, db: Session):
        self.db = db

    def build(self) -> dict:
        db = self.db
        today = date.today()
        now = datetime.now(timezone.utc)
        org = OrgSettingsService(db)
        lo, hi = org.get("account_target_min"), org.get("account_target_max")
        warn_days = org.get("token_expiry_warning_days")

        # ---------------------------------------------------------------- people
        by_status = dict(db.query(Employee.status, func.count(Employee.id)).group_by(Employee.status).all())
        by_role = dict(db.query(Employee.role, func.count(Employee.id))
                       .filter(Employee.is_active == True).group_by(Employee.role).all())  # noqa: E712
        dept_rows = (db.query(Department.name, func.count(Employee.id))
                     .outerjoin(Employee, (Employee.department_id == Department.id) & (Employee.is_active == True))  # noqa: E712
                     .group_by(Department.name).order_by(func.count(Employee.id).desc()).all())
        no_dept = db.query(func.count(Employee.id)).filter(Employee.is_active == True, Employee.department_id.is_(None)).scalar()  # noqa: E712
        month_ago = now - timedelta(days=30)
        joined_30d = db.query(func.count(Employee.id)).filter(Employee.joined_on >= (today - timedelta(days=30))).scalar()
        left_30d = db.query(func.count(Employee.id)).filter(Employee.offboarded_at >= month_ago).scalar()
        no_manager = db.query(func.count(Employee.id)).filter(
            Employee.is_active == True, Employee.manager_id.is_(None), Employee.role == "employee").scalar()  # noqa: E712

        # ---------------------------------------------------------------- attendance (today + 14-day trend)
        working = db.query(Employee.id).filter(Employee.is_active == True, Employee.status.in_(["ACTIVE", "ON_LEAVE"]))  # noqa: E712
        working_ids = [r.id for r in working.all()]
        on_leave_today = 0
        checked_in_today = 0
        if working_ids:
            on_leave_today = db.query(func.count(func.distinct(LeaveRequest.employee_id))).filter(
                LeaveRequest.employee_id.in_(working_ids), LeaveRequest.status == "APPROVED",
                LeaveRequest.start_date <= today, LeaveRequest.end_date >= today).scalar()
            checked_in_today = db.query(func.count(AttendanceRecord.id)).filter(
                AttendanceRecord.employee_id.in_(working_ids), AttendanceRecord.date == today).scalar()
        expected = max(len(working_ids) - on_leave_today, 0)
        start = today - timedelta(days=13)
        daily = dict(db.query(AttendanceRecord.date, func.count(AttendanceRecord.id))
                     .filter(AttendanceRecord.date >= start).group_by(AttendanceRecord.date).all())
        trend = [{"date": (start + timedelta(days=i)).isoformat(), "checked_in": daily.get(start + timedelta(days=i), 0)}
                 for i in range(14)]

        # ---------------------------------------------------------------- approvals
        approvals = {
            "accounts": db.query(func.count(InstagramAccount.id)).filter(InstagramAccount.status == "pending_approval").scalar(),
            "leave": db.query(func.count(LeaveRequest.id)).filter(LeaveRequest.status == "PENDING").scalar(),
            "tasks": db.query(func.count(Task.id)).filter(Task.status == "IN_REVIEW").scalar(),
            "posts": db.query(func.count(ScheduledPost.id)).filter(ScheduledPost.status == "PENDING_APPROVAL").scalar(),
        }
        approvals["total"] = sum(approvals.values())

        # ---------------------------------------------------------------- accounts & workload
        acc_status = dict(db.query(InstagramAccount.status, func.count(InstagramAccount.id))
                          .group_by(InstagramAccount.status).all())
        total_accounts = sum(acc_status.values())
        assigned_ids = db.query(AccountAssignment.instagram_account_id).filter(AccountAssignment.is_active == True)  # noqa: E712
        unassigned = db.query(func.count(InstagramAccount.id)).filter(~InstagramAccount.id.in_(assigned_ids)).scalar()

        staff = db.query(Employee).filter(Employee.is_active == True, Employee.role == "employee",  # noqa: E712
                                          Employee.status == "ACTIVE").all()
        counts = account_counts(db, [e.id for e in staff])
        loads = [(e, counts.get(e.id, (0, 0))[0]) for e in staff]
        over = sorted([x for x in loads if x[1] > hi], key=lambda x: -x[1])
        under = sorted([x for x in loads if x[1] < lo], key=lambda x: x[1])
        brief = lambda e, n: {"id": str(e.id), "full_name": e.full_name, "employee_code": e.employee_code, "assigned": n}  # noqa: E731
        buckets = [0, 0, 0, 0, 0]  # <25%, <lo, within, >hi, unassigned staff
        for _, n in loads:
            if n == 0:
                buckets[4] += 1
            elif n < lo / 2:
                buckets[0] += 1
            elif n < lo:
                buckets[1] += 1
            elif n <= hi:
                buckets[2] += 1
            else:
                buckets[3] += 1

        # ---------------------------------------------------------------- Meta token health
        horizon = now + timedelta(days=warn_days)
        conns = (db.query(AccountConnection).options(joinedload(AccountConnection.account))
                 .filter(AccountConnection.token_expires_at.isnot(None),
                         AccountConnection.connection_status.in_(["CONNECTED", "connected"])).all())
        expiring, expired = [], 0
        for c in conns:
            exp = _aware(c.token_expires_at)
            if exp <= now:
                expired += 1
            elif exp <= horizon:
                expiring.append({"account_id": str(c.instagram_account_id),
                                 "username": c.account.username if c.account else None,
                                 "expires_at": exp.isoformat(), "days_left": max((exp - now).days, 0)})
        expiring.sort(key=lambda x: x["expires_at"])

        # ---------------------------------------------------------------- recent activity
        recent = (db.query(AuditLog).options(joinedload(AuditLog.actor))
                  .order_by(AuditLog.created_at.desc()).limit(8).all())

        return {
            "generated_at": now.isoformat(),
            "people": {
                "active": by_status.get("ACTIVE", 0),
                "invited": by_status.get("INVITED", 0),
                "on_leave_status": by_status.get("ON_LEAVE", 0),
                "offboarded": by_status.get("OFFBOARDED", 0),
                "joined_last_30d": joined_30d,
                "left_last_30d": left_30d,
                "without_manager": no_manager,
                "by_role": [{"role": r, "label": ROLE_LABELS.get(r, r), "count": by_role.get(r, 0)} for r in ROLE_LABELS],
                "by_department": [{"name": n, "count": c} for n, c in dept_rows] + ([{"name": "Unassigned", "count": no_dept}] if no_dept else []),
            },
            "attendance_today": {
                "working_headcount": len(working_ids),
                "on_leave": on_leave_today,
                "checked_in": checked_in_today,
                "not_checked_in": max(expected - checked_in_today, 0),
                "rate": round(100 * checked_in_today / expected) if expected else None,
                "trend": trend,
            },
            "approvals": approvals,
            "accounts": {
                "total": total_accounts,
                "by_status": [{"status": s, "count": acc_status.get(s, 0)} for s in ACCOUNT_STATUSES],
                "unassigned": unassigned,
            },
            "workload": {
                "target_min": lo, "target_max": hi, "staff": len(loads),
                "within": buckets[2], "over_count": len(over), "under_count": len(under),
                "distribution": [
                    {"band": "No accounts", "count": buckets[4]},
                    {"band": f"1–{lo // 2 - 1 if lo > 2 else 1}", "count": buckets[0]},
                    {"band": f"{lo // 2}–{lo - 1}", "count": buckets[1]},
                    {"band": f"{lo}–{hi} (target)", "count": buckets[2]},
                    {"band": f">{hi}", "count": buckets[3]},
                ],
                "over": [brief(e, n) for e, n in over[:5]],
                "under": [brief(e, n) for e, n in under[:5]],
            },
            "meta_tokens": {"warning_days": warn_days, "expiring": expiring[:10],
                            "expiring_count": len(expiring), "expired_count": expired},
            "recent_activity": [{
                "id": str(a.id), "action": a.action, "entity_type": a.entity_type,
                "actor_name": a.actor.full_name if a.actor else "System",
                "created_at": _aware(a.created_at).isoformat() if a.created_at else None,
            } for a in recent],
        }
