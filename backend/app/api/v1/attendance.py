from app.core.permissions import is_admin
import uuid
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.services.auth_service import get_current_employee, require_admin
from app.repositories.attendance_repo import AttendanceRepository
from app.services.leave_service import LeaveService
from app.schemas.attendance import (
    AttendanceRecordResponse, AttendanceSummary,
    LeaveRequestCreate, LeaveReviewRequest, LeaveRequestResponse
)

router = APIRouter(prefix="/attendance", tags=["Attendance & Leave Management"])

@router.get("/summary", response_model=AttendanceSummary)
def get_attendance_summary(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Returns today's shift status and current month's attendance hours."""
    repo = AttendanceRepository(db)
    today_rec = repo.get_today_record(current_employee.id)

    status_str = "NOT_CHECKED_IN"
    check_in_time = None
    check_out_time = None
    hours = None

    if today_rec:
        check_in_time = today_rec.check_in_at
        check_out_time = today_rec.check_out_at
        hours = today_rec.total_hours
        status_str = "CHECKED_OUT" if today_rec.check_out_at else "CHECKED_IN"

    # Calendar month to date (previously this counted the last 31 shifts, whatever month they were in)
    from datetime import date as _date
    month = repo.list_month(current_employee.id, _date.today().replace(day=1))
    present_days = len(month)
    total_hours = sum(r.total_hours or 0.0 for r in month)

    return AttendanceSummary(
        today_status=status_str,
        today_check_in=check_in_time,
        today_check_out=check_out_time,
        today_hours=hours,
        current_month_present_days=present_days,
        current_month_total_hours=round(total_hours, 1)
    )

@router.post("/check-in", response_model=AttendanceRecordResponse)
def check_in(
    request: Request,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Server-timestamped check-in (prevents local client time tampering)."""
    repo = AttendanceRepository(db)
    client_ip = request.client.host if request.client else "unknown"
    rec = repo.check_in(current_employee.id, ip_address=client_ip)
    return AttendanceRecordResponse(
        id=rec.id,
        employee_id=rec.employee_id,
        employee_name=current_employee.full_name,
        employee_code=current_employee.employee_code,
        date=rec.date,
        check_in_at=rec.check_in_at,
        check_out_at=rec.check_out_at,
        total_hours=rec.total_hours,
        status=rec.status,
        ip_address=rec.ip_address,
        created_at=rec.created_at
    )

@router.post("/check-out", response_model=AttendanceRecordResponse)
def check_out(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Closes today's work shift and computes total hours."""
    repo = AttendanceRepository(db)
    rec = repo.check_out(current_employee.id)
    if not rec:
        raise HTTPException(status_code=400, detail="Cannot check out: No active check-in found for today.")
    return AttendanceRecordResponse(
        id=rec.id,
        employee_id=rec.employee_id,
        employee_name=current_employee.full_name,
        employee_code=current_employee.employee_code,
        date=rec.date,
        check_in_at=rec.check_in_at,
        check_out_at=rec.check_out_at,
        total_hours=rec.total_hours,
        status=rec.status,
        ip_address=rec.ip_address,
        created_at=rec.created_at
    )

@router.get("/history", response_model=List[AttendanceRecordResponse])
def get_attendance_history(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists employee's recent attendance entries."""
    repo = AttendanceRepository(db)
    records = repo.list_employee_attendance(current_employee.id, limit=30)
    return [
        AttendanceRecordResponse(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=current_employee.full_name,
            employee_code=current_employee.employee_code,
            date=r.date,
            check_in_at=r.check_in_at,
            check_out_at=r.check_out_at,
            total_hours=r.total_hours,
            status=r.status,
            ip_address=r.ip_address,
            created_at=r.created_at
        )
        for r in records
    ]

# Leave Management
def _leave_response(l) -> LeaveRequestResponse:
    return LeaveRequestResponse(
        id=l.id,
        employee_id=l.employee_id,
        employee_name=l.employee.full_name if l.employee else "Unknown",
        employee_code=l.employee.employee_code if l.employee else "N/A",
        leave_type=l.leave_type,
        start_date=l.start_date,
        end_date=l.end_date,
        reason=l.reason,
        status=l.status,
        reviewed_by=l.reviewed_by,
        reviewer_name=l.reviewer.full_name if l.reviewer else None,
        review_remarks=l.review_remarks,
        created_at=l.created_at,
        reviewed_at=l.reviewed_at
    )

@router.post("/leaves", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
def request_leave(
    payload: LeaveRequestCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Submits a leave request. Checked against balance and overlaps; routed to the employee's manager."""
    leave = LeaveService(db).request(current_employee, payload.leave_type, payload.start_date,
                                     payload.end_date, payload.reason)
    return _leave_response(leave)

@router.get("/leaves", response_model=List[LeaveRequestResponse])
def list_leaves(
    scope: str = Query("auto", pattern="^(auto|mine|team|team_and_mine|all)$"),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Leave requests visible to the caller: own, team (managers) or company-wide (admins)."""
    return [_leave_response(l) for l in LeaveService(db).list(current_employee, scope, status_filter)]

@router.get("/leave-balance")
def get_leave_balance(
    year: Optional[int] = Query(None, ge=2000, le=2100),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Allowance, used, pending and remaining days per leave type for the calendar year."""
    return LeaveService(db).balance(current_employee, year)

@router.patch("/leaves/{leave_id}/review", response_model=LeaveRequestResponse)
def review_leave(
    leave_id: uuid.UUID,
    payload: LeaveReviewRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Approve / reject. Managers may review their team; admins anyone; never your own."""
    leave = LeaveService(db).review(leave_id, current_employee, payload.status, payload.remarks)
    return _leave_response(leave)

@router.post("/leaves/{leave_id}/cancel", response_model=LeaveRequestResponse)
def cancel_leave(
    leave_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Employee withdraws a pending (or future approved) request."""
    return _leave_response(LeaveService(db).cancel(leave_id, current_employee))
