"""Team lead account powers, scoped to their own team.

A team lead (role value "manager", shown as "Team Lead") may:
  - approve or reject Instagram account requests registered by people on their team
    (never their own: separation of duties), and
  - reassign accounts between people on their team (themselves included).
Both reuse the admin code paths, so audit logs, Mail notices and the mass-reassignment
alert behave exactly as they do for administrators.
"""
import uuid
from typing import List, Optional, Set

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.models import AccountAssignment, AccountVerification, Employee, InstagramAccount
from app.repositories.employee_repo import EmployeeRepository
from app.schemas.admin import ApprovalRequest, AssignmentRequest
from app.services.admin_service import AdminService
from app.services.alert_service import AlertService


class TeamAccountsService:
    def __init__(self, db: Session):
        self.db = db

    def team_ids(self, lead: Employee) -> Set[uuid.UUID]:
        return {e.id for e in EmployeeRepository(self.db).list_team(lead)}

    def _active_assignee(self, acc: InstagramAccount) -> Optional[uuid.UUID]:
        return next((a.employee_id for a in acc.assignments if a.is_active), None)

    def _get(self, account_id: uuid.UUID) -> InstagramAccount:
        acc = (self.db.query(InstagramAccount)
               .options(joinedload(InstagramAccount.assignments), joinedload(InstagramAccount.verification))
               .filter(InstagramAccount.id == account_id).first())
        if not acc:
            raise HTTPException(status_code=404, detail="Account not found.")
        return acc

    # ------------------------------------------------------------------ requests

    def requests(self, lead: Employee) -> List[dict]:
        team = self.team_ids(lead)
        if not team:
            return []
        rows = (self.db.query(InstagramAccount)
                .join(AccountVerification, AccountVerification.instagram_account_id == InstagramAccount.id)
                .options(joinedload(InstagramAccount.creator))
                .filter(InstagramAccount.registered_by.in_(team), AccountVerification.approval_status == "pending",
                        InstagramAccount.status.notin_(("approved", "rejected")))
                .order_by(InstagramAccount.created_at.asc()).limit(200).all())
        return [{"id": str(a.id), "username": a.username, "account_type": a.account_type, "niche": a.niche,
                 "status": a.status, "registered_by_name": a.creator.full_name if a.creator else None,
                 "requested_at": a.created_at} for a in rows]

    def review(self, lead: Employee, account_id: uuid.UUID, decision: str, remarks: Optional[str]) -> dict:
        acc = self._get(account_id)
        if acc.registered_by == lead.id:
            raise HTTPException(status_code=403, detail="Someone else has to approve an account you added.")
        if acc.registered_by not in self.team_ids(lead):
            raise HTTPException(status_code=404, detail="Account not found.")
        if decision not in ("approved", "rejected"):
            raise HTTPException(status_code=400, detail="Choose approve or reject.")
        if decision == "rejected" and not (remarks or "").strip():
            raise HTTPException(status_code=400, detail="Give a reason so they know what to fix.")
        if acc.verification and acc.verification.approval_status != "pending":
            raise HTTPException(status_code=409, detail="This request was already decided.")
        return AdminService(self.db).review_account(account_id, ApprovalRequest(approval_status=decision, remarks=remarks), lead)

    # ------------------------------------------------------------------ team accounts + reassignment

    def accounts(self, lead: Employee) -> List[dict]:
        team = self.team_ids(lead) | {lead.id}
        rows = (self.db.query(AccountAssignment)
                .options(joinedload(AccountAssignment.account), joinedload(AccountAssignment.employee))
                .filter(AccountAssignment.is_active == True, AccountAssignment.employee_id.in_(team))  # noqa: E712
                .all())
        out = [{"id": str(r.instagram_account_id), "username": r.account.username if r.account else None,
                "status": r.account.status if r.account else None,
                "assignee_id": str(r.employee_id), "assignee_name": r.employee.full_name if r.employee else None}
               for r in rows]
        return sorted(out, key=lambda x: ((x["assignee_name"] or ""), (x["username"] or "")))

    def reassign(self, lead: Employee, account_id: uuid.UUID, to_id: uuid.UUID) -> dict:
        team = self.team_ids(lead) | {lead.id}
        acc = self._get(account_id)
        current = self._active_assignee(acc)
        if current not in team:
            raise HTTPException(status_code=404, detail="Account not found.")
        if to_id not in team:
            raise HTTPException(status_code=403, detail="You can only move accounts between people on your team.")
        if to_id == current:
            raise HTTPException(status_code=409, detail="It's already assigned to them.")
        result = AdminService(self.db).assign_account(account_id, AssignmentRequest(employee_id=to_id), lead)
        AlertService(self.db).on_account_reassigned(lead)
        return result
