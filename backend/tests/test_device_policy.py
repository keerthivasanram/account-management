"""Company software: phones and tablets are refused at the API."""
import pytest

from app.security.device_policy import is_mobile_request

from tests.test_rbac_lifecycle import login, org  # noqa: F401

IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"
ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36"
IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15"


@pytest.mark.parametrize("ua,mobile", [(IPHONE, True), (ANDROID, True), (IPAD, True), (WINDOWS, False), (MAC, False)])
def test_detection(ua, mobile):
    assert is_mobile_request(ua) is mobile


def test_client_hint_counts_as_mobile():
    assert is_mobile_request(WINDOWS, "?1") is True
    assert is_mobile_request(WINDOWS, "?0") is False


def test_phone_is_refused_computer_allowed(client, org):
    headers = login(client, "employee1@company.internal")
    r = client.get("/api/v1/employees/me", headers={**headers, "User-Agent": IPHONE})
    assert r.status_code == 403 and r.json()["code"] == "MOBILE_BLOCKED"
    assert client.post("/api/v1/auth/dev-login", json={"email": "employee1@company.internal"}, headers={"User-Agent": ANDROID}).status_code == 403
    assert client.get("/api/v1/employees/me", headers={**headers, "User-Agent": WINDOWS}).status_code == 200


def test_health_and_preflight_still_work_on_phones(client):
    assert client.get("/api/health", headers={"User-Agent": IPHONE}).status_code == 200
    r = client.options("/api/v1/employees/me", headers={"User-Agent": IPHONE, "Origin": "http://localhost:5173",
                                                         "Access-Control-Request-Method": "GET"})
    assert r.status_code in (200, 204)
