"""A month closed for payroll can't change until Senior HR reopens it."""
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.models import PayrollPeriod


def is_month_locked(db: Session, day: date) -> bool:
    row = db.query(PayrollPeriod).filter(PayrollPeriod.month == day.strftime("%Y-%m")).first()
    return bool(row and row.status == "LOCKED")


def guard_unlocked(db: Session, *days: date) -> None:
    """Refuse changes that touch a closed month."""
    for d in {x.strftime("%Y-%m") for x in days if x}:
        row = db.query(PayrollPeriod).filter(PayrollPeriod.month == d).first()
        if row and row.status == "LOCKED":
            raise HTTPException(status_code=409, detail=f"{d} is closed for payroll. Ask Senior HR to reopen it first.")


def guard_range_unlocked(db: Session, start: date, end: date) -> None:
    months, d = [], start.replace(day=1)
    while d <= end:
        months.append(d)
        d = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    guard_unlocked(db, *months)
