"""
Server-side loss alerts.

Each rule raises a SecurityIncident (event_type ALERT_<RULE>) that lists the affected records,
then notifies admins (or only super admins, for actions admins themselves perform).
One alert per actor per rule per dedupe window, so a burst produces a single alert.

Rules
- BULK_EXPORT          employee directory exported
- MASS_REASSIGNMENT    one person reassigns > N Instagram accounts within an hour
- COPY_VOLUME          one employee copies > N protected fields within 10 minutes
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.models import AuditLog, Employee, InstagramAccount, SecurityIncident
from app.repositories.notification_repo import NotificationRepository
from app.services.org_settings_service import OrgSettingsService

RULE_TITLES = {
    "BULK_EXPORT": "Employee directory exported",
    "MASS_REASSIGNMENT": "Unusual number of account reassignments",
    "COPY_VOLUME": "Unusual volume of copied protected data",
}


class AlertService:
    def __init__(self, db: Session):
        self.db = db

    def _recent_alert(self, actor_id: uuid.UUID, rule: str, window: timedelta) -> bool:
        since = datetime.now(timezone.utc) - window
        return self.db.query(SecurityIncident.id).filter(
            SecurityIncident.actor_id == actor_id,
            SecurityIncident.event_type == f"ALERT_{rule}",
            SecurityIncident.created_at >= since,
        ).first() is not None

    def raise_alert(self, rule: str, actor: Employee, severity: str, summary: str, records: List[dict],
                    dedupe: timedelta = timedelta(hours=1), founders_only: bool = False) -> Optional[SecurityIncident]:
        if self._recent_alert(actor.id, rule, dedupe):
            return None
        incident = SecurityIncident(
            id=uuid.uuid4(), actor_id=actor.id, event_type=f"ALERT_{rule}", severity=severity,
            route="server", status="OPEN",
            details={"rule": rule, "summary": summary, "records": records[:100], "record_count": len(records)},
        )
        self.db.add(incident)
        self.db.commit()
        roles = ["super_admin"] if founders_only else ["admin", "super_admin"]
        recipients = self.db.query(Employee).filter(Employee.role.in_(roles), Employee.is_active == True,  # noqa: E712
                                                   Employee.id != actor.id).all()
        notes = NotificationRepository(self.db)
        for r in recipients:
            notes.create(recipient_id=r.id, title=f"Security alert: {RULE_TITLES[rule]}",
                         message=f"{actor.full_name} ({actor.employee_code}): {summary}",
                         type="SECURITY_ALERT", link_url="/admin/security")
        return incident

    # ------------------------------------------------------------------ rules

    def on_employee_export(self, actor: Employee, row_count: int) -> None:
        self.raise_alert("BULK_EXPORT", actor, "MEDIUM",
                         f"exported the employee directory ({row_count} people, incl. emails and reporting lines).",
                         [{"type": "employee_directory", "rows": row_count}],
                         dedupe=timedelta(minutes=10), founders_only=True)

    def on_account_reassigned(self, actor: Employee) -> None:
        limit = OrgSettingsService(self.db).get("alert_reassignments_per_hour")
        since = datetime.now(timezone.utc) - timedelta(hours=1)
        rows = self.db.query(AuditLog).filter(AuditLog.actor_id == actor.id, AuditLog.action == "account_assigned",
                                              AuditLog.created_at >= since).all()
        if len(rows) <= limit:
            return
        ids = list({r.entity_id for r in rows if r.entity_id})
        names = dict(self.db.query(InstagramAccount.id, InstagramAccount.username).filter(InstagramAccount.id.in_(ids)).all())
        records = [{"account_id": str(r.entity_id), "username": names.get(r.entity_id),
                    "assigned_to": (r.extra_metadata or {}).get("assigned_to_code")} for r in rows]
        self.raise_alert("MASS_REASSIGNMENT", actor, "HIGH",
                         f"reassigned {len(rows)} Instagram accounts in the last hour (limit {limit}).",
                         records, founders_only=True)

    def on_protected_copy(self, actor: Employee) -> None:
        limit = OrgSettingsService(self.db).get("alert_copies_per_10_minutes")
        since = datetime.now(timezone.utc) - timedelta(minutes=10)
        rows = self.db.query(AuditLog).filter(AuditLog.actor_id == actor.id, AuditLog.action == "protected_copy",
                                              AuditLog.created_at >= since).all()
        if len(rows) <= limit:
            return
        records = [{"resource_type": r.entity_type, "resource_id": (r.extra_metadata or {}).get("resource_id"),
                    "field": (r.extra_metadata or {}).get("field")} for r in rows]
        self.raise_alert("COPY_VOLUME", actor, "MEDIUM",
                         f"copied {len(rows)} protected fields in 10 minutes (limit {limit}).", records)
