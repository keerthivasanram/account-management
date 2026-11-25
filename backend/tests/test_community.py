"""Kudos, work anniversaries, content idea of the day."""
from datetime import date

from app.models.models import Notification
from app.services.community_service import idea_for, next_anniversary

from tests.test_rbac_lifecycle import login, org  # noqa: F401  (fixture re-export)
from tests.test_manager_workspace import outsider  # noqa: F401


def test_idea_rotates_daily_and_admins_can_edit(client, org):
    assert idea_for(["a", "b", "c"], date(2026, 11, 25)) != idea_for(["a", "b", "c"], date(2026, 11, 26))
    assert idea_for([], date(2026, 11, 25)) is None
    sarah = login(client, "employee1@company.internal")
    assert client.get("/api/v1/community/today", headers=sarah).json()["idea"]

    founder = login(client, "founder@company.internal")
    r = client.put("/api/v1/super-admin/settings", json={"content_ideas": ["  Only idea  ", ""]}, headers=founder)
    assert r.status_code == 200, r.text
    assert client.get("/api/v1/community/today", headers=sarah).json()["idea"] == "Only idea"
    assert client.put("/api/v1/super-admin/settings", json={"content_ideas": "nope"}, headers=founder).status_code == 400
    assert client.put("/api/v1/super-admin/settings", json={"content_ideas": ["x" * 281]}, headers=founder).status_code == 400


def test_kudos_to_colleague_notifies_and_shows_in_feed(client, org, db_session):
    sarah = login(client, "employee1@company.internal")
    r = client.post("/api/v1/community/kudos", json={"to_id": str(org["manager"].id), "message": "Thanks for the quick review!"}, headers=sarah)
    assert r.status_code == 201, r.text
    n = db_session.query(Notification).filter_by(recipient_id=org["manager"].id, type="KUDOS").one()
    assert "Sarah Jenkins" in n.title
    mgr = login(client, "manager1@company.internal")
    feed = client.get("/api/v1/community/today", headers=mgr).json()["kudos"]
    assert feed[0]["for_me"] and feed[0]["from_name"] == "Sarah Jenkins"
    assert [m["category"] for m in client.get("/api/v1/mail", headers=mgr).json()] == ["kudos"]


def test_kudos_rules(client, org, outsider):
    sarah = login(client, "employee1@company.internal")
    send = lambda to, msg="Great work": client.post("/api/v1/community/kudos", json={"to_id": str(to), "message": msg}, headers=sarah)
    assert send(org["employee"].id).status_code == 400            # not yourself
    assert send(outsider.id).status_code == 403                   # not outside your circle
    assert send(org["manager"].id, "   ").status_code == 400      # needs a message
    for _ in range(10):
        assert send(org["manager"].id).status_code == 201
    assert send(org["manager"].id).status_code == 429             # daily cap


def test_feed_scoped_to_people_you_work_with(client, org, outsider):
    alex = login(client, "employee2@company.internal")
    client.post("/api/v1/community/kudos", json={"to_id": str(outsider.id), "message": "Nice"}, headers=alex)
    sarah = login(client, "employee1@company.internal")
    assert client.get("/api/v1/community/today", headers=sarah).json()["kudos"] == []
    admin = login(client, "admin@company.internal")
    assert len(client.get("/api/v1/community/today", headers=admin).json()["kudos"]) == 1


def test_anniversaries(client, org, db_session):
    assert next_anniversary(date(2024, 2, 29), date(2026, 2, 1)) == date(2026, 2, 28)
    assert next_anniversary(date(2020, 1, 10), date(2026, 11, 25)) == date(2027, 1, 10)
    today = date.today()
    org["manager"].joined_on = today.replace(year=today.year - 3) if not (today.month == 2 and today.day == 29) else date(today.year - 3, 2, 28)
    org["employee"].joined_on = today  # joined today: no anniversary yet
    db_session.commit()
    sarah = login(client, "employee1@company.internal")
    cel = client.get("/api/v1/community/today", headers=sarah).json()["celebrations"]
    assert [(c["full_name"], c["years"], c["is_today"]) for c in cel] == [("Priya Manager", 3, True)]


def test_switch_off_hides_kudos_and_celebrations(client, org):
    founder = login(client, "founder@company.internal")
    client.put("/api/v1/super-admin/settings", json={"community_features": False}, headers=founder)
    sarah = login(client, "employee1@company.internal")
    t = client.get("/api/v1/community/today", headers=sarah).json()
    assert t["community_enabled"] is False and t["kudos"] == [] and t["idea"]
    assert client.post("/api/v1/community/kudos", json={"to_id": str(org["manager"].id), "message": "x"}, headers=sarah).status_code == 404
