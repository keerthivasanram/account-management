"""Junior HR prepares role / team changes; Senior HR (employees:manage) approves.

Approval applies the change through the normal paths (EmployeeService.update / HrService.move), so
every rule still holds: who may grant which role, no circular reporting lines, can't touch admins,
audit log, Mail to the people affected. Nobody approves a request they filed.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import ROLE_LABELS, Perm, Role, can_manage_employee, has_permission
from app.models.models import Employee, PeopleChangeRequest
from app.repositories.audit_repo import AuditRepository
from app.repositories.notification_repo import NotificationRepository

REQUESTABLE_ROLES = (Role.EMPLOYEE.value, Role.MANAGER.value)


class PeopleChangeService:
    def __init__(self, db: Session):
        self.db = db
        self.notes = NotificationRepository(db)
        self.audit = AuditRepository(db)

    def _names(self, ids) -> dict:
        ids = [i for i in ids if i]
        if not ids:
            return {}
        return {str(e.id): e.full_name for e in self.db.query(Employee).filter(Employee.id.in_(ids)).all()}

    def _dict(self, r: PeopleChangeRequest, viewer: Employee) -> dict:
        p = r.payload or {}
        names = self._names([uuid.UUID(p["manager_id"])] if p.get("manager_id") else [])
        if r.kind == "ROLE":
            summary = f"Make {r.employee.full_name if r.employee else 'them'} {ROLE_LABELS.get(p.get('role'), p.get('role'))}"
        elif p.get("manager_id"):
            summary = f"Move {r.employee.full_name if r.employee else 'them'} to {names.get(p['manager_id'], 'a team lead')}'s team"
        else:
            summary = f"Remove {r.employee.full_name if r.employee else 'them'} from their team"
        return {
            "id": str(r.id), "kind": r.kind, "employee_id": str(r.employee_id),
            "employee_name": r.employee.full_name if r.employee else None, "payload": p, "summary": summary,
            "reason": r.reason, "status": r.status, "remarks": r.remarks, "created_at": r.created_at,
            "requested_by_name": r.requester.full_name if r.requester else None,
            "mine": r.requested_by == viewer.id,
            "can_review": r.status == "PENDING" and r.requested_by != viewer.id and has_permission(viewer, Perm.EMPLOYEES_MANAGE),
        }

    def list(self, viewer: Employee, status: Optional[str] = None) -> List[dict]:
        if not has_permission(viewer, Perm.HR_PORTAL):
            return []
        q = self.db.query(PeopleChangeRequest).options(joinedload(PeopleChangeRequest.employee), joinedload(PeopleChangeRequest.requester))
        if not has_permission(viewer, Perm.EMPLOYEES_MANAGE):
            q = q.filter(PeopleChangeRequest.requested_by == viewer.id)  # Junior HR: their own requests
        if status:
            q = q.filter(PeopleChangeRequest.status == status.upper())
        return [self._dict(r, viewer) for r in q.order_by(PeopleChangeRequest.created_at.desc()).limit(200).all()]

    def create(self, actor: Employee, employee_id: uuid.UUID, kind: str, reason: str, role: Optional[str] = None,
               manager_id: Optional[uuid.UUID] = None, department_id: Optional[uuid.UUID] = None,
               remove_from_team: bool = False) -> dict:
        if not has_permission(actor, Perm.HR_PORTAL):
            raise HTTPException(status_code=403, detail="Only HR can request people changes.")
        target = self.db.query(Employee).filter(Employee.id == employee_id).first()
        if not target or not target.is_active:
            raise HTTPException(status_code=404, detail="Employee not found.")
        if target.role in (Role.ADMIN.value, Role.SUPER_ADMIN.value, Role.HR_SENIOR.value) or target.id == actor.id:
            raise HTTPException(status_code=403, detail="HR can't request changes for this person.")
        if not (reason or "").strip():
            raise HTTPException(status_code=400, detail="Say why the change is needed.")
        kind = (kind or "").upper()
        if kind == "ROLE":
            if role not in REQUESTABLE_ROLES:
                raise HTTPException(status_code=400, detail="Request Employee or Team Lead.")
            if role == target.role:
                raise HTTPException(status_code=409, detail="They already have that role.")
            payload = {"role": role}
        elif kind == "TEAM":
            if manager_id:
                lead = self.db.query(Employee).filter(Employee.id == manager_id).first()
                if not lead or not lead.is_active or lead.role != Role.MANAGER.value:
                    raise HTTPException(status_code=400, detail="Choose an active Team Lead.")
            elif not remove_from_team:
                raise HTTPException(status_code=400, detail="Choose a team lead, or ask to remove them from their team.")
            payload = {"manager_id": str(manager_id) if manager_id else None,
                       "department_id": str(department_id) if department_id else None}
        else:
            raise HTTPException(status_code=400, detail="Kind must be ROLE or TEAM.")
        if self.db.query(PeopleChangeRequest).filter(PeopleChangeRequest.employee_id == employee_id, PeopleChangeRequest.kind == kind,
                                                     PeopleChangeRequest.status == "PENDING").first():
            raise HTTPException(status_code=409, detail="There's already a request like this waiting.")
        r = PeopleChangeRequest(id=uuid.uuid4(), kind=kind, employee_id=employee_id, payload=payload,
                                reason=reason.strip()[:1000], requested_by=actor.id)
        self.db.add(r)
        self.db.commit()
        for s in self.db.query(Employee).filter(Employee.role == Role.HR_SENIOR.value, Employee.is_active == True).all():  # noqa: E712
            self.notes.create(recipient_id=s.id, title=f"Change request: {target.full_name}",
                              message=f"{actor.full_name} asks: {reason.strip()[:200]}", type="PEOPLE_CHANGE_REQUESTED", link_url="/hr")
        self.audit.log(action="people_change_requested", entity_type="employee", entity_id=employee_id, actor_id=actor.id,
                       metadata={"kind": kind, **payload})
        self.db.refresh(r)
        return self._dict(r, actor)

    def review(self, actor: Employee, request_id: uuid.UUID, decision: str, remarks: Optional[str]) -> dict:
        r = self.db.query(PeopleChangeRequest).options(joinedload(PeopleChangeRequest.employee), joinedload(PeopleChangeRequest.requester)) \
            .filter(PeopleChangeRequest.id == request_id).first()
        if not r:
            raise HTTPException(status_code=404, detail="Request not found.")
        if not has_permission(actor, Perm.EMPLOYEES_MANAGE):
            raise HTTPException(status_code=403, detail="Only Senior HR can approve people changes.")
        if r.requested_by == actor.id:
            raise HTTPException(status_code=403, detail="Someone else has to approve your own request.")
        if r.status != "PENDING":
            raise HTTPException(status_code=409, detail="This request was already decided.")
        decision = (decision or "").upper()
        if decision not in ("APPROVED", "REJECTED"):
            raise HTTPException(status_code=400, detail="Choose approve or reject.")
        if decision == "REJECTED" and not (remarks or "").strip():
            raise HTTPException(status_code=400, detail="Give a reason.")
        if decision == "APPROVED":
            if not can_manage_employee(actor, r.employee):
                raise HTTPException(status_code=403, detail="You can't change this person.")
            p = r.payload or {}
            if r.kind == "ROLE":
                from app.schemas.employee import EmployeeUpdate
                from app.services.employee_service import EmployeeService
                EmployeeService(self.db).update(r.employee_id, EmployeeUpdate(role=p["role"]), actor)
            else:
                from app.services.hr_service import HrService
                HrService(self.db).move(actor, [r.employee_id], uuid.UUID(p["manager_id"]) if p.get("manager_id") else None,
                                        uuid.UUID(p["department_id"]) if p.get("department_id") else None)
        r.status, r.reviewed_by, r.reviewed_at = decision, actor.id, datetime.now(timezone.utc)
        r.remarks = (remarks or "").strip() or None
        self.db.commit()
        word = "approved" if decision == "APPROVED" else "rejected"
        if r.requested_by:
            summary = self._dict(r, actor)["summary"]
            self.notes.create(recipient_id=r.requested_by, title=f"Change request {word}",
                              message=f"{summary}: {actor.full_name} {word} it." + (f" {r.remarks}" if r.remarks else ""),
                              type="PEOPLE_CHANGE_REVIEWED", link_url="/hr")
        self.audit.log(action=f"people_change_{word}", entity_type="employee", entity_id=r.employee_id, actor_id=actor.id,
                       metadata={"request_id": str(r.id), "kind": r.kind})
        return self._dict(r, actor)
