import pytest

def test_check_duplicate_username(client, seed_data):
    headers = {"Authorization": "Bearer dev-token-employee-1"}
    response = client.post(
        "/api/v1/accounts/check-duplicate",
        json={"username": "brand_new_page"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["is_duplicate"] is False

def test_register_account_success(client, seed_data):
    headers = {"Authorization": "Bearer dev-token-employee-1"}
    payload = {
        "username": "Klarves_Official",
        "profile_url": "https://www.instagram.com/klarves_official",
        "display_name": "Klarves Official Brand",
        "account_created_date": "2024-01-15",
        "niche": "Technology & AI",
        "client_id": str(seed_data["client"].id),
        "campaign_id": str(seed_data["campaign"].id)
    }
    response = client.post("/api/v1/accounts", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "Klarves_Official"
    assert data["username_normalized"] == "klarves_official"
    assert data["status"] == "pending_connection"
    assert data["registered_by"] == str(seed_data["employee"].id)
    assert data["active_assignment"]["employee_id"] == str(seed_data["employee"].id)
    assert data["verification"]["approval_status"] == "pending"

def test_duplicate_registration_rejected_case_insensitive(client, seed_data):
    headers = {"Authorization": "Bearer dev-token-employee-1"}
    payload1 = {
        "username": "Klarves_Official",
        "profile_url": "https://www.instagram.com/klarves_official",
        "display_name": "First Registration",
        "account_created_date": "2024-01-15"
    }
    resp1 = client.post("/api/v1/accounts", json=payload1, headers=headers)
    assert resp1.status_code == 201

    # Try registering again with lowercase or mixed case
    payload2 = {
        "username": "klarves_OFFICIAL",
        "profile_url": "https://www.instagram.com/klarves_official",
        "display_name": "Duplicate Attempt",
        "account_created_date": "2024-01-15"
    }
    response = client.post("/api/v1/accounts", json=payload2, headers=headers)
    assert response.status_code == 409
    assert "already registered" in response.json()["detail"].lower()

def test_invalid_profile_url_rejected(client, seed_data):
    headers = {"Authorization": "Bearer dev-token-employee-1"}
    payload = {
        "username": "bad_url_account",
        "profile_url": "https://www.twitter.com/bad_url_account",
        "display_name": "Invalid URL",
        "account_created_date": "2024-01-15"
    }
    response = client.post("/api/v1/accounts", json=payload, headers=headers)
    assert response.status_code == 422

def test_list_employee_accounts(client, seed_data):
    headers = {"Authorization": "Bearer dev-token-employee-1"}
    # Register an account first
    client.post("/api/v1/accounts", json={
        "username": "page_to_list",
        "profile_url": "https://www.instagram.com/page_to_list",
        "display_name": "Page To List",
        "account_created_date": "2024-01-15"
    }, headers=headers)

    response = client.get("/api/v1/accounts", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["username"] == "page_to_list"

def test_get_employee_dashboard_stats(client, seed_data):
    headers = {"Authorization": "Bearer dev-token-employee-1"}
    # Register an account first
    client.post("/api/v1/accounts", json={
        "username": "page_for_stats",
        "profile_url": "https://www.instagram.com/page_for_stats",
        "display_name": "Page For Stats",
        "account_created_date": "2024-01-15"
    }, headers=headers)

    response = client.get("/api/v1/employees/me/stats", headers=headers)
    assert response.status_code == 200
    stats = response.json()
    assert stats["total"] >= 1
    assert "pending_connection" in stats
