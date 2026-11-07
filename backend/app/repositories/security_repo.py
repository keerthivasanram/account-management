import uuid
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from app.models.models import RegisteredDevice, SecurityIncident

class SecurityRepository:
    def __init__(self, db: Session):
        self.db = db

    # Device Management
    def get_device_by_fingerprint(self, employee_id: UUID, fingerprint: str) -> Optional[RegisteredDevice]:
        return self.db.query(RegisteredDevice).filter(
            RegisteredDevice.employee_id == employee_id,
            RegisteredDevice.device_fingerprint == fingerprint
        ).first()

    def list_devices(self, employee_id: Optional[UUID] = None) -> List[RegisteredDevice]:
        query = self.db.query(RegisteredDevice).options(joinedload(RegisteredDevice.employee))
        if employee_id:
            query = query.filter(RegisteredDevice.employee_id == employee_id)
        return query.order_by(RegisteredDevice.registered_at.desc()).all()

    def register_or_touch_device(
        self,
        employee_id: UUID,
        device_name: str,
        fingerprint: str,
        browser: Optional[str] = None,
        os: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> RegisteredDevice:
        dev = self.get_device_by_fingerprint(employee_id, fingerprint)
        now = datetime.now(timezone.utc)
        if dev:
            dev.last_seen_at = now
            if ip_address:
                dev.ip_address = ip_address
            self.db.commit()
            self.db.refresh(dev)
            return dev

        new_dev = RegisteredDevice(
            id=uuid.uuid4(),
            employee_id=employee_id,
            device_name=device_name,
            device_fingerprint=fingerprint,
            browser=browser,
            os=os,
            ip_address=ip_address,
            status="APPROVED",
            registered_at=now,
            last_seen_at=now
        )
        self.db.add(new_dev)
        self.db.commit()
        self.db.refresh(new_dev)
        return new_dev

    def update_device_status(self, device_id: UUID, status: str) -> Optional[RegisteredDevice]:
        dev = self.db.query(RegisteredDevice).filter(RegisteredDevice.id == device_id).first()
        if dev:
            dev.status = status
            self.db.commit()
            self.db.refresh(dev)
        return dev

    # Incident Management
    def log_incident(
        self,
        actor_id: UUID,
        event_type: str,
        route: str,
        severity: str = "MEDIUM",
        key_combination: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> SecurityIncident:
        incident = SecurityIncident(
            id=uuid.uuid4(),
            actor_id=actor_id,
            event_type=event_type,
            severity=severity,
            route=route,
            key_combination=key_combination,
            ip_address=ip_address,
            status="OPEN"
        )
        self.db.add(incident)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def list_incidents(self, limit: int = 100) -> List[SecurityIncident]:
        return (
            self.db.query(SecurityIncident)
            .options(joinedload(SecurityIncident.actor))
            .order_by(SecurityIncident.created_at.desc())
            .limit(limit)
            .all()
        )

    def update_incident_status(self, incident_id: UUID, status: str) -> Optional[SecurityIncident]:
        incident = self.db.query(SecurityIncident).filter(SecurityIncident.id == incident_id).first()
        if incident:
            incident.status = status
            self.db.commit()
            self.db.refresh(incident)
        return incident

    def count_open_incidents(self) -> int:
        return self.db.query(SecurityIncident).filter(SecurityIncident.status == "OPEN").count()
