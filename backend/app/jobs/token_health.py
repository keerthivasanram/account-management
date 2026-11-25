"""
Daily Meta token health sweep.

    python -m app.jobs.token_health            # run once (schedule daily via cron / Task Scheduler / platform cron)
    python -m app.jobs.token_health --dry-run  # report only, change nothing

1. CONNECTED tokens past their expiry  -> TOKEN_EXPIRED, account owner + admins notified.
2. CONNECTED tokens expiring within the org's `token_expiry_warning_days` -> owner notified,
   at most once per account per 24 hours.
"""
import argparse
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session, joinedload

from app.models.models import AccountAssignment, AccountConnection, Employee, Notification
from app.repositories.audit_repo import AuditRepository
from app.repositories.notification_repo import NotificationRepository
from app.schemas.connection import ConnectionStatus
from app.services.org_settings_service import OrgSettingsService


def _aware(dt):
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _owners(db: Session, account) -> list:
    assigned = (db.query(AccountAssignment.employee_id)
                .filter(AccountAssignment.instagram_account_id == account.id, AccountAssignment.is_active == True)  # noqa: E712
                .all())
    ids = {a.employee_id for a in assigned} or {account.registered_by}
    return [e for e in db.query(Employee).filter(Employee.id.in_(ids), Employee.is_active == True).all()]  # noqa: E712


def _recently_warned(db: Session, recipient_id, link: str, since: datetime) -> bool:
    return db.query(Notification.id).filter(
        Notification.recipient_id == recipient_id, Notification.type == "TOKEN_EXPIRING",
        Notification.link_url == link, Notification.created_at >= since,
    ).first() is not None


def run(db: Session, dry_run: bool = False, now: datetime = None) -> dict:
    now = now or datetime.now(timezone.utc)
    warn_days = OrgSettingsService(db).get("token_expiry_warning_days")
    horizon = now + timedelta(days=warn_days)
    notes = NotificationRepository(db)
    admins = db.query(Employee).filter(Employee.role.in_(["admin", "super_admin"]), Employee.is_active == True).all()  # noqa: E712

    conns = (db.query(AccountConnection).options(joinedload(AccountConnection.account))
             .filter(AccountConnection.connection_status == ConnectionStatus.CONNECTED.value,
                     AccountConnection.token_expires_at.isnot(None)).all())
    expired, warned = [], []
    for c in conns:
        exp = _aware(c.token_expires_at)
        acc = c.account
        if acc is None:
            continue
        link = f"/accounts?search={acc.username}"
        if exp <= now:
            expired.append(acc.username)
            if dry_run:
                continue
            c.connection_status = ConnectionStatus.TOKEN_EXPIRED.value
            for person in {e.id: e for e in _owners(db, acc) + admins}.values():
                notes.create(recipient_id=person.id, title="Instagram connection expired",
                             message=f"@{acc.username} lost its Meta connection. Reconnect it to resume publishing.",
                             type="TOKEN_EXPIRED", link_url=link)
        elif exp <= horizon:
            days = max((exp - now).days, 0)
            warned.append({"username": acc.username, "days_left": days})
            if dry_run:
                continue
            for person in _owners(db, acc):
                if not _recently_warned(db, person.id, link, now - timedelta(hours=24)):
                    notes.create(recipient_id=person.id, title="Instagram connection expiring soon",
                                 message=f"@{acc.username}'s Meta token expires in {days} day(s). Reconnect to avoid interruption.",
                                 type="TOKEN_EXPIRING", link_url=link)
    if not dry_run:
        db.commit()
        AuditRepository(db).log(action="token_health_sweep", entity_type="account_connection", actor_id=None,
                                metadata={"expired": len(expired), "expiring": len(warned)})
    return {"checked": len(conns), "expired": expired, "expiring": warned, "dry_run": dry_run}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        print(json.dumps(run(db, dry_run=args.dry_run), indent=2, default=str))
    finally:
        db.close()


if __name__ == "__main__":
    main()
