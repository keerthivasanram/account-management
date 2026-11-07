import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., description="POLICY, CONTRACT, BRAND_ASSET, FINANCIAL, BRIEF")
    classification: str = Field("INTERNAL", description="PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED")
    file_url: str = Field(..., min_length=5)
    mime_type: str = Field("application/pdf")
    file_size_bytes: int = Field(1024, ge=1)

class DocumentOwner(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    employee_code: str
    role: str

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    category: str
    classification: str
    file_url: str
    mime_type: str
    file_size_bytes: int
    owner_id: uuid.UUID
    owner: Optional[DocumentOwner] = None
    download_count: int
    created_at: datetime
