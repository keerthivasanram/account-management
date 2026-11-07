import pytest
from datetime import date, timedelta
from app.models.models import Employee, Department, Conversation, ConversationMember, Message, AttendanceRecord, LeaveRequest

def test_mfa_challenge_and_verification(client, seed_data):
    # 1. Request challenge for seeded admin
    res = client.post("/api/v1/auth/mfa/challenge", json={"email": "admin@company.internal"})
    assert res.status_code == 200
    data = res.json()
    assert data["verification_required"] is True
    challenge_id = data["challenge_id"]
    hint = data["hint"]
    code = hint.split(":")[-1].strip()

    # 2. Verify with wrong code
    res_bad = client.post("/api/v1/auth/mfa/verify", json={
        "email": "admin@company.internal",
        "challenge_id": challenge_id,
        "code": "000000"
    })
    assert res_bad.status_code == 400

    # 3. Verify with correct code and device fingerprint
    res_good = client.post("/api/v1/auth/mfa/verify", json={
        "email": "admin@company.internal",
        "challenge_id": challenge_id,
        "code": code,
        "device_fingerprint": "fp-macbook-pro-m3-admin",
        "device_name": "Admin Primary MacBook",
        "browser": "Chrome",
        "os": "macOS"
    })
    assert res_good.status_code == 200
    auth_data = res_good.json()
    assert "access_token" in auth_data
    assert auth_data["device_trusted"] is True
    assert auth_data["employee"]["role"] == "admin"

def test_company_chat_and_dlp_redaction(client, seed_data):
    admin_token = "dev-token-admin"
    emp_token = "dev-token-employee-EMP-0002"

    # 1. Admin creates a team channel
    res = client.post(
        "/api/v1/chat/conversations",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "type": "DEPARTMENT",
            "title": "Marketing Strategy Channel"
        }
    )
    assert res.status_code == 201
    conv_id = res.json()["id"]

    # 2. Admin sends normal message
    res_msg1 = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": "Welcome team! Let's align on the upcoming product campaign."}
    )
    assert res_msg1.status_code == 201
    assert res_msg1.json()["is_redacted"] is False

    # 3. Admin sends sensitive message containing Meta Token and API Key (DLP test)
    leak_content = "Here is the master Meta token: EAABwzL13840abcdef1234567890 and the secret sk_live_999888777666555444333."
    res_msg2 = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"content": leak_content}
    )
    assert res_msg2.status_code == 201
    sanitized_data = res_msg2.json()
    assert sanitized_data["is_redacted"] is True
    assert "EAABwzL13840" not in sanitized_data["content"]
    assert "sk_live_" not in sanitized_data["content"]
    assert "[REDACTED META TOKEN - DLP SHIELD]" in sanitized_data["content"]
    assert "[REDACTED API KEY - DLP SHIELD]" in sanitized_data["content"]

    # 4. Read messages
    res_list = client.get(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_list.status_code == 200
    messages = res_list.json()
    assert len(messages) >= 2

def test_attendance_and_leave_workflow(client, seed_data):
    admin_token = "dev-token-admin"
    emp_token = "dev-token-employee-EMP-0002"

    # 1. Employee checks in
    res_checkin = client.post(
        "/api/v1/attendance/check-in",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert res_checkin.status_code == 200
    checkin_data = res_checkin.json()
    assert checkin_data["status"] == "PRESENT"
    assert checkin_data["check_in_at"] is not None

    # 2. Check summary
    res_summary = client.get(
        "/api/v1/attendance/summary",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert res_summary.status_code == 200
    assert res_summary.json()["today_status"] == "CHECKED_IN"

    # 3. Employee checks out
    res_checkout = client.post(
        "/api/v1/attendance/check-out",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert res_checkout.status_code == 200
    assert res_checkout.json()["check_out_at"] is not None

    # 4. Employee submits leave request
    today = date.today()
    tomorrow = today + timedelta(days=2)
    res_leave = client.post(
        "/api/v1/attendance/leaves",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "leave_type": "ANNUAL",
            "start_date": str(today),
            "end_date": str(tomorrow),
            "reason": "Family vacation and personal travel."
        }
    )
    assert res_leave.status_code == 201
    leave_id = res_leave.json()["id"]
    assert res_leave.json()["status"] == "PENDING"

    # 5. Admin reviews and approves leave
    res_review = client.patch(
        f"/api/v1/attendance/leaves/{leave_id}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "status": "APPROVED",
            "remarks": "Approved. Have a great vacation!"
        }
    )
    assert res_review.status_code == 200
    assert res_review.json()["status"] == "APPROVED"
    assert res_review.json()["review_remarks"] == "Approved. Have a great vacation!"
