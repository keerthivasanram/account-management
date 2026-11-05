import uuid
from typing import Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.connection import (
    OAuthAuthorizeResponse, OAuthCallbackResponse,
    DisconnectRequest, ValidateConnectionRequest
)
from app.services.auth_service import get_current_employee
from app.services.meta_service import MetaIntegrationService

router = APIRouter(prefix="/integrations/instagram", tags=["Instagram Meta Integration"])

@router.get("/authorize", response_model=OAuthAuthorizeResponse)
def get_oauth_authorization_url(
    account_id: uuid.UUID = Query(..., description="ID of the Instagram account to connect"),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    Generates a secure Meta OAuth authorization URL with a tamper-proof signed state token.
    Enforces authorization check that the employee owns or is assigned the account.
    """
    meta_service = MetaIntegrationService(db)
    result = meta_service.get_authorization_url(account_id, current_employee)
    return OAuthAuthorizeResponse(
        authorization_url=result["authorization_url"],
        state=result["state"],
        account_id=account_id
    )

@router.get("/callback", response_model=OAuthCallbackResponse)
async def handle_oauth_callback(
    code: str = Query(..., description="Authorization code from Meta"),
    state: str = Query(..., description="State parameter from authorize request"),
    db: Session = Depends(get_db)
):
    """
    Handles Meta OAuth callback:
    1. Verifies signed state parameter & expiration.
    2. Exchanges code for short-lived token, then long-lived token.
    3. Retrieves Instagram Business Account ID.
    4. Encrypts token with Fernet before saving.
    5. Updates connection and verification status.
    """
    meta_service = MetaIntegrationService(db)
    result = await meta_service.handle_callback(code, state)
    return OAuthCallbackResponse(
        success=result["success"],
        message=result["message"],
        account_id=result["account_id"],
        username=result["username"],
        connection_status=result["connection_status"],
        instagram_user_id=result.get("instagram_user_id"),
        account_type=result.get("account_type"),
        permissions=result.get("permissions")
    )

@router.post("/disconnect")
async def disconnect_instagram_account(
    req: DisconnectRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Disconnects Instagram OAuth connection, removes token, and resets connection status."""
    meta_service = MetaIntegrationService(db)
    return await meta_service.disconnect(req.account_id, current_employee)

@router.post("/validate")
async def validate_instagram_connection(
    req: ValidateConnectionRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Tests the health and validity of the stored access token against Meta Graph API."""
    meta_service = MetaIntegrationService(db)
    return await meta_service.validate_connection(req.account_id, current_employee)
