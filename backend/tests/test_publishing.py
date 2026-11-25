"""Publishing: scoping, draft -> approval workflow, review rules, private media."""
import json
import uuid
from datetime import date, datetime, timedelta, timezone

import httpx
import pytest

from app.core.config import settings
from app.models.models import AccountAssignment, InstagramAccount, Notification
from app.services.storage_service import REF_PREFIX, StorageService

from tests.test_rbac_lifecycle import login, org  # noqa: F401  (fixture re-export)
from tests.test_manager_workspace import outsider  # noqa: F401

LATER = lambda days=1: (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()  # noqa: E731


def account_for(db, owner, handle):
    acc = InstagramAccount(id=uuid.uuid4(), username=handle, username_normalized=handle, profile_url="https://instagram.com/x",
                           display_name=handle, account_created_date=date(2024, 1, 1), registered_by=owner.id, status="approved")
    db.add(acc)
    db.flush()
    db.add(AccountAssignment(instagram_account_id=acc.id, employee_id=owner.id, assigned_by=owner.id, is_active=True))
    db.commit()
    return acc


def body(acc, **kw):
    return {"account_id": str(acc.id), "caption": "New drop", "media_url": "https://cdn.example.com/a.jpg",
            "media_type": "IMAGE", "scheduled_at": LATER(), **kw}


@pytest.fixture
def accts(db_session, org, outsider):
    return {"sarah": account_for(db_session, org["employee"], "sarah_brand"),
            "alex": account_for(db_session, org["employee2"], "alex_brand")}


# ----------------------------------------------------------------- scoping

def test_employee_sees_only_own_posts_and_accounts(client, org, accts):
    sarah, alex = login(client, "employee1@company.internal"), login(client, "employee2@company.internal")
    client.post("/api/v1/social/posts", json=body(accts["sarah"]), headers=sarah)
    alex_post = client.post("/api/v1/social/posts", json=body(accts["alex"]), headers=alex).json()

    mine = client.get("/api/v1/social/posts", headers=sarah).json()
    assert [p["account_username"] for p in mine] == ["sarah_brand"]
    assert client.get(f"/api/v1/social/posts/{alex_post['id']}", headers=sarah).status_code == 404
    # cannot post to someone else's account
    assert client.post("/api/v1/social/posts", json=body(accts["alex"]), headers=sarah).status_code == 404


def test_manager_sees_team_admin_sees_all(client, org, accts):
    client.post("/api/v1/social/posts", json=body(accts["sarah"]), headers=login(client, "employee1@company.internal"))
    client.post("/api/v1/social/posts", json=body(accts["alex"]), headers=login(client, "employee2@company.internal"))
    mgr = [p["account_username"] for p in client.get("/api/v1/social/posts", headers=login(client, "manager1@company.internal")).json()]
    assert mgr == ["sarah_brand"]
    admin = {p["account_username"] for p in client.get("/api/v1/social/posts", headers=login(client, "admin@company.internal")).json()}
    assert admin == {"sarah_brand", "alex_brand"}


# ----------------------------------------------------------------- workflow

def test_draft_edit_submit_reject_resubmit_approve(client, org, accts, db_session):
    sarah = login(client, "employee1@company.internal")
    admin = login(client, "admin@company.internal")

    draft = client.post("/api/v1/social/posts", json=body(accts["sarah"]), headers=sarah).json()
    assert draft["status"] == "DRAFT"
    # admins can't review a draft
    assert client.patch(f"/api/v1/social/posts/{draft['id']}/review", json={"status": "APPROVED"}, headers=admin).status_code == 409

    r = client.patch(f"/api/v1/social/posts/{draft['id']}", json={"caption": "Better caption", "submit": True}, headers=sarah)
    assert r.status_code == 200 and r.json()["status"] == "PENDING_APPROVAL" and r.json()["caption"] == "Better caption"
    # can't edit while awaiting approval
    assert client.patch(f"/api/v1/social/posts/{draft['id']}", json={"caption": "x"}, headers=sarah).status_code == 409

    # rejecting needs a reason; the reason comes back as review_note
    assert client.patch(f"/api/v1/social/posts/{draft['id']}/review", json={"status": "REJECTED"}, headers=admin).status_code == 400
    rej = client.patch(f"/api/v1/social/posts/{draft['id']}/review", json={"status": "REJECTED", "remarks": "Add the price"}, headers=admin).json()
    assert rej["status"] == "REJECTED" and rej["review_note"] == "Add the price"

    again = client.patch(f"/api/v1/social/posts/{draft['id']}", json={"caption": "Now ₹999", "submit": True}, headers=sarah).json()
    assert again["status"] == "PENDING_APPROVAL" and again["review_note"] is None
    ok = client.patch(f"/api/v1/social/posts/{draft['id']}/review", json={"status": "APPROVED"}, headers=admin).json()
    assert ok["status"] == "APPROVED"

    kinds = [n.type for n in db_session.query(Notification).filter_by(recipient_id=org["employee"].id).all()]
    assert "POST_REJECTED" in kinds and "POST_APPROVED" in kinds


def test_submitting_needs_future_time(client, org, accts):
    sarah = login(client, "employee1@company.internal")
    past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    assert client.post("/api/v1/social/posts", json=body(accts["sarah"], scheduled_at=past, submit=True), headers=sarah).status_code == 400
    # a draft may keep a past time while it's being worked on
    assert client.post("/api/v1/social/posts", json=body(accts["sarah"], scheduled_at=past), headers=sarah).status_code == 201


def test_no_self_approval_and_employees_cannot_review(client, org, accts, db_session):
    admin_acc = account_for(db_session, org["admin"], "admin_brand")
    admin = login(client, "admin@company.internal")
    own = client.post("/api/v1/social/posts", json=body(admin_acc, submit=True), headers=admin).json()
    assert client.patch(f"/api/v1/social/posts/{own['id']}/review", json={"status": "APPROVED"}, headers=admin).status_code == 403

    sarah = login(client, "employee1@company.internal")
    p = client.post("/api/v1/social/posts", json=body(accts["sarah"], submit=True), headers=sarah).json()
    assert client.patch(f"/api/v1/social/posts/{p['id']}/review", json={"status": "APPROVED"}, headers=sarah).status_code == 403


def test_withdraw_rules(client, org, accts):
    sarah, alex = login(client, "employee1@company.internal"), login(client, "employee2@company.internal")
    p = client.post("/api/v1/social/posts", json=body(accts["sarah"], submit=True), headers=sarah).json()
    assert client.delete(f"/api/v1/social/posts/{p['id']}", headers=alex).status_code == 404
    assert client.delete(f"/api/v1/social/posts/{p['id']}", headers=sarah).status_code == 204
    assert client.get(f"/api/v1/social/posts/{p['id']}", headers=sarah).status_code == 404


def test_status_filter_accepts_lists(client, org, accts):
    sarah = login(client, "employee1@company.internal")
    client.post("/api/v1/social/posts", json=body(accts["sarah"]), headers=sarah)
    client.post("/api/v1/social/posts", json=body(accts["sarah"], submit=True), headers=sarah)
    got = client.get("/api/v1/social/posts?status_filter=DRAFT,REJECTED", headers=sarah).json()
    assert [p["status"] for p in got] == ["DRAFT"]
    assert client.get("/api/v1/social/posts?status_filter=NOPE", headers=sarah).status_code == 400


# ----------------------------------------------------------------- media

def test_cannot_attach_someone_elses_upload(client, org, accts):
    sarah = login(client, "employee1@company.internal")
    foreign = f"{REF_PREFIX}{org['employee2'].id}/abc.jpg"
    assert client.post("/api/v1/social/posts", json=body(accts["sarah"], media_url=foreign), headers=sarah).status_code == 403
    own = f"{REF_PREFIX}{org['employee'].id}/abc.jpg"
    assert client.post("/api/v1/social/posts", json=body(accts["sarah"], media_url=own), headers=sarah).status_code == 201


def _fake_storage(calls):
    def handler(request: httpx.Request):
        calls.append((request.method, request.url.path))
        path = request.url.path
        if request.method == "GET" and path.endswith("/bucket/post-media"):
            return httpx.Response(404, json={"error": "not found"})
        if request.method == "POST" and path.endswith("/bucket"):
            assert json.loads(request.content)["public"] is False
            return httpx.Response(200, json={"name": "post-media"})
        if request.method == "POST" and "/object/sign/" in path:
            return httpx.Response(200, json={"signedURL": "/object/sign/post-media/x?token=t"})
        if request.method == "POST" and "/object/post-media/" in path:
            return httpx.Response(200, json={"Key": "ok"})
        return httpx.Response(500)
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_storage_upload_uses_private_bucket_and_owner_folder(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "service-key")
    calls = []
    owner = uuid.uuid4()
    out = StorageService(client=_fake_storage(calls)).upload(b"\xff\xd8img", "image/jpeg", owner)
    assert out["media_ref"].startswith(f"{REF_PREFIX}{owner}/") and out["kind"] == "IMAGE"
    assert out["preview_url"].startswith("https://proj.supabase.co/storage/v1/object/sign/")
    assert ("POST", "/storage/v1/bucket") in calls  # created private bucket on first use


@pytest.mark.parametrize("ctype,data,code", [
    ("application/pdf", b"%PDF", 415),
    ("image/png", b"", 400),
])
def test_storage_rejects_bad_files(monkeypatch, ctype, data, code):
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "service-key")
    with pytest.raises(Exception) as exc:
        StorageService(client=_fake_storage([])).upload(data, ctype, uuid.uuid4())
    assert getattr(exc.value, "status_code", None) == code
