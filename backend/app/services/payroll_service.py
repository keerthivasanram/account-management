"""Month close: per-person payroll inputs from the attendance register, checks, lock, reopen, CSV.

Klarves doesn't calculate pay. It produces accurate attendance numbers for the accountant or payroll
software. Placeholder rules (to-do E14, E15):
  unpaid (LOP) days = absent days + 1/2 for each half day or short day
  "No record" days are not deducted; they're reported as unaccounted
  payable days     = days employed in the month - unpaid days
A locked month freezes its numbers: roster, corrections, holidays and leave for that month are
refused until Senior HR reopens it (with a reason).
"""
import csv
import io
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.permissions import Perm, has_permission
from app.models.models import AttendanceCorrection, Employee, LeaveRequest, PayrollPeriod
from app.repositories.audit_repo import AuditRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.attendance_rules_service import AttendanceRulesService, month_bounds

LEAVE_TYPES = ("ANNUAL", "SICK", "CASUAL", "EMERGENCY")
CSV_COLUMNS = [
    ("employee_code", "Employee code"), ("full_name", "Name"), ("department", "Department"), ("team_lead", "Team lead"),
    ("days_employed", "Days employed"), ("present_days", "Present (full)"), ("half_days", "Half days"),
    ("short_days", "Short days"), ("missed_clock_outs", "Missed clock-outs"), ("paid_leave_days", "Paid leave"),
    *[(f"leave_{t.lower()}", f"Leave: {t.title()}") for t in LEAVE_TYPES],
    ("week_offs", "Week offs"), ("holidays", "Holidays"), ("absent_days", "Absent"),
    ("unaccounted_days", "Unaccounted (no record)"), ("lop_days", "Unpaid (LOP) days"),
    ("payable_days", "Payable days"), ("worked_hours", "Worked hours"), ("late_marks", "Late marks"),
]


from app.services.period_lock import guard_range_unlocked, guard_unlocked, is_month_locked  # noqa: F401  (re-export)


class PayrollService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditRepository(db)

    # ------------------------------------------------------------------ calculation

    def _rows(self, viewer: Employee, month: str) -> List[dict]:
        register = AttendanceRulesService(self.db).register(viewer, month)
        first, last = month_bounds(month)
        days = register["days"]
        people = {str(e.id): e for e in self.db.query(Employee).filter(
            Employee.id.in_([uuid.UUID(r["employee_id"]) for r in register["rows"]] or [uuid.uuid4()])).all()}
        # leave type for each leave day
        leave_type: Dict[tuple, str] = {}
        for l in self.db.query(LeaveRequest).filter(LeaveRequest.status == "APPROVED", LeaveRequest.start_date <= last,
                                                    LeaveRequest.end_date >= first):
            d = max(l.start_date, first)
            while d <= min(l.end_date, last):
                leave_type[(str(l.employee_id), d.isoformat())] = l.leave_type
                d += timedelta(days=1)

        rows = []
        for r in register["rows"]:
            e = people.get(r["employee_id"])
            codes = Counter(c["code"] for c in r["days"])
            by_type = Counter(leave_type.get((r["employee_id"], iso)) for iso, c in zip(days, r["days"]) if c["code"] == "L")
            # days employed = days in the month from the joining date on
            employed = sum(1 for iso in days if not (e and e.joined_on and date.fromisoformat(iso) < e.joined_on))
            if employed == 0:
                continue  # joined after this month: not on its payroll
            lop = codes["A"] + 0.5 * (codes["HD"] + codes["S"])
            rows.append({
                "employee_id": r["employee_id"], "employee_code": r["employee_code"], "full_name": r["full_name"],
                "department": r["department_name"], "team_lead": e.manager.full_name if e and e.manager else None,
                "days_employed": employed, "present_days": codes["P"], "half_days": codes["HD"], "short_days": codes["S"],
                "missed_clock_outs": codes["MO"] + codes["IN"], "paid_leave_days": codes["L"],
                **{f"leave_{t.lower()}": by_type.get(t, 0) for t in LEAVE_TYPES},
                "week_offs": codes["WO"], "holidays": codes["H"], "absent_days": codes["A"],
                "unaccounted_days": codes["NR"], "lop_days": lop, "payable_days": max(employed - lop, 0),
                "worked_hours": r["totals"]["hours"], "late_marks": r["totals"]["late"],
            })
        return rows

    def _issues(self, viewer: Employee, month: str, rows: List[dict]) -> List[dict]:
        first, last = month_bounds(month)
        today = datetime.now(AttendanceRulesService(self.db).rules.tz).date()
        issues = []
        if last >= today:
            issues.append({"kind": "month_open", "severity": "block",
                           "message": f"The month isn't over yet. It can be closed from {(last + timedelta(days=1)).isoformat()}."})
        pending_corr = self.db.query(AttendanceCorrection).filter(AttendanceCorrection.status == "PENDING",
                                                                  AttendanceCorrection.date >= first, AttendanceCorrection.date <= last).count()
        if pending_corr:
            issues.append({"kind": "corrections", "severity": "warn", "count": pending_corr,
                           "message": f"{pending_corr} attendance correction(s) for this month are still waiting.",
                           "link": "/attendance/register?tab=corrections"})
        pending_leave = self.db.query(LeaveRequest).filter(LeaveRequest.status == "PENDING", LeaveRequest.start_date <= last,
                                                           LeaveRequest.end_date >= first).count()
        if pending_leave:
            issues.append({"kind": "leave", "severity": "warn", "count": pending_leave,
                           "message": f"{pending_leave} leave request(s) in this month aren't decided.", "link": "/hr"})
        missed = sum(r["missed_clock_outs"] for r in rows)
        if missed:
            issues.append({"kind": "missed_clock_outs", "severity": "warn", "count": missed,
                           "message": f"{missed} day(s) with a missed clock-out (their hours are counted as 0).",
                           "link": f"/attendance/register?month={month}"})
        unaccounted = sum(r["unaccounted_days"] for r in rows)
        if unaccounted:
            issues.append({"kind": "unaccounted", "severity": "info", "count": unaccounted,
                           "message": f"{unaccounted} day(s) have no record and no planned week off. They are not deducted.",
                           "link": f"/attendance/register?month={month}"})
        return issues

    # ------------------------------------------------------------------ queries

    def periods(self) -> List[dict]:
        names = dict(self.db.query(Employee.id, Employee.full_name).all())
        return [{"month": p.month, "status": p.status, "locked_at": p.locked_at, "locked_by": names.get(p.locked_by),
                 "reopened_at": p.reopened_at, "reopen_reason": p.reopen_reason, "rows": len(p.snapshot or [])}
                for p in self.db.query(PayrollPeriod).order_by(PayrollPeriod.month.desc()).limit(36).all()]

    def preview(self, viewer: Employee, month: str) -> dict:
        if not has_permission(viewer, Perm.ATTENDANCE_READ_ALL):
            raise HTTPException(status_code=403, detail="Only HR can see payroll inputs.")
        period = self.db.query(PayrollPeriod).filter(PayrollPeriod.month == month).first()
        locked = bool(period and period.status == "LOCKED")
        rows = period.snapshot if locked else self._rows(viewer, month)
        issues = [] if locked else self._issues(viewer, month, rows)
        names = dict(self.db.query(Employee.id, Employee.full_name).all())
        totals = {k: round(sum(r[k] for r in rows), 1) for k in ("payable_days", "lop_days", "paid_leave_days",
                                                                 "unaccounted_days", "worked_hours", "late_marks")}
        return {
            "month": month, "status": "LOCKED" if locked else ("REOPENED" if period else "OPEN"),
            "locked_at": period.locked_at if period else None, "locked_by": names.get(period.locked_by) if period else None,
            "note": period.note if period else None, "reopen_reason": period.reopen_reason if period else None,
            "can_lock": not locked and not any(i["severity"] == "block" for i in issues) and has_permission(viewer, Perm.ATTENDANCE_MANAGE),
            "issues": issues, "rows": rows, "totals": {**totals, "people": len(rows)},
            "rules": "Unpaid = absent + ½ per half/short day; 'No record' days are not deducted (to-do E14).",
        }

    # ------------------------------------------------------------------ lock / reopen / export

    def lock(self, actor: Employee, month: str, note: Optional[str], acknowledge_warnings: bool) -> dict:
        if not has_permission(actor, Perm.ATTENDANCE_MANAGE):
            raise HTTPException(status_code=403, detail="Only Senior HR can close a month.")
        month_bounds(month)
        period = self.db.query(PayrollPeriod).filter(PayrollPeriod.month == month).first()
        if period and period.status == "LOCKED":
            raise HTTPException(status_code=409, detail="This month is already closed.")
        rows = self._rows(actor, month)
        issues = self._issues(actor, month, rows)
        if any(i["severity"] == "block" for i in issues):
            raise HTTPException(status_code=409, detail=next(i["message"] for i in issues if i["severity"] == "block"))
        if any(i["severity"] == "warn" for i in issues) and not acknowledge_warnings:
            raise HTTPException(status_code=409, detail="There are open items for this month. Review them, then confirm to close anyway.")
        if period is None:
            period = PayrollPeriod(id=uuid.uuid4(), month=month)
            self.db.add(period)
        period.status, period.snapshot, period.note = "LOCKED", rows, (note or "").strip() or None
        period.locked_by, period.locked_at = actor.id, datetime.now(timezone.utc)
        self.db.commit()
        self.audit.log(action="payroll_month_locked", entity_type="payroll_period", entity_id=period.id, actor_id=actor.id,
                       metadata={"month": month, "people": len(rows), "warnings": [i["kind"] for i in issues]})
        return self.preview(actor, month)

    def reopen(self, actor: Employee, month: str, reason: str) -> dict:
        if not has_permission(actor, Perm.ATTENDANCE_MANAGE):
            raise HTTPException(status_code=403, detail="Only Senior HR can reopen a month.")
        if not (reason or "").strip():
            raise HTTPException(status_code=400, detail="Say why the month is being reopened.")
        period = self.db.query(PayrollPeriod).filter(PayrollPeriod.month == month).first()
        if not period or period.status != "LOCKED":
            raise HTTPException(status_code=409, detail="This month isn't closed.")
        period.status, period.reopened_by, period.reopened_at = "REOPENED", actor.id, datetime.now(timezone.utc)
        period.reopen_reason = reason.strip()[:500]
        self.db.commit()
        self.audit.log(action="payroll_month_reopened", entity_type="payroll_period", entity_id=period.id, actor_id=actor.id,
                       metadata={"month": month, "reason": period.reopen_reason})
        notes = NotificationRepository(self.db)
        for f in self.db.query(Employee).filter(Employee.role == "super_admin", Employee.is_active == True).all():  # noqa: E712
            if f.id != actor.id:
                notes.create(recipient_id=f.id, title=f"Payroll month {month} reopened",
                             message=f"{actor.full_name} reopened {month}: {period.reopen_reason}", type="SECURITY_ALERT",
                             link_url="/hr/payroll")
        return self.preview(actor, month)

    def export_csv(self, actor: Employee, month: str) -> str:
        if not has_permission(actor, Perm.ATTENDANCE_MANAGE):
            raise HTTPException(status_code=403, detail="Only Senior HR can export payroll inputs.")
        period = self.db.query(PayrollPeriod).filter(PayrollPeriod.month == month).first()
        if not period or period.status != "LOCKED":
            raise HTTPException(status_code=409, detail="Close the month before exporting, so the numbers can't change afterwards.")
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow([label for _, label in CSV_COLUMNS])
        for r in period.snapshot or []:
            w.writerow([r.get(key, "") for key, _ in CSV_COLUMNS])
        self.audit.log(action="payroll_exported", entity_type="payroll_period", entity_id=period.id, actor_id=actor.id,
                       metadata={"month": month, "rows": len(period.snapshot or [])})
        return "﻿" + out.getvalue()  # BOM so Excel opens it as UTF-8
