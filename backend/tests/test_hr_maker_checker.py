"""Step 4: Junior HR prepares, Senior HR approves (long leave, role and team changes)."""
from datetime import date, timedelta

from app.models.models import Notification

from tests.test_rbac_lifecycle import login, org  # noqa: F401
from tests.test_hr import hr  # noqa: F401


def leave(client, headers, days):
    start = date.today() + timedelta(days=10)
    return client.post("/api/v1/attendance/leaves", json={"leave_type": "ANNUAL", "start_date": start.isoformat(),
                                                          "end_date": (start + timedelta(days=days - 1)).isoformat(),
                                                          "reason": "Trip home"}, headers=headers).json()


def test_junior_hr_leave_limit(client, org, hr):
    alex = login(client, "employee2@company.internal")   # no team lead: HR decides
    short = leave(client, alex, 2)
    j = login(client, "hr.junior@company.internal")
    assert client.patch(f"/api/v1/attendance/leaves/{short['id']}/review", json={"status": "APPROVED"}, headers=j).status_code == 200
    # a 5-day request (over the 3-day limit) needs Senior HR
    five = client.post("/api/v1/attendance/leaves", json={"leave_type": "ANNUAL", "start_date": (date.today() + timedelta(days=20)).isoformat(),
                                                          "end_date": (date.today() + timedelta(days=24)).isoformat(), "reason": "Wedding"},
                       headers=alex).json()
    ov = client.get("/api/v1/hr/overview", headers=j).json()
    item = next(l for l in ov["waiting"]["leaves"] if l["id"] == five["id"])
    assert item["can_decide"] is False
    r = client.patch(f"/api/v1/attendance/leaves/{five['id']}/review", json={"status": "APPROVED"}, headers=j)
    assert r.status_code == 403 and "Senior HR" in r.json()["detail"]
    s = login(client, "hr.senior@company.internal")
    assert client.patch(f"/api/v1/attendance/leaves/{five['id']}/review", json={"status": "APPROVED"}, headers=s).status_code == 200


def test_role_change_request_flow(client, org, hr, db_session):
    j = login(client, "hr.junior@company.internal")
    body = {"employee_id": str(org["employee2"].id), "kind": "ROLE", "role": "manager", "reason": "Leading the new video team"}
    r = client.post("/api/v1/hr/change-requests", json=body, headers=j)
    assert r.status_code == 201, r.text
    req = r.json()
    assert req["summary"] == "Make Alex Rivera Team Lead" and req["can_review"] is False and req["mine"]
    assert client.post("/api/v1/hr/change-requests", json=body, headers=j).status_code == 409      # duplicate
    assert db_session.query(Notification).filter_by(recipient_id=hr["senior"].id, type="PEOPLE_CHANGE_REQUESTED").count() == 1
    # Junior HR can't approve; Senior HR sees it as reviewable
    assert client.patch(f"/api/v1/hr/change-requests/{req['id']}/review", json={"status": "APPROVED"}, headers=j).status_code == 403
    s = login(client, "hr.senior@company.internal")
    pending = client.get("/api/v1/hr/change-requests?status=PENDING", headers=s).json()
    assert [p["id"] for p in pending] == [req["id"]] and pending[0]["can_review"]
    r = client.patch(f"/api/v1/hr/change-requests/{req['id']}/review", json={"status": "APPROVED"}, headers=s)
    assert r.status_code == 200 and r.json()["status"] == "APPROVED"
    db_session.refresh(org["employee2"])
    assert org["employee2"].role == "manager"
    assert db_session.query(Notification).filter_by(recipient_id=hr["junior"].id, type="PEOPLE_CHANGE_REVIEWED").count() == 1


def test_team_change_request_applies_move(client, org, hr, db_session):
    j = login(client, "hr.junior@company.internal")
    r = client.post("/api/v1/hr/change-requests", json={"employee_id": str(org["employee2"].id), "kind": "TEAM",
                                                        "manager_id": str(org["manager"].id), "reason": "Joins marketing"}, headers=j).json()
    assert r["summary"] == "Move Alex Rivera to Priya Manager's team"
    s = login(client, "hr.senior@company.internal")
    assert client.patch(f"/api/v1/hr/change-requests/{r['id']}/review", json={"status": "REJECTED"}, headers=s).status_code == 400
    assert client.patch(f"/api/v1/hr/change-requests/{r['id']}/review", json={"status": "APPROVED"}, headers=s).status_code == 200
    db_session.refresh(org["employee2"])
    assert org["employee2"].manager_id == org["manager"].id


def test_change_request_rules(client, org, hr):
    j = login(client, "hr.junior@company.internal")
    post = lambda **b: client.post("/api/v1/hr/change-requests", json={"reason": "Because", **b}, headers=j)
    assert post(employee_id=str(org["admin"].id), kind="ROLE", role="employee").status_code == 403      # admins off-limits
    assert post(employee_id=str(org["employee"].id), kind="ROLE", role="admin").status_code == 400      # only Employee / Team Lead
    assert post(employee_id=str(org["employee"].id), kind="TEAM", manager_id=str(org["employee2"].id)).status_code == 400  # not a lead
    assert post(employee_id=str(org["employee"].id), kind="TEAM").status_code == 400                    # nothing asked
    assert client.get("/api/v1/hr/change-requests", headers=login(client, "employee1@company.internal")).status_code == 403
    # Senior HR files one; they can't approve their own
    s = login(client, "hr.senior@company.internal")
    r = client.post("/api/v1/hr/change-requests", json={"employee_id": str(org["employee"].id), "kind": "TEAM",
                                                        "remove_from_team": True, "reason": "Moving to a new project"}, headers=s).json()
    assert client.patch(f"/api/v1/hr/change-requests/{r['id']}/review", json={"status": "APPROVED"}, headers=s).status_code == 403
