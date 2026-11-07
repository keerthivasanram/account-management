import pytest
import uuid

def test_milestone1_end_to_end_workspace_workflow(client, seed_data):
    admin_headers = {"Authorization": "Bearer dev-token-admin"}
    emp_headers = {"Authorization": "Bearer dev-token-employee-1"}

    # 1. Super Admin creates Department
    dept_resp = client.post("/api/v1/departments", json={
        "name": "Creative Content & Production",
        "code": "CCP",
        "description": "Video editors, copywriters, and content producers"
    }, headers=admin_headers)
    assert dept_resp.status_code == 201
    dept_id = dept_resp.json()["id"]
    assert dept_resp.json()["code"] == "CCP"

    # 2. Super Admin creates Project
    proj_resp = client.post("/api/v1/projects", json={
        "name": "Winter 2026 Creative Sprint",
        "description": "Short-form video assets for holiday campaign",
        "department_id": dept_id,
        "priority": "HIGH"
    }, headers=admin_headers)
    assert proj_resp.status_code == 201
    proj_id = proj_resp.json()["id"]

    # 3. Manager/Admin creates & assigns Task to employee
    emp_id = str(seed_data["employee"].id)
    task_resp = client.post("/api/v1/tasks", json={
        "project_id": proj_id,
        "title": "Produce 5 TikTok / Reels Short Videos",
        "description": "4K 60fps vertical videos highlighting winter collection.",
        "assigned_to": emp_id,
        "priority": "URGENT",
        "due_date": "2026-12-15"
    }, headers=admin_headers)
    assert task_resp.status_code == 201
    task_id = task_resp.json()["id"]
    assert task_resp.json()["status"] == "TODO"

    # Verify notification was generated for the assignee
    notif_resp = client.get("/api/v1/notifications", headers=emp_headers)
    assert notif_resp.status_code == 200
    notifs = notif_resp.json()
    assert any("Produce 5 TikTok" in n["title"] or "Produce 5 TikTok" in n["message"] for n in notifs)

    # 4. Employee starts task
    start_resp = client.post(f"/api/v1/tasks/{task_id}/start", headers=emp_headers)
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "IN_PROGRESS"

    # 5. Employee submits task for manager review
    submit_resp = client.post(
        f"/api/v1/tasks/{task_id}/submit",
        json={"deliverable_notes": "All 5 videos rendered and uploaded to creative asset library."},
        headers=emp_headers
    )
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "IN_REVIEW"

    # 6. Separation of duties: Assigned employee cannot approve their own task
    self_appr_resp = client.post(
        f"/api/v1/tasks/{task_id}/approve",
        json={"remarks": "Self approving"},
        headers=emp_headers
    )
    assert self_appr_resp.status_code == 403

    # 7. Manager/Admin reviews and approves task
    appr_resp = client.post(
        f"/api/v1/tasks/{task_id}/approve",
        json={"remarks": "Superb editing and color grading. Approved for scheduling."},
        headers=admin_headers
    )
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "APPROVED"

    # 8. Verify immutable task activity history
    get_task_resp = client.get(f"/api/v1/tasks/{task_id}", headers=admin_headers)
    assert get_task_resp.status_code == 200
    task_data = get_task_resp.json()
    actions = [ev["action"] for ev in task_data["activity_events"]]
    assert "CREATED" in actions
    assert "STARTED" in actions
    assert "SUBMITTED_FOR_REVIEW" in actions
    assert "APPROVED" in actions

    # 9. Test Security Incident Reporting (Screen capture attempt)
    inc_resp = client.post(
        "/api/v1/security/incidents",
        json={
            "event_type": "SCREENSHOT_KEY_DETECTED",
            "route": "/tasks",
            "key_combination": "PrintScreen"
        },
        headers=emp_headers
    )
    assert inc_resp.status_code == 201
    assert inc_resp.json()["status"] == "incident_recorded"

    # 10. Test Device Registration
    dev_resp = client.post(
        "/api/v1/security/devices/register",
        json={
            "device_name": "MacBook Pro M3 (Sarah)",
            "device_fingerprint": "fp_sarah_mbp_test_123",
            "browser": "Chrome 126",
            "os": "macOS Sonoma"
        },
        headers=emp_headers
    )
    assert dev_resp.status_code == 200
    assert dev_resp.json()["status"] == "APPROVED"
