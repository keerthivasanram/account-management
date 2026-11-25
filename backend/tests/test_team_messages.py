"""Team messages: who you can message, direct chats (dedupe + titles), group rules."""
import uuid

from app.models.models import Department

from tests.test_rbac_lifecycle import login, org  # noqa: F401  (fixture re-export)
from tests.test_manager_workspace import outsider  # noqa: F401


def names(client, headers):
    return {c["full_name"] for c in client.get("/api/v1/chat/contacts", headers=headers).json()}


def test_employee_contacts_are_manager_and_department(client, org, outsider, db_session):
    dept = Department(id=uuid.uuid4(), name="Marketing", code="MKT")
    db_session.add(dept)
    db_session.flush()
    org["employee"].department_id = dept.id
    org["admin"].department_id = dept.id
    db_session.commit()
    sarah = login(client, "employee1@company.internal")
    got = names(client, sarah)
    assert "Priya Manager" in got and org["admin"].full_name in got     # manager + department colleague
    assert "Alex Rivera" not in got and "Other Manager" not in got       # other teams
    assert len(names(client, login(client, "admin@company.internal"))) >= 4  # admins reach everyone


def test_direct_chat_works_dedupes_and_titles_for_each_side(client, org):
    sarah = login(client, "employee1@company.internal")
    mgr = login(client, "manager1@company.internal")
    r = client.post("/api/v1/chat/conversations", json={"type": "DIRECT", "member_ids": [str(org["manager"].id)]}, headers=sarah)
    assert r.status_code == 201, r.text
    again = client.post("/api/v1/chat/conversations", json={"type": "DIRECT", "member_ids": [str(org["manager"].id)]}, headers=sarah)
    assert again.json()["id"] == r.json()["id"]
    client.post(f"/api/v1/chat/conversations/{r.json()['id']}/messages", json={"content": "Can you check the caption?"}, headers=sarah)
    assert [c["title"] for c in client.get("/api/v1/chat/conversations", headers=sarah).json()] == ["Priya Manager"]
    assert [c["title"] for c in client.get("/api/v1/chat/conversations", headers=mgr).json()] == ["Sarah Jenkins"]


def test_cannot_message_outside_contacts(client, org, outsider):
    sarah = login(client, "employee1@company.internal")
    r = client.post("/api/v1/chat/conversations", json={"type": "DIRECT", "member_ids": [str(outsider.id)]}, headers=sarah)
    assert r.status_code == 403


def test_group_rules(client, org):
    sarah = login(client, "employee1@company.internal")
    mgr = login(client, "manager1@company.internal")
    assert client.post("/api/v1/chat/conversations", json={"type": "PROJECT", "title": "Launch"}, headers=sarah).status_code == 403
    assert client.post("/api/v1/chat/conversations", json={"type": "ANNOUNCEMENT", "title": "All"}, headers=mgr).status_code == 403
    assert client.post("/api/v1/chat/conversations", json={"type": "PROJECT", "title": "Launch",
                                                           "member_ids": [str(org["employee2"].id)]}, headers=mgr).status_code == 403
    r = client.post("/api/v1/chat/conversations", json={"type": "PROJECT", "title": "Launch",
                                                       "member_ids": [str(org["employee"].id)]}, headers=mgr)
    assert r.status_code == 201 and r.json()["member_count"] == 2
