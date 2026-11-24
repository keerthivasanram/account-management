"""Roadmap B1-B4: tokens stay server-side, protected-copy audit, loss alerts, alert de-duplication."""
import json

from app.models.models import AccountConnection, AuditLog, InstagramAccount, Notification, SecurityIncident
from tests.test_rbac_lifecycle import give_account, login, org  # noqa: F401


def test_meta_tokens_never_leave_the_server(client, org, db_session):
    give_account(db_session, org["employee"], 1)
    acc = db_session.query(InstagramAccount).first()
    db_session.add(AccountConnection(instagram_account_id=acc.id, connection_status="CONNECTED",
                                     encrypted_access_token="gAAAA-super-secret-ciphertext"))
    db_session.commit()
    for email, url in (("employee1@company.internal", "/api/v1/employees/me/accounts"),
                       ("employee1@company.internal", f"/api/v1/accounts/{acc.id}"),
                       ("admin@company.internal", "/api/v1/admin/accounts")):
        body = client.get(url, headers=login(client, email)).text
        assert "super-secret" not in body and "access_token" not in body, url


def test_copy_event_logs_metadata_not_content(client, org, db_session):
    h = login(client, "employee1@company.internal")
    r = client.post("/api/v1/security/copy-events", headers=h, json={
        "resource_type": "instagram_account", "resource_id": "abc-123", "field": "username", "route": "/accounts"})
    assert r.status_code == 204
    log = db_session.query(AuditLog).filter_by(action="protected_copy").one()
    assert log.actor_id == org["employee"].id
    assert log.extra_metadata == {"resource_id": "abc-123", "field": "username", "route": "/accounts"}
    # only identifiers are accepted, so free text can't be smuggled in as a "field"
    bad = client.post("/api/v1/security/copy-events", headers=h, json={
        "resource_type": "instagram_account", "field": "my password is hunter2"})
    assert bad.status_code == 422


def test_copy_volume_alert_fires_once(client, org, db_session):
    founder = login(client, "founder@company.internal")
    client.put("/api/v1/super-admin/settings", json={"alert_copies_per_10_minutes": 3}, headers=founder)
    h = login(client, "employee1@company.internal")
    for i in range(8):
        client.post("/api/v1/security/copy-events", headers=h,
                    json={"resource_type": "employee", "resource_id": f"id-{i}", "field": "email"})
    alerts = db_session.query(SecurityIncident).filter_by(event_type="ALERT_COPY_VOLUME").all()
    assert len(alerts) == 1
    assert alerts[0].details["record_count"] == 4
    assert {r["resource_id"] for r in alerts[0].details["records"]} == {"id-0", "id-1", "id-2", "id-3"}
    assert db_session.query(Notification).filter_by(recipient_id=org["admin"].id, type="SECURITY_ALERT").count() == 1


def test_bulk_export_alerts_founders_only(client, org, db_session):
    client.get("/api/v1/admin/employees/export", headers=login(client, "admin@company.internal"))
    alert = db_session.query(SecurityIncident).filter_by(event_type="ALERT_BULK_EXPORT").one()
    assert alert.actor_id == org["admin"].id and alert.details["records"][0]["rows"] >= 5
    assert db_session.query(Notification).filter_by(recipient_id=org["founder"].id, type="SECURITY_ALERT").count() == 1
    # the exporting admin isn't the audience for their own alert
    assert db_session.query(Notification).filter_by(recipient_id=org["admin"].id, type="SECURITY_ALERT").count() == 0


def test_mass_reassignment_alert_lists_accounts(client, org, db_session):
    founder = login(client, "founder@company.internal")
    client.put("/api/v1/super-admin/settings", json={"alert_reassignments_per_hour": 2}, headers=founder)
    give_account(db_session, org["employee"], 4)
    h = login(client, "admin@company.internal")
    for acc in db_session.query(InstagramAccount).all():
        r = client.post(f"/api/v1/admin/accounts/{acc.id}/assign", headers=h, json={"employee_id": str(org["employee2"].id)})
        assert r.status_code == 200
    alert = db_session.query(SecurityIncident).filter_by(event_type="ALERT_MASS_REASSIGNMENT").one()
    assert alert.severity == "HIGH" and alert.details["record_count"] == 3
    assert all(rec["assigned_to"] == "EMP-0003" and rec["username"] for rec in alert.details["records"])
    # visible to admins in the incident list, with details
    incidents = client.get("/api/v1/security/incidents", headers=founder).json()
    assert any(i["event_type"] == "ALERT_MASS_REASSIGNMENT" and i["details"]["records"] for i in incidents)


def test_screenshot_alerts_are_deduplicated(client, org, db_session):
    h = login(client, "employee1@company.internal")
    for _ in range(5):
        client.post("/api/v1/security/incidents", headers=h, json={"event_type": "SCREENSHOT_KEY_DETECTED", "route": "/x"})
    assert db_session.query(SecurityIncident).filter_by(actor_id=org["employee"].id).count() == 5  # all recorded
    assert db_session.query(Notification).filter_by(recipient_id=org["admin"].id, type="SECURITY_ALERT").count() == 1
