from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ClientBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ClientResponse(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    campaigns_count: int = 0
    accounts_count: int = 0
