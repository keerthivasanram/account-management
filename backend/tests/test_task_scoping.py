"""Tasks are scoped by role: employees see their own, managers their team's, admins everything.

Only managers/admins create tasks; managers only for their team. Status changes follow the
workflow (TODO -> IN_PROGRESS -> IN_REVIEW -> APPROVED / CHANGES_REQUESTED -> IN_PROGRESS ...).
"""
import uuid

import pytest

from app.models.models import Project, Task

from tests.test_rbac_lifecycle import login, org  # noqa: F401  (fixture re-export)
from tests.test_manager_workspace import outsider  # noqa: F401


@pytest.fixture
def tasks(db_session, org, outsider):
    proj = Project(id=uuid.uuid4(), name="Ops", owner_id=org["admin"].id)
    db_session.add(proj)
    db_session.flush()
    mk = lambda who, status="TODO": Task(id=uuid.uuid4(), project_id=proj.id, title=f"Task for {who.full_name}",
                                         assigned_to=who.id, created_by=org["admin"].id, status=status)
    t = {"sarah": mk(org["employee"]), "alex": mk(org["employee2"]), "admin": mk(org["admin"])}
    db_session.add_all(t.values())
    db_session.commit()
    return {**t, "project": proj}


def titles(client, headers, query=""):
    r = client.get(f"/api/v1/tasks{query}", headers=headers)
    assert r.status_code == 200, r.text
    return {t["title"] for t in r.json()}


def test_employee_sees_only_own_tasks(client, org, tasks):
    sarah = login(client, "employee1@company.internal")
    assert titles(client, sarah) == {"Task for Sarah Jenkins"}
    # asking for someone else's tasks returns nothing rather than leaking them
    assert titles(client, sarah, f"?assigned_to={org['employee2'].id}") == set()
    assert client.get(f"/api/v1/tasks/{tasks['alex'].id}", headers=sarah).status_code == 404
    assert client.get(f"/api/v1/tasks/{tasks['sarah'].id}", headers=sarah).status_code == 200


def test_manager_sees_own_team_only(client, org, tasks):
    mgr = login(client, "manager1@company.internal")
    assert titles(client, mgr) == {"Task for Sarah Jenkins"}
    assert client.get(f"/api/v1/tasks/{tasks['alex'].id}", headers=mgr).status_code == 404


def test_admin_sees_all(client, org, tasks):
    admin = login(client, "admin@company.internal")
    assert {"Task for Sarah Jenkins", "Task for Alex Rivera"} <= titles(client, admin)


def test_employee_cannot_create_tasks(client, org, tasks):
    sarah = login(client, "employee1@company.internal")
    r = client.post("/api/v1/tasks", json={"project_id": str(tasks["project"].id), "title": "Sneaky",
                                           "assigned_to": str(org["admin"].id)}, headers=sarah)
    assert r.status_code == 403


def test_manager_assigns_only_within_team(client, org, tasks):
    mgr = login(client, "manager1@company.internal")
    body = lambda who: {"project_id": str(tasks["project"].id), "title": "Edit reel", "assigned_to": str(who.id)}
    assert client.post("/api/v1/tasks", json=body(org["employee2"]), headers=mgr).status_code == 403
    r = client.post("/api/v1/tasks", json=body(org["employee"]), headers=mgr)
    assert r.status_code == 201, r.text


def test_only_assignee_starts_and_workflow_order_is_enforced(client, org, tasks):
    sarah = login(client, "employee1@company.internal")
    alex = login(client, "employee2@company.internal")
    tid = tasks["sarah"].id
    assert client.post(f"/api/v1/tasks/{tid}/start", headers=alex).status_code == 403
    # cannot submit before starting
    assert client.post(f"/api/v1/tasks/{tid}/submit", json={}, headers=sarah).status_code == 409
    assert client.post(f"/api/v1/tasks/{tid}/start", headers=sarah).json()["status"] == "IN_PROGRESS"
    assert client.post(f"/api/v1/tasks/{tid}/start", headers=sarah).status_code == 409
    assert client.post(f"/api/v1/tasks/{tid}/submit", json={"deliverable_notes": "Done"}, headers=sarah).json()["status"] == "IN_REVIEW"

    mgr = login(client, "manager1@company.internal")
    r = client.post(f"/api/v1/tasks/{tid}/request-changes", json={"remarks": "Tighten the intro"}, headers=mgr)
    assert r.status_code == 200 and r.json()["status"] == "CHANGES_REQUESTED"
    # resubmitting straight from CHANGES_REQUESTED is allowed, as is resuming work
    assert client.post(f"/api/v1/tasks/{tid}/start", headers=sarah).json()["status"] == "IN_PROGRESS"
