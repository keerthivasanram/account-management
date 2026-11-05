from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import AccountVerification

class VerificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_account_id(self, account_id: UUID) -> Optional[AccountVerification]:
        return self.db.query(AccountVerification).filter(
            AccountVerification.instagram_account_id == account_id
        ).first()

    def create_or_init(
        self,
        account_id: UUID,
        profile_verified: bool = True,
        connection_verified: bool = False,
        ownership_verified: bool = False,
        approval_status: str = "pending"
    ) -> AccountVerification:
        ver = self.get_by_account_id(account_id)
        if not ver:
            ver = AccountVerification(
                instagram_account_id=account_id,
                profile_verified=profile_verified,
                connection_verified=connection_verified,
                ownership_verified=ownership_verified,
                approval_status=approval_status
            )
            self.db.add(ver)
            self.db.commit()
            self.db.refresh(ver)
        return ver

    def update_verification_status(
        self,
        account_id: UUID,
        profile_verified: Optional[bool] = None,
        connection_verified: Optional[bool] = None,
        ownership_verified: Optional[bool] = None
    ) -> AccountVerification:
        ver = self.create_or_init(account_id)
        if profile_verified is not None:
            ver.profile_verified = profile_verified
        if connection_verified is not None:
            ver.connection_verified = connection_verified
        if ownership_verified is not None:
            ver.ownership_verified = ownership_verified
        self.db.commit()
        self.db.refresh(ver)
        return ver

    def review(
        self,
        account_id: UUID,
        approval_status: str,
        reviewed_by: UUID,
        remarks: Optional[str] = None
    ) -> AccountVerification:
        ver = self.create_or_init(account_id)
        ver.approval_status = approval_status
        ver.reviewed_by = reviewed_by
        ver.reviewed_at = datetime.now(timezone.utc)
        ver.remarks = remarks
        self.db.commit()
        self.db.refresh(ver)
        return ver
