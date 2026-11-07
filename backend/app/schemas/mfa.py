import uuid
from typing import Optional
from pydantic import BaseModel, Field

class MFAChallengeRequest(BaseModel):
    email: str

class MFAChallengeResponse(BaseModel):
    verification_required: bool
    challenge_id: str
    message: str
    hint: Optional[str] = None

class MFAVerifyRequest(BaseModel):
    email: str
    challenge_id: str
    code: str = Field(..., min_length=4, max_length=10)
    device_fingerprint: Optional[str] = None
    device_name: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None

class MFAVerifyResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: dict
    device_trusted: bool
