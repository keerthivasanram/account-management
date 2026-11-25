"""Attendance summary counts the current calendar month only."""
import uuid
from datetime import date, datetime, timedelta, timezone

from app.models.models import AttendanceRecord

from tests.test_rbac_lifecycle import login, org  # noqa: F401


def shift(db, who, day, hours):
    db.add(AttendanceRecord(id=uuid.uuid4(), employee_id=who.id, date=day,
                            check_in_at=datetime.combine(day, datetime.min.time(), timezone.utc),
                            check_out_at=datetime.combine(day, datetime.min.time(), timezone.utc) + timedelta(hours=hours),
                            total_hours=hours))


def test_summary_is_calendar_month(client, org, db_session):
    first = date.today().replace(day=1)
    last_month = first - timedelta(days=1)
    shift(db_session, org["employee"], last_month, 8)               # previous month: not counted
    shift(db_session, org["employee"], last_month - timedelta(days=3), 8)
    if date.today() != first:
        shift(db_session, org["employee"], first, 7.5)              # this month
    db_session.commit()
    s = client.get("/api/v1/attendance/summary", headers=login(client, "employee1@company.internal")).json()
    expected_days = 0 if date.today() == first else 1
    assert s["current_month_present_days"] == expected_days
    assert s["current_month_total_hours"] == (0 if expected_days == 0 else 7.5)
