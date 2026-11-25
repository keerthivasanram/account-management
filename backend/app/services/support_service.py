"""Help & support tickets.

Anyone can raise a ticket and follow it ("My tickets"). Support staff (admin portal) see every
ticket, reply, assign and change status. Replies and status changes reach the requester's Mail.
"""
import uuid
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import Perm, has_permission
from app.models.models import Employee, SupportTicket, SupportTicketMessage
from app.repositories.audit_repo import AuditRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.storage_service import StorageService

CATEGORIES = {"ACCOUNT_SETUP", "PUBLISHING", "ACCESS", "OTHER"}
STATUSES = {"OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"}
STATUS_TEXT = {"OPEN": "open", "IN_PROGRESS": "in progress", "RESOLVED": "resolved", "CLOSED": "closed"}


def is_support_staff(emp: Employee) -> bool:
    return has_permission(emp, Perm.ADMIN_PORTAL)


class SupportService:
    def __init__(self, db: Session, storage: Optional[StorageService] = None):
        self.db = db
        self.storage = storage or StorageService()
        self.notes = NotificationRepository(db)

    # ------------------------------------------------------------------ helpers

    def _query(self):
        return self.db.query(SupportTicket).options(
            joinedload(SupportTicket.creator), joinedload(SupportTicket.assignee),
            joinedload(SupportTicket.messages).joinedload(SupportTicketMessage.author))

    def _get(self, me: Employee, ticket_id: uuid.UUID) -> SupportTicket:
        t = self._query().filter(SupportTicket.id == ticket_id).first()
        if not t or not (t.created_by == me.id or is_support_staff(me)):
            raise HTTPException(status_code=404, detail="Ticket not found.")
        return t

    def _next_reference(self) -> str:
        n = self.db.query(func.count(SupportTicket.id)).scalar() or 0
        return f"SUP-{n + 1:04d}"

    def to_dict(self, t: SupportTicket, with_messages: bool = False) -> dict:
        out = {
            "id": t.id, "reference": t.reference, "category": t.category, "subject": t.subject,
            "description": t.description, "status": t.status,
            "created_by": t.created_by, "creator_name": t.creator.full_name if t.creator else None,
            "assigned_to": t.assigned_to, "assignee_name": t.assignee.full_name if t.assignee else None,
            "reply_count": len(t.messages), "created_at": t.created_at, "updated_at": t.updated_at,
            "has_attachment": bool(t.attachment_ref),
        }
        if with_messages:
            out["attachment_url"] = self.storage.signed_url(t.attachment_ref) if t.attachment_ref else None
            out["messages"] = [{
                "id": m.id, "author_id": m.author_id, "author_name": m.author.full_name if m.author else "Unknown",
                "from_support": m.author_id != t.created_by, "body": m.body, "created_at": m.created_at,
            } for m in t.messages]
        return out

    # ------------------------------------------------------------------ queries

    def list(self, me: Employee, scope: str = "mine", status: Optional[str] = None) -> List[dict]:
        q = self._query()
        if scope == "all":
            if not is_support_staff(me):
                raise HTTPException(status_code=403, detail="Only support staff can see every ticket.")
        elif scope == "mine":
            q = q.filter(SupportTicket.created_by == me.id)
        else:
            raise HTTPException(status_code=400, detail="Scope must be mine or all.")
        if status:
            if status.upper() not in STATUSES:
                raise HTTPException(status_code=400, detail="Unknown status.")
            q = q.filter(SupportTicket.status == status.upper())
        return [self.to_dict(t) for t in q.order_by(SupportTicket.updated_at.desc()).limit(200).all()]

    def get(self, me: Employee, ticket_id: uuid.UUID) -> dict:
        return self.to_dict(self._get(me, ticket_id), with_messages=True)

    # ------------------------------------------------------------------ actions

    def create(self, me: Employee, category: str, subject: str, description: str, attachment_ref: Optional[str]) -> dict:
        category = (category or "OTHER").upper()
        if category not in CATEGORIES:
            raise HTTPException(status_code=400, detail="Choose a category.")
        if attachment_ref and not StorageService.owns_ref(attachment_ref, me.id):
            raise HTTPException(status_code=403, detail="Attach a screenshot you uploaded yourself.")
        if attachment_ref and not attachment_ref.startswith("storage:"):
            raise HTTPException(status_code=400, detail="Upload the screenshot instead of linking it.")
        for _ in range(3):  # references are sequential; retry if two tickets race for the same one
            t = SupportTicket(id=uuid.uuid4(), reference=self._next_reference(), created_by=me.id, category=category,
                              subject=subject.strip(), description=description.strip(), attachment_ref=attachment_ref,
                              status="OPEN")
            self.db.add(t)
            try:
                self.db.commit()
                break
            except IntegrityError:
                self.db.rollback()
        else:
            raise HTTPException(status_code=503, detail="Please try again.")
        AuditRepository(self.db).log(action="support_ticket_opened", entity_type="support_ticket", entity_id=t.id,
                                     actor_id=me.id, metadata={"reference": t.reference, "category": category})
        return self.get(me, t.id)

    def reply(self, me: Employee, ticket_id: uuid.UUID, body: str) -> dict:
        t = self._get(me, ticket_id)
        body = (body or "").strip()
        if not body:
            raise HTTPException(status_code=400, detail="Write a reply.")
        if t.status == "CLOSED":
            raise HTTPException(status_code=409, detail="This ticket is closed. Open a new one if you still need help.")
        self.db.add(SupportTicketMessage(id=uuid.uuid4(), ticket_id=t.id, author_id=me.id, body=body))
        if me.id == t.created_by:
            if t.status == "RESOLVED":
                t.status = "OPEN"  # the requester says it isn't fixed
            if t.assigned_to:
                self.notes.create(recipient_id=t.assigned_to, title=f"Reply on {t.reference}",
                                  message=f"{me.full_name}: {body[:200]}", type="SUPPORT_REPLY", link_url=f"/help?ticket={t.id}")
        else:
            if t.status == "OPEN":
                t.status = "IN_PROGRESS"
            if not t.assigned_to:
                t.assigned_to = me.id
            self.notes.create(recipient_id=t.created_by, title=f"Support replied: {t.reference}",
                              message=f"{t.subject}\n\n{me.full_name}: {body[:500]}", type="SUPPORT_REPLY",
                              link_url=f"/help?ticket={t.id}")
        self.db.commit()
        return self.get(me, t.id)

    def update(self, me: Employee, ticket_id: uuid.UUID, status: Optional[str], assigned_to: Optional[uuid.UUID]) -> dict:
        t = self._get(me, ticket_id)
        staff = is_support_staff(me)
        if assigned_to is not None:
            if not staff:
                raise HTTPException(status_code=403, detail="Only support staff can assign tickets.")
            target = self.db.query(Employee).filter(Employee.id == assigned_to).first()
            if not target or not is_support_staff(target):
                raise HTTPException(status_code=400, detail="Assign the ticket to a member of the support team.")
            t.assigned_to = assigned_to
        if status is not None:
            status = status.upper()
            if status not in STATUSES:
                raise HTTPException(status_code=400, detail="Unknown status.")
            if not staff and not (me.id == t.created_by and status == "CLOSED"):
                raise HTTPException(status_code=403, detail="You can close your own ticket; support changes the rest.")
            if status != t.status:
                t.status = status
                if me.id != t.created_by:
                    self.notes.create(recipient_id=t.created_by, title=f"{t.reference} is {STATUS_TEXT[status]}",
                                      message=f"{t.subject}\n\n{me.full_name} marked your ticket as {STATUS_TEXT[status]}.",
                                      type="SUPPORT_STATUS", link_url=f"/help?ticket={t.id}")
        self.db.commit()
        return self.get(me, t.id)

    def upload_attachment(self, me: Employee, data: bytes, content_type: str) -> dict:
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=415, detail="Attach a JPG or PNG screenshot.")
        return self.storage.upload(data, content_type, me.id)
