from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    recipient_id: UUID
    title: str
    message: str
    type: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime
