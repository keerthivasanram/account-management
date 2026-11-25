import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Employee
from app.services.auth_service import get_current_employee
from app.services.mail_service import MailService

router = APIRouter(prefix="/mail", tags=["Mail"])


class MailUpdate(BaseModel):
    is_read: Optional[bool] = None
    archived: Optional[bool] = None


class NoticeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=5000)
    department_id: Optional[uuid.UUID] = None  # None = everyone


@router.get("")
def list_mail(
    folder: str = Query("inbox", description="inbox | archived"),
    q: Optional[str] = Query(None, max_length=100),
    category: Optional[str] = Query(None, description="approvals | assignments | notices | security | support | other"),
    unread_only: bool = False,
    me: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Your own mail only."""
    return MailService(db).list(me, folder, q, category, unread_only)


@router.get("/unread-count")
def unread_count(me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return {"unread": MailService(db).unread_count(me)}


@router.post("/read-all")
def read_all(me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return {"updated": MailService(db).read_all(me)}


@router.get("/notices/sent")
def sent_notices(me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Admins: notices you have sent."""
    return MailService(db).sent_notices(me)


@router.post("/notices", status_code=201)
def send_notice(payload: NoticeCreate, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Admins: send a company notice to everyone or one department."""
    return MailService(db).send_notice(me, payload.title, payload.message, payload.department_id)


@router.patch("/{mail_id}")
def update_mail(mail_id: uuid.UUID, payload: MailUpdate, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Mark read/unread, archive or move back to the inbox."""
    return MailService(db).update(me, mail_id, payload.is_read, payload.archived)
