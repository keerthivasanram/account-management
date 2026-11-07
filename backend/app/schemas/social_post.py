import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ScheduledPostCreate(BaseModel):
    account_id: uuid.UUID
    caption: str = Field(..., min_length=1, max_length=2200)
    media_url: str = Field(..., min_length=5)
    media_type: str = Field("IMAGE", description="IMAGE, CAROUSEL, REELS, STORY")
    scheduled_at: datetime
    campaign_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None

class PostReviewRequest(BaseModel):
    status: str = Field(..., description="APPROVED, REJECTED")
    remarks: Optional[str] = None

class ScheduledPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_id: uuid.UUID
    account_username: Optional[str] = None
    created_by: uuid.UUID
    creator_name: Optional[str] = None
    creator_code: Optional[str] = None
    campaign_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    media_type: str
    caption: str
    media_url: str
    scheduled_at: datetime
    status: str
    published_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
