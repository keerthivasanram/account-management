from pydantic import BaseModel, Field, ConfigDict
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
    details: Optional[Dict[str, Any]] = None
    created_at: datetime


class ProtectedCopyEvent(BaseModel):
    """A copy of a protected field inside Klarves. The copied text is never sent or stored."""
    resource_type: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z_]+$")
    resource_id: Optional[str] = Field(None, max_length=64)
    field: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z_]+$")
    route: Optional[str] = Field(None, max_length=255)

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
