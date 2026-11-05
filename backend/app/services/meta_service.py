import uuid
from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.integrations.meta.meta_client import MetaIntegrationClient
from app.security.crypto import encrypt_token, decrypt_token
from app.repositories.account_repo import AccountRepository
from app.repositories.connection_repo import ConnectionRepository
from app.repositories.verification_repo import VerificationRepository
from app.repositories.audit_repo import AuditRepository
from app.models.models import Employee, InstagramAccount, AccountConnection, OAuthState
from app.schemas.connection import ConnectionStatus

class MetaIntegrationService:
    def __init__(self, db: Session):
        self.db = db
        self.client = MetaIntegrationClient()
        self.account_repo = AccountRepository(db)
        self.connection_repo = ConnectionRepository(db)
        self.verification_repo = VerificationRepository(db)
        self.audit_repo = AuditRepository(db)

    def get_authorization_url(self, account_id: uuid.UUID, employee: Employee) -> Dict[str, str]:
        """
        Generates official Meta Instagram OAuth authorization URL with a short-lived,
        single-use signed state parameter recorded in the database.
        """
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instagram account not found.")

        # Check employee authorization: must be creator/registrar, assigned employee, or admin
        is_owner = (account.registered_by == employee.id)
        is_assigned = any(a.employee_id == employee.id and a.is_active for a in account.assignments)
        if not (is_owner or is_assigned or employee.role == "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to connect or manage this Instagram account."
            )

        # Generate signed state token
        state_token = self.client.generate_state_token(str(account_id), str(employee.id))
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=15)

        # Store single-use OAuthState record in database
        oauth_state = OAuthState(
            state_token=state_token,
            employee_id=employee.id,
            account_id=account.id,
            expires_at=expires_at,
            is_used=False
        )
        self.db.add(oauth_state)
        self.db.commit()

        # Update connection status to AUTHORIZATION_PENDING
        self.connection_repo.create_or_update(
            account_id=account_id,
            connection_status=ConnectionStatus.AUTHORIZATION_PENDING.value
        )

        auth_url = self.client.get_authorization_url(str(account_id), str(employee.id), state_token)

        self.audit_repo.log(
            action="oauth_authorization_initiated",
            entity_type="instagram_account",
            entity_id=account_id,
            actor_id=employee.id,
            metadata={
                "username": account.username,
                "state_expires_at": expires_at.isoformat()
            }
        )

        return {
            "authorization_url": auth_url,
            "state": state_token,
            "account_id": str(account_id)
        }

    async def handle_callback(self, code: str, state: str) -> Dict[str, Any]:
        """
        Validates the single-use OAuth state, exchanges authorization code,
        verifies account eligibility and matches identity against intended account.
        """
        now = datetime.now(timezone.utc)

        # 1. Cryptographic HMAC signature check
        payload = self.client.verify_state_signature(state)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OAuth state parameter signature."
            )

        # 2. Database single-use check
        oauth_state = self.db.query(OAuthState).filter(OAuthState.state_token == state).first()
        if not oauth_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unknown or forged OAuth state parameter."
            )

        if oauth_state.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state has already been consumed (single-use policy). Please initiate a new authorization."
            )

        expires_at = oauth_state.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state parameter has expired. Please initiate a new authorization."
            )

        # Mark single-use state as consumed immediately
        oauth_state.is_used = True
        oauth_state.used_at = now
        self.db.commit()

        account_id = oauth_state.account_id
        employee_id = oauth_state.employee_id

        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated Instagram account not found.")

        # 3. Exchange authorization code securely with Meta
        try:
            token_data = await self.client.exchange_code_for_token(code, expected_username=account.username)
        except Exception as e:
            self.connection_repo.create_or_update(
                account_id=account_id,
                connection_status=ConnectionStatus.CONNECTION_FAILED.value
            )
            self.audit_repo.log(
                action="oauth_connection_failed",
                entity_type="instagram_account",
                entity_id=account_id,
                actor_id=employee_id,
                metadata={"error": str(e), "stage": "code_exchange"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth authorization failed with Meta: {str(e)}"
            )

        access_token = token_data.get("access_token", "")
        expires_in = token_data.get("expires_in", 5184000)
        token_expires_at = now + timedelta(seconds=expires_in)
        ig_user_id = token_data.get("instagram_user_id")
        ig_username = token_data.get("instagram_username")
        account_type = token_data.get("account_type", "BUSINESS").upper()
        permissions = token_data.get("permissions", [])

        # 4. Account Eligibility Verification (Business vs Creator vs Personal)
        if account_type == "PERSONAL":
            self.connection_repo.create_or_update(
                account_id=account_id,
                connection_status=ConnectionStatus.CONNECTION_FAILED.value
            )
            self.audit_repo.log(
                action="oauth_eligibility_rejected",
                entity_type="instagram_account",
                entity_id=account_id,
                actor_id=employee_id,
                metadata={"account_type": account_type, "reason": "Personal accounts ineligible"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Personal Instagram accounts are not eligible for official API publishing. An Instagram Professional (Business) account is required."
            )

        if account_type in ("CREATOR", "MEDIA_CREATOR"):
            if not account.allow_creator:
                self.connection_repo.create_or_update(
                    account_id=account_id,
                    connection_status=ConnectionStatus.CONNECTION_FAILED.value
                )
                self.audit_repo.log(
                    action="oauth_creator_rejected",
                    entity_type="instagram_account",
                    entity_id=account_id,
                    actor_id=employee_id,
                    metadata={"account_type": account_type, "reason": "Creator accounts disallowed by company policy"}
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Creator accounts are not permitted under the default company policy. An administrator must explicitly enable Creator account compatibility for this record."
                )

        # 5. Account Identity Matching Verification
        # Never trust arbitrary username; verify that authorized Meta account matches intended target account
        meta_username_norm = (ig_username or "").strip().lower().lstrip("@")
        intended_username_norm = account.username.strip().lower().lstrip("@")

        if meta_username_norm and intended_username_norm and meta_username_norm != intended_username_norm:
            self.connection_repo.create_or_update(
                account_id=account_id,
                connection_status=ConnectionStatus.CONNECTION_FAILED.value
            )
            self.audit_repo.log(
                action="oauth_identity_mismatch",
                entity_type="instagram_account",
                entity_id=account_id,
                actor_id=employee_id,
                metadata={
                    "expected_username": account.username,
                    "authorized_username": ig_username,
                    "meta_user_id": ig_user_id
                }
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Instagram account identity mismatch. Expected authorization for '@{account.username}', but Meta authorized '@{ig_username}'. Connection aborted."
            )

        # Check if another record already has this official instagram_user_id
        if ig_user_id:
            existing_user = self.db.query(InstagramAccount).filter(
                InstagramAccount.instagram_user_id == ig_user_id,
                InstagramAccount.id != account.id
            ).first()
            if existing_user:
                self.connection_repo.create_or_update(
                    account_id=account_id,
                    connection_status=ConnectionStatus.CONNECTION_FAILED.value
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"This Instagram account (ID: {ig_user_id}) is already connected to another record ('@{existing_user.username}'). Duplicate connections are prohibited."
                )

        # 6. Secure Encryption at Rest (Tokens never logged or stored in plain text)
        encrypted_token = encrypt_token(access_token)

        # 7. Persist Connection Metadata
        self.connection_repo.create_or_update(
            account_id=account_id,
            provider="meta_oauth",
            provider_account_id=ig_user_id,
            encrypted_token=encrypted_token,
            token_expires_at=token_expires_at,
            granted_permissions={"permissions": permissions},
            connection_status=ConnectionStatus.CONNECTED.value,
            last_validated_at=now
        )

        # Update Account Details
        if ig_user_id:
            account.instagram_user_id = ig_user_id
        account.account_type = account_type
        account.status = "connected"
        self.account_repo.update(account)

        # Update Verifications
        self.verification_repo.update_verification_status(
            account_id=account_id,
            connection_verified=True,
            ownership_verified=True
        )

        # Immutable Audit Log
        self.audit_repo.log(
            action="instagram_connected",
            entity_type="instagram_account",
            entity_id=account_id,
            actor_id=employee_id,
            metadata={
                "username": account.username,
                "provider": "meta_oauth",
                "ig_user_id": ig_user_id,
                "account_type": account_type,
                "token_expires_at": token_expires_at.isoformat()
            }
        )

        return {
            "success": True,
            "message": "Instagram Professional account connected successfully.",
            "account_id": account_id,
            "username": account.username,
            "connection_status": ConnectionStatus.CONNECTED.value,
            "instagram_user_id": ig_user_id,
            "account_type": account_type,
            "permissions": permissions
        }

    async def disconnect(self, account_id: uuid.UUID, employee: Employee) -> Dict[str, Any]:
        """
        Disconnects an active Instagram connection and revokes stored credentials.
        """
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instagram account not found.")

        # Check authorization
        is_owner = (account.registered_by == employee.id)
        is_assigned = any(a.employee_id == employee.id and a.is_active for a in account.assignments)
        if not (is_owner or is_assigned or employee.role == "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to disconnect this account."
            )

        # Clear token and update status to NOT_CONNECTED
        self.connection_repo.create_or_update(
            account_id=account_id,
            encrypted_token="",
            connection_status=ConnectionStatus.NOT_CONNECTED.value
        )

        account.status = "pending_connection"
        self.account_repo.update(account)

        self.verification_repo.update_verification_status(
            account_id=account_id,
            connection_verified=False
        )

        self.audit_repo.log(
            action="instagram_disconnected",
            entity_type="instagram_account",
            entity_id=account_id,
            actor_id=employee.id,
            metadata={"username": account.username}
        )

        return {
            "success": True,
            "message": "Account disconnected successfully.",
            "connection_status": ConnectionStatus.NOT_CONNECTED.value
        }

    async def validate_connection(self, account_id: uuid.UUID, employee: Employee) -> Dict[str, Any]:
        """
        Validates token health against Meta debug_token and updates connection status:
        CONNECTED, TOKEN_EXPIRED, ACCESS_REVOKED, REAUTHORIZATION_REQUIRED.
        """
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instagram account not found.")

        conn = self.connection_repo.get_by_account_id(account_id)
        if not conn or not conn.encrypted_access_token:
            return {
                "account_id": account_id,
                "is_valid": False,
                "status": ConnectionStatus.NOT_CONNECTED.value,
                "message": "No active connection credentials found."
            }

        # Decrypt token safely for validation
        try:
            raw_token = decrypt_token(conn.encrypted_access_token)
            is_valid, conn_status, msg = await self.client.validate_token(raw_token)
        except Exception as e:
            is_valid = False
            conn_status = ConnectionStatus.CONNECTION_FAILED.value
            msg = f"Token validation error: {str(e)}"

        now = datetime.now(timezone.utc)
        self.connection_repo.create_or_update(
            account_id=account_id,
            connection_status=conn_status,
            last_validated_at=now
        )

        if not is_valid and account.status == "connected":
            account.status = "pending_connection"
            self.account_repo.update(account)
            self.verification_repo.update_verification_status(account_id=account_id, connection_verified=False)

        return {
            "account_id": account_id,
            "is_valid": is_valid,
            "status": conn_status,
            "message": msg,
            "last_validated_at": now.isoformat()
        }
