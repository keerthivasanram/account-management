import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.notification import NotificationResponse
from app.services.auth_service import get_current_employee
from app.repositories.notification_repo import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["Notification Center"])

@router.get("", response_model=List[NotificationResponse])
def get_my_notifications(
    unread_only: bool = False,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Retrieves in-app notifications for the logged-in employee."""
    repo = NotificationRepository(db)
    return repo.list_for_employee(current_employee.id, unread_only=unread_only)

@router.patch("/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notif_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Marks a single notification as read."""
    repo = NotificationRepository(db)
    notif = repo.mark_read(notif_id, current_employee.id)
    return notif

@router.post("/read-all")
def mark_all_notifications_read(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Marks all notifications as read for current employee."""
    repo = NotificationRepository(db)
    repo.mark_all_read(current_employee.id)
    return {"success": True, "message": "All notifications marked as read."}
