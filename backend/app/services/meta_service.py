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
from app.models.models import Employee

class MetaIntegrationService:
    def __init__(self, db: Session):
        self.db = db
        self.client = MetaIntegrationClient()
        self.account_repo = AccountRepository(db)
        self.connection_repo = ConnectionRepository(db)
        self.verification_repo = VerificationRepository(db)
        self.audit_repo = AuditRepository(db)

    def get_authorization_url(self, account_id: uuid.UUID, employee: Employee) -> Dict[str, str]:
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        # Verify employee authorization (registered by or assigned to or admin)
        active_assignment = self.account_repo.db.query(account.__class__).filter(
            account.__class__.id == account_id
        ).first()

        # Check permission: employee must own or be assigned unless admin
        is_owner = (account.registered_by == employee.id)
        is_assigned = any(a.employee_id == employee.id and a.is_active for a in account.assignments)
        if not (is_owner or is_assigned or employee.role == "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to connect this Instagram account."
            )

        url, state = self.client.get_authorization_url(str(account_id), str(employee.id))
        return {
            "authorization_url": url,
            "state": state,
            "account_id": str(account_id)
        }

    async def handle_callback(self, code: str, state: str) -> Dict[str, Any]:
        payload = self.client.verify_state(state)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OAuth state parameter."
            )

        account_id_str = payload.get("account_id")
        employee_id_str = payload.get("employee_id")
        account_id = uuid.UUID(account_id_str)
        employee_id = uuid.UUID(employee_id_str)

        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated account not found")

        # Exchange code for token
        try:
            token_data = await self.client.exchange_code_for_token(code)
        except Exception as e:
            # Mark connection failed
            self.connection_repo.create_or_update(
                account_id=account_id,
                connection_status="failed"
            )
            self.audit_repo.log(
                action="oauth_connection_failed",
                entity_type="instagram_account",
                entity_id=account_id,
                actor_id=employee_id,
                metadata={"error": str(e)}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth authorization failed: {str(e)}"
            )

        access_token = token_data.get("access_token", "")
        expires_in = token_data.get("expires_in", 5184000)
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        ig_user_id = token_data.get("instagram_user_id")
        ig_username = token_data.get("instagram_username") or account.username
        permissions = token_data.get("permissions", [])

        # Encrypt the token
        encrypted_token = encrypt_token(access_token)

        # Update official instagram_user_id on account if available
        if ig_user_id and ig_user_id != "ig_unknown":
            account.instagram_user_id = ig_user_id

        # Update connection record
        now = datetime.now(timezone.utc)
        self.connection_repo.create_or_update(
            account_id=account_id,
            provider="meta_oauth",
            provider_account_id=ig_user_id,
            encrypted_token=encrypted_token,
            token_expires_at=token_expires_at,
            granted_permissions={"permissions": permissions},
            connection_status="connected",
            last_validated_at=now
        )

        # Update account status and verifications
        account.status = "connected"
        self.account_repo.update(account)

        self.verification_repo.update_verification_status(
            account_id=account_id,
            connection_verified=True,
            ownership_verified=True
        )

        # Audit log
        self.audit_repo.log(
            action="instagram_connected",
            entity_type="instagram_account",
            entity_id=account_id,
            actor_id=employee_id,
            metadata={
                "username": account.username,
                "provider": "meta_oauth",
                "ig_user_id": ig_user_id,
                "token_expires_at": token_expires_at.isoformat()
            }
        )

        return {
            "success": True,
            "message": "Instagram account connected successfully.",
            "account_id": account_id,
            "username": account.username,
            "connection_status": "connected"
        }

    async def disconnect(self, account_id: uuid.UUID, employee: Employee) -> Dict[str, Any]:
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        is_owner = (account.registered_by == employee.id)
        is_assigned = any(a.employee_id == employee.id and a.is_active for a in account.assignments)
        if not (is_owner or is_assigned or employee.role == "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to disconnect this account."
            )

        self.connection_repo.create_or_update(
            account_id=account_id,
            encrypted_token="",
            connection_status="disconnected"
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

        return {"success": True, "message": "Account disconnected successfully."}

    async def validate_connection(self, account_id: uuid.UUID, employee: Employee) -> Dict[str, Any]:
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        conn = self.connection_repo.get_by_account_id(account_id)
        if not conn or not conn.encrypted_access_token:
            return {
                "account_id": account_id,
                "is_valid": False,
                "status": "disconnected",
                "message": "No active connection token found."
            }

        # Decrypt token for validation
        try:
            raw_token = decrypt_token(conn.encrypted_access_token)
            is_valid, msg = await self.client.validate_token(raw_token)
        except Exception as e:
            is_valid = False
            msg = f"Token decryption or validation error: {str(e)}"

        now = datetime.now(timezone.utc)
        new_status = "connected" if is_valid else "expired"
        self.connection_repo.create_or_update(
            account_id=account_id,
            connection_status=new_status,
            last_validated_at=now
        )

        if not is_valid and account.status == "connected":
            account.status = "pending_connection"
            self.account_repo.update(account)
            self.verification_repo.update_verification_status(account_id=account_id, connection_verified=False)

        return {
            "account_id": account_id,
            "is_valid": is_valid,
            "status": new_status,
            "message": msg,
            "last_validated_at": now.isoformat()
        }
