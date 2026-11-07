import pytest
import uuid

def test_admin_workflows(client, seed_data):
    admin_headers = {"Authorization": "Bearer dev-token-admin"}
    emp_headers = {"Authorization": "Bearer dev-token-employee-1"}

    # 1. Employee registers an account
    reg_resp = client.post("/api/v1/accounts", json={
        "username": "admin_flow_page",
        "profile_url": "https://www.instagram.com/admin_flow_page",
        "display_name": "Admin Flow Page",
        "account_created_date": "2024-03-01"
    }, headers=emp_headers)
    assert reg_resp.status_code == 201
    account_id = reg_resp.json()["id"]

    # 2. Admin views all accounts
    acc_list_resp = client.get("/api/v1/admin/accounts", headers=admin_headers)
    assert acc_list_resp.status_code == 200
    accounts = acc_list_resp.json()
    assert any(a["id"] == account_id for a in accounts)

    # 3. Admin approves account
    appr_resp = client.patch(
        f"/api/v1/admin/accounts/{account_id}/approval",
        json={"approval_status": "approved", "remarks": "Profile and niche verified"},
        headers=admin_headers
    )
    assert appr_resp.status_code == 200
    assert appr_resp.json()["approval_status"] == "approved"

    # 4. Admin creates new client
    client_resp = client.post(
        "/api/v1/admin/clients",
        json={"name": "Starbucks Partners", "description": "Coffee and lifestyle"},
        headers=admin_headers
    )
    assert client_resp.status_code == 201
    client_id = client_resp.json()["id"]

    # 5. Admin creates campaign
    camp_resp = client.post(
        "/api/v1/admin/campaigns",
        json={"client_id": client_id, "name": "Frappuccino Promo 2026"},
        headers=admin_headers
    )
    assert camp_resp.status_code == 201

    # 6. Admin assigns account to employee
    assign_resp = client.post(
        f"/api/v1/admin/accounts/{account_id}/assign",
        json={"employee_id": str(seed_data["employee"].id)},
        headers=admin_headers
    )
    assert assign_resp.status_code == 200
    assert assign_resp.json()["success"] is True

    # 7. Admin reviews audit logs
    audit_resp = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert len(logs) > 0
    actions = [l["action"] for l in logs]
    assert "account_approved" in actions or "account_registered" in actions

    # 8. Admin fetches specific employee details and accounts created by employee
    emp_id = str(seed_data["employee"].id)
    emp_detail_resp = client.get(f"/api/v1/admin/employees/{emp_id}", headers=admin_headers)
    assert emp_detail_resp.status_code == 200
    detail_data = emp_detail_resp.json()
    assert "employee" in detail_data
    assert "stats" in detail_data
    assert detail_data["employee"]["id"] == emp_id
    assert "status_breakdown" in detail_data["stats"]

    # 9. Admin lists accounts created by this employee
    emp_accs_resp = client.get(
        f"/api/v1/admin/employees/{emp_id}/accounts?filter_type=created",
        headers=admin_headers
    )
    assert emp_accs_resp.status_code == 200
    created_accs = emp_accs_resp.json()
    assert any(a["id"] == account_id for a in created_accs)

    # 10. Security incident reporting dispatches live alert to Admin
    inc_resp = client.post(
        "/api/v1/security/incidents",
        json={
            "event_type": "SCREENSHOT_KEY_DETECTED",
            "route": "/admin/employees",
            "key_combination": "PrintScreen"
        },
        headers=emp_headers
    )
    assert inc_resp.status_code == 201
    inc_id = inc_resp.json()["incident_id"]

    # Verify admin received security alert notification
    notif_resp = client.get("/api/v1/notifications", headers=admin_headers)
    assert notif_resp.status_code == 200
    notifs = notif_resp.json()
    sec_alerts = [n for n in notifs if n["type"] == "SECURITY_ALERT"]
    assert len(sec_alerts) >= 1
    assert "SCREENSHOT" in sec_alerts[0]["title"].upper() or "CAPTURE" in sec_alerts[0]["title"].upper()

    # Verify admin can resolve incident
    resolve_resp = client.patch(
        f"/api/v1/security/incidents/{inc_id}/status",
        json={"status": "RESOLVED"},
        headers=admin_headers
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["new_status"] == "RESOLVED"
