"""Team lead (role value 'manager'): team-scoped post review, account approval, reassignment."""
import uuid
from datetime import date, datetime, timedelta, timezone

from app.models.models import AccountAssignment, AccountVerification, InstagramAccount, Notification, ScheduledPost

from tests.test_rbac_lifecycle import login, org  # noqa: F401  (fixture re-export)
from tests.test_manager_workspace import outsider  # noqa: F401


def account(db, owner, handle, decided=False):
    acc = InstagramAccount(id=uuid.uuid4(), username=handle, username_normalized=handle, profile_url="https://instagram.com/x",
                           display_name=handle, account_created_date=date(2024, 1, 1), registered_by=owner.id, status="pending_connection")
    db.add(acc)
    db.flush()
    db.add(AccountAssignment(instagram_account_id=acc.id, employee_id=owner.id, assigned_by=owner.id, is_active=True))
    db.add(AccountVerification(instagram_account_id=acc.id, approval_status="approved" if decided else "pending"))
    db.commit()
    return acc


def pending_post(db, acc, author):
    p = ScheduledPost(id=uuid.uuid4(), account_id=acc.id, created_by=author.id, caption="Launch", media_url="https://x/a.jpg",
                      media_type="IMAGE", scheduled_at=datetime.now(timezone.utc) + timedelta(days=1), status="PENDING_APPROVAL")
    db.add(p)
    db.commit()
    return p


def test_role_is_shown_as_team_lead(client, org):
    me = client.get("/api/v1/auth/me", headers=login(client, "manager1@company.internal")).json()
    assert me["role"] == "manager" and me["role_label"] == "Team Lead"


# ----------------------------------------------------------------- posts

def test_team_lead_reviews_own_team_posts_only(client, org, outsider, db_session):
    sarah_post = pending_post(db_session, account(db_session, org["employee"], "sarah_b"), org["employee"])
    alex_post = pending_post(db_session, account(db_session, org["employee2"], "alex_b"), org["employee2"])
    lead = login(client, "manager1@company.internal")

    listed = {p["account_username"]: p["can_review"] for p in client.get("/api/v1/social/posts", headers=lead).json()}
    assert listed == {"sarah_b": True}
    assert client.patch(f"/api/v1/social/posts/{alex_post.id}/review", json={"status": "APPROVED"}, headers=lead).status_code == 404
    r = client.patch(f"/api/v1/social/posts/{sarah_post.id}/review", json={"status": "APPROVED"}, headers=lead)
    assert r.status_code == 200 and r.json()["status"] == "APPROVED"
    # employees still can't review
    sarah = login(client, "employee1@company.internal")
    p2 = pending_post(db_session, account(db_session, org["employee"], "sarah_c"), org["employee"])
    assert client.patch(f"/api/v1/social/posts/{p2.id}/review", json={"status": "APPROVED"}, headers=sarah).status_code == 403


def test_approvals_inbox_includes_posts_and_account_requests(client, org, db_session):
    acc = account(db_session, org["employee"], "sarah_req")
    pending_post(db_session, account(db_session, org["employee"], "sarah_p", decided=True), org["employee"])
    inbox = client.get("/api/v1/manager/approvals", headers=login(client, "manager1@company.internal")).json()
    assert [p["account_username"] for p in inbox["posts"]] == ["sarah_p"]
    assert [a["username"] for a in inbox["accounts"]] == ["sarah_req"]
    ov = client.get("/api/v1/manager/overview", headers=login(client, "manager1@company.internal")).json()
    assert ov["pending_post_reviews"] == 1 and ov["pending_account_requests"] == 1
    assert acc.id


# ----------------------------------------------------------------- account requests

def test_team_lead_approves_team_account_requests(client, org, outsider, db_session):
    mine = account(db_session, org["employee"], "sarah_new")
    other = account(db_session, org["employee2"], "alex_new")
    lead = login(client, "manager1@company.internal")
    assert [a["username"] for a in client.get("/api/v1/manager/account-requests", headers=lead).json()] == ["sarah_new"]
    assert client.patch(f"/api/v1/manager/accounts/{other.id}/approval", json={"approval_status": "approved"}, headers=lead).status_code == 404
    assert client.patch(f"/api/v1/manager/accounts/{mine.id}/approval", json={"approval_status": "rejected"}, headers=lead).status_code == 400
    r = client.patch(f"/api/v1/manager/accounts/{mine.id}/approval", json={"approval_status": "approved"}, headers=lead)
    assert r.status_code == 200, r.text
    assert client.patch(f"/api/v1/manager/accounts/{mine.id}/approval", json={"approval_status": "approved"}, headers=lead).status_code == 409
    assert db_session.query(Notification).filter_by(recipient_id=org["employee"].id, type="ACCOUNT_APPROVED").count() == 1
    assert client.get("/api/v1/manager/account-requests", headers=lead).json() == []
    # employees have no access to the team endpoints
    assert client.get("/api/v1/manager/account-requests", headers=login(client, "employee1@company.internal")).status_code == 403


def test_team_lead_cannot_approve_own_account(client, org, db_session):
    own = account(db_session, org["manager"], "lead_own")
    # the lead isn't in their own team list, so it isn't offered; and a direct call is refused
    r = client.patch(f"/api/v1/manager/accounts/{own.id}/approval", json={"approval_status": "approved"}, headers=login(client, "manager1@company.internal"))
    assert r.status_code == 403


# ----------------------------------------------------------------- reassignment

def test_reassign_within_team_only(client, org, outsider, db_session):
    acc = account(db_session, org["employee"], "sarah_move", decided=True)
    lead = login(client, "manager1@company.internal")
    names = {a["username"]: a["assignee_name"] for a in client.get("/api/v1/manager/accounts", headers=lead).json()}
    assert names == {"sarah_move": "Sarah Jenkins"}
    # can't send it outside the team
    assert client.post(f"/api/v1/manager/accounts/{acc.id}/assign", json={"employee_id": str(org["employee2"].id)}, headers=lead).status_code == 403
    # can take it over themselves (they're part of their own team for this purpose)
    r = client.post(f"/api/v1/manager/accounts/{acc.id}/assign", json={"employee_id": str(org["manager"].id)}, headers=lead)
    assert r.status_code == 200, r.text
    assert db_session.query(Notification).filter_by(recipient_id=org["manager"].id, type="ACCOUNT_ASSIGNED").count() == 1
    # accounts outside the team are invisible
    alex_acc = account(db_session, org["employee2"], "alex_move", decided=True)
    assert client.post(f"/api/v1/manager/accounts/{alex_acc.id}/assign", json={"employee_id": str(org["employee"].id)}, headers=lead).status_code == 404
