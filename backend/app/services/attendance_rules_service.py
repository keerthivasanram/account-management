"""Attendance rules: monthly register, rotational week-off roster, holidays, corrections.

Day codes (one per person per day):
  P  present (worked >= shift_hours)      HD half day (>= half_day_hours)     S  short (< half day)
  MO missed clock-out (past day, no out)  IN on shift now (today, no out)
  L  approved leave   WO rostered week off   H  company holiday
  A  absent (only when absent_without_roster is on)   NR no record   -  future / before joining
Late (a flag on worked days) only when shift_start_time is set.

Who can do what:
  register   HR (attendance:read_all) everyone; team leads their team; employees themselves
  roster     Senior HR / admins (attendance:manage) anyone; team leads their team
  holidays   attendance:manage
  corrections  request: the person, their team lead, or HR; approve: attendance:manage or the
               person's team lead, never the requester or the person themselves
"""
import calendar
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, List, Optional, Set

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import Perm, has_permission, is_manager_of
from app.models.models import AttendanceCorrection, AttendanceRecord, Employee, Holiday, LeaveRequest, WeekOff
from app.repositories.audit_repo import AuditRepository
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.org_settings_service import OrgSettingsService

WORKED = {"P", "HD", "S", "MO", "IN"}


def month_bounds(month: str) -> (date, date):
    try:
        y, m = (int(x) for x in month.split("-"))
        first = date(y, m, 1)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Month must look like 2026-11.")
    return first, date(y, m, calendar.monthrange(y, m)[1])


class Rules:
    """Snapshot of the company's attendance settings."""

    def __init__(self, org: OrgSettingsService):
        self.shift_hours = float(org.get("shift_hours"))
        self.half_day_hours = float(org.get("half_day_hours"))
        self.start = org.get("shift_start_time") or ""
        self.grace = int(org.get("late_grace_minutes"))
        self.absent_without_roster = bool(org.get("absent_without_roster"))
        self.window_days = int(org.get("correction_window_days"))
        self.tz = timezone(timedelta(minutes=int(org.get("utc_offset_minutes"))))

    def local_date(self, dt: datetime) -> date:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(self.tz).date()

    def is_late(self, check_in: datetime) -> bool:
        if not self.start:
            return False
        if check_in.tzinfo is None:
            check_in = check_in.replace(tzinfo=timezone.utc)
        local = check_in.astimezone(self.tz)
        h, m = (int(x) for x in self.start.split(":"))
        limit = datetime.combine(local.date(), time(h, m), self.tz) + timedelta(minutes=self.grace)
        return local > limit

    def to_utc(self, day: date, hhmm: str) -> datetime:
        try:
            h, m = (int(x) for x in hhmm.split(":"))
            return datetime.combine(day, time(h, m), self.tz).astimezone(timezone.utc)
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Times must look like 09:30.")


def day_code(rules: Rules, day: date, today: date, record: Optional[AttendanceRecord], holiday: bool,
             leave: bool, week_off: bool, joined: Optional[date]) -> dict:
    if joined and day < joined:
        return {"code": "-"}
    if record is not None:
        if record.check_out_at is None:
            return {"code": "IN" if day == today else "MO", "late": rules.is_late(record.check_in_at)}
        hours = float(record.total_hours or 0)
        code = "P" if hours >= rules.shift_hours else "HD" if hours >= rules.half_day_hours else "S"
        return {"code": code, "hours": round(hours, 2), "late": rules.is_late(record.check_in_at)}
    if holiday:
        return {"code": "H"}
    if leave:
        return {"code": "L"}
    if week_off:
        return {"code": "WO"}
    if day >= today:
        return {"code": "-"}
    return {"code": "A" if rules.absent_without_roster else "NR"}


class AttendanceRulesService:
    def __init__(self, db: Session):
        self.db = db
        self.rules = Rules(OrgSettingsService(db))
        self.notes = NotificationRepository(db)
        self.audit = AuditRepository(db)

    # ------------------------------------------------------------------ scope

    def _visible(self, viewer: Employee) -> List[Employee]:
        q = self.db.query(Employee).filter(Employee.is_active == True, Employee.status != "INVITED")  # noqa: E712
        if has_permission(viewer, Perm.ATTENDANCE_READ_ALL):
            return q.order_by(Employee.full_name).all()
        if has_permission(viewer, Perm.ATTENDANCE_READ_TEAM):
            team = [e.id for e in EmployeeRepository(self.db).list_team(viewer)] + [viewer.id]
            return q.filter(Employee.id.in_(team)).order_by(Employee.full_name).all()
        return [viewer]

    def _can_roster(self, actor: Employee, target: Employee) -> bool:
        return has_permission(actor, Perm.ATTENDANCE_MANAGE) or (
            has_permission(actor, Perm.ATTENDANCE_READ_TEAM) and is_manager_of(actor, target))

    def _can_review(self, actor: Employee, target: Employee) -> bool:
        return has_permission(actor, Perm.ATTENDANCE_MANAGE) or (
            has_permission(actor, Perm.ATTENDANCE_READ_TEAM) and is_manager_of(actor, target))

    def _employee(self, employee_id: uuid.UUID) -> Employee:
        e = self.db.query(Employee).filter(Employee.id == employee_id).first()
        if not e:
            raise HTTPException(status_code=404, detail="Employee not found.")
        return e

    # ------------------------------------------------------------------ register

    def register(self, viewer: Employee, month: str, department_id: Optional[uuid.UUID] = None,
                 today: Optional[date] = None) -> dict:
        first, last = month_bounds(month)
        today = today or datetime.now(self.rules.tz).date()
        people = self._visible(viewer)
        if department_id:
            people = [p for p in people if p.department_id == department_id]
        ids = [p.id for p in people] or [uuid.uuid4()]

        records = {(r.employee_id, r.date): r for r in self.db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id.in_(ids), AttendanceRecord.date >= first, AttendanceRecord.date <= last)}
        offs = {(w.employee_id, w.date) for w in self.db.query(WeekOff).filter(
            WeekOff.employee_id.in_(ids), WeekOff.date >= first, WeekOff.date <= last)}
        holidays = {h.date: h.name for h in self.db.query(Holiday).filter(Holiday.date >= first, Holiday.date <= last)}
        leave_days: Set = set()
        for l in self.db.query(LeaveRequest).filter(LeaveRequest.employee_id.in_(ids), LeaveRequest.status == "APPROVED",
                                                    LeaveRequest.start_date <= last, LeaveRequest.end_date >= first):
            d = max(l.start_date, first)
            while d <= min(l.end_date, last):
                leave_days.add((l.employee_id, d))
                d += timedelta(days=1)

        days = [first + timedelta(days=i) for i in range((last - first).days + 1)]
        rows = []
        for p in people:
            cells, totals = [], {k: 0 for k in ("P", "HD", "S", "MO", "IN", "L", "WO", "H", "A", "NR")}
            hours, late = 0.0, 0
            for d in days:
                c = day_code(self.rules, d, today, records.get((p.id, d)), d in holidays, (p.id, d) in leave_days,
                             (p.id, d) in offs, p.joined_on)
                cells.append(c)
                if c["code"] in totals:
                    totals[c["code"]] += 1
                hours += c.get("hours", 0)
                late += 1 if c.get("late") else 0
            rows.append({
                "employee_id": str(p.id), "full_name": p.full_name, "employee_code": p.employee_code,
                "department_name": p.department.name if p.department else None,
                "can_roster": self._can_roster(viewer, p), "days": cells,
                "totals": {**totals, "hours": round(hours, 1), "late": late,
                           "worked_days": totals["P"] + totals["HD"] + totals["S"] + totals["MO"] + totals["IN"]},
            })
        return {
            "month": first.strftime("%Y-%m"), "days": [d.isoformat() for d in days], "today": today.isoformat(),
            "holidays": [{"date": d.isoformat(), "name": n} for d, n in sorted(holidays.items())],
            "rules": {"shift_hours": self.rules.shift_hours, "half_day_hours": self.rules.half_day_hours,
                      "shift_start_time": self.rules.start or None, "late_grace_minutes": self.rules.grace,
                      "absent_without_roster": self.rules.absent_without_roster},
            "rows": rows,
        }

    # ------------------------------------------------------------------ roster (rotational week offs)

    def set_week_off(self, actor: Employee, employee_id: uuid.UUID, day: date, off: bool) -> dict:
        target = self._employee(employee_id)
        if not self._can_roster(actor, target):
            raise HTTPException(status_code=403, detail="You can plan week offs for your own team.")
        existing = self.db.query(WeekOff).filter(WeekOff.employee_id == employee_id, WeekOff.date == day).first()
        if off and not existing:
            self.db.add(WeekOff(id=uuid.uuid4(), employee_id=employee_id, date=day, set_by=actor.id))
        elif not off and existing:
            self.db.delete(existing)
        self.db.commit()
        self.audit.log(action="week_off_set" if off else "week_off_cleared", entity_type="employee",
                       entity_id=employee_id, actor_id=actor.id, metadata={"date": day.isoformat()})
        return {"employee_id": str(employee_id), "date": day.isoformat(), "week_off": off}

    # ------------------------------------------------------------------ holidays

    def holidays(self, year: int) -> List[dict]:
        rows = self.db.query(Holiday).filter(Holiday.date >= date(year, 1, 1), Holiday.date <= date(year, 12, 31)) \
            .order_by(Holiday.date).all()
        return [{"id": str(h.id), "date": h.date.isoformat(), "name": h.name} for h in rows]

    def add_holiday(self, actor: Employee, day: date, name: str) -> dict:
        if not has_permission(actor, Perm.ATTENDANCE_MANAGE):
            raise HTTPException(status_code=403, detail="Only Senior HR can change the holiday list.")
        name = (name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name the holiday.")
        if self.db.query(Holiday).filter(Holiday.date == day).first():
            raise HTTPException(status_code=409, detail="There's already a holiday on that date.")
        h = Holiday(id=uuid.uuid4(), date=day, name=name[:120], created_by=actor.id)
        self.db.add(h)
        self.db.commit()
        self.audit.log(action="holiday_added", entity_type="holiday", entity_id=h.id, actor_id=actor.id,
                       metadata={"date": day.isoformat(), "name": h.name})
        return {"id": str(h.id), "date": day.isoformat(), "name": h.name}

    def remove_holiday(self, actor: Employee, holiday_id: uuid.UUID) -> None:
        if not has_permission(actor, Perm.ATTENDANCE_MANAGE):
            raise HTTPException(status_code=403, detail="Only Senior HR can change the holiday list.")
        h = self.db.query(Holiday).filter(Holiday.id == holiday_id).first()
        if not h:
            raise HTTPException(status_code=404, detail="Holiday not found.")
        self.db.delete(h)
        self.db.commit()
        self.audit.log(action="holiday_removed", entity_type="holiday", entity_id=holiday_id, actor_id=actor.id,
                       metadata={"date": h.date.isoformat(), "name": h.name})

    # ------------------------------------------------------------------ corrections

    def _corr_dict(self, c: AttendanceCorrection, viewer: Employee) -> dict:
        tz = self.rules.tz
        fmt = lambda dt: (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).astimezone(tz).strftime("%H:%M")  # noqa: E731
        return {
            "id": str(c.id), "employee_id": str(c.employee_id), "employee_name": c.employee.full_name if c.employee else None,
            "date": c.date.isoformat(), "check_in": fmt(c.check_in_at), "check_out": fmt(c.check_out_at),
            "hours": round((c.check_out_at - c.check_in_at).total_seconds() / 3600, 2), "reason": c.reason,
            "status": c.status, "remarks": c.remarks, "created_at": c.created_at,
            "requested_by_name": c.requester.full_name if c.requester else None,
            "can_review": c.status == "PENDING" and viewer.id not in (c.employee_id, c.requested_by)
                          and bool(c.employee) and self._can_review(viewer, c.employee),
        }

    def request_correction(self, actor: Employee, employee_id: uuid.UUID, day: date, check_in: str, check_out: str,
                           reason: str) -> dict:
        target = self._employee(employee_id)
        allowed = actor.id == target.id or has_permission(actor, Perm.ATTENDANCE_READ_ALL) or (
            has_permission(actor, Perm.ATTENDANCE_READ_TEAM) and is_manager_of(actor, target))
        if not allowed:
            raise HTTPException(status_code=403, detail="You can correct your own attendance or your team's.")
        today = datetime.now(self.rules.tz).date()
        if day > today:
            raise HTTPException(status_code=400, detail="You can't correct a day that hasn't happened yet.")
        if (today - day).days > self.rules.window_days:
            raise HTTPException(status_code=400, detail=f"Corrections are allowed for the last {self.rules.window_days} days.")
        if not (reason or "").strip():
            raise HTTPException(status_code=400, detail="Say what happened.")
        start, end = self.rules.to_utc(day, check_in), self.rules.to_utc(day, check_out)
        if end <= start:
            raise HTTPException(status_code=400, detail="Clock-out must be after clock-in (shifts crossing midnight aren't supported yet).")
        if self.db.query(AttendanceCorrection).filter(AttendanceCorrection.employee_id == employee_id,
                                                     AttendanceCorrection.date == day,
                                                     AttendanceCorrection.status == "PENDING").first():
            raise HTTPException(status_code=409, detail="There's already a correction waiting for that day.")
        c = AttendanceCorrection(id=uuid.uuid4(), employee_id=employee_id, date=day, check_in_at=start, check_out_at=end,
                                 reason=reason.strip()[:1000], requested_by=actor.id)
        self.db.add(c)
        self.db.commit()
        # tell the people who can approve it
        approvers = [target.manager] if target.manager and target.manager.is_active else []
        if not approvers:
            approvers = [e for e in self.db.query(Employee).filter(Employee.role.in_(("hr_senior", "admin")),
                                                                   Employee.is_active == True).all()]  # noqa: E712
        for a in approvers:
            if a.id not in (actor.id, target.id):
                self.notes.create(recipient_id=a.id, title=f"Attendance correction: {target.full_name}",
                                  message=f"{day.isoformat()}: {check_in}–{check_out}. {reason.strip()[:200]}",
                                  type="ATTENDANCE_CORRECTION", link_url="/attendance/register?tab=corrections")
        self.audit.log(action="attendance_correction_requested", entity_type="attendance_correction", entity_id=c.id,
                       actor_id=actor.id, metadata={"employee": target.employee_code, "date": day.isoformat()})
        return self._corr_dict(self.db.query(AttendanceCorrection).options(
            joinedload(AttendanceCorrection.employee), joinedload(AttendanceCorrection.requester)).get(c.id), actor)

    def corrections(self, viewer: Employee, scope: str = "mine", status: Optional[str] = None) -> List[dict]:
        q = self.db.query(AttendanceCorrection).options(joinedload(AttendanceCorrection.employee),
                                                        joinedload(AttendanceCorrection.requester))
        if scope == "mine":
            q = q.filter(AttendanceCorrection.employee_id == viewer.id)
        elif scope == "review":
            people = [p.id for p in self._visible(viewer) if p.id != viewer.id]
            q = q.filter(AttendanceCorrection.employee_id.in_(people or [uuid.uuid4()]))
        else:
            raise HTTPException(status_code=400, detail="Scope must be mine or review.")
        if status:
            q = q.filter(AttendanceCorrection.status == status.upper())
        rows = [self._corr_dict(c, viewer) for c in q.order_by(AttendanceCorrection.created_at.desc()).limit(300).all()]
        return [r for r in rows if scope == "mine" or r["can_review"] or (status or "").upper() != "PENDING"]

    def review(self, actor: Employee, correction_id: uuid.UUID, decision: str, remarks: Optional[str]) -> dict:
        c = self.db.query(AttendanceCorrection).options(joinedload(AttendanceCorrection.employee),
                                                        joinedload(AttendanceCorrection.requester)) \
            .filter(AttendanceCorrection.id == correction_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Correction not found.")
        if actor.id in (c.employee_id, c.requested_by):
            raise HTTPException(status_code=403, detail="Someone else has to approve this correction.")
        if not self._can_review(actor, c.employee):
            raise HTTPException(status_code=403, detail="Only Senior HR or the person's team lead can approve corrections.")
        if c.status != "PENDING":
            raise HTTPException(status_code=409, detail="This correction was already decided.")
        decision = decision.upper()
        if decision not in ("APPROVED", "REJECTED"):
            raise HTTPException(status_code=400, detail="Choose approve or reject.")
        if decision == "REJECTED" and not (remarks or "").strip():
            raise HTTPException(status_code=400, detail="Give a reason.")
        c.status, c.reviewed_by, c.reviewed_at = decision, actor.id, datetime.now(timezone.utc)
        c.remarks = (remarks or "").strip() or None
        if decision == "APPROVED":
            rec = self.db.query(AttendanceRecord).filter(AttendanceRecord.employee_id == c.employee_id,
                                                        AttendanceRecord.date == c.date).first()
            hours = round((c.check_out_at - c.check_in_at).total_seconds() / 3600, 2)
            if rec is None:
                rec = AttendanceRecord(id=uuid.uuid4(), employee_id=c.employee_id, date=c.date, check_in_at=c.check_in_at)
                self.db.add(rec)
            rec.check_in_at, rec.check_out_at, rec.total_hours = c.check_in_at, c.check_out_at, hours
            rec.status = "PRESENT"
        self.db.commit()
        word = "approved" if decision == "APPROVED" else "rejected"
        self.notes.create(recipient_id=c.employee_id, title=f"Attendance correction {word}",
                          message=f"{c.date.isoformat()}: {actor.full_name} {word} your correction." + (f" {c.remarks}" if c.remarks else ""),
                          type="ATTENDANCE_CORRECTION_REVIEWED", link_url="/attendance")
        self.audit.log(action=f"attendance_correction_{word}", entity_type="attendance_correction", entity_id=c.id,
                       actor_id=actor.id, metadata={"employee_id": str(c.employee_id), "date": c.date.isoformat()})
        return self._corr_dict(c, actor)
