"""Light community features: content idea of the day, kudos, work anniversaries.

Visibility follows Team messages contacts: you see kudos and anniversaries for the people you
work with (manager, department, team) and yourself; administrators see the whole company.
Kudos and anniversaries can be switched off company-wide (community_features).
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Set

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import Perm, has_permission
from app.models.models import Employee, Kudos
from app.repositories.audit_repo import AuditRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.chat_contacts import contacts_for
from app.services.org_settings_service import OrgSettingsService

KUDOS_PER_DAY = 10
WINDOW_DAYS = 7


def idea_for(ideas: List[str], day: date) -> Optional[str]:
    return ideas[day.toordinal() % len(ideas)] if ideas else None


def next_anniversary(joined: date, today: date) -> Optional[date]:
    """This year's anniversary (or next year's if it has passed); Feb 29 falls on Feb 28."""
    def on(year):
        try:
            return joined.replace(year=year)
        except ValueError:
            return date(year, 2, 28)
    d = on(today.year)
    return d if d >= today else on(today.year + 1)


class CommunityService:
    def __init__(self, db: Session):
        self.db = db
        self.org = OrgSettingsService(db)

    def enabled(self) -> bool:
        return bool(self.org.get("community_features"))

    def _require_enabled(self):
        if not self.enabled():
            raise HTTPException(status_code=404, detail="Kudos and celebrations are turned off for this company.")

    def _visible_ids(self, me: Employee) -> Optional[Set[uuid.UUID]]:
        """None = everyone (admins)."""
        if has_permission(me, Perm.ADMIN_PORTAL):
            return None
        return {e.id for e in contacts_for(self.db, me)} | {me.id}

    # ------------------------------------------------------------------ idea

    def idea_today(self, today: Optional[date] = None) -> dict:
        ideas = self.org.get("content_ideas") or []
        today = today or date.today()
        return {"date": today, "idea": idea_for(ideas, today)}

    # ------------------------------------------------------------------ anniversaries

    def celebrations(self, me: Employee, today: Optional[date] = None) -> List[dict]:
        self._require_enabled()
        today = today or date.today()
        q = self.db.query(Employee).filter(Employee.is_active == True, Employee.joined_on.isnot(None))  # noqa: E712
        ids = self._visible_ids(me)
        if ids is not None:
            q = q.filter(Employee.id.in_(ids))
        out = []
        for e in q.all():
            when = next_anniversary(e.joined_on, today)
            years = when.year - e.joined_on.year
            if years >= 1 and (when - today).days < WINDOW_DAYS:
                out.append({"employee_id": e.id, "full_name": e.full_name, "years": years, "date": when,
                            "is_today": when == today, "is_me": e.id == me.id})
        return sorted(out, key=lambda x: (x["date"], x["full_name"]))

    # ------------------------------------------------------------------ kudos

    def kudos_feed(self, me: Employee) -> List[dict]:
        self._require_enabled()
        since = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
        q = self.db.query(Kudos).options(joinedload(Kudos.sender), joinedload(Kudos.recipient)).filter(Kudos.created_at >= since)
        ids = self._visible_ids(me)
        if ids is not None:
            q = q.filter(or_(Kudos.to_id.in_(ids), Kudos.from_id.in_(ids)))
        return [{
            "id": k.id, "from_id": k.from_id, "from_name": k.sender.full_name if k.sender else "Someone",
            "to_id": k.to_id, "to_name": k.recipient.full_name if k.recipient else "Someone",
            "message": k.message, "created_at": k.created_at,
            "sent_by_me": k.from_id == me.id, "for_me": k.to_id == me.id,
        } for k in q.order_by(Kudos.created_at.desc()).limit(30).all()]

    def give(self, me: Employee, to_id: uuid.UUID, message: str) -> dict:
        self._require_enabled()
        message = (message or "").strip()
        if not message:
            raise HTTPException(status_code=400, detail="Say what they did well.")
        if len(message) > 280:
            raise HTTPException(status_code=400, detail="Keep it to 280 characters.")
        if to_id == me.id:
            raise HTTPException(status_code=400, detail="Kudos are for someone else.")
        if to_id not in {e.id for e in contacts_for(self.db, me)}:
            raise HTTPException(status_code=403, detail="You can give kudos to people you work with.")
        day_ago = datetime.now(timezone.utc) - timedelta(days=1)
        if self.db.query(Kudos).filter(Kudos.from_id == me.id, Kudos.created_at >= day_ago).count() >= KUDOS_PER_DAY:
            raise HTTPException(status_code=429, detail=f"That's {KUDOS_PER_DAY} kudos today. Save some for tomorrow.")
        k = Kudos(id=uuid.uuid4(), from_id=me.id, to_id=to_id, message=message)
        self.db.add(k)
        self.db.commit()
        NotificationRepository(self.db).create(recipient_id=to_id, title=f"🎉 Kudos from {me.full_name}",
                                               message=message, type="KUDOS", link_url="/dashboard")
        AuditRepository(self.db).log(action="kudos_given", entity_type="kudos", entity_id=k.id, actor_id=me.id,
                                     metadata={"to": str(to_id)})
        return {"id": k.id}
