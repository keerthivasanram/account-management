import uuid
from typing import List, Optional
from datetime import datetime, date, timezone
from sqlalchemy.orm import Session, joinedload
from app.models.models import AttendanceRecord, LeaveRequest, Employee

class AttendanceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_today_record(self, employee_id: uuid.UUID) -> Optional[AttendanceRecord]:
        today = date.today()
        return (
            self.db.query(AttendanceRecord)
            .filter(AttendanceRecord.employee_id == employee_id, AttendanceRecord.date == today)
            .first()
        )

    def check_in(self, employee_id: uuid.UUID, ip_address: Optional[str] = None) -> AttendanceRecord:
        existing = self.get_today_record(employee_id)
        if existing:
            return existing

        now = datetime.now(timezone.utc)
        record = AttendanceRecord(
            id=uuid.uuid4(),
            employee_id=employee_id,
            date=date.today(),
            check_in_at=now,
            status="PRESENT",
            ip_address=ip_address
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def check_out(self, employee_id: uuid.UUID) -> Optional[AttendanceRecord]:
        record = self.get_today_record(employee_id)
        if not record:
            return None

        now = datetime.now(timezone.utc)
        record.check_out_at = now
        in_time = record.check_in_at.replace(tzinfo=None) if record.check_in_at.tzinfo else record.check_in_at
        out_time = record.check_out_at.replace(tzinfo=None) if record.check_out_at.tzinfo else record.check_out_at
        elapsed_seconds = max((out_time - in_time).total_seconds(), 0)
        record.total_hours = round(elapsed_seconds / 3600.0, 2)
        if record.total_hours < 4.0:
            record.status = "HALF_DAY"
        self.db.commit()
        self.db.refresh(record)
        return record

    def list_employee_attendance(self, employee_id: uuid.UUID, limit: int = 30) -> List[AttendanceRecord]:
        return (
            self.db.query(AttendanceRecord)
            .filter(AttendanceRecord.employee_id == employee_id)
            .order_by(AttendanceRecord.date.desc())
            .limit(limit)
            .all()
        )

    def create_leave_request(self, employee_id: uuid.UUID, leave_type: str, start_date: date, end_date: date, reason: str) -> LeaveRequest:
        req = LeaveRequest(
            id=uuid.uuid4(),
            employee_id=employee_id,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            status="PENDING"
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)
        return req

    def list_leave_requests(self, employee_id: Optional[uuid.UUID] = None) -> List[LeaveRequest]:
        query = self.db.query(LeaveRequest).options(
            joinedload(LeaveRequest.employee),
            joinedload(LeaveRequest.reviewer)
        )
        if employee_id:
            query = query.filter(LeaveRequest.employee_id == employee_id)
        return query.order_by(LeaveRequest.created_at.desc()).all()

    def review_leave_request(self, request_id: uuid.UUID, reviewer_id: uuid.UUID, status: str, remarks: Optional[str] = None) -> Optional[LeaveRequest]:
        req = self.db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
        if not req:
            return None
        req.status = status
        req.reviewed_by = reviewer_id
        req.review_remarks = remarks
        req.reviewed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(req)
        return req
