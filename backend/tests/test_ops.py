"""Phase 6: scheduled token-health sweep."""
from datetime import datetime, timedelta, timezone

from app.jobs.token_health import run
from app.models.models import AccountConnection, InstagramAccount, Notification
from tests.test_rbac_lifecycle import give_account, org  # noqa: F401


def _connect(db, acc, days):
    db.add(AccountConnection(instagram_account_id=acc.id, connection_status="CONNECTED",
                             token_expires_at=datetime.now(timezone.utc) + timedelta(days=days)))


def test_token_sweep_expires_and_warns_once(org, db_session):
    give_account(db_session, org["employee"], 3)
    a, b, c = db_session.query(InstagramAccount).order_by(InstagramAccount.username).all()
    _connect(db_session, a, -1)   # expired
    _connect(db_session, b, 3)    # inside the 7-day window
    _connect(db_session, c, 30)   # healthy
    db_session.commit()

    dry = run(db_session, dry_run=True)
    assert dry["expired"] == [a.username] and len(dry["expiring"]) == 1
    assert db_session.query(Notification).count() == 0

    res = run(db_session)
    assert res["checked"] == 3
    db_session.expire_all()
    assert db_session.query(AccountConnection).filter_by(instagram_account_id=a.id).one().connection_status == "TOKEN_EXPIRED"
    sarah = org["employee"].id
    assert db_session.query(Notification).filter_by(recipient_id=sarah, type="TOKEN_EXPIRED").count() == 1
    assert db_session.query(Notification).filter_by(recipient_id=org["admin"].id, type="TOKEN_EXPIRED").count() == 1
    assert db_session.query(Notification).filter_by(recipient_id=sarah, type="TOKEN_EXPIRING").count() == 1

    run(db_session)  # second run the same day: no duplicate warning, expired already handled
    assert db_session.query(Notification).filter_by(recipient_id=sarah, type="TOKEN_EXPIRING").count() == 1
    assert db_session.query(Notification).filter_by(recipient_id=sarah, type="TOKEN_EXPIRED").count() == 1
