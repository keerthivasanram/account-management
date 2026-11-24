import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Perm, require_permission
from app.models.models import Employee
from app.services.org_settings_service import OrgSettingsService
from app.services.super_admin_service import SuperAdminService

router = APIRouter(prefix="/super-admin", tags=["Super Admin Console"])


@router.get("/overview")
def super_admin_overview(
    actor: Employee = Depends(require_permission(Perm.SETTINGS_MANAGE)),
    db: Session = Depends(get_db),
):
    """Admins & roles, security posture, configuration warnings and the privileged-change timeline."""
    return SuperAdminService(db).overview()


@router.get("/settings")
def get_org_settings(
    actor: Employee = Depends(require_permission(Perm.SETTINGS_MANAGE)),
    db: Session = Depends(get_db),
):
    return OrgSettingsService(db).describe()


@router.put("/settings")
def update_org_settings(
    changes: Dict[str, Any] = Body(..., examples=[{"account_target_max": 65, "require_mfa": True}]),
    actor: Employee = Depends(require_permission(Perm.SETTINGS_MANAGE)),
    db: Session = Depends(get_db),
):
    """Partial update; each key is validated. Changes are audit-logged with before/after values."""
    OrgSettingsService(db).update(changes, actor)
    return OrgSettingsService(db).describe()


@router.get("/health")
def system_health(
    actor: Employee = Depends(require_permission(Perm.SYSTEM_HEALTH)),
    db: Session = Depends(get_db),
):
    """Database reachability & latency, migration drift, integration and auth configuration."""
    return SuperAdminService(db).health()


@router.get("/audit")
def search_audit(
    actor_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None, description="Substring match, e.g. 'offboard'"),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[uuid.UUID] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    privileged_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    actor: Employee = Depends(require_permission(Perm.AUDIT_READ)),
    db: Session = Depends(get_db),
):
    """Paginated audit search with total count."""
    return SuperAdminService(db).search_audit(actor_id, action, entity_type, entity_id, date_from, date_to,
                                              privileged_only, limit, offset)


@router.post("/sessions/revoke-all")
def revoke_all_sessions(
    actor: Employee = Depends(require_permission(Perm.SESSIONS_REVOKE_ANY)),
    db: Session = Depends(get_db),
):
    """Break-glass: sign out every employee except the caller."""
    return SuperAdminService(db).revoke_all_sessions(actor)
