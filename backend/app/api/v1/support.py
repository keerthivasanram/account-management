import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Employee
from app.services.auth_service import get_current_employee
from app.services.storage_service import MAX_BYTES
from app.services.support_service import SupportService

router = APIRouter(prefix="/support", tags=["Help & support"])


class TicketCreate(BaseModel):
    category: str = "OTHER"
    subject: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5, max_length=5000)
    attachment_ref: Optional[str] = None


class TicketReply(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None


@router.get("/tickets")
def list_tickets(scope: str = Query("mine", description="mine | all (support staff)"), status: Optional[str] = None,
                 me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return SupportService(db).list(me, scope, status)


@router.post("/tickets", status_code=201)
def create_ticket(payload: TicketCreate, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return SupportService(db).create(me, payload.category, payload.subject, payload.description, payload.attachment_ref)


@router.post("/attachments")
async def upload_attachment(file: UploadFile = File(...), me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    data = await file.read(MAX_BYTES + 1)
    return SupportService(db).upload_attachment(me, data, (file.content_type or "").lower())


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: uuid.UUID, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return SupportService(db).get(me, ticket_id)


@router.post("/tickets/{ticket_id}/messages")
def reply(ticket_id: uuid.UUID, payload: TicketReply, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return SupportService(db).reply(me, ticket_id, payload.body)


@router.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: uuid.UUID, payload: TicketUpdate, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return SupportService(db).update(me, ticket_id, payload.status, payload.assigned_to)
