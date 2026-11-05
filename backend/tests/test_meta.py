import pytest
import uuid

def test_meta_oauth_flow(client, seed_data):
    emp_headers = {"Authorization": "Bearer dev-token-employee-1"}

    # 1. Register an account first
    reg_resp = client.post("/api/v1/accounts", json={
        "username": "oauth_test_page",
        "profile_url": "https://www.instagram.com/oauth_test_page",
        "display_name": "OAuth Test Page",
        "account_created_date": "2024-02-01"
    }, headers=emp_headers)
    assert reg_resp.status_code == 201
    account_id = reg_resp.json()["id"]

    # 2. Request authorization URL
    auth_resp = client.get(f"/api/v1/integrations/instagram/authorize?account_id={account_id}", headers=emp_headers)
    assert auth_resp.status_code == 200
    auth_data = auth_resp.json()
    assert "authorization_url" in auth_data
    assert "state" in auth_data
    state = auth_data["state"]

    # 3. Simulate callback with code and valid state
    callback_resp = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_code_123&state={state}")
    assert callback_resp.status_code == 200
    cb_data = callback_resp.json()
    assert cb_data["success"] is True
    assert cb_data["connection_status"] == "connected"

    # 4. Check account status is now connected
    status_resp = client.get(f"/api/v1/accounts/{account_id}/status", headers=emp_headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["connection_status"] == "connected"

    # 5. Validate connection
    val_resp = client.post("/api/v1/integrations/instagram/validate", json={"account_id": account_id}, headers=emp_headers)
    assert val_resp.status_code == 200
    assert val_resp.json()["is_valid"] is True

    # 6. Disconnect connection
    disc_resp = client.post("/api/v1/integrations/instagram/disconnect", json={"account_id": account_id}, headers=emp_headers)
    assert disc_resp.status_code == 200
    assert disc_resp.json()["success"] is True
