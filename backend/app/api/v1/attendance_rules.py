import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Employee
from app.services.attendance_rules_service import AttendanceRulesService
from app.services.auth_service import get_current_employee

router = APIRouter(prefix="/attendance", tags=["Attendance rules"])


class RosterChange(BaseModel):
    employee_id: uuid.UUID
    date: date
    week_off: bool


class HolidayCreate(BaseModel):
    date: date
    name: str = Field(..., min_length=1, max_length=120)


class CorrectionCreate(BaseModel):
    employee_id: Optional[uuid.UUID] = None   # default: yourself
    date: date
    check_in: str = Field(..., description="HH:MM, company time")
    check_out: str = Field(..., description="HH:MM, company time")
    reason: str = Field(..., min_length=3, max_length=1000)


class CorrectionReview(BaseModel):
    status: str  # APPROVED | REJECTED
    remarks: Optional[str] = None


@router.get("/register")
def register(month: str = Query(..., description="YYYY-MM"), department_id: Optional[uuid.UUID] = None,
             me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Monthly register: one row per person you may see, one code per day, with totals."""
    return AttendanceRulesService(db).register(me, month, department_id)


@router.put("/roster")
def set_week_off(payload: RosterChange, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Plan (or clear) a rotational week off for someone on your team (Senior HR: anyone)."""
    return AttendanceRulesService(db).set_week_off(me, payload.employee_id, payload.date, payload.week_off)


@router.get("/holidays")
def list_holidays(year: int = Query(..., ge=2000, le=2100), me: Employee = Depends(get_current_employee),
                  db: Session = Depends(get_db)):
    return AttendanceRulesService(db).holidays(year)


@router.post("/holidays", status_code=201)
def add_holiday(payload: HolidayCreate, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return AttendanceRulesService(db).add_holiday(me, payload.date, payload.name)


@router.delete("/holidays/{holiday_id}", status_code=204)
def remove_holiday(holiday_id: uuid.UUID, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    AttendanceRulesService(db).remove_holiday(me, holiday_id)
    return Response(status_code=204)


@router.get("/corrections")
def list_corrections(scope: str = Query("mine", description="mine | review"), status: Optional[str] = None,
                     me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return AttendanceRulesService(db).corrections(me, scope, status)


@router.post("/corrections", status_code=201)
def request_correction(payload: CorrectionCreate, me: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Ask to fix a day (forgot to clock in/out). The team lead or Senior HR approves it."""
    return AttendanceRulesService(db).request_correction(me, payload.employee_id or me.id, payload.date,
                                                         payload.check_in, payload.check_out, payload.reason)


@router.patch("/corrections/{correction_id}/review")
def review_correction(correction_id: uuid.UUID, payload: CorrectionReview, me: Employee = Depends(get_current_employee),
                      db: Session = Depends(get_db)):
    return AttendanceRulesService(db).review(me, correction_id, payload.status, payload.remarks)
