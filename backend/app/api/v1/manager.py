from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Perm, require_permission
from app.models.models import Employee
from app.services.manager_service import ManagerService

router = APIRouter(prefix="/manager", tags=["Manager Workspace"])


@router.get("/overview")
def manager_overview(
    manager: Employee = Depends(require_permission(Perm.MANAGER_PORTAL)),
    db: Session = Depends(get_db),
):
    """Team roster with today's attendance, open/overdue tasks, account workload flags and approval counts."""
    return ManagerService(db).overview(manager)


@router.get("/approvals")
def manager_approvals(
    manager: Employee = Depends(require_permission(Perm.MANAGER_PORTAL)),
    db: Session = Depends(get_db),
):
    """Everything waiting on this person: task reviews and leave requests they are allowed to decide."""
    return ManagerService(db).approvals(manager)


# ---------------------------------------------------------------- team lead account powers
import uuid  # noqa: E402

from pydantic import BaseModel  # noqa: E402

from app.services.team_accounts_service import TeamAccountsService  # noqa: E402


class TeamApproval(BaseModel):
    approval_status: str  # approved | rejected
    remarks: str | None = None


class TeamAssignment(BaseModel):
    employee_id: uuid.UUID


@router.get("/account-requests")
def team_account_requests(lead: Employee = Depends(require_permission(Perm.MANAGER_PORTAL)), db: Session = Depends(get_db)):
    """Instagram accounts your team added that are waiting for approval."""
    return TeamAccountsService(db).requests(lead)


@router.patch("/accounts/{account_id}/approval")
def team_review_account(account_id: uuid.UUID, payload: TeamApproval,
                        lead: Employee = Depends(require_permission(Perm.MANAGER_PORTAL)), db: Session = Depends(get_db)):
    """Approve or reject an account request from your team (not your own)."""
    return TeamAccountsService(db).review(lead, account_id, payload.approval_status.lower(), payload.remarks)


@router.get("/accounts")
def team_accounts(lead: Employee = Depends(require_permission(Perm.MANAGER_PORTAL)), db: Session = Depends(get_db)):
    """Accounts currently assigned to you or your team."""
    return TeamAccountsService(db).accounts(lead)


@router.post("/accounts/{account_id}/assign")
def team_reassign(account_id: uuid.UUID, payload: TeamAssignment,
                  lead: Employee = Depends(require_permission(Perm.MANAGER_PORTAL)), db: Session = Depends(get_db)):
    """Move an account between people on your team."""
    return TeamAccountsService(db).reassign(lead, account_id, payload.employee_id)
