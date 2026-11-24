"""Phase 1 + 2: role hierarchy, permission-driven access, and the employee lifecycle."""
import uuid
from datetime import date

import pytest

from app.core.config import settings
from app.models.models import AccountAssignment, Employee, InstagramAccount, Task, Project


# ----------------------------------------------------------------- fixtures

@pytest.fixture
def org(db_session, seed_data, monkeypatch):
    """seed_data + one super admin and one manager who manages Sarah (employee1)."""
    monkeypatch.setattr(settings, "SUPER_ADMIN_EMAILS", "founder@company.internal")
    founder = Employee(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), employee_code="EMP-9000",
                       full_name="Founder", email="founder@company.internal", role="super_admin",
                       is_active=True, status="ACTIVE")
    manager = Employee(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), employee_code="EMP-9001",
                       full_name="Priya Manager", email="manager1@company.internal", role="manager",
                       is_active=True, status="ACTIVE")
    db_session.add_all([founder, manager])
    db_session.flush()
    seed_data["employee"].manager_id = manager.id
    db_session.commit()
    return {**seed_data, "founder": founder, "manager": manager}


def login(client, email):
    r = client.post("/api/v1/auth/dev-login", json={"email": email})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def give_account(db, owner, n=1):
    for i in range(n):
        handle = f"acct{i}_{owner.employee_code}".replace("-", "_")
        acc = InstagramAccount(id=uuid.uuid4(), username=handle,
                               username_normalized=handle.lower(),
                               profile_url="https://instagram.com/x", display_name="X",
                               account_created_date=date(2024, 1, 1), registered_by=owner.id)
        db.add(acc)
        db.flush()
        db.add(AccountAssignment(instagram_account_id=acc.id, employee_id=owner.id, assigned_by=owner.id, is_active=True))
    db.commit()


# ----------------------------------------------------------------- permissions surface

@pytest.mark.parametrize("email,role,must_have,must_not_have", [
    ("founder@company.internal", "super_admin", ["settings:manage", "roles:assign_admin"], []),
    ("admin@company.internal", "admin", ["employees:manage", "admin:portal"], ["settings:manage", "roles:assign_admin"]),
    ("manager1@company.internal", "manager", ["manager:portal", "leave:approve_team"], ["admin:portal", "employees:manage"]),
    ("employee1@company.internal", "employee", ["self:use"], ["manager:portal", "admin:portal"]),
])
def test_me_exposes_role_permissions(client, org, email, role, must_have, must_not_have):
    me = client.get("/api/v1/auth/me", headers=login(client, email)).json()
    assert me["role"] == role
    for p in must_have:
        assert p in me["permissions"]
    for p in must_not_have:
        assert p not in me["permissions"]


def test_manager_cannot_use_admin_endpoints(client, org):
    h = login(client, "manager1@company.internal")
    assert client.get("/api/v1/admin/employees", headers=h).status_code == 403
    assert client.get("/api/v1/admin/stats", headers=h).status_code == 403


def test_super_admin_can_use_admin_endpoints(client, org):
    h = login(client, "founder@company.internal")
    assert client.get("/api/v1/admin/stats", headers=h).status_code == 200


# ----------------------------------------------------------------- role hierarchy

def test_admin_can_promote_to_manager_but_not_admin(client, org):
    h = login(client, "admin@company.internal")
    emp2 = org["employee2"].id
    assert client.patch(f"/api/v1/admin/employees/{emp2}", json={"role": "manager"}, headers=h).json()["role"] == "manager"
    assert client.patch(f"/api/v1/admin/employees/{emp2}", json={"role": "admin"}, headers=h).status_code == 403
    assert client.patch(f"/api/v1/admin/employees/{emp2}", json={"role": "super_admin"}, headers=h).status_code == 403


def test_admin_cannot_modify_admins_or_super_admins(client, org):
    h = login(client, "admin@company.internal")
    r = client.patch(f"/api/v1/admin/employees/{org['founder'].id}", json={"is_active": False}, headers=h)
    assert r.status_code == 403


def test_super_admin_can_grant_admin(client, org):
    h = login(client, "founder@company.internal")
    r = client.patch(f"/api/v1/admin/employees/{org['employee2'].id}", json={"role": "admin"}, headers=h)
    assert r.status_code == 200 and r.json()["role"] == "admin"


def test_cannot_change_own_role_or_demote_last_super_admin(client, org):
    h = login(client, "founder@company.internal")
    r = client.patch(f"/api/v1/admin/employees/{org['founder'].id}", json={"role": "admin"}, headers=h)
    assert r.status_code == 403


def test_unknown_role_rejected(client, org):
    h = login(client, "founder@company.internal")
    r = client.patch(f"/api/v1/admin/employees/{org['employee2'].id}", json={"role": "god"}, headers=h)
    assert r.status_code == 400


def test_reporting_line_cycles_rejected(client, org, db_session):
    h = login(client, "founder@company.internal")
    # manager reports to employee2-promoted-manager, then try to make that person report to manager
    emp2 = org["employee2"].id
    client.patch(f"/api/v1/admin/employees/{emp2}", json={"role": "manager"}, headers=h)
    assert client.patch(f"/api/v1/admin/employees/{org['manager'].id}", json={"manager_id": str(emp2)}, headers=h).status_code == 200
    r = client.patch(f"/api/v1/admin/employees/{emp2}", json={"manager_id": str(org['manager'].id)}, headers=h)
    assert r.status_code == 400 and "circular" in r.json()["detail"]


def test_manager_must_have_manager_role(client, org):
    h = login(client, "admin@company.internal")
    r = client.patch(f"/api/v1/admin/employees/{org['employee2'].id}",
                     json={"manager_id": str(org['employee'].id)}, headers=h)
    assert r.status_code == 400


def test_self_service_profile_cannot_escalate(client, org):
    h = login(client, "employee1@company.internal")
    r = client.patch("/api/v1/employees/me", json={"phone_number": "+91 99999", "role": "admin"}, headers=h)
    assert r.status_code == 200
    assert r.json()["role"] == "employee"
    assert r.json()["phone_number"] == "+91 99999"


# ----------------------------------------------------------------- lifecycle

def test_invite_then_first_login_activates(client, org):
    h = login(client, "admin@company.internal")
    r = client.post("/api/v1/admin/employees", json={
        "email": "NewHire@Company.internal", "full_name": "New Hire", "role": "employee",
        "manager_id": str(org["manager"].id), "job_title": "Content Creator"}, headers=h)
    assert r.status_code == 201, r.text
    invited = r.json()
    assert invited["status"] == "INVITED" and invited["email"] == "newhire@company.internal"
    assert client.post("/api/v1/admin/employees", json={"email": "newhire@company.internal", "full_name": "Dup"},
                       headers=h).status_code == 409

    me = client.get("/api/v1/employees/me", headers=login(client, "newhire@company.internal")).json()
    assert me["id"] == invited["id"]
    assert me["status"] == "ACTIVE"
    assert me["manager_name"] == "Priya Manager"


def test_invite_only_mode_blocks_strangers(client, org, monkeypatch):
    monkeypatch.setattr(settings, "AUTO_PROVISION_EMPLOYEES", False)
    r = client.post("/api/v1/auth/dev-login", json={"email": "stranger@company.internal"})
    assert r.status_code == 403
    # bootstrap super admins still get in
    monkeypatch.setattr(settings, "SUPER_ADMIN_EMAILS", "cofounder@company.internal")
    assert client.post("/api/v1/auth/dev-login", json={"email": "cofounder@company.internal"}).status_code == 200


def test_email_domain_allowlist(client, org, monkeypatch):
    monkeypatch.setattr(settings, "ALLOWED_EMAIL_DOMAINS", "company.internal")
    assert client.post("/api/v1/auth/dev-login", json={"email": "x@gmail.com"}).status_code == 403
    assert client.post("/api/v1/auth/dev-login", json={"email": "y@company.internal"}).status_code == 200


def test_csv_import(client, org):
    h = login(client, "admin@company.internal")
    csv_body = ("email,full_name,role,manager_email,job_title,joined_on\n"
                "a1@company.internal,Asha One,employee,manager1@company.internal,Editor,2026-12-01\n"
                "a2@company.internal,Ben Two,manager,,,\n"
                "employee1@company.internal,Existing,employee,,,\n"
                "a3@company.internal,Bad Role,admin,,,\n")
    r = client.post("/api/v1/admin/employees/import", files={"file": ("e.csv", csv_body, "text/csv")}, headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 2 and body["skipped"] == 1
    assert len(body["errors"]) == 1 and "a3@" in body["errors"][0]


def test_export_csv(client, org):
    r = client.get("/api/v1/admin/employees/export", headers=login(client, "admin@company.internal"))
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    assert "employee1@company.internal" in r.text


def test_offboarding_requires_successor_when_work_is_open(client, org, db_session):
    give_account(db_session, org["employee"], 2)
    h = login(client, "admin@company.internal")
    r = client.post(f"/api/v1/admin/employees/{org['employee'].id}/offboard", json={}, headers=h)
    assert r.status_code == 400 and "successor" in r.json()["detail"]


def test_offboarding_hands_over_work_and_locks_login(client, org, db_session):
    emp, succ = org["employee"], org["employee2"]
    give_account(db_session, emp, 3)
    proj = Project(id=uuid.uuid4(), name="P", owner_id=org["admin"].id)
    db_session.add(proj)
    db_session.flush()
    db_session.add(Task(id=uuid.uuid4(), project_id=proj.id, title="open", assigned_to=emp.id,
                        created_by=org["admin"].id, status="IN_PROGRESS"))
    db_session.add(Task(id=uuid.uuid4(), project_id=proj.id, title="done", assigned_to=emp.id,
                        created_by=org["admin"].id, status="COMPLETED"))
    db_session.commit()

    emp_session = login(client, "employee1@company.internal")
    assert client.get("/api/v1/auth/me", headers=emp_session).status_code == 200

    h = login(client, "admin@company.internal")
    r = client.post(f"/api/v1/admin/employees/{emp.id}/offboard",
                    json={"reassign_to": str(succ.id), "reason": "Resigned"}, headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["accounts_reassigned"] == 3 and body["tasks_reassigned"] == 1
    assert body["employee"]["status"] == "OFFBOARDED"

    db_session.expire_all()
    assert db_session.query(AccountAssignment).filter_by(employee_id=succ.id, is_active=True).count() == 3
    assert db_session.query(Task).filter_by(assigned_to=emp.id, status="COMPLETED").count() == 1  # history kept

    # existing session is dead, and a new login is refused
    assert client.get("/api/v1/auth/me", headers=emp_session).status_code in (401, 403)
    assert client.post("/api/v1/auth/dev-login", json={"email": "employee1@company.internal"}).status_code == 403

    # reactivation restores access
    assert client.post(f"/api/v1/admin/employees/{emp.id}/reactivate", headers=h).json()["status"] == "ACTIVE"
    assert client.post("/api/v1/auth/dev-login", json={"email": "employee1@company.internal"}).status_code == 200


def test_force_logout_revokes_sessions(client, org):
    emp_session = login(client, "employee1@company.internal")
    h = login(client, "admin@company.internal")
    assert client.post(f"/api/v1/admin/employees/{org['employee'].id}/revoke-sessions", headers=h).status_code == 204
    assert client.get("/api/v1/auth/me", headers=emp_session).status_code == 401
    assert client.get("/api/v1/auth/me", headers=login(client, "employee1@company.internal")).status_code == 200


def test_cannot_offboard_last_super_admin_or_self(client, org):
    h = login(client, "founder@company.internal")
    r = client.post(f"/api/v1/admin/employees/{org['founder'].id}/offboard", json={}, headers=h)
    assert r.status_code == 403


def test_assignable_roles_endpoint(client, org):
    admin_roles = [r["value"] for r in client.get("/api/v1/admin/roles", headers=login(client, "admin@company.internal")).json()]
    super_roles = [r["value"] for r in client.get("/api/v1/admin/roles", headers=login(client, "founder@company.internal")).json()]
    assert admin_roles == ["manager", "employee"]
    assert set(super_roles) == {"super_admin", "admin", "manager", "employee"}
