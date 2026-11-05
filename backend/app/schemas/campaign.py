from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class CampaignCreate(CampaignBase):
    client_id: UUID

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CampaignResponse(CampaignBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: UUID
    client_name: Optional[str] = None
    created_at: datetime
    accounts_count: int = 0
