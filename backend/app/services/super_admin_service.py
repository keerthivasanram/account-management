"""Super admin console: governance overview, system health, audit search, emergency session revocation."""
import platform
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
import uuid

from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.permissions import ROLE_LABELS
from app.models.models import (
    AuditLog, Department, Employee, InstagramAccount, RegisteredDevice, SecurityIncident, Task,
)
from app.repositories.audit_repo import AuditRepository
from app.services.org_settings_service import OrgSettingsService

# Actions that change who can do what - surfaced on the super admin timeline
PRIVILEGED_ACTIONS = (
    "employee_profile_updated", "employee_invited", "employee_offboarded", "employee_reactivated",
    "employee_sessions_revoked", "employees_imported", "employees_exported", "org_settings_updated",
    "super_admin_bootstrapped", "all_sessions_revoked", "employee_identity_linked",
)


def _iso(dt):
    if dt is None:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


class SuperAdminService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------ overview

    def config_warnings(self) -> list:
        w = []
        if settings.dev_auth_enabled:
            w.append({"level": "warning", "text": "Development login shortcuts are enabled (ENVIRONMENT=development, DEV_AUTH_BYPASS=true)."})
        if not settings.SUPABASE_JWT_SECRET:
            w.append({"level": "warning", "text": "SUPABASE_JWT_SECRET is not set, so Supabase password sign-in cannot be verified."})
        if settings.AUTO_PROVISION_EMPLOYEES and not settings.allowed_email_domains:
            w.append({"level": "warning", "text": "Anyone who can sign in to Supabase gets an employee profile. Set ALLOWED_EMAIL_DOMAINS or turn off AUTO_PROVISION_EMPLOYEES."})
        if not settings.super_admin_emails:
            w.append({"level": "info", "text": "SUPER_ADMIN_EMAILS is empty; super admins cannot be re-bootstrapped if locked out."})
        if not settings.META_APP_ID or not settings.META_APP_SECRET:
            w.append({"level": "info", "text": "Meta app credentials are not configured; Instagram connections will fail."})
        if not OrgSettingsService(self.db).get("require_mfa"):
            w.append({"level": "info", "text": "Multi-factor authentication is optional for all employees."})
        return w

    def overview(self) -> dict:
        db = self.db
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        role_counts = dict(db.query(Employee.role, func.count(Employee.id))
                           .filter(Employee.is_active == True).group_by(Employee.role).all())  # noqa: E712
        admins = (db.query(Employee).filter(Employee.role.in_(["super_admin", "admin"]))
                  .order_by(Employee.role.desc(), Employee.full_name).all())
        events = (db.query(AuditLog).options(joinedload(AuditLog.actor))
                  .filter(AuditLog.action.in_(PRIVILEGED_ACTIONS))
                  .order_by(AuditLog.created_at.desc()).limit(15).all())
        return {
            "roles": [{"role": r, "label": l, "count": role_counts.get(r, 0)} for r, l in ROLE_LABELS.items()],
            "admins": [{
                "id": str(a.id), "full_name": a.full_name, "email": a.email, "employee_code": a.employee_code,
                "role": a.role, "role_label": ROLE_LABELS.get(a.role, a.role), "status": a.status,
                "is_active": a.is_active, "last_login_at": _iso(a.last_login_at),
            } for a in admins],
            "security": {
                "open_incidents": db.query(func.count(SecurityIncident.id)).filter(SecurityIncident.status == "OPEN").scalar(),
                "incidents_7d": db.query(func.count(SecurityIncident.id)).filter(SecurityIncident.created_at >= week_ago).scalar(),
                "trusted_devices": db.query(func.count(RegisteredDevice.id)).filter(RegisteredDevice.status == "APPROVED").scalar(),
                "require_mfa": OrgSettingsService(db).get("require_mfa"),
            },
            "warnings": self.config_warnings(),
            "privileged_events": [self._audit_row(e) for e in events],
        }

    # ------------------------------------------------------------------ health

    def _alembic_heads(self) -> Optional[list]:
        try:
            from alembic.config import Config
            from alembic.script import ScriptDirectory
            base = Path(__file__).resolve().parents[2]
            cfg = Config(str(base / "alembic.ini"))
            cfg.set_main_option("script_location", str(base / "alembic"))
            return list(ScriptDirectory.from_config(cfg).get_heads())
        except Exception:
            return None

    def health(self) -> dict:
        db = self.db
        started = time.perf_counter()
        db_ok, db_error = True, None
        try:
            db.execute(text("SELECT 1"))
        except Exception as e:  # pragma: no cover - surfaced to the operator, not raised
            db_ok, db_error = False, type(e).__name__
        latency_ms = round((time.perf_counter() - started) * 1000, 1)

        current_rev = None
        try:
            current_rev = db.execute(text("SELECT version_num FROM alembic_version")).scalar()
        except Exception:
            db.rollback()
        heads = self._alembic_heads()

        counts = {
            "employees": db.query(func.count(Employee.id)).scalar(),
            "departments": db.query(func.count(Department.id)).scalar(),
            "instagram_accounts": db.query(func.count(InstagramAccount.id)).scalar(),
            "tasks": db.query(func.count(Task.id)).scalar(),
            "audit_logs": db.query(func.count(AuditLog.id)).scalar(),
        }
        return {
            "status": "ok" if db_ok and (heads is None or current_rev in (heads or [])) else "degraded",
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "python": platform.python_version(),
            "database": {
                "ok": db_ok, "error": db_error, "latency_ms": latency_ms,
                "dialect": db.get_bind().dialect.name,
                "migration_current": current_rev, "migration_head": heads[0] if heads and len(heads) == 1 else heads,
                "migrations_up_to_date": (current_rev in heads) if heads and current_rev else None,
            },
            "integrations": {
                "supabase_auth": bool(settings.SUPABASE_URL and settings.SUPABASE_JWT_SECRET),
                "meta_oauth": bool(settings.META_APP_ID and settings.META_APP_SECRET),
            },
            "auth": {
                "dev_shortcuts_enabled": settings.dev_auth_enabled,
                "auto_provision": settings.AUTO_PROVISION_EMPLOYEES,
                "allowed_domains": settings.allowed_email_domains,
            },
            "row_counts": counts,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    # ------------------------------------------------------------------ audit search

    def _audit_row(self, a: AuditLog) -> dict:
        return {
            "id": str(a.id), "action": a.action, "entity_type": a.entity_type,
            "entity_id": str(a.entity_id) if a.entity_id else None,
            "actor_id": str(a.actor_id) if a.actor_id else None,
            "actor_name": a.actor.full_name if a.actor else "System",
            "metadata": a.extra_metadata or {}, "created_at": _iso(a.created_at),
        }

    def search_audit(self, actor_id: Optional[uuid.UUID] = None, action: Optional[str] = None,
                     entity_type: Optional[str] = None, entity_id: Optional[uuid.UUID] = None,
                     date_from: Optional[datetime] = None, date_to: Optional[datetime] = None,
                     privileged_only: bool = False, limit: int = 50, offset: int = 0) -> dict:
        q = self.db.query(AuditLog)
        if actor_id:
            q = q.filter(AuditLog.actor_id == actor_id)
        if action:
            q = q.filter(func.lower(AuditLog.action).like(f"%{action.strip().lower()}%"))
        if entity_type:
            q = q.filter(AuditLog.entity_type == entity_type)
        if entity_id:
            q = q.filter(AuditLog.entity_id == entity_id)
        if date_from:
            q = q.filter(AuditLog.created_at >= date_from)
        if date_to:
            q = q.filter(AuditLog.created_at <= date_to)
        if privileged_only:
            q = q.filter(AuditLog.action.in_(PRIVILEGED_ACTIONS))
        total = q.count()
        rows = (q.options(joinedload(AuditLog.actor)).order_by(AuditLog.created_at.desc())
                .offset(offset).limit(limit).all())
        return {"total": total, "limit": limit, "offset": offset, "items": [self._audit_row(r) for r in rows]}

    # ------------------------------------------------------------------ break-glass

    def revoke_all_sessions(self, actor: Employee) -> dict:
        affected = (self.db.query(Employee).filter(Employee.id != actor.id)
                    .update({Employee.token_version: Employee.token_version + 1}, synchronize_session=False))
        self.db.commit()
        AuditRepository(self.db).log(action="all_sessions_revoked", entity_type="employee", actor_id=actor.id,
                                     metadata={"employees_affected": affected})
        return {"employees_affected": affected,
                "note": "Backend-issued sessions are revoked immediately. Supabase sessions end when their JWT expires; "
                        "revoke them in Supabase for an instant global sign-out."}
