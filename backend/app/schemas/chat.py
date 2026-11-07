import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class MessageCreate(MessageBase):
    pass

class MessageSender(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    employee_code: str
    role: str

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender: MessageSender
    content: str
    is_redacted: bool
    created_at: datetime

class ConversationCreate(BaseModel):
    type: str = Field("DIRECT", description="DIRECT, DEPARTMENT, PROJECT, ANNOUNCEMENT")
    title: Optional[str] = None
    department_id: Optional[uuid.UUID] = None
    member_ids: List[uuid.UUID] = Field(default_factory=list)

class ConversationMemberResponse(BaseModel):
    employee_id: uuid.UUID
    full_name: str
    employee_code: str
    joined_at: datetime

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    title: Optional[str]
    department_id: Optional[uuid.UUID]
    created_by: Optional[uuid.UUID]
    created_at: datetime
    member_count: int = 0
    members: List[ConversationMemberResponse] = []
    latest_message: Optional[MessageResponse] = None
