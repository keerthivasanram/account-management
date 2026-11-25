"""Attendance rules: day codes, rotational roster, holidays, corrections (maker-checker), late marks."""
import uuid
from datetime import date, datetime, time, timedelta, timezone

import pytest

from app.models.models import AttendanceRecord, Employee, LeaveRequest, Notification
from app.services.attendance_rules_service import Rules, day_code

from tests.test_rbac_lifecycle import login, org  # noqa: F401
from tests.test_hr import hr  # noqa: F401

IST = timezone(timedelta(minutes=330))


class FakeOrg:
    def __init__(self, **over):
        self.v = {"shift_hours": 10, "half_day_hours": 5, "shift_start_time": "", "late_grace_minutes": 15,
                  "absent_without_roster": False, "correction_window_days": 30, "utc_offset_minutes": 330, **over}

    def get(self, k):
        return self.v[k]


def rec(day, start_h, hours=None):
    start = datetime.combine(day, time(start_h), IST).astimezone(timezone.utc)
    return AttendanceRecord(id=uuid.uuid4(), employee_id=uuid.uuid4(), date=day, check_in_at=start,
                            check_out_at=start + timedelta(hours=hours) if hours is not None else None, total_hours=hours)


# ----------------------------------------------------------------- pure rules

def test_day_codes():
    r, today, d = Rules(FakeOrg()), date(2026, 11, 25), date(2026, 11, 20)
    code = lambda **k: day_code(r, k.pop("day", d), today, k.pop("record", None), k.pop("holiday", False),
                                k.pop("leave", False), k.pop("week_off", False), k.pop("joined", None))["code"]
    assert code(record=rec(d, 9, 10)) == "P"
    assert code(record=rec(d, 9, 6)) == "HD"
    assert code(record=rec(d, 9, 3)) == "S"
    assert code(record=rec(d, 9)) == "MO"                      # past day, never clocked out
    assert code(day=today, record=rec(today, 9)) == "IN"       # on shift now
    assert code(holiday=True) == "H" and code(leave=True) == "L" and code(week_off=True) == "WO"
    assert code() == "NR"                                      # unrostered no-show isn't called absent...
    assert day_code(Rules(FakeOrg(absent_without_roster=True)), d, today, None, False, False, False, None)["code"] == "A"
    assert code(day=today + timedelta(days=2)) == "-" and code(joined=date(2026, 11, 22)) == "-"
    assert code(record=rec(d, 9, 10), week_off=True) == "P"    # worked on a week off still counts as worked


def test_late_only_when_start_time_set():
    d = date(2026, 11, 20)
    assert Rules(FakeOrg()).is_late(rec(d, 11).check_in_at) is False
    r = Rules(FakeOrg(shift_start_time="09:30", late_grace_minutes=15))
    assert r.is_late(rec(d, 9).check_in_at) is False
    late = datetime.combine(d, time(9, 46), IST).astimezone(timezone.utc)
    assert r.is_late(late) is True and r.is_late(late - timedelta(minutes=2)) is False


# ----------------------------------------------------------------- settings

def test_settings_validation(client, org):
    founder = login(client, "founder@company.internal")
    put = lambda body: client.put("/api/v1/super-admin/settings", json=body, headers=founder)
    assert put({"shift_start_time": "9:5"}).status_code == 200
    assert put({"shift_start_time": "25:00"}).status_code == 400
    assert put({"shift_start_time": ""}).status_code == 200
    assert put({"half_day_hours": 12}).status_code == 400      # more than the 10-hour shift


# ----------------------------------------------------------------- register & roster

def month():
    return date.today().strftime("%Y-%m")


def test_register_scope(client, org, hr):
    lead = client.get(f"/api/v1/attendance/register?month={month()}", headers=login(client, "manager1@company.internal")).json()
    assert {r["full_name"] for r in lead["rows"]} == {"Priya Manager", "Sarah Jenkins"}
    sarah = client.get(f"/api/v1/attendance/register?month={month()}", headers=login(client, "employee1@company.internal")).json()
    assert [r["full_name"] for r in sarah["rows"]] == ["Sarah Jenkins"]
    hr_view = client.get(f"/api/v1/attendance/register?month={month()}", headers=login(client, "hr.junior@company.internal")).json()
    assert len(hr_view["rows"]) >= 6
    assert client.get("/api/v1/attendance/register?month=nope", headers=login(client, "employee1@company.internal")).status_code == 400


def test_rotational_week_off(client, org, hr):
    day = date.today() + timedelta(days=2)
    body = {"employee_id": str(org["employee"].id), "date": day.isoformat(), "week_off": True}
    assert client.put("/api/v1/attendance/roster", json=body, headers=login(client, "employee1@company.internal")).status_code == 403
    assert client.put("/api/v1/attendance/roster", json=body, headers=login(client, "hr.junior@company.internal")).status_code == 403
    assert client.put("/api/v1/attendance/roster", json=body, headers=login(client, "manager1@company.internal")).status_code == 200
    reg = client.get(f"/api/v1/attendance/register?month={day.strftime('%Y-%m')}", headers=login(client, "hr.senior@company.internal")).json()
    row = next(r for r in reg["rows"] if r["full_name"] == "Sarah Jenkins")
    assert row["days"][reg["days"].index(day.isoformat())]["code"] == "WO"
    # another team's lead can't roster Alex
    alex = {"employee_id": str(org["employee2"].id), "date": day.isoformat(), "week_off": True}
    assert client.put("/api/v1/attendance/roster", json=alex, headers=login(client, "manager1@company.internal")).status_code == 403
    assert client.put("/api/v1/attendance/roster", json=alex, headers=login(client, "hr.senior@company.internal")).status_code == 200


def test_holidays(client, org, hr):
    day = date.today() + timedelta(days=5)
    body = {"date": day.isoformat(), "name": "Founders' Day"}
    assert client.post("/api/v1/attendance/holidays", json=body, headers=login(client, "hr.junior@company.internal")).status_code == 403
    r = client.post("/api/v1/attendance/holidays", json=body, headers=login(client, "hr.senior@company.internal"))
    assert r.status_code == 201
    assert client.post("/api/v1/attendance/holidays", json=body, headers=login(client, "hr.senior@company.internal")).status_code == 409
    assert [h["name"] for h in client.get(f"/api/v1/attendance/holidays?year={day.year}", headers=login(client, "employee1@company.internal")).json()] == ["Founders' Day"]
    assert client.delete(f"/api/v1/attendance/holidays/{r.json()['id']}", headers=login(client, "hr.senior@company.internal")).status_code == 204


# ----------------------------------------------------------------- corrections

def correction(client, headers, emp_id=None, day=None, ci="09:30", co="19:30", reason="Forgot to clock out"):
    body = {"date": (day or date.today() - timedelta(days=1)).isoformat(), "check_in": ci, "check_out": co, "reason": reason}
    if emp_id:
        body["employee_id"] = str(emp_id)
    return client.post("/api/v1/attendance/corrections", json=body, headers=headers)


def test_correction_flow_team_lead_approves(client, org, hr, db_session):
    sarah = login(client, "employee1@company.internal")
    r = correction(client, sarah)
    assert r.status_code == 201, r.text
    c = r.json()
    assert c["hours"] == 10.0 and c["status"] == "PENDING" and c["can_review"] is False
    assert correction(client, sarah).status_code == 409                   # one pending per day
    assert db_session.query(Notification).filter_by(recipient_id=org["manager"].id, type="ATTENDANCE_CORRECTION").count() == 1
    # the employee can't approve their own; Junior HR can't approve at all
    assert client.patch(f"/api/v1/attendance/corrections/{c['id']}/review", json={"status": "APPROVED"}, headers=sarah).status_code == 403
    assert client.patch(f"/api/v1/attendance/corrections/{c['id']}/review", json={"status": "APPROVED"},
                        headers=login(client, "hr.junior@company.internal")).status_code == 403
    lead = login(client, "manager1@company.internal")
    pending = client.get("/api/v1/attendance/corrections?scope=review&status=PENDING", headers=lead).json()
    assert [p["id"] for p in pending] == [c["id"]] and pending[0]["can_review"]
    r = client.patch(f"/api/v1/attendance/corrections/{c['id']}/review", json={"status": "APPROVED"}, headers=lead)
    assert r.status_code == 200 and r.json()["status"] == "APPROVED"
    day = date.today() - timedelta(days=1)
    rec = db_session.query(AttendanceRecord).filter_by(employee_id=org["employee"].id, date=day).one()
    assert rec.total_hours == 10.0
    reg = client.get(f"/api/v1/attendance/register?month={day.strftime('%Y-%m')}", headers=sarah).json()
    assert reg["rows"][0]["days"][reg["days"].index(day.isoformat())]["code"] == "P"


def test_junior_hr_prepares_senior_hr_approves(client, org, hr):
    j = login(client, "hr.junior@company.internal")
    c = correction(client, j, emp_id=org["employee2"].id, ci="10:00", co="15:00", reason="Biometric was down").json()
    assert c["requested_by_name"] == "Arjun Junior HR"
    s = login(client, "hr.senior@company.internal")
    r = client.patch(f"/api/v1/attendance/corrections/{c['id']}/review", json={"status": "REJECTED"}, headers=s)
    assert r.status_code == 400                                          # reason required to reject
    r = client.patch(f"/api/v1/attendance/corrections/{c['id']}/review", json={"status": "APPROVED"}, headers=s)
    assert r.status_code == 200


def test_correction_rules(client, org, hr):
    sarah = login(client, "employee1@company.internal")
    assert correction(client, sarah, day=date.today() + timedelta(days=1)).status_code == 400        # future
    assert correction(client, sarah, day=date.today() - timedelta(days=45)).status_code == 400       # outside window
    assert correction(client, sarah, ci="19:00", co="09:00").status_code == 400                     # out before in
    assert correction(client, sarah, emp_id=org["employee2"].id).status_code == 403                 # someone else's


def test_eagle_view_and_team_inbox_show_pending_corrections(client, org, hr):
    correction(client, login(client, "employee1@company.internal"))
    inbox = client.get("/api/v1/manager/approvals", headers=login(client, "manager1@company.internal")).json()
    assert len(inbox["corrections"]) == 1
    ov = client.get("/api/v1/hr/overview", headers=login(client, "hr.senior@company.internal")).json()
    assert len(ov["waiting"]["corrections"]) == 1
