"""
Leave requests: balance-checked submission, manager routing, scoped approval.

Days are counted as inclusive calendar days.
"""
import uuid
from datetime import date, datetime, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import Perm, can_approve_leave, has_permission
from app.models.models import Employee, LeaveRequest
from app.repositories.audit_repo import AuditRepository
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.org_settings_service import LEAVE_TYPES, OrgSettingsService


def leave_days(start: date, end: date) -> int:
    return (end - start).days + 1


def _year_overlap_days(lr: LeaveRequest, year: int) -> int:
    start = max(lr.start_date, date(year, 1, 1))
    end = min(lr.end_date, date(year, 12, 31))
    return leave_days(start, end) if end >= start else 0


class LeaveService:
    def __init__(self, db: Session):
        self.db = db
        self.notifications = NotificationRepository(db)
        self.audit = AuditRepository(db)
        self.employees = EmployeeRepository(db)

    # ------------------------------------------------------------- approvers

    def approvers_for(self, employee: Employee) -> List[Employee]:
        """Direct manager, else department head, else all active admins."""
        if employee.manager_id and employee.manager and employee.manager.is_active:
            return [employee.manager]
        if employee.department and employee.department.head_employee_id and employee.department.head_employee_id != employee.id:
            head = self.employees.get_by_id(employee.department.head_employee_id)
            if head and head.is_active:
                return [head]
        return [a for a in self.employees.list(roles=["admin", "super_admin"], is_active=True) if a.id != employee.id]

    # ------------------------------------------------------------- balance

    def balance(self, employee: Employee, year: Optional[int] = None) -> dict:
        year = year or date.today().year
        allowance: Dict[str, int] = OrgSettingsService(self.db).get("leave_allowance_days")
        rows = self.db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == employee.id,
            LeaveRequest.status.in_(["APPROVED", "PENDING"]),
            LeaveRequest.start_date <= date(year, 12, 31),
            LeaveRequest.end_date >= date(year, 1, 1),
        ).all()
        used = {t: 0 for t in LEAVE_TYPES}
        pending = {t: 0 for t in LEAVE_TYPES}
        for r in rows:
            bucket = used if r.status == "APPROVED" else pending
            if r.leave_type in bucket:
                bucket[r.leave_type] += _year_overlap_days(r, year)
        return {
            "year": year,
            "balances": [
                {"leave_type": t, "allowance": allowance.get(t, 0), "used": used[t], "pending": pending[t],
                 "remaining": max(allowance.get(t, 0) - used[t], 0)}
                for t in LEAVE_TYPES
            ],
        }

    # ------------------------------------------------------------- request / cancel

    def request(self, employee: Employee, leave_type: str, start: date, end: date, reason: str) -> LeaveRequest:
        leave_type = leave_type.upper().strip()
        if leave_type not in LEAVE_TYPES:
            raise HTTPException(status_code=400, detail=f"Leave type must be one of {', '.join(LEAVE_TYPES)}.")
        if end < start:
            raise HTTPException(status_code=400, detail="End date cannot be earlier than start date.")
        if leave_days(start, end) > 60:
            raise HTTPException(status_code=400, detail="A single request cannot exceed 60 days.")

        overlap = self.db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == employee.id,
            LeaveRequest.status.in_(["PENDING", "APPROVED"]),
            LeaveRequest.start_date <= end,
            LeaveRequest.end_date >= start,
        ).first()
        if overlap:
            raise HTTPException(status_code=409, detail=f"Overlaps an existing {overlap.status.lower()} request "
                                                        f"({overlap.start_date} to {overlap.end_date}).")

        # Balance check per calendar year the request touches (counting pending requests too)
        for year in range(start.year, end.year + 1):
            bal = next(b for b in self.balance(employee, year)["balances"] if b["leave_type"] == leave_type)
            requested = _year_overlap_days(LeaveRequest(start_date=start, end_date=end), year)
            available = bal["allowance"] - bal["used"] - bal["pending"]
            if requested > available:
                raise HTTPException(status_code=400, detail=f"Insufficient {leave_type.lower()} leave for {year}: "
                                                            f"{max(available, 0)} day(s) available, {requested} requested.")

        lr = LeaveRequest(id=uuid.uuid4(), employee_id=employee.id, leave_type=leave_type,
                          start_date=start, end_date=end, reason=reason.strip(), status="PENDING")
        self.db.add(lr)
        self.db.commit()
        self.db.refresh(lr)

        for approver in self.approvers_for(employee):
            self.notifications.create(
                recipient_id=approver.id, title="Leave request awaiting approval",
                message=f"{employee.full_name} requested {leave_days(start, end)} day(s) of {leave_type.lower()} leave "
                        f"({start} to {end}).",
                type="LEAVE_REQUESTED", link_url="/manager?tab=approvals")
        return lr

    def cancel(self, leave_id: uuid.UUID, employee: Employee) -> LeaveRequest:
        lr = self._get(leave_id)
        if lr.employee_id != employee.id:
            raise HTTPException(status_code=403, detail="You can only cancel your own leave requests.")
        if lr.status != "PENDING" and not (lr.status == "APPROVED" and lr.start_date > date.today()):
            raise HTTPException(status_code=409, detail="Only pending or future approved leave can be cancelled.")
        lr.status = "CANCELLED"
        self.db.commit()
        self.db.refresh(lr)
        return lr

    # ------------------------------------------------------------- review

    def _get(self, leave_id: uuid.UUID) -> LeaveRequest:
        lr = self.db.query(LeaveRequest).options(joinedload(LeaveRequest.employee)).filter(LeaveRequest.id == leave_id).first()
        if not lr:
            raise HTTPException(status_code=404, detail="Leave request not found.")
        return lr

    def review(self, leave_id: uuid.UUID, reviewer: Employee, decision: str, remarks: Optional[str]) -> LeaveRequest:
        decision = decision.upper()
        if decision not in ("APPROVED", "REJECTED"):
            raise HTTPException(status_code=400, detail="Status must be either APPROVED or REJECTED.")
        lr = self._get(leave_id)
        if lr.employee_id == reviewer.id:
            raise HTTPException(status_code=403, detail="Separation of duties: you cannot review your own leave.")
        if not can_approve_leave(reviewer, lr.employee):
            raise HTTPException(status_code=403, detail="You can only review leave for your own team.")
        if lr.status != "PENDING":
            raise HTTPException(status_code=409, detail=f"This request was already {lr.status.lower()}.")

        lr.status = decision
        lr.reviewed_by = reviewer.id
        lr.review_remarks = remarks
        lr.reviewed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(lr)
        self.audit.log(action=f"leave_{decision.lower()}", entity_type="leave_request", entity_id=lr.id,
                       actor_id=reviewer.id, metadata={"employee_id": str(lr.employee_id), "days": leave_days(lr.start_date, lr.end_date)})
        self.notifications.create(
            recipient_id=lr.employee_id, title=f"Leave {decision.lower()}",
            message=f"{reviewer.full_name} {decision.lower()} your {lr.leave_type.lower()} leave ({lr.start_date} to {lr.end_date})"
                    + (f": {remarks}" if remarks else "."),
            type="LEAVE_REVIEWED", link_url="/attendance")
        return lr

    # ------------------------------------------------------------- listing

    def team_ids(self, manager: Employee) -> List[uuid.UUID]:
        return [e.id for e in self.employees.list_team(manager)]

    def list(self, viewer: Employee, scope: str = "auto", status_filter: Optional[str] = None) -> List[LeaveRequest]:
        q = self.db.query(LeaveRequest).options(joinedload(LeaveRequest.employee), joinedload(LeaveRequest.reviewer))
        can_all = has_permission(viewer, Perm.LEAVE_APPROVE_ALL)
        can_team = has_permission(viewer, Perm.LEAVE_APPROVE_TEAM)
        if scope == "auto":
            scope = "all" if can_all else "team_and_mine" if can_team else "mine"
        if scope == "all":
            if not can_all:
                raise HTTPException(status_code=403, detail="You cannot view company-wide leave.")
        elif scope in ("team", "team_and_mine"):
            if not can_team:
                raise HTTPException(status_code=403, detail="You do not manage a team.")
            ids = self.team_ids(viewer)
            if scope == "team_and_mine":
                ids.append(viewer.id)
            q = q.filter(LeaveRequest.employee_id.in_(ids or [uuid.uuid4()]))
        else:
            q = q.filter(LeaveRequest.employee_id == viewer.id)
        if status_filter:
            q = q.filter(LeaveRequest.status == status_filter.upper())
        return q.order_by(LeaveRequest.created_at.desc()).limit(500).all()

    def pending_for_reviewer(self, reviewer: Employee) -> List[LeaveRequest]:
        if has_permission(reviewer, Perm.LEAVE_APPROVE_ALL):
            rows = self.list(reviewer, scope="all", status_filter="PENDING")
        elif has_permission(reviewer, Perm.LEAVE_APPROVE_TEAM):
            rows = self.list(reviewer, scope="team", status_filter="PENDING")
        else:
            return []
        return [r for r in rows if r.employee_id != reviewer.id]
