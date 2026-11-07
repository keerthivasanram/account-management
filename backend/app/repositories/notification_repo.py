import uuid
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.models import Notification

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_employee(self, employee_id: UUID, unread_only: bool = False, limit: int = 50) -> List[Notification]:
        query = self.db.query(Notification).filter(Notification.recipient_id == employee_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    def create(
        self,
        recipient_id: UUID,
        title: str,
        message: str,
        type: str = "INFO",
        link_url: Optional[str] = None
    ) -> Notification:
        notif = Notification(
            id=uuid.uuid4(),
            recipient_id=recipient_id,
            title=title,
            message=message,
            type=type,
            link_url=link_url,
            is_read=False
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def mark_read(self, notif_id: UUID, employee_id: UUID) -> Optional[Notification]:
        notif = self.db.query(Notification).filter(
            Notification.id == notif_id,
            Notification.recipient_id == employee_id
        ).first()
        if notif:
            notif.is_read = True
            self.db.commit()
            self.db.refresh(notif)
        return notif

    def mark_all_read(self, employee_id: UUID) -> None:
        self.db.query(Notification).filter(
            Notification.recipient_id == employee_id,
            Notification.is_read == False
        ).update({"is_read": True})
        self.db.commit()
