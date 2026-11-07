import uuid
from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.services.auth_service import get_current_employee, require_admin
from app.repositories.attendance_repo import AttendanceRepository
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

    recent = repo.list_employee_attendance(current_employee.id, limit=31)
    present_days = len(recent)
    total_hours = sum(r.total_hours or 0.0 for r in recent)

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
@router.post("/leaves", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
def request_leave(
    payload: LeaveRequestCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Submits a formal leave request for management approval."""
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be earlier than start date.")

    repo = AttendanceRepository(db)
    leave = repo.create_leave_request(
        employee_id=current_employee.id,
        leave_type=payload.leave_type.upper(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason
    )
    return LeaveRequestResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=current_employee.full_name,
        employee_code=current_employee.employee_code,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        created_at=leave.created_at
    )

@router.get("/leaves", response_model=List[LeaveRequestResponse])
def list_leaves(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists leave requests (Admins see all organization requests; Employees see their own)."""
    repo = AttendanceRepository(db)
    emp_filter = None if current_employee.role == "admin" else current_employee.id
    leaves = repo.list_leave_requests(employee_id=emp_filter)
    
    return [
        LeaveRequestResponse(
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
        for l in leaves
    ]

@router.patch("/leaves/{leave_id}/review", response_model=LeaveRequestResponse)
def review_leave(
    leave_id: uuid.UUID,
    payload: LeaveReviewRequest,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Manager/Admin action: approves or rejects an employee's leave request."""
    if payload.status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Status must be either APPROVED or REJECTED.")

    repo = AttendanceRepository(db)
    leave = repo.review_leave_request(leave_id, admin.id, payload.status, payload.remarks)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    return LeaveRequestResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=leave.employee.full_name if leave.employee else "Unknown",
        employee_code=leave.employee.employee_code if leave.employee else "N/A",
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        reviewed_by=leave.reviewed_by,
        reviewer_name=admin.full_name,
        review_remarks=leave.review_remarks,
        created_at=leave.created_at,
        reviewed_at=leave.reviewed_at
    )
