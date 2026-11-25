from typing import Optional

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Perm, require_permission
from app.models.models import Employee
from app.services.payroll_service import PayrollService

router = APIRouter(prefix="/payroll", tags=["Month close"])


class LockRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=500)
    acknowledge_warnings: bool = False


class ReopenRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


@router.get("/periods")
def periods(viewer: Employee = Depends(require_permission(Perm.ATTENDANCE_READ_ALL)), db: Session = Depends(get_db)):
    """Months that have been closed (or reopened)."""
    return PayrollService(db).periods()


@router.get("/{month}/preview")
def preview(month: str, viewer: Employee = Depends(require_permission(Perm.ATTENDANCE_READ_ALL)), db: Session = Depends(get_db)):
    """Per-person payroll inputs for the month, plus anything to sort out before closing it."""
    return PayrollService(db).preview(viewer, month)


@router.post("/{month}/lock")
def lock(month: str, payload: LockRequest, actor: Employee = Depends(require_permission(Perm.ATTENDANCE_MANAGE)),
         db: Session = Depends(get_db)):
    """Close the month: freeze its numbers for export. Senior HR / admins."""
    return PayrollService(db).lock(actor, month, payload.note, payload.acknowledge_warnings)


@router.post("/{month}/reopen")
def reopen(month: str, payload: ReopenRequest, actor: Employee = Depends(require_permission(Perm.ATTENDANCE_MANAGE)),
           db: Session = Depends(get_db)):
    return PayrollService(db).reopen(actor, month, payload.reason)


@router.get("/{month}/export")
def export(month: str, actor: Employee = Depends(require_permission(Perm.ATTENDANCE_MANAGE)), db: Session = Depends(get_db)):
    """CSV for the accountant / payroll software. Only for closed months."""
    content = PayrollService(db).export_csv(actor, month)
    return Response(content=content, media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="klarves-payroll-{month}.csv"'})
