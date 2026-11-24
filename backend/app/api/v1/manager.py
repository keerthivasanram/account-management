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
