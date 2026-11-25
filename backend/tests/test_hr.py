"""Senior HR / Junior HR: roles, logins (invites), eagle view, org structure, team routing."""
import uuid
from datetime import date

import pytest

from app.models.models import AttendanceRecord, Employee, Notification

from tests.test_rbac_lifecycle import login, org  # noqa: F401  (fixture re-export)


@pytest.fixture
def hr(db_session, org):
    senior = Employee(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), employee_code="EMP-9200", full_name="Meera Senior HR",
                      email="hr.senior@company.internal", role="hr_senior", is_active=True, status="ACTIVE")
    junior = Employee(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), employee_code="EMP-9201", full_name="Arjun Junior HR",
                      email="hr.junior@company.internal", role="hr_junior", is_active=True, status="ACTIVE")
    db_session.add_all([senior, junior])
    db_session.commit()
    return {"senior": senior, "junior": junior}


def invite(client, headers, email, role="employee", **extra):
    return client.post("/api/v1/admin/employees", json={"email": email, "full_name": "New Person", "role": role, **extra}, headers=headers)


# ----------------------------------------------------------------- roles & permissions

def test_hr_roles_and_labels(client, org, hr):
    s = client.get("/api/v1/auth/me", headers=login(client, "hr.senior@company.internal")).json()
    j = client.get("/api/v1/auth/me", headers=login(client, "hr.junior@company.internal")).json()
    assert (s["role_label"], j["role_label"]) == ("Senior HR", "Junior HR")
    for p in ("hr:portal", "employees:manage", "roles:assign", "attendance:read_all", "leave:approve_all"):
        assert p in s["permissions"]
    assert "employees:invite" in j["permissions"] and "employees:manage" not in j["permissions"]
    for p in ("admin:portal", "accounts:manage_all", "security:manage", "settings:manage"):
        assert p not in s["permissions"] and p not in j["permissions"]


def test_hr_cannot_use_instagram_or_security_admin(client, org, hr):
    s = login(client, "hr.senior@company.internal")
    assert client.get("/api/v1/admin/accounts", headers=s).status_code == 403
    assert client.get("/api/v1/security/summary", headers=s).status_code == 403
    assert client.get("/api/v1/super-admin/settings", headers=s).status_code == 403


# ----------------------------------------------------------------- logins

def test_senior_hr_creates_logins_and_routes_on_creation(client, org, hr):
    s = login(client, "hr.senior@company.internal")
    r = invite(client, s, "new.lead@company.internal", role="manager")
    assert r.status_code == 201, r.text
    r = invite(client, s, "new.emp@company.internal", manager_id=str(org["manager"].id))
    assert r.status_code == 201 and r.json()["manager_name"] == "Priya Manager"
    assert invite(client, s, "new.hr@company.internal", role="hr_junior").status_code == 201
    # Senior HR can't create Senior HR or admins (super admin only)
    assert invite(client, s, "x1@company.internal", role="hr_senior").status_code == 403
    assert invite(client, s, "x2@company.internal", role="admin").status_code == 403


def test_junior_hr_invites_employees_only(client, org, hr):
    j = login(client, "hr.junior@company.internal")
    assert invite(client, j, "fresh@company.internal").status_code == 201
    assert invite(client, j, "lead2@company.internal", role="manager").status_code == 403
    # but can't edit, offboard or cancel
    emp = org["employee"]
    assert client.patch(f"/api/v1/admin/employees/{emp.id}", json={"job_title": "x"}, headers=j).status_code == 403
    assert client.post(f"/api/v1/admin/employees/{emp.id}/offboard", json={}, headers=j).status_code == 403


def test_resend_and_cancel_invite(client, org, hr, db_session):
    s = login(client, "hr.senior@company.internal")
    new = invite(client, s, "pending@company.internal").json()
    assert client.post(f"/api/v1/admin/employees/{new['id']}/resend-invite", headers=s).status_code == 200
    j = login(client, "hr.junior@company.internal")
    assert client.delete(f"/api/v1/admin/employees/{new['id']}/invite", headers=j).status_code == 403
    assert client.delete(f"/api/v1/admin/employees/{new['id']}/invite", headers=s).status_code == 204
    assert db_session.query(Employee).filter_by(email="pending@company.internal").first() is None
    # someone who already signed in can't be "cancelled"
    assert client.delete(f"/api/v1/admin/employees/{org['employee'].id}/invite", headers=s).status_code == 409


# ----------------------------------------------------------------- eagle view & org

def test_eagle_view(client, org, hr, db_session):
    today = date.today()
    from datetime import datetime, timezone
    db_session.add(AttendanceRecord(id=uuid.uuid4(), employee_id=org["employee"].id, date=today,
                                    check_in_at=datetime.now(timezone.utc)))
    db_session.commit()
    invite(client, login(client, "hr.senior@company.internal"), "waiting@company.internal")
    for who in ("hr.senior@company.internal", "hr.junior@company.internal", "admin@company.internal"):
        ov = client.get("/api/v1/hr/overview", headers=login(client, who))
        assert ov.status_code == 200, (who, ov.text)
    ov = ov.json()
    assert ov["today"]["present"] >= 1 and ov["today"]["total"] >= 5
    assert any(i["email"] == "waiting@company.internal" for i in ov["waiting"]["invites"])
    assert "Alex Rivera" in [u["full_name"] for u in ov["org"]["unassigned"]]   # employee2 has no team lead
    assert client.get("/api/v1/hr/overview", headers=login(client, "employee1@company.internal")).status_code == 403
    assert client.get("/api/v1/hr/overview", headers=login(client, "manager1@company.internal")).status_code == 403


def test_org_structure(client, org, hr):
    data = client.get("/api/v1/hr/org", headers=login(client, "hr.junior@company.internal")).json()
    team = next(t for t in data["teams"] if t["lead"]["full_name"] == "Priya Manager")
    assert [m["full_name"] for m in team["members"]] == ["Sarah Jenkins"]
    assert "Alex Rivera" in [u["full_name"] for u in data["unassigned"]]


# ----------------------------------------------------------------- team routing

def test_move_people_between_teams(client, org, hr, db_session):
    s = login(client, "hr.senior@company.internal")
    r = client.post("/api/v1/hr/teams/move", json={"employee_ids": [str(org["employee2"].id)], "manager_id": str(org["manager"].id)}, headers=s)
    assert r.status_code == 200 and r.json() == {"moved": 1, "team_lead": "Priya Manager"}
    db_session.refresh(org["employee2"])
    assert org["employee2"].manager_id == org["manager"].id
    kinds = {(n.recipient_id, n.type) for n in db_session.query(Notification).filter_by(type="TEAM_CHANGED")}
    assert (org["employee2"].id, "TEAM_CHANGED") in kinds and (org["manager"].id, "TEAM_CHANGED") in kinds

    # remove from team: the old team lead hears about it
    r = client.post("/api/v1/hr/teams/move", json={"employee_ids": [str(org["employee"].id)], "manager_id": None}, headers=s)
    assert r.status_code == 200
    db_session.refresh(org["employee"])
    assert org["employee"].manager_id is None


def test_move_rules(client, org, hr):
    s = login(client, "hr.senior@company.internal")
    # target must be a Team Lead
    r = client.post("/api/v1/hr/teams/move", json={"employee_ids": [str(org["employee2"].id)], "manager_id": str(org["employee"].id)}, headers=s)
    assert r.status_code == 400
    # HR can't move admins
    r = client.post("/api/v1/hr/teams/move", json={"employee_ids": [str(org["admin"].id)], "manager_id": str(org["manager"].id)}, headers=s)
    assert r.status_code == 403
    # Junior HR can't route teams
    j = login(client, "hr.junior@company.internal")
    r = client.post("/api/v1/hr/teams/move", json={"employee_ids": [str(org["employee2"].id)], "manager_id": str(org["manager"].id)}, headers=j)
    assert r.status_code == 403


def test_hr_decides_leave_for_people_without_team_lead(client, org, hr, db_session):
    from datetime import timedelta
    alex = login(client, "employee2@company.internal")  # no team lead
    lr = client.post("/api/v1/attendance/leaves", json={"leave_type": "SICK", "start_date": (date.today() + timedelta(days=3)).isoformat(),
                                                         "end_date": (date.today() + timedelta(days=3)).isoformat(), "reason": "Checkup"}, headers=alex).json()
    j = login(client, "hr.junior@company.internal")
    ov = client.get("/api/v1/hr/overview", headers=j).json()
    assert any(l["id"] == lr["id"] for l in ov["waiting"]["leaves"])
    r = client.patch(f"/api/v1/attendance/leaves/{lr['id']}/review", json={"status": "APPROVED"}, headers=j)
    assert r.status_code == 200 and r.json()["status"] == "APPROVED"
