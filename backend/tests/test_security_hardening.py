"""Phase 0 regression tests: every privilege-escalation path found in the audit stays closed."""
import time
import uuid

import jwt
import pytest

from app.core.config import settings, DEV_FALLBACK_FERNET_KEY
from app.models.models import LoginVerificationCode


@pytest.fixture
def production_mode(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "APP_JWT_SECRET", "x" * 48)
    yield


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


# --- forged / unsigned tokens -------------------------------------------------

def test_dev_tokens_rejected_outside_development(client, seed_data, production_mode):
    assert client.get("/api/v1/auth/me", headers=_bearer("dev-token-admin")).status_code == 401
    assert client.get("/api/v1/admin/stats", headers=_bearer("dev-token-admin")).status_code == 401


def test_unsigned_jwt_is_rejected(client, seed_data):
    forged = jwt.encode({"sub": str(seed_data["admin"].auth_user_id), "email": "admin@company.internal"},
                        key="", algorithm="none")
    assert client.get("/api/v1/auth/me", headers=_bearer(forged)).status_code == 401


def test_app_token_signed_with_wrong_secret_is_rejected(client, seed_data):
    forged = jwt.encode({"iss": settings.APP_JWT_ISSUER, "sub": str(seed_data["admin"].auth_user_id),
                         "iat": int(time.time()), "exp": int(time.time()) + 600},
                        "attacker-secret", algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers=_bearer(forged)).status_code == 401


# --- role can never be self-selected -----------------------------------------

def test_dev_login_disabled_outside_development(client, seed_data, production_mode):
    r = client.post("/api/v1/auth/dev-login", json={"email": "admin@company.internal"})
    assert r.status_code == 404


def test_dev_login_ignores_requested_role(client, seed_data):
    r = client.post("/api/v1/auth/dev-login", json={"email": "mallory@company.internal", "role": "admin"})
    assert r.status_code == 200
    assert r.json()["employee"]["role"] == "employee"
    token = r.json()["access_token"]
    assert client.get("/api/v1/admin/stats", headers=_bearer(token)).status_code == 403


def test_admin_prefixed_email_is_not_auto_admin(client, seed_data):
    r = client.post("/api/v1/auth/dev-login", json={"email": "admin@evil.example"})
    assert r.json()["employee"]["role"] == "employee"


def test_supabase_user_metadata_role_is_ignored(client, seed_data, monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "supabase-test-secret")
    token = jwt.encode({
        "sub": str(uuid.uuid4()),
        "email": "newhire@company.internal",
        "user_metadata": {"role": "admin", "full_name": "New Hire"},
        "app_metadata": {"role": "admin"},
        "role": "admin",
    }, "supabase-test-secret", algorithm="HS256")
    me = client.get("/api/v1/auth/me", headers=_bearer(token))
    assert me.status_code == 200
    assert me.json()["role"] == "employee"


def test_super_admin_bootstrapped_only_from_settings(client, seed_data, monkeypatch):
    monkeypatch.setattr(settings, "SUPER_ADMIN_EMAILS", "founder@company.internal")
    r = client.post("/api/v1/auth/dev-login", json={"email": "founder@company.internal"})
    assert r.json()["employee"]["role"] == "super_admin"


# --- MFA ----------------------------------------------------------------------

def test_mfa_issues_signed_session_token(client, seed_data):
    ch = client.post("/api/v1/auth/mfa/challenge", json={"email": "employee1@company.internal"}).json()
    code = ch["hint"].split(":")[-1].strip()
    r = client.post("/api/v1/auth/mfa/verify", json={
        "email": "employee1@company.internal", "challenge_id": ch["challenge_id"], "code": code
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert not token.startswith("dev-token")
    me = client.get("/api/v1/auth/me", headers=_bearer(token))
    assert me.status_code == 200
    assert me.json()["email"] == "employee1@company.internal"


def test_mfa_challenge_burns_after_max_attempts(client, seed_data, db_session):
    ch = client.post("/api/v1/auth/mfa/challenge", json={"email": "employee1@company.internal"}).json()
    real = ch["hint"].split(":")[-1].strip()
    wrong = "000000" if real != "000000" else "111111"
    for _ in range(settings.MFA_MAX_ATTEMPTS):
        client.post("/api/v1/auth/mfa/verify", json={
            "email": "employee1@company.internal", "challenge_id": ch["challenge_id"], "code": wrong})
    r = client.post("/api/v1/auth/mfa/verify", json={
        "email": "employee1@company.internal", "challenge_id": ch["challenge_id"], "code": real})
    assert r.status_code == 400


def test_mfa_challenge_unavailable_without_smtp_in_production(client, seed_data, production_mode):
    known = client.post("/api/v1/auth/mfa/challenge", json={"email": "employee1@company.internal"})
    unknown = client.post("/api/v1/auth/mfa/challenge", json={"email": "nobody@company.internal"})
    assert known.status_code == unknown.status_code == 503
    assert known.json() == unknown.json()


def test_mfa_challenge_does_not_enumerate_or_leak_code_in_production(client, seed_data, production_mode, monkeypatch):
    sent = []
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test")
    monkeypatch.setattr(settings, "SMTP_FROM", "noreply@company.internal")
    monkeypatch.setattr("app.api.v1.mfa.send_login_code", lambda to, name, code: sent.append((to, code)) or True)
    known = client.post("/api/v1/auth/mfa/challenge", json={"email": "employee1@company.internal"}).json()
    unknown = client.post("/api/v1/auth/mfa/challenge", json={"email": "nobody@company.internal"}).json()
    assert known["hint"] is None and unknown["hint"] is None
    assert known["message"] == unknown["message"]
    assert [to for to, _ in sent] == ["employee1@company.internal"]  # only real employees get a code


def test_mfa_code_cannot_be_used_for_another_email(client, seed_data):
    ch = client.post("/api/v1/auth/mfa/challenge", json={"email": "employee1@company.internal"}).json()
    code = ch["hint"].split(":")[-1].strip()
    r = client.post("/api/v1/auth/mfa/verify", json={
        "email": "admin@company.internal", "challenge_id": ch["challenge_id"], "code": code})
    assert r.status_code == 400


# --- startup guard ------------------------------------------------------------

def test_production_config_validation(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "DEV_AUTH_BYPASS", True)
    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY", DEV_FALLBACK_FERNET_KEY)
    monkeypatch.setattr(settings, "APP_JWT_SECRET", "")
    monkeypatch.setattr(settings, "DATABASE_URL", "sqlite:///./app.db")
    problems = settings.validate_for_production()
    assert len(problems) == 4

    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    assert settings.validate_for_production() == []


def test_server_errors_do_not_leak_details_in_production(production_mode):
    from fastapi.testclient import TestClient
    from app.main import app

    @app.get("/__boom_test")
    def boom():
        raise RuntimeError("secret connection string postgres://user:pw@host")

    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get("/__boom_test")
    assert r.status_code == 500
    assert "postgres://" not in r.text


# --- task review separation of duties -----------------------------------------

def _make_task_in_review(client, seed_data):
    admin, emp = _bearer("dev-token-admin"), _bearer("dev-token-employee-1")
    proj = client.post("/api/v1/projects", json={"name": "P", "priority": "LOW"}, headers=admin).json()
    task = client.post("/api/v1/tasks", json={
        "project_id": proj["id"], "title": "T", "assigned_to": str(seed_data["employee"].id), "priority": "LOW"
    }, headers=admin).json()
    return task["id"], admin, emp


def test_unrelated_employee_cannot_approve_task(client, seed_data):
    task_id, admin, emp = _make_task_in_review(client, seed_data)
    client.post(f"/api/v1/tasks/{task_id}/start", headers=emp)
    client.post(f"/api/v1/tasks/{task_id}/submit", json={"deliverable_notes": "done"}, headers=emp)
    other = _bearer("dev-token-employee-2")
    assert client.post(f"/api/v1/tasks/{task_id}/approve", json={}, headers=other).status_code == 403
    assert client.post(f"/api/v1/tasks/{task_id}/request-changes", json={"remarks": "x"}, headers=other).status_code == 403


def test_assignee_cannot_self_approve(client, seed_data):
    task_id, admin, emp = _make_task_in_review(client, seed_data)
    client.post(f"/api/v1/tasks/{task_id}/start", headers=emp)
    client.post(f"/api/v1/tasks/{task_id}/submit", json={"deliverable_notes": "done"}, headers=emp)
    assert client.post(f"/api/v1/tasks/{task_id}/approve", json={}, headers=emp).status_code == 403


def test_task_must_be_in_review_to_approve(client, seed_data):
    task_id, admin, emp = _make_task_in_review(client, seed_data)
    assert client.post(f"/api/v1/tasks/{task_id}/approve", json={}, headers=admin).status_code == 409
