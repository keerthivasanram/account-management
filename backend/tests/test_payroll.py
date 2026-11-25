"""Month close: payroll inputs, pre-close checks, lock (freezes the month), export, reopen."""
import uuid
from datetime import date, datetime, time, timedelta, timezone

import pytest

from app.models.models import AttendanceRecord, LeaveRequest, Notification, WeekOff

from tests.test_rbac_lifecycle import login, org  # noqa: F401
from tests.test_hr import hr  # noqa: F401

IST = timezone(timedelta(minutes=330))


def last_month():
    first_this = date.today().replace(day=1)
    last = first_this - timedelta(days=1)
    return last.replace(day=1), last


def worked(db, emp, day, hours):
    start = datetime.combine(day, time(9), IST).astimezone(timezone.utc)
    db.add(AttendanceRecord(id=uuid.uuid4(), employee_id=emp.id, date=day, check_in_at=start,
                            check_out_at=start + timedelta(hours=hours), total_hours=hours))


@pytest.fixture
def month_data(db_session, org, hr):
    first, last = last_month()
    sarah = org["employee"]
    sarah.joined_on = first - timedelta(days=400)
    worked(db_session, sarah, first, 10)                    # P
    worked(db_session, sarah, first + timedelta(days=1), 6)   # HD
    worked(db_session, sarah, first + timedelta(days=2), 3)   # S
    db_session.add(WeekOff(id=uuid.uuid4(), employee_id=sarah.id, date=first + timedelta(days=3)))
    db_session.add(LeaveRequest(id=uuid.uuid4(), employee_id=sarah.id, leave_type="CASUAL", status="APPROVED",
                                start_date=first + timedelta(days=4), end_date=first + timedelta(days=5), reason="Family"))
    db_session.commit()
    return first.strftime("%Y-%m"), first, last


def sarah_row(preview):
    return next(r for r in preview["rows"] if r["full_name"] == "Sarah Jenkins")


def test_preview_numbers(client, org, hr, month_data):
    month, first, last = month_data
    p = client.get(f"/api/v1/payroll/{month}/preview", headers=login(client, "hr.junior@company.internal")).json()
    r = sarah_row(p)
    days = (last - first).days + 1
    assert (r["present_days"], r["half_days"], r["short_days"], r["week_offs"]) == (1, 1, 1, 1)
    assert (r["paid_leave_days"], r["leave_casual"]) == (2, 2)
    assert r["lop_days"] == 1.0                              # ½ half day + ½ short day
    assert r["unaccounted_days"] == days - 6                 # every other day: no record, not deducted
    assert r["days_employed"] == days and r["payable_days"] == days - 1.0
    assert r["worked_hours"] == 19.0
    assert p["status"] == "OPEN" and p["can_lock"] is False  # Junior HR can't close
    assert client.get(f"/api/v1/payroll/{month}/preview", headers=login(client, "employee1@company.internal")).status_code == 403


def test_cannot_close_current_month(client, org, hr):
    s = login(client, "hr.senior@company.internal")
    month = date.today().strftime("%Y-%m")
    p = client.get(f"/api/v1/payroll/{month}/preview", headers=s).json()
    assert p["can_lock"] is False and p["issues"][0]["kind"] == "month_open"
    assert client.post(f"/api/v1/payroll/{month}/lock", json={"acknowledge_warnings": True}, headers=s).status_code == 409


def test_lock_needs_ack_for_open_items_then_freezes_month(client, org, hr, month_data, db_session):
    month, first, last = month_data
    founder = login(client, "founder@company.internal")
    client.put("/api/v1/super-admin/settings", json={"correction_window_days": 365}, headers=founder)
    sarah = login(client, "employee1@company.internal")
    r = client.post("/api/v1/attendance/corrections", json={"date": (first + timedelta(days=8)).isoformat(),
                                                            "check_in": "09:00", "check_out": "19:00", "reason": "Forgot"}, headers=sarah)
    assert r.status_code == 201, r.text
    s = login(client, "hr.senior@company.internal")
    assert client.post(f"/api/v1/payroll/{month}/lock", json={}, headers=login(client, "hr.junior@company.internal")).status_code == 403
    r = client.post(f"/api/v1/payroll/{month}/lock", json={"note": "Nov close"}, headers=s)
    assert r.status_code == 409 and "open items" in r.json()["detail"]
    r = client.post(f"/api/v1/payroll/{month}/lock", json={"note": "Nov close", "acknowledge_warnings": True}, headers=s)
    assert r.status_code == 200 and r.json()["status"] == "LOCKED"

    # month is frozen
    day = (first + timedelta(days=9)).isoformat()
    assert client.put("/api/v1/attendance/roster", json={"employee_id": str(org["employee"].id), "date": day, "week_off": True},
                      headers=s).status_code == 409
    assert client.post("/api/v1/attendance/corrections", json={"date": day, "check_in": "09:00", "check_out": "19:00", "reason": "x x"},
                       headers=sarah).status_code == 409
    assert client.post("/api/v1/attendance/holidays", json={"date": day, "name": "Late add"}, headers=s).status_code == 409
    assert client.post("/api/v1/attendance/leaves", json={"leave_type": "SICK", "start_date": day, "end_date": day, "reason": "Back-dated"},
                       headers=sarah).status_code == 409
    # the snapshot doesn't move even if data changes underneath
    worked(db_session, org["employee"], first + timedelta(days=10), 10)
    db_session.commit()
    p = client.get(f"/api/v1/payroll/{month}/preview", headers=s).json()
    assert sarah_row(p)["present_days"] == 1 and p["locked_by"] == "Meera Senior HR"


def test_export_csv(client, org, hr, month_data):
    month, _, _ = month_data
    s = login(client, "hr.senior@company.internal")
    assert client.get(f"/api/v1/payroll/{month}/export", headers=s).status_code == 409       # not closed yet
    client.post(f"/api/v1/payroll/{month}/lock", json={"acknowledge_warnings": True}, headers=s)
    assert client.get(f"/api/v1/payroll/{month}/export", headers=login(client, "hr.junior@company.internal")).status_code == 403
    r = client.get(f"/api/v1/payroll/{month}/export", headers=s)
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    lines = r.text.lstrip("﻿").splitlines()
    assert lines[0].startswith("Employee code,Name,Department,Team lead,Days employed")
    assert any(",Sarah Jenkins," in l for l in lines[1:])


def test_reopen(client, org, hr, month_data, db_session):
    month, first, _ = month_data
    s = login(client, "hr.senior@company.internal")
    client.post(f"/api/v1/payroll/{month}/lock", json={"acknowledge_warnings": True}, headers=s)
    assert client.post(f"/api/v1/payroll/{month}/reopen", json={"reason": "x"}, headers=s).status_code == 422
    r = client.post(f"/api/v1/payroll/{month}/reopen", json={"reason": "Missed a holiday"}, headers=s)
    assert r.status_code == 200 and r.json()["status"] == "REOPENED"
    assert db_session.query(Notification).filter_by(recipient_id=org["founder"].id).filter(Notification.title.like("%reopened%")).count() == 1
    day = (first + timedelta(days=12)).isoformat()
    assert client.post("/api/v1/attendance/holidays", json={"date": day, "name": "Missed holiday"}, headers=s).status_code == 201
    assert [p["status"] for p in client.get("/api/v1/payroll/periods", headers=s).json()] == ["REOPENED"]
