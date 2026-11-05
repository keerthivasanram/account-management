from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID

class OAuthAuthorizeResponse(BaseModel):
    authorization_url: str
    state: str
    account_id: UUID

class OAuthCallbackResponse(BaseModel):
    success: bool
    message: str
    account_id: UUID
    username: str
    connection_status: str

class DisconnectRequest(BaseModel):
    account_id: UUID

class ValidateConnectionRequest(BaseModel):
    account_id: UUID
