from enum import Enum
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime
from uuid import UUID

class ConnectionStatus(str, Enum):
    NOT_CONNECTED = "NOT_CONNECTED"
    AUTHORIZATION_PENDING = "AUTHORIZATION_PENDING"
    CONNECTED = "CONNECTED"
    CONNECTION_FAILED = "CONNECTION_FAILED"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    ACCESS_REVOKED = "ACCESS_REVOKED"
    REAUTHORIZATION_REQUIRED = "REAUTHORIZATION_REQUIRED"

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
    instagram_user_id: Optional[str] = None
    account_type: Optional[str] = None
    permissions: Optional[List[str]] = None

class DisconnectRequest(BaseModel):
    account_id: UUID

class ValidateConnectionRequest(BaseModel):
    account_id: UUID

class ValidateConnectionResponse(BaseModel):
    account_id: UUID
    is_valid: bool
    status: str
    message: str
    last_validated_at: Optional[str] = None
