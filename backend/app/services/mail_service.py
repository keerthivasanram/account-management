"""Mail: the internal Klarves inbox.

Formal, findable-later communications (approval decisions, assignment changes, company
notices, support replies) are stored as notifications addressed to one employee; Mail adds
categories, search and archive on top. Everyone only ever reads their own mail.
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.permissions import Perm, has_permission
from app.models.models import AuditLog, Department, Employee, Notification
from app.repositories.audit_repo import AuditRepository

CATEGORIES: Dict[str, set] = {
    "approvals": {"ACCOUNT_APPROVED", "ACCOUNT_REJECTED", "POST_APPROVED", "POST_REJECTED", "TASK_APPROVED",
                  "CHANGES_REQUESTED", "LEAVE_REVIEWED"},
    "assignments": {"ACCOUNT_ASSIGNED", "TASK_ASSIGNED", "TASK_REVIEW_REQUESTED", "LEAVE_REQUESTED"},
    "notices": {"NOTICE"},
    "security": {"SECURITY_ALERT", "TOKEN_EXPIRED", "TOKEN_EXPIRING"},
    "support": {"SUPPORT_REPLY", "SUPPORT_STATUS"},
    "kudos": {"KUDOS"},
}
KNOWN = set().union(*CATEGORIES.values())


def category_of(kind: str) -> str:
    for name, kinds in CATEGORIES.items():
        if kind in kinds:
            return name
    return "other"


def to_mail(n: Notification) -> dict:
    return {
        "id": n.id, "title": n.title, "message": n.message, "type": n.type, "category": category_of(n.type),
        "link_url": n.link_url, "is_read": n.is_read, "archived": n.archived_at is not None,
        "created_at": n.created_at,
    }


class MailService:
    def __init__(self, db: Session):
        self.db = db

    def _mine(self, me: Employee):
        return self.db.query(Notification).filter(Notification.recipient_id == me.id)

    def list(self, me: Employee, folder: str = "inbox", q: Optional[str] = None, category: Optional[str] = None,
             unread_only: bool = False, limit: int = 100) -> List[dict]:
        query = self._mine(me)
        if folder == "archived":
            query = query.filter(Notification.archived_at.isnot(None))
        elif folder == "inbox":
            query = query.filter(Notification.archived_at.is_(None))
        else:
            raise HTTPException(status_code=400, detail="Folder must be inbox or archived.")
        if category:
            if category == "other":
                query = query.filter(Notification.type.notin_(KNOWN))
            elif category in CATEGORIES:
                query = query.filter(Notification.type.in_(CATEGORIES[category]))
            else:
                raise HTTPException(status_code=400, detail="Unknown category.")
        if unread_only:
            query = query.filter(Notification.is_read == False)  # noqa: E712
        if q and q.strip():
            like = f"%{q.strip().lower()}%"
            query = query.filter(or_(func.lower(Notification.title).like(like), func.lower(Notification.message).like(like)))
        return [to_mail(n) for n in query.order_by(Notification.created_at.desc()).limit(min(limit, 200)).all()]

    def unread_count(self, me: Employee) -> int:
        return self._mine(me).filter(Notification.is_read == False, Notification.archived_at.is_(None)).count()  # noqa: E712

    def update(self, me: Employee, mail_id: uuid.UUID, is_read: Optional[bool], archived: Optional[bool]) -> dict:
        n = self._mine(me).filter(Notification.id == mail_id).first()
        if not n:
            raise HTTPException(status_code=404, detail="Mail not found.")
        if is_read is not None:
            n.is_read = is_read
        if archived is not None:
            n.archived_at = datetime.now(timezone.utc) if archived else None
            if archived:
                n.is_read = True
        self.db.commit()
        return to_mail(n)

    def read_all(self, me: Employee) -> int:
        count = self._mine(me).filter(Notification.is_read == False, Notification.archived_at.is_(None)) \
            .update({"is_read": True}, synchronize_session=False)  # noqa: E712
        self.db.commit()
        return count

    # ------------------------------------------------------------------ company notices

    def send_notice(self, sender: Employee, title: str, message: str, department_id: Optional[uuid.UUID]) -> dict:
        if not has_permission(sender, Perm.EMPLOYEES_MANAGE):
            raise HTTPException(status_code=403, detail="Only administrators can send company notices.")
        title, message = title.strip(), message.strip()
        if not title or not message:
            raise HTTPException(status_code=400, detail="A notice needs a subject and a message.")
        q = self.db.query(Employee.id).filter(Employee.is_active == True, Employee.status != "OFFBOARDED")  # noqa: E712
        audience = "everyone"
        if department_id:
            dept = self.db.query(Department).filter(Department.id == department_id).first()
            if not dept:
                raise HTTPException(status_code=404, detail="Department not found.")
            q = q.filter(Employee.department_id == department_id)
            audience = dept.name
        ids = [r.id for r in q.all()]
        if not ids:
            raise HTTPException(status_code=400, detail="Nobody would receive this notice.")
        self.db.add_all([Notification(id=uuid.uuid4(), recipient_id=i, title=title,
                                      message=f"{message}\n\n— {sender.full_name}", type="NOTICE",
                                      link_url=None, is_read=False) for i in ids])
        self.db.commit()
        AuditRepository(self.db).log(action="notice_sent", entity_type="notice", actor_id=sender.id,
                                     metadata={"title": title, "audience": audience, "recipients": len(ids)})
        return {"recipients": len(ids), "audience": audience}

    def sent_notices(self, sender: Employee, limit: int = 50) -> List[dict]:
        if not has_permission(sender, Perm.EMPLOYEES_MANAGE):
            raise HTTPException(status_code=403, detail="Only administrators can see sent notices.")
        logs = (self.db.query(AuditLog).filter(AuditLog.action == "notice_sent", AuditLog.actor_id == sender.id)
                .order_by(AuditLog.created_at.desc()).limit(limit).all())
        out = []
        for log in logs:
            meta = log.extra_metadata or {}
            out.append({"title": meta.get("title"), "audience": meta.get("audience"),
                        "recipients": meta.get("recipients"), "created_at": log.created_at})
        return out
