import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Perm, require_permission
from app.models.models import Employee
from app.services.hr_service import HrService

router = APIRouter(prefix="/hr", tags=["HR"])


class TeamMove(BaseModel):
    employee_ids: List[uuid.UUID] = Field(..., min_length=1, max_length=200)
    manager_id: Optional[uuid.UUID] = None       # None = remove from their team
    department_id: Optional[uuid.UUID] = None    # None = keep current department


@router.get("/overview")
def hr_overview(viewer: Employee = Depends(require_permission(Perm.HR_PORTAL)), db: Session = Depends(get_db)):
    """Eagle view: today's attendance by department, waiting on HR, org health, movement, workload."""
    return HrService(db).overview(viewer)


@router.get("/org")
def hr_org(viewer: Employee = Depends(require_permission(Perm.HR_PORTAL)), db: Session = Depends(get_db)):
    """Departments, every team lead with their team, and people with no team lead."""
    return HrService(db).org()


@router.post("/teams/move")
def move_people(payload: TeamMove, actor: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)),
                db: Session = Depends(get_db)):
    """Move people to a team lead (and optionally a department), or out of their team."""
    return HrService(db).move(actor, payload.employee_ids, payload.manager_id, payload.department_id)


# ---------------------------------------------------------------- change requests (Junior HR -> Senior HR)
from app.services.people_change_service import PeopleChangeService  # noqa: E402


class ChangeRequestCreate(BaseModel):
    employee_id: uuid.UUID
    kind: str = Field(..., description="ROLE | TEAM")
    reason: str = Field(..., min_length=3, max_length=1000)
    role: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    remove_from_team: bool = False


class ChangeRequestReview(BaseModel):
    status: str  # APPROVED | REJECTED
    remarks: Optional[str] = None


@router.get("/change-requests")
def list_change_requests(status: Optional[str] = None, viewer: Employee = Depends(require_permission(Perm.HR_PORTAL)),
                         db: Session = Depends(get_db)):
    """Senior HR: all requests. Junior HR: the ones they filed."""
    return PeopleChangeService(db).list(viewer, status)


@router.post("/change-requests", status_code=201)
def create_change_request(payload: ChangeRequestCreate, actor: Employee = Depends(require_permission(Perm.HR_PORTAL)),
                          db: Session = Depends(get_db)):
    """Ask Senior HR to change someone's role (Employee / Team Lead) or team."""
    return PeopleChangeService(db).create(actor, payload.employee_id, payload.kind, payload.reason, payload.role,
                                          payload.manager_id, payload.department_id, payload.remove_from_team)


@router.patch("/change-requests/{request_id}/review")
def review_change_request(request_id: uuid.UUID, payload: ChangeRequestReview,
                          actor: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)), db: Session = Depends(get_db)):
    return PeopleChangeService(db).review(actor, request_id, payload.status, payload.remarks)
