import uuid
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    date: date
    check_in_at: datetime
    check_out_at: Optional[datetime] = None
    total_hours: Optional[float] = None
    status: str
    ip_address: Optional[str] = None
    created_at: datetime

class AttendanceSummary(BaseModel):
    today_status: Optional[str] = None  # NOT_CHECKED_IN, CHECKED_IN, CHECKED_OUT
    today_check_in: Optional[datetime] = None
    today_check_out: Optional[datetime] = None
    today_hours: Optional[float] = None
    current_month_present_days: int = 0
    current_month_total_hours: float = 0.0

class LeaveRequestCreate(BaseModel):
    leave_type: str = Field(..., description="SICK, CASUAL, ANNUAL, EMERGENCY")
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=3, max_length=1000)

class LeaveReviewRequest(BaseModel):
    status: str = Field(..., description="APPROVED, REJECTED")
    remarks: Optional[str] = None

class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    status: str
    reviewed_by: Optional[uuid.UUID] = None
    reviewer_name: Optional[str] = None
    review_remarks: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
