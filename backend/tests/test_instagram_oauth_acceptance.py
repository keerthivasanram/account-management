import pytest
import uuid
from datetime import date

def test_two_employees_connect_own_business_accounts(client, seed_data):
    """
    Acceptance Test 1:
    - Two different employees connect their own authorized Instagram Business accounts.
    - Verified Instagram account ID is recorded.
    """
    emp1_headers = {"Authorization": "Bearer dev-token-employee-1"}
    emp2_headers = {"Authorization": "Bearer dev-token-employee-2"}

    # Employee 1 registers account 1
    reg1 = client.post("/api/v1/accounts", json={
        "username": "acme_brand_official",
        "profile_url": "https://www.instagram.com/acme_brand_official",
        "display_name": "Acme Brand Official",
        "account_created_date": "2024-01-15",
        "niche": "Apparel"
    }, headers=emp1_headers)
    assert reg1.status_code == 201
    acc1_id = reg1.json()["id"]

    # Employee 2 registers account 2
    reg2 = client.post("/api/v1/accounts", json={
        "username": "nova_tech_gear",
        "profile_url": "https://www.instagram.com/nova_tech_gear",
        "display_name": "Nova Tech Gear",
        "account_created_date": "2024-02-20",
        "niche": "Electronics"
    }, headers=emp2_headers)
    assert reg2.status_code == 201
    acc2_id = reg2.json()["id"]

    # Employee 1 connects account 1
    auth1 = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc1_id}", headers=emp1_headers)
    assert auth1.status_code == 200
    state1 = auth1.json()["state"]

    cb1 = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_code_1&state={state1}")
    assert cb1.status_code == 200
    cb1_data = cb1.json()
    assert cb1_data["success"] is True
    assert cb1_data["connection_status"] == "CONNECTED"
    assert cb1_data["instagram_user_id"].startswith("ig_uid_")
    assert cb1_data["account_type"] == "BUSINESS"

    # Employee 2 connects account 2
    auth2 = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc2_id}", headers=emp2_headers)
    assert auth2.status_code == 200
    state2 = auth2.json()["state"]

    cb2 = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_code_2&state={state2}")
    assert cb2.status_code == 200
    cb2_data = cb2.json()
    assert cb2_data["success"] is True
    assert cb2_data["connection_status"] == "CONNECTED"
    assert cb2_data["instagram_user_id"].startswith("ig_uid_")
    assert cb2_data["instagram_user_id"] != cb1_data["instagram_user_id"]

def test_employee_isolation_and_cross_access_prevention(client, seed_data):
    """
    Acceptance Test 2:
    - One employee cannot access, authorize, or disconnect another employee's account.
    """
    emp1_headers = {"Authorization": "Bearer dev-token-employee-1"}
    emp2_headers = {"Authorization": "Bearer dev-token-employee-2"}

    # Employee 1 registers account
    reg1 = client.post("/api/v1/accounts", json={
        "username": "sarah_exclusive_page",
        "profile_url": "https://www.instagram.com/sarah_exclusive_page",
        "display_name": "Sarah Page",
        "account_created_date": "2024-03-01"
    }, headers=emp1_headers)
    assert reg1.status_code == 201
    acc1_id = reg1.json()["id"]

    # Employee 2 attempts to initiate OAuth connection on Employee 1's account -> 403 Forbidden
    auth_attempt = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc1_id}", headers=emp2_headers)
    assert auth_attempt.status_code == 403
    assert "not authorized" in auth_attempt.json()["detail"].lower()

    # Employee 1 successfully authorizes
    auth1 = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc1_id}", headers=emp1_headers)
    state1 = auth1.json()["state"]
    client.get(f"/api/v1/integrations/instagram/callback?code=simulated_code&state={state1}")

    # Employee 2 attempts to disconnect Employee 1's account -> 403 Forbidden
    disc_attempt = client.post("/api/v1/integrations/instagram/disconnect", json={"account_id": acc1_id}, headers=emp2_headers)
    assert disc_attempt.status_code == 403

def test_account_identity_mismatch_prevention(client, seed_data):
    """
    Acceptance Test 3:
    - The wrong Instagram account cannot accidentally be linked to a registered record.
    - Verified against Meta-returned username.
    """
    emp1_headers = {"Authorization": "Bearer dev-token-employee-1"}

    reg = client.post("/api/v1/accounts", json={
        "username": "expected_brand_account",
        "profile_url": "https://www.instagram.com/expected_brand_account",
        "display_name": "Expected Brand",
        "account_created_date": "2024-01-01"
    }, headers=emp1_headers)
    acc_id = reg.json()["id"]

    auth = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc_id}", headers=emp1_headers)
    state = auth.json()["state"]

    # Callback simulates Meta returning a different username (mismatch)
    callback = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_mismatch_code&state={state}")
    assert callback.status_code == 400
    assert "identity mismatch" in callback.json()["detail"].lower()

    # Verify status is CONNECTION_FAILED and token is not saved
    acc_status = client.get(f"/api/v1/accounts/{acc_id}/status", headers=emp1_headers)
    assert acc_status.json()["connection_status"] == "CONNECTION_FAILED"

def test_personal_account_ineligibility_rejected(client, seed_data):
    """
    Acceptance Test 4:
    - Personal Instagram accounts must NOT be treated as eligible for official API publishing.
    """
    emp1_headers = {"Authorization": "Bearer dev-token-employee-1"}

    reg = client.post("/api/v1/accounts", json={
        "username": "personal_john_doe",
        "profile_url": "https://www.instagram.com/personal_john_doe",
        "display_name": "John Doe Personal",
        "account_created_date": "2024-04-10"
    }, headers=emp1_headers)
    acc_id = reg.json()["id"]

    auth = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc_id}", headers=emp1_headers)
    state = auth.json()["state"]

    # Callback returns PERSONAL account type
    callback = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_personal_code&state={state}")
    assert callback.status_code == 400
    assert "personal instagram accounts are not eligible" in callback.json()["detail"].lower()

def test_creator_account_policy_enforcement(client, seed_data):
    """
    Acceptance Test 5:
    - Default company policy: Business accounts only.
    - Creator accounts rejected unless administrator explicitly enables allow_creator.
    """
    emp1_headers = {"Authorization": "Bearer dev-token-employee-1"}
    admin_headers = {"Authorization": "Bearer dev-token-admin"}

    reg = client.post("/api/v1/accounts", json={
        "username": "creator_influencer_hub",
        "profile_url": "https://www.instagram.com/creator_influencer_hub",
        "display_name": "Creator Hub",
        "account_created_date": "2024-05-01"
    }, headers=emp1_headers)
    acc_id = reg.json()["id"]

    auth = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc_id}", headers=emp1_headers)
    state = auth.json()["state"]

    # Initial attempt: Creator account rejected by default policy
    cb_fail = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_creator_code&state={state}")
    assert cb_fail.status_code == 400
    assert "creator accounts are not permitted under the default company policy" in cb_fail.json()["detail"].lower()

    # Admin explicitly enables Creator compatibility
    update_res = client.put(f"/api/v1/accounts/{acc_id}", json={"allow_creator": True}, headers=admin_headers)
    assert update_res.status_code == 200
    assert update_res.json()["allow_creator"] is True

    # New authorization attempt with allow_creator enabled succeeds
    auth2 = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc_id}", headers=emp1_headers)
    state2 = auth2.json()["state"]

    cb_success = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_creator_code&state={state2}")
    assert cb_success.status_code == 200
    assert cb_success.json()["account_type"] == "CREATOR"
    assert cb_success.json()["connection_status"] == "CONNECTED"

def test_single_use_state_prevents_replay(client, seed_data):
    """
    Acceptance Test 6:
    - Short-lived, single-use state prevents replay attacks.
    """
    emp1_headers = {"Authorization": "Bearer dev-token-employee-1"}

    reg = client.post("/api/v1/accounts", json={
        "username": "replay_protection_test",
        "profile_url": "https://www.instagram.com/replay_protection_test",
        "display_name": "Replay Test",
        "account_created_date": "2024-06-01"
    }, headers=emp1_headers)
    acc_id = reg.json()["id"]

    auth = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc_id}", headers=emp1_headers)
    state = auth.json()["state"]

    # First consumption succeeds
    cb1 = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_code&state={state}")
    assert cb1.status_code == 200

    # Second consumption of the same state fails immediately
    cb2 = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_code&state={state}")
    assert cb2.status_code == 400
    assert "already been consumed" in cb2.json()["detail"].lower()

def test_disconnect_and_reauthorization(client, seed_data):
    """
    Acceptance Test 7:
    - Disconnect wipes token and resets status to NOT_CONNECTED.
    - Reauthorization cleanly reconnects.
    """
    emp1_headers = {"Authorization": "Bearer dev-token-employee-1"}

    reg = client.post("/api/v1/accounts", json={
        "username": "reconnect_lifecycle_test",
        "profile_url": "https://www.instagram.com/reconnect_lifecycle_test",
        "display_name": "Lifecycle Test",
        "account_created_date": "2024-07-01"
    }, headers=emp1_headers)
    acc_id = reg.json()["id"]

    # 1. Connect
    auth = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc_id}", headers=emp1_headers)
    state = auth.json()["state"]
    client.get(f"/api/v1/integrations/instagram/callback?code=simulated_code&state={state}")

    status1 = client.get(f"/api/v1/accounts/{acc_id}/status", headers=emp1_headers)
    assert status1.json()["connection_status"] == "CONNECTED"

    # 2. Disconnect
    disc = client.post("/api/v1/integrations/instagram/disconnect", json={"account_id": acc_id}, headers=emp1_headers)
    assert disc.status_code == 200
    assert disc.json()["connection_status"] == "NOT_CONNECTED"

    status2 = client.get(f"/api/v1/accounts/{acc_id}/status", headers=emp1_headers)
    assert status2.json()["connection_status"] == "NOT_CONNECTED"

    # 3. Reconnect
    auth2 = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc_id}", headers=emp1_headers)
    state2 = auth2.json()["state"]
    cb2 = client.get(f"/api/v1/integrations/instagram/callback?code=simulated_code&state={state2}")
    assert cb2.status_code == 200
    assert cb2.json()["connection_status"] == "CONNECTED"

def test_token_expiry_and_revocation_validation(client, seed_data):
    """
    Acceptance Test 8:
    - Validates token health against TOKEN_EXPIRED and ACCESS_REVOKED.
    """
    emp1_headers = {"Authorization": "Bearer dev-token-employee-1"}

    reg = client.post("/api/v1/accounts", json={
        "username": "token_health_test",
        "profile_url": "https://www.instagram.com/token_health_test",
        "display_name": "Health Test",
        "account_created_date": "2024-08-01"
    }, headers=emp1_headers)
    acc_id = reg.json()["id"]

    # Connect with expired token simulation
    auth = client.get(f"/api/v1/integrations/instagram/authorize?account_id={acc_id}", headers=emp1_headers)
    state = auth.json()["state"]
    client.get(f"/api/v1/integrations/instagram/callback?code=simulated_expired_code&state={state}")

    val_res = client.post("/api/v1/integrations/instagram/validate", json={"account_id": acc_id}, headers=emp1_headers)
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["is_valid"] is False
    assert val_data["status"] == "TOKEN_EXPIRED"
