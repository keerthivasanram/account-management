"""Phase 5: super admin console, org policy enforcement, audit search, break-glass."""
import uuid

import jwt
import pytest

from app.core.config import settings
from tests.test_rbac_lifecycle import login, org  # noqa: F401


def test_console_is_super_admin_only(client, org):
    for email in ("admin@company.internal", "manager1@company.internal", "employee1@company.internal"):
        h = login(client, email)
        assert client.get("/api/v1/super-admin/overview", headers=h).status_code == 403
        assert client.put("/api/v1/super-admin/settings", json={"require_mfa": True}, headers=h).status_code == 403
        assert client.post("/api/v1/super-admin/sessions/revoke-all", headers=h).status_code == 403


def test_overview_lists_admins_and_warnings(client, org):
    ov = client.get("/api/v1/super-admin/overview", headers=login(client, "founder@company.internal")).json()
    emails = {a["email"] for a in ov["admins"]}
    assert {"founder@company.internal", "admin@company.internal"} <= emails
    assert any("Development login" in w["text"] for w in ov["warnings"])


def test_settings_validation_and_audit(client, org):
    h = login(client, "founder@company.internal")
    assert client.put("/api/v1/super-admin/settings", json={"bogus": 1}, headers=h).status_code == 400
    assert client.put("/api/v1/super-admin/settings", json={"account_target_max": "lots"}, headers=h).status_code == 400
    assert client.put("/api/v1/super-admin/settings", json={"account_target_min": 70, "account_target_max": 60}, headers=h).status_code == 400
    r = client.put("/api/v1/super-admin/settings", json={"account_target_min": 40, "account_target_max": 45,
                                                         "leave_allowance_days": {"CASUAL": 2}}, headers=h)
    assert r.status_code == 200
    values = {s["key"]: s["value"] for s in r.json()}
    assert values["account_target_max"] == 45 and values["leave_allowance_days"]["CASUAL"] == 2

    # new targets flow into the admin overview & leave balance
    ov = client.get("/api/v1/admin/overview", headers=login(client, "admin@company.internal")).json()
    assert ov["workload"]["target_max"] == 45
    bal = client.get("/api/v1/attendance/leave-balance", headers=login(client, "employee1@company.internal")).json()
    assert next(b for b in bal["balances"] if b["leave_type"] == "CASUAL")["allowance"] == 2

    audit = client.get("/api/v1/super-admin/audit?action=org_settings", headers=h).json()
    assert audit["total"] == 1 and audit["items"][0]["metadata"]["changes"]["account_target_max"]["to"] == 45


def test_require_mfa_policy(client, org, monkeypatch):
    h = login(client, "founder@company.internal")
    client.put("/api/v1/super-admin/settings", json={"require_mfa": True}, headers=h)
    # dev-login sessions are no longer accepted...
    assert client.get("/api/v1/auth/me", headers=login(client, "employee1@company.internal")).status_code == 401
    # ...Supabase password-only sessions are rejected, aal2 sessions accepted
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "sb-secret")
    emp = org["employee"]
    aal1 = jwt.encode({"sub": str(emp.auth_user_id), "email": emp.email, "aal": "aal1"}, "sb-secret", algorithm="HS256")
    aal2 = jwt.encode({"sub": str(emp.auth_user_id), "email": emp.email, "aal": "aal2"}, "sb-secret", algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {aal1}"}).status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {aal2}"}).status_code == 200
    # ...and the email-code flow still works
    ch = client.post("/api/v1/auth/mfa/challenge", json={"email": emp.email}).json()
    code = ch["hint"].split(":")[-1].strip()
    tok = client.post("/api/v1/auth/mfa/verify", json={"email": emp.email, "challenge_id": ch["challenge_id"], "code": code}).json()["access_token"]
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok}"}).status_code == 200


def test_session_ttl_setting_applies(client, org):
    h = login(client, "founder@company.internal")
    client.put("/api/v1/super-admin/settings", json={"session_ttl_minutes": 30}, headers=h)
    tok = client.post("/api/v1/auth/dev-login", json={"email": "employee1@company.internal"}).json()["access_token"]
    claims = jwt.decode(tok, options={"verify_signature": False})
    assert claims["exp"] - claims["iat"] == 30 * 60


def test_health(client, org):
    r = client.get("/api/v1/super-admin/health", headers=login(client, "founder@company.internal"))
    assert r.status_code == 200
    body = r.json()
    assert body["database"]["ok"] is True
    assert body["database"]["migration_head"] == "005_rbac_lifecycle_org_settings"


def test_revoke_all_sessions_spares_caller(client, org):
    founder = login(client, "founder@company.internal")
    emp = login(client, "employee1@company.internal")
    adm = login(client, "admin@company.internal")
    r = client.post("/api/v1/super-admin/sessions/revoke-all", headers=founder)
    assert r.status_code == 200 and r.json()["employees_affected"] >= 3
    assert client.get("/api/v1/auth/me", headers=emp).status_code == 401
    assert client.get("/api/v1/auth/me", headers=adm).status_code == 401
    assert client.get("/api/v1/auth/me", headers=founder).status_code == 200


def test_admin_can_search_audit_but_not_change_settings(client, org):
    h = login(client, "admin@company.internal")
    assert client.get("/api/v1/super-admin/audit", headers=h).status_code == 200
    assert client.get("/api/v1/super-admin/settings", headers=h).status_code == 403
