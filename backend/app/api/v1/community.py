import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Employee
from app.services.auth_service import get_current_employee
from app.services.community_service import CommunityService

router = APIRouter(prefix="/community", tags=["Community"])


class KudosCreate(BaseModel):
    to_id: uuid.UUID
    message: str = Field(..., min_length=1, max_length=280)


@router.get("/today")
def today(me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Everything the dashboard needs in one call: idea of the day, and (if enabled) kudos + anniversaries."""
    svc = CommunityService(db)
    out = {**svc.idea_today(), "community_enabled": svc.enabled(), "kudos": [], "celebrations": []}
    if out["community_enabled"]:
        out["kudos"] = svc.kudos_feed(me)
        out["celebrations"] = svc.celebrations(me)
    return out


@router.post("/kudos", status_code=201)
def give_kudos(payload: KudosCreate, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return CommunityService(db).give(me, payload.to_id, payload.message)
