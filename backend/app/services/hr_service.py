"""HR: company-wide "eagle view", org structure and team routing.

Read access needs hr:portal (Senior HR, Junior HR, admins). Moving people between teams needs
employees:manage (Senior HR, admins) and goes through EmployeeService.update, so the usual checks
(no circular reporting lines, can't touch admins, audit log) all apply.
"""
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import ROLE_LABELS, Role
from app.models.models import AttendanceRecord, Department, Employee, LeaveRequest
from app.repositories.notification_repo import NotificationRepository
from app.schemas.employee import EmployeeUpdate
from app.services.community_service import next_anniversary
from app.services.employee_presenter import account_counts
from app.services.employee_service import EmployeeService
from app.services.leave_service import LeaveService, leave_days
from app.services.org_settings_service import OrgSettingsService

PEOPLE_ROLES = (Role.EMPLOYEE.value, Role.MANAGER.value, Role.HR_JUNIOR.value, Role.HR_SENIOR.value)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    return dt.replace(tzinfo=timezone.utc) if dt is not None and dt.tzinfo is None else dt


def _member(e: Employee) -> dict:
    return {"id": str(e.id), "full_name": e.full_name, "employee_code": e.employee_code, "email": e.email,
            "role": e.role, "role_label": ROLE_LABELS.get(e.role, e.role), "job_title": e.job_title,
            "department_id": str(e.department_id) if e.department_id else None,
            "department_name": e.department.name if e.department else None,
            "manager_id": str(e.manager_id) if e.manager_id else None, "status": e.status}


class HrService:
    def __init__(self, db: Session):
        self.db = db

    def _people(self) -> List[Employee]:
        return (self.db.query(Employee).options(joinedload(Employee.department))
                .filter(Employee.is_active == True, Employee.status != "OFFBOARDED")  # noqa: E712
                .all())

    # ------------------------------------------------------------------ eagle view

    def overview(self, viewer: Employee, today: Optional[date] = None) -> dict:
        today = today or date.today()
        month_start = today.replace(day=1)
        people = self._people()
        working = [e for e in people if e.status != "INVITED"]
        ids = [e.id for e in working]

        records = {r.employee_id: r for r in self.db.query(AttendanceRecord)
                   .filter(AttendanceRecord.date == today, AttendanceRecord.employee_id.in_(ids or [uuid.uuid4()])).all()}
        on_leave = {l.employee_id for l in self.db.query(LeaveRequest).filter(
            LeaveRequest.status == "APPROVED", LeaveRequest.start_date <= today, LeaveRequest.end_date >= today).all()}

        def today_state(e: Employee) -> str:
            if e.id in on_leave or e.status == "ON_LEAVE":
                return "on_leave"
            r = records.get(e.id)
            if r is None:
                return "not_checked_in"
            return "checked_out" if r.check_out_at else "present"

        states = {e.id: today_state(e) for e in working}
        totals = Counter(states.values())

        depts = {d.id: d for d in self.db.query(Department).all()}
        by_dept: Dict[Optional[uuid.UUID], Counter] = defaultdict(Counter)
        for e in working:
            by_dept[e.department_id][states[e.id]] += 1
            by_dept[e.department_id]["total"] += 1
        departments = sorted([{
            "id": str(k) if k else None, "name": depts[k].name if k in depts else "No department",
            "total": c["total"], "present": c["present"] + c["checked_out"], "on_leave": c["on_leave"],
            "not_checked_in": c["not_checked_in"],
        } for k, c in by_dept.items()], key=lambda d: (d["id"] is None, d["name"]))

        # waiting on HR
        invites = sorted([{
            "id": str(e.id), "full_name": e.full_name, "email": e.email, "role_label": ROLE_LABELS.get(e.role, e.role),
            "invited_at": e.created_at, "days_waiting": (datetime.now(timezone.utc) - _aware(e.created_at)).days if e.created_at else 0,
        } for e in people if e.status == "INVITED"], key=lambda x: -x["days_waiting"])
        leaves = [{
            "id": str(l.id), "employee_name": l.employee.full_name if l.employee else None, "leave_type": l.leave_type,
            "start_date": l.start_date, "end_date": l.end_date, "days": leave_days(l.start_date, l.end_date), "reason": l.reason,
        } for l in LeaveService(self.db).pending_for_reviewer(viewer)]
        from app.services.attendance_rules_service import AttendanceRulesService
        corrections = AttendanceRulesService(self.db).corrections(viewer, "review", "PENDING")
        week_ago = today - timedelta(days=7)
        missed = [{"employee_id": str(r.employee_id), "full_name": r.employee.full_name if r.employee else None, "date": r.date}
                  for r in self.db.query(AttendanceRecord).options(joinedload(AttendanceRecord.employee))
                  .filter(AttendanceRecord.check_out_at.is_(None), AttendanceRecord.date < today, AttendanceRecord.date >= week_ago)
                  .order_by(AttendanceRecord.date.desc()).all()]

        # org health
        leads = [e for e in working if e.role == Role.MANAGER.value]
        reports = Counter(e.manager_id for e in working if e.manager_id)
        unassigned = [_member(e) for e in working if e.role == Role.EMPLOYEE.value and not e.manager_id]
        org = {
            "departments": len(depts), "team_leads": len(leads),
            "unassigned": unassigned,
            "leads_without_team": [_member(e) for e in leads if reports.get(e.id, 0) == 0],
            "departments_without_head": [{"id": str(d.id), "name": d.name} for d in depts.values() if not d.head_employee_id],
        }

        # people movement
        joiners = [_member(e) | {"joined_on": e.joined_on} for e in people
                   if e.joined_on and month_start <= e.joined_on <= today]
        leavers = [{"id": str(e.id), "full_name": e.full_name, "offboarded_at": e.offboarded_at}
                   for e in self.db.query(Employee).filter(Employee.offboarded_at.isnot(None)).all()
                   if e.offboarded_at.date() >= month_start]
        anniversaries = []
        for e in working:
            if e.joined_on:
                when = next_anniversary(e.joined_on, today)
                years = when.year - e.joined_on.year
                if years >= 1 and (when - today).days <= 30:
                    anniversaries.append({"id": str(e.id), "full_name": e.full_name, "years": years, "date": when})
        anniversaries.sort(key=lambda a: a["date"])

        # workload against the account target
        org_settings = OrgSettingsService(self.db)
        lo, hi = org_settings.get("account_target_min"), org_settings.get("account_target_max")
        counts = account_counts(self.db, ids)
        load = [{"id": str(e.id), "full_name": e.full_name, "accounts": counts.get(e.id, (0, 0))[0]}
                for e in working if e.role in (Role.EMPLOYEE.value, Role.MANAGER.value)]
        over = sorted([w for w in load if w["accounts"] > hi], key=lambda w: -w["accounts"])
        under = [w for w in load if w["accounts"] < lo]

        return {
            "date": today,
            "headcount": {"active": len(working), "invited": len(invites), "team_leads": len(leads),
                          "joined_this_month": len(joiners), "left_this_month": len(leavers)},
            "today": {"present": totals["present"] + totals["checked_out"], "on_shift": totals["present"],
                      "on_leave": totals["on_leave"], "not_checked_in": totals["not_checked_in"], "total": len(working),
                      "departments": departments},
            "waiting": {"invites": invites, "leaves": leaves, "missed_checkouts": missed, "corrections": corrections},
            "org": org,
            "movement": {"joiners": joiners, "leavers": leavers, "anniversaries": anniversaries[:10]},
            "workload": {"target_min": lo, "target_max": hi, "over": over[:10], "over_count": len(over),
                         "under_count": len(under), "people": len(load)},
        }

    # ------------------------------------------------------------------ org structure

    def org(self) -> dict:
        people = self._people()
        depts = self.db.query(Department).order_by(Department.name).all()
        names = {e.id: e.full_name for e in people}
        leads = sorted([e for e in people if e.role == Role.MANAGER.value], key=lambda e: e.full_name)
        lead_ids = {e.id for e in leads}
        teams = [{"lead": _member(l), "members": sorted([_member(e) for e in people if e.manager_id == l.id],
                                                        key=lambda m: m["full_name"])} for l in leads]
        unassigned = sorted([_member(e) for e in people if e.role == Role.EMPLOYEE.value
                             and (not e.manager_id or e.manager_id not in lead_ids and e.manager_id not in names)],
                            key=lambda m: m["full_name"])
        return {
            "departments": [{"id": str(d.id), "name": d.name, "code": d.code,
                             "head_name": names.get(d.head_employee_id)} for d in depts],
            "teams": teams,
            "unassigned": unassigned,
        }

    # ------------------------------------------------------------------ team routing

    def move(self, actor: Employee, employee_ids: List[uuid.UUID], manager_id: Optional[uuid.UUID],
             department_id: Optional[uuid.UUID]) -> dict:
        if not employee_ids:
            raise HTTPException(status_code=400, detail="Choose who to move.")
        if len(employee_ids) > 200:
            raise HTTPException(status_code=400, detail="Move up to 200 people at a time.")
        lead = None
        if manager_id:
            lead = self.db.query(Employee).filter(Employee.id == manager_id).first()
            if not lead or not lead.is_active or lead.role != Role.MANAGER.value:
                raise HTTPException(status_code=400, detail="Choose an active Team Lead.")
        svc = EmployeeService(self.db)
        moved, previous = [], {}
        for emp_id in dict.fromkeys(employee_ids):
            emp = self.db.query(Employee).filter(Employee.id == emp_id).first()
            if not emp:
                raise HTTPException(status_code=404, detail="Employee not found.")
            previous[emp.id] = emp.manager_id
            update = EmployeeUpdate(manager_id=manager_id) if manager_id else EmployeeUpdate(clear_manager=True)
            if department_id:
                update.department_id = department_id
            svc.update(emp.id, update, actor)  # validates scope, cycles, department; audit-logged
            moved.append(emp)

        notes = NotificationRepository(self.db)
        lead_name = lead.full_name if lead else None
        for emp in moved:
            if emp.manager_id == previous.get(emp.id) and not department_id:
                continue
            notes.create(recipient_id=emp.id, title="Your team has changed",
                         message=f"You now report to {lead_name}." if lead else "You are no longer assigned to a team lead.",
                         type="TEAM_CHANGED", link_url="/profile")
            old = previous.get(emp.id)
            if old and old != manager_id:
                notes.create(recipient_id=old, title=f"{emp.full_name} moved teams",
                             message=f"{emp.full_name} now reports to {lead_name}." if lead else f"{emp.full_name} left your team.",
                             type="TEAM_CHANGED", link_url="/manager")
        joined = [e.full_name for e in moved if previous.get(e.id) != manager_id]
        if lead and joined:
            notes.create(recipient_id=lead.id, title=f"{len(joined)} {'person' if len(joined) == 1 else 'people'} joined your team",
                         message=", ".join(joined), type="TEAM_CHANGED", link_url="/manager")
        return {"moved": len(moved), "team_lead": lead_name}
