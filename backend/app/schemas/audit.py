from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_id: Optional[UUID] = None
    actor_name: Optional[str] = None
    actor_code: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[UUID] = None
    extra_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
