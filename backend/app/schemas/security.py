from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class SecurityIncidentReport(BaseModel):
    event_type: str = "SCREENSHOT_KEY_DETECTED"
    route: Optional[str] = None
    key_combination: Optional[str] = None
    details: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class SecurityIncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_id: UUID
    actor_name: Optional[str] = None
    actor_code: Optional[str] = None
    event_type: str
    severity: str
    route: str
    key_combination: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    created_at: datetime

class DeviceRegisterRequest(BaseModel):
    device_name: str
    device_fingerprint: str
    browser: Optional[str] = None
    os: Optional[str] = None

class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    employee_name: Optional[str] = None
    device_name: str
    device_fingerprint: str
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None
    status: str
    registered_at: datetime
    last_seen_at: datetime
