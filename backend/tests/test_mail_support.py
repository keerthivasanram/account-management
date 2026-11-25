"""Mail (own inbox, categories, search, archive, notices) and Help & support tickets."""
import uuid
from datetime import date

from app.models.models import Department, InstagramAccount, Notification

from tests.test_rbac_lifecycle import login, org  # noqa: F401  (fixture re-export)


def note(db, who, title, kind="INFO", message="m"):
    n = Notification(id=uuid.uuid4(), recipient_id=who.id, title=title, message=message, type=kind, is_read=False)
    db.add(n)
    db.commit()
    return n


# ----------------------------------------------------------------- mail

def test_mail_is_private_and_categorised(client, org, db_session):
    note(db_session, org["employee"], "Account approved: @north", "ACCOUNT_APPROVED")
    note(db_session, org["employee"], "New task", "TASK_ASSIGNED")
    other = note(db_session, org["employee2"], "Alex only", "INFO")
    sarah = login(client, "employee1@company.internal")

    inbox = client.get("/api/v1/mail", headers=sarah).json()
    assert {m["title"] for m in inbox} == {"Account approved: @north", "New task"}
    assert {m["category"] for m in inbox} == {"approvals", "assignments"}
    assert [m["title"] for m in client.get("/api/v1/mail?category=approvals", headers=sarah).json()] == ["Account approved: @north"]
    assert [m["title"] for m in client.get("/api/v1/mail?q=TASK", headers=sarah).json()] == ["New task"]
    # can't touch someone else's mail
    assert client.patch(f"/api/v1/mail/{other.id}", json={"is_read": True}, headers=sarah).status_code == 404
    assert client.get("/api/v1/mail/unread-count", headers=sarah).json() == {"unread": 2}


def test_archive_moves_out_of_inbox_and_bell(client, org, db_session):
    n = note(db_session, org["employee"], "Old notice", "NOTICE")
    sarah = login(client, "employee1@company.internal")
    r = client.patch(f"/api/v1/mail/{n.id}", json={"archived": True}, headers=sarah).json()
    assert r["archived"] and r["is_read"]
    assert client.get("/api/v1/mail", headers=sarah).json() == []
    assert [m["title"] for m in client.get("/api/v1/mail?folder=archived", headers=sarah).json()] == ["Old notice"]
    assert client.get("/api/v1/notifications", headers=sarah).json() == []  # bell/dashboard hide archived too
    client.patch(f"/api/v1/mail/{n.id}", json={"archived": False}, headers=sarah)
    assert len(client.get("/api/v1/mail", headers=sarah).json()) == 1


def test_read_all(client, org, db_session):
    for i in range(3):
        note(db_session, org["employee"], f"n{i}")
    sarah = login(client, "employee1@company.internal")
    assert client.post("/api/v1/mail/read-all", headers=sarah).json() == {"updated": 3}
    assert client.get("/api/v1/mail/unread-count", headers=sarah).json() == {"unread": 0}


def test_notices_admin_only_and_department_scoped(client, org, db_session):
    dept = Department(id=uuid.uuid4(), name="Marketing", code="MKT")
    db_session.add(dept)
    db_session.flush()
    org["employee"].department_id = dept.id
    db_session.commit()

    sarah = login(client, "employee1@company.internal")
    assert client.post("/api/v1/mail/notices", json={"title": "Hi", "message": "x"}, headers=sarah).status_code == 403

    admin = login(client, "admin@company.internal")
    r = client.post("/api/v1/mail/notices", json={"title": "Team offsite", "message": "Friday 4pm", "department_id": str(dept.id)}, headers=admin)
    assert r.status_code == 201 and r.json() == {"recipients": 1, "audience": "Marketing"}
    got = client.get("/api/v1/mail?category=notices", headers=sarah).json()
    assert got[0]["title"] == "Team offsite" and "Friday 4pm" in got[0]["message"]
    assert client.get("/api/v1/mail?category=notices", headers=login(client, "employee2@company.internal")).json() == []
    sent = client.get("/api/v1/mail/notices/sent", headers=admin).json()
    assert sent[0]["title"] == "Team offsite" and sent[0]["recipients"] == 1


def test_account_decision_and_assignment_reach_mail(client, org, db_session):
    acc = InstagramAccount(id=uuid.uuid4(), username="fernmarket", username_normalized="fernmarket", profile_url="https://instagram.com/x",
                           display_name="Fern", account_created_date=date(2024, 1, 1), registered_by=org["employee"].id, status="pending_approval")
    db_session.add(acc)
    db_session.commit()
    admin = login(client, "admin@company.internal")
    r = client.patch(f"/api/v1/admin/accounts/{acc.id}/approval", json={"approval_status": "approved"}, headers=admin)
    assert r.status_code == 200, r.text
    sarah = login(client, "employee1@company.internal")
    titles = [m["title"] for m in client.get("/api/v1/mail?category=approvals", headers=sarah).json()]
    assert "Account approved: @fernmarket" in titles

    r = client.post(f"/api/v1/admin/accounts/{acc.id}/assign", json={"employee_id": str(org["employee2"].id)}, headers=admin)
    assert r.status_code == 200, r.text
    alex = login(client, "employee2@company.internal")
    assert [m["title"] for m in client.get("/api/v1/mail?category=assignments", headers=alex).json()] == ["Account assigned: @fernmarket"]


# ----------------------------------------------------------------- support

def test_ticket_lifecycle(client, org, db_session):
    sarah = login(client, "employee1@company.internal")
    admin = login(client, "admin@company.internal")
    t = client.post("/api/v1/support/tickets", json={"category": "publishing", "subject": "Reel won't upload",
                                                     "description": "It says file too large"}, headers=sarah).json()
    assert t["reference"].startswith("SUP-") and t["status"] == "OPEN" and t["category"] == "PUBLISHING"

    # others can't see it; employees can't list everything
    alex = login(client, "employee2@company.internal")
    assert client.get(f"/api/v1/support/tickets/{t['id']}", headers=alex).status_code == 404
    assert client.get("/api/v1/support/tickets?scope=all", headers=sarah).status_code == 403

    # support replies -> in progress, assigned, requester gets mail
    r = client.post(f"/api/v1/support/tickets/{t['id']}/messages", json={"body": "Reels must be under 50 MB."}, headers=admin).json()
    assert r["status"] == "IN_PROGRESS" and r["assignee_name"] and r["messages"][0]["from_support"]
    assert any(m["category"] == "support" for m in client.get("/api/v1/mail", headers=sarah).json())

    # requester can't change status except close
    assert client.patch(f"/api/v1/support/tickets/{t['id']}", json={"status": "RESOLVED"}, headers=sarah).status_code == 403
    client.patch(f"/api/v1/support/tickets/{t['id']}", json={"status": "RESOLVED"}, headers=admin)
    # replying to a resolved ticket reopens it
    assert client.post(f"/api/v1/support/tickets/{t['id']}/messages", json={"body": "Still failing"}, headers=sarah).json()["status"] == "OPEN"
    assert client.patch(f"/api/v1/support/tickets/{t['id']}", json={"status": "CLOSED"}, headers=sarah).json()["status"] == "CLOSED"
    assert client.post(f"/api/v1/support/tickets/{t['id']}/messages", json={"body": "x"}, headers=sarah).status_code == 409

    assert [x["reference"] for x in client.get("/api/v1/support/tickets", headers=sarah).json()] == [t["reference"]]
    assert len(client.get("/api/v1/support/tickets?scope=all", headers=admin).json()) == 1


def test_ticket_attachment_must_be_own_upload(client, org):
    sarah = login(client, "employee1@company.internal")
    foreign = f"storage:post-media/{org['employee2'].id}/x.png"
    r = client.post("/api/v1/support/tickets", json={"subject": "Help me", "description": "Screenshot attached",
                                                     "attachment_ref": foreign}, headers=sarah)
    assert r.status_code == 403
    r = client.post("/api/v1/support/tickets", json={"subject": "Help me", "description": "Screenshot attached",
                                                     "attachment_ref": "https://evil.example/x.png"}, headers=sarah)
    assert r.status_code == 400
