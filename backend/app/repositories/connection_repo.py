from typing import Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import AccountConnection

class ConnectionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_account_id(self, account_id: UUID) -> Optional[AccountConnection]:
        return self.db.query(AccountConnection).filter(
            AccountConnection.instagram_account_id == account_id
        ).first()

    def create_or_update(
        self,
        account_id: UUID,
        provider: str = "meta_oauth",
        provider_account_id: Optional[str] = None,
        encrypted_token: Optional[str] = None,
        token_expires_at: Optional[datetime] = None,
        granted_permissions: Optional[dict] = None,
        connection_status: str = "connected",
        last_validated_at: Optional[datetime] = None
    ) -> AccountConnection:
        conn = self.get_by_account_id(account_id)
        if not conn:
            conn = AccountConnection(
                instagram_account_id=account_id,
                provider=provider,
                provider_account_id=provider_account_id,
                encrypted_access_token=encrypted_token,
                token_expires_at=token_expires_at,
                granted_permissions=granted_permissions,
                connection_status=connection_status,
                last_validated_at=last_validated_at
            )
            self.db.add(conn)
        else:
            conn.provider = provider
            if provider_account_id:
                conn.provider_account_id = provider_account_id
            if encrypted_token:
                conn.encrypted_access_token = encrypted_token
            if token_expires_at:
                conn.token_expires_at = token_expires_at
            if granted_permissions:
                conn.granted_permissions = granted_permissions
            conn.connection_status = connection_status
            if last_validated_at:
                conn.last_validated_at = last_validated_at

        self.db.commit()
        self.db.refresh(conn)
        return conn

    def update_status(self, account_id: UUID, status: str) -> Optional[AccountConnection]:
        conn = self.get_by_account_id(account_id)
        if conn:
            conn.connection_status = status
            self.db.commit()
            self.db.refresh(conn)
        return conn
