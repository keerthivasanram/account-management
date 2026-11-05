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
