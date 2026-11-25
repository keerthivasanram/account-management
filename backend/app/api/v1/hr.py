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
