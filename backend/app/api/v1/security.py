import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.security import (
    SecurityIncidentReport, SecurityIncidentResponse,
    DeviceRegisterRequest, DeviceResponse
)
from app.services.auth_service import get_current_employee, require_admin
from app.repositories.security_repo import SecurityRepository
from app.repositories.audit_repo import AuditRepository
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.notification_repo import NotificationRepository

router = APIRouter(prefix="/security", tags=["Enterprise Security & Incident Center"])

@router.post("/incidents", status_code=status.HTTP_201_CREATED)
def report_security_incident(
    report: SecurityIncidentReport,
    request: Request,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    Client-side security telemetry beacon: records screenshot attempts, focus-loss violations,
    and clipboard protection events. Dispatches immediate alert to all Administrators.
    """
    sec_repo = SecurityRepository(db)
    audit_repo = AuditRepository(db)
    emp_repo = EmployeeRepository(db)
    notif_repo = NotificationRepository(db)

    client_ip = request.client.host if request.client else "unknown"

    incident = sec_repo.log_incident(
        actor_id=current_employee.id,
        event_type=report.event_type or "SCREENSHOT_KEY_DETECTED",
        severity="HIGH" if "SCREENSHOT" in (report.event_type or "") else "MEDIUM",
        route=report.route or "unknown",
        key_combination=report.key_combination,
        ip_address=client_ip
    )

    audit_repo.log(
        action="screenshot_attempt",
        entity_type="security_incident",
        entity_id=incident.id,
        actor_id=current_employee.id,
        metadata={
            "route": report.route,
            "key": report.key_combination,
            "employee_code": current_employee.employee_code,
            "client_ip": client_ip
        }
    )

    # Dispatch high-priority in-app notification to all administrators
    admins = emp_repo.list(role="admin")
    key_info = f" ({report.key_combination})" if report.key_combination else ""
    for adm in admins:
        notif_repo.create(
            recipient_id=adm.id,
            title="🚨 SECURITY ALERT: Screen Capture Attempt",
            message=f"Staff member {current_employee.full_name} ({current_employee.employee_code}) attempted a screen capture{key_info} on page {report.route or '/'}.",
            type="SECURITY_ALERT",
            link_url="/admin/security"
        )

    return {
        "status": "incident_recorded",
        "incident_id": incident.id,
        "alert_level": incident.severity,
        "message": "Incident logged to system security audit and dispatched to administrators."
    }

@router.get("/summary")
def get_security_summary(
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns security metrics including open incident counts for admin badges."""
    sec_repo = SecurityRepository(db)
    open_count = sec_repo.count_open_incidents()
    devices = sec_repo.list_devices()
    return {
        "open_incidents": open_count,
        "active_devices": sum(1 for d in devices if d.status == "APPROVED"),
        "revoked_devices": sum(1 for d in devices if d.status == "REVOKED")
    }

@router.patch("/incidents/{incident_id}/status")
def update_incident_status(
    incident_id: uuid.UUID,
    status_update: dict,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint: marks an incident as RESOLVED or FALSE_POSITIVE."""
    sec_repo = SecurityRepository(db)
    audit_repo = AuditRepository(db)
    new_status = status_update.get("status", "RESOLVED")
    incident = sec_repo.update_incident_status(incident_id, new_status)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    audit_repo.log(
        action="incident_status_updated",
        entity_type="security_incident",
        entity_id=incident.id,
        actor_id=admin.id,
        metadata={"status": new_status}
    )
    return {"status": "success", "incident_id": incident.id, "new_status": incident.status}

@router.get("/incidents", response_model=List[SecurityIncidentResponse])
def list_security_incidents(
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint: lists all recorded security incidents and capture alerts."""
    sec_repo = SecurityRepository(db)
    incidents = sec_repo.list_incidents()
    res = []
    for inc in incidents:
        res.append(
            SecurityIncidentResponse(
                id=inc.id,
                actor_id=inc.actor_id,
                actor_name=inc.actor.full_name if inc.actor else "Unknown",
                actor_code=inc.actor.employee_code if inc.actor else None,
                event_type=inc.event_type,
                severity=inc.severity,
                route=inc.route,
                key_combination=inc.key_combination,
                ip_address=inc.ip_address,
                status=inc.status,
                created_at=inc.created_at
            )
        )
    return res

# Device Trust Management
@router.post("/devices/register", response_model=DeviceResponse)
def register_device(
    req: DeviceRegisterRequest,
    request: Request,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Enrolls or validates employee device binding for trusted hardware access."""
    sec_repo = SecurityRepository(db)
    client_ip = request.client.host if request.client else "unknown"
    dev = sec_repo.register_or_touch_device(
        employee_id=current_employee.id,
        device_name=req.device_name,
        fingerprint=req.device_fingerprint,
        browser=req.browser,
        os=req.os,
        ip_address=client_ip
    )
    return DeviceResponse(
        id=dev.id,
        employee_id=dev.employee_id,
        employee_name=current_employee.full_name,
        device_name=dev.device_name,
        device_fingerprint=dev.device_fingerprint,
        browser=dev.browser,
        os=dev.os,
        ip_address=dev.ip_address,
        status=dev.status,
        registered_at=dev.registered_at,
        last_seen_at=dev.last_seen_at
    )

@router.get("/devices", response_model=List[DeviceResponse])
def list_registered_devices(
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint: lists all enrolled employee devices with revocation status."""
    sec_repo = SecurityRepository(db)
    devices = sec_repo.list_devices()
    res = []
    for d in devices:
        res.append(
            DeviceResponse(
                id=d.id,
                employee_id=d.employee_id,
                employee_name=d.employee.full_name if d.employee else "Unknown",
                device_name=d.device_name,
                device_fingerprint=d.device_fingerprint,
                browser=d.browser,
                os=d.os,
                ip_address=d.ip_address,
                status=d.status,
                registered_at=d.registered_at,
                last_seen_at=d.last_seen_at
            )
        )
    return res

@router.post("/devices/{device_id}/revoke")
def revoke_device(
    device_id: uuid.UUID,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Emergency Admin Action: revokes a device's trust certificate immediately."""
    sec_repo = SecurityRepository(db)
    dev = sec_repo.update_device_status(device_id, "REVOKED")
    if not dev:
        return {"error": "Device not found"}
    return {"success": True, "message": f"Device '{dev.device_name}' revoked successfully."}
