import pytest

def test_auth_me_requires_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_auth_me_employee_success(client, seed_data):
    headers = {"Authorization": "Bearer dev-token-employee-1"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "employee"
    assert "email" in data
    assert "employee_code" in data

def test_auth_me_admin_success(client, seed_data):
    headers = {"Authorization": "Bearer dev-token-admin"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "admin"
    assert data["email"] == "admin@company.internal"

def test_admin_route_forbidden_for_regular_employee(client, seed_data):
    emp_headers = {"Authorization": "Bearer dev-token-employee-1"}
    response = client.get("/api/v1/admin/stats", headers=emp_headers)
    assert response.status_code == 403

def test_admin_route_allowed_for_admin(client, seed_data):
    admin_headers = {"Authorization": "Bearer dev-token-admin"}
    response = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_accounts" in data
    assert "total_employees" in data
