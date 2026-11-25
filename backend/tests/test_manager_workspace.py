"""Phase 3: manager workspace, scoped leave approvals, leave balance, task review routing."""
import uuid
from datetime import date, timedelta

import pytest

from app.models.models import Employee, Notification, Project, Task

from tests.test_rbac_lifecycle import login, give_account, org  # noqa: F401  (fixture re-export)


def future(days):
    return (date.today() + timedelta(days=days)).isoformat()


@pytest.fixture
def outsider(db_session, org):
    """A second manager with their own report; must not see/approve Sarah's items."""
    other_mgr = Employee(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), employee_code="EMP-9100",
                         full_name="Other Manager", email="manager2@company.internal", role="manager",
                         is_active=True, status="ACTIVE")
    db_session.add(other_mgr)
    db_session.flush()
    org["employee2"].manager_id = other_mgr.id
    db_session.commit()
    return other_mgr


# ----------------------------------------------------------------- leave

def test_leave_request_routes_to_manager_and_respects_balance(client, org, db_session):
    emp = login(client, "employee1@company.internal")
    r = client.post("/api/v1/attendance/leaves", json={
        "leave_type": "CASUAL", "start_date": future(10), "end_date": future(12), "reason": "Family function"}, headers=emp)
    assert r.status_code == 201, r.text
    notes = db_session.query(Notification).filter_by(recipient_id=org["manager"].id, type="LEAVE_REQUESTED").all()
    assert len(notes) == 1

    bal = {b["leave_type"]: b for b in client.get("/api/v1/attendance/leave-balance", headers=emp).json()["balances"]}
    assert bal["CASUAL"]["pending"] == 3 and bal["CASUAL"]["remaining"] == bal["CASUAL"]["allowance"]

    # default CASUAL allowance is 8: 3 pending + 6 more would exceed it
    over = client.post("/api/v1/attendance/leaves", json={
        "leave_type": "CASUAL", "start_date": future(30), "end_date": future(35), "reason": "Trip"}, headers=emp)
    assert over.status_code == 400 and "Insufficient" in over.json()["detail"]


def test_overlapping_leave_rejected(client, org):
    emp = login(client, "employee1@company.internal")
    client.post("/api/v1/attendance/leaves", json={"leave_type": "SICK", "start_date": future(5), "end_date": future(6), "reason": "Flu"}, headers=emp)
    r = client.post("/api/v1/attendance/leaves", json={"leave_type": "CASUAL", "start_date": future(6), "end_date": future(7), "reason": "x x x"}, headers=emp)
    assert r.status_code == 409


def test_unknown_leave_type_rejected(client, org):
    emp = login(client, "employee1@company.internal")
    r = client.post("/api/v1/attendance/leaves", json={"leave_type": "VACATION", "start_date": future(5), "end_date": future(6), "reason": "abc"}, headers=emp)
    assert r.status_code == 400


def test_manager_approves_team_leave_but_not_others(client, org, outsider):
    sarah = login(client, "employee1@company.internal")
    alex = login(client, "employee2@company.internal")
    s_leave = client.post("/api/v1/attendance/leaves", json={"leave_type": "ANNUAL", "start_date": future(20), "end_date": future(21), "reason": "Rest"}, headers=sarah).json()
    a_leave = client.post("/api/v1/attendance/leaves", json={"leave_type": "ANNUAL", "start_date": future(20), "end_date": future(21), "reason": "Rest"}, headers=alex).json()

    mgr = login(client, "manager1@company.internal")
    assert client.patch(f"/api/v1/attendance/leaves/{a_leave['id']}/review", json={"status": "APPROVED"}, headers=mgr).status_code == 403
    r = client.patch(f"/api/v1/attendance/leaves/{s_leave['id']}/review", json={"status": "APPROVED", "remarks": "Enjoy"}, headers=mgr)
    assert r.status_code == 200 and r.json()["status"] == "APPROVED"
    # cannot be decided twice
    assert client.patch(f"/api/v1/attendance/leaves/{s_leave['id']}/review", json={"status": "REJECTED"}, headers=mgr).status_code == 409

    # manager's list shows only their team (+ own)
    names = {l["employee_name"] for l in client.get("/api/v1/attendance/leaves", headers=mgr).json()}
    assert "Sarah Jenkins" in names and "Alex Rivera" not in names


def test_employee_cannot_review_or_see_all_leave(client, org):
    emp = login(client, "employee1@company.internal")
    assert client.get("/api/v1/attendance/leaves?scope=all", headers=emp).status_code == 403
    mine = client.post("/api/v1/attendance/leaves", json={"leave_type": "SICK", "start_date": future(3), "end_date": future(3), "reason": "Dentist"}, headers=emp).json()
    assert client.patch(f"/api/v1/attendance/leaves/{mine['id']}/review", json={"status": "APPROVED"}, headers=emp).status_code == 403


def test_employee_can_cancel_pending_leave(client, org):
    emp = login(client, "employee1@company.internal")
    lr = client.post("/api/v1/attendance/leaves", json={"leave_type": "SICK", "start_date": future(3), "end_date": future(3), "reason": "Dentist"}, headers=emp).json()
    r = client.post(f"/api/v1/attendance/leaves/{lr['id']}/cancel", headers=emp)
    assert r.status_code == 200 and r.json()["status"] == "CANCELLED"
    other = login(client, "employee2@company.internal")
    assert client.post(f"/api/v1/attendance/leaves/{lr['id']}/cancel", headers=other).status_code == 403


# ----------------------------------------------------------------- tasks

def _task_in_review(client, db_session, org, assignee):
    proj = Project(id=uuid.uuid4(), name="Ops", owner_id=org["admin"].id)
    db_session.add(proj)
    db_session.flush()
    t = Task(id=uuid.uuid4(), project_id=proj.id, title=f"Deliverable for {assignee.full_name}",
             assigned_to=assignee.id, created_by=org["admin"].id, status="IN_REVIEW")
    db_session.add(t)
    db_session.commit()
    return t


def test_manager_can_review_reports_tasks_only(client, org, outsider, db_session):
    t_sarah = _task_in_review(client, db_session, org, org["employee"])
    t_alex = _task_in_review(client, db_session, org, org["employee2"])
    mgr = login(client, "manager1@company.internal")
    assert client.post(f"/api/v1/tasks/{t_alex.id}/approve", json={}, headers=mgr).status_code == 403
    assert client.post(f"/api/v1/tasks/{t_sarah.id}/approve", json={}, headers=mgr).status_code == 200


# ----------------------------------------------------------------- manager endpoints

def test_manager_overview_and_inbox(client, org, outsider, db_session):
    give_account(db_session, org["employee"], 2)  # under the 50 minimum
    _task_in_review(client, db_session, org, org["employee"])
    _task_in_review(client, db_session, org, org["employee2"])
    sarah = login(client, "employee1@company.internal")
    client.post("/api/v1/attendance/check-in", headers=sarah)
    client.post("/api/v1/attendance/leaves", json={"leave_type": "SICK", "start_date": future(2), "end_date": future(2), "reason": "Checkup"}, headers=sarah)

    mgr = login(client, "manager1@company.internal")
    ov = client.get("/api/v1/manager/overview", headers=mgr).json()
    assert ov["team_size"] == 1
    member = ov["members"][0]
    assert member["full_name"] == "Sarah Jenkins"
    assert member["today"] == "PRESENT"
    assert member["assigned_accounts"] == 2 and member["workload"] == "UNDER"
    assert ov["pending_task_reviews"] == 1 and ov["pending_leave_requests"] == 1

    inbox = client.get("/api/v1/manager/approvals", headers=mgr).json()
    assert [t["assignee_name"] for t in inbox["tasks"]] == ["Sarah Jenkins"]

    # admin inbox sees both teams
    admin_inbox = client.get("/api/v1/manager/approvals", headers=login(client, "admin@company.internal")).json()
    assert len(admin_inbox["tasks"]) == 2


def test_department_head_counts_as_manager(client, org, db_session):
    from app.models.models import Department
    dept = Department(id=uuid.uuid4(), name="Video", code="VID", head_employee_id=org["manager"].id)
    db_session.add(dept)
    db_session.flush()
    org["employee2"].department_id = dept.id
    db_session.commit()
    ov = client.get("/api/v1/manager/overview", headers=login(client, "manager1@company.internal")).json()
    assert {m["full_name"] for m in ov["members"]} == {"Sarah Jenkins", "Alex Rivera"}


def test_employees_cannot_open_manager_workspace(client, org):
    assert client.get("/api/v1/manager/overview", headers=login(client, "employee1@company.internal")).status_code == 403


# ----------------------------------------------------------------- Phase 4: admin overview

def test_admin_overview_aggregates(client, org, db_session):
    from datetime import datetime, timedelta, timezone
    from app.models.models import AccountConnection, InstagramAccount
    give_account(db_session, org["employee"], 2)
    acc = db_session.query(InstagramAccount).first()
    db_session.add(AccountConnection(instagram_account_id=acc.id, connection_status="CONNECTED",
                                     token_expires_at=datetime.now(timezone.utc) + timedelta(days=3)))
    db_session.commit()
    client.post("/api/v1/attendance/check-in", headers=login(client, "employee1@company.internal"))

    ov = client.get("/api/v1/admin/overview", headers=login(client, "admin@company.internal"))
    assert ov.status_code == 200, ov.text
    ov = ov.json()
    assert ov["people"]["active"] >= 4
    assert ov["attendance_today"]["checked_in"] == 1
    assert len(ov["attendance_today"]["trend"]) == 14
    assert ov["accounts"]["total"] == 2 and ov["accounts"]["unassigned"] == 0
    assert ov["meta_tokens"]["expiring_count"] == 1
    assert ov["workload"]["under_count"] >= 1
    assert sum(b["count"] for b in ov["workload"]["distribution"]) == ov["workload"]["staff"]


def test_admin_overview_forbidden_for_manager(client, org):
    assert client.get("/api/v1/admin/overview", headers=login(client, "manager1@company.internal")).status_code == 403
