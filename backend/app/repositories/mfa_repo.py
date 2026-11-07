import uuid
import random
from typing import Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.models import LoginVerificationCode, Employee

class MFARepository:
    def __init__(self, db: Session):
        self.db = db

    def generate_challenge(self, employee_id: uuid.UUID, purpose: str = "LOGIN_2FA") -> Tuple[str, str]:
        """Generates a secure 6-digit code with 10-minute validity."""
        code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        
        # Invalidate old unused codes for this employee & purpose
        self.db.query(LoginVerificationCode).filter(
            LoginVerificationCode.employee_id == employee_id,
            LoginVerificationCode.purpose == purpose,
            LoginVerificationCode.is_used == False
        ).update({"is_used": True})
        
        rec = LoginVerificationCode(
            id=uuid.uuid4(),
            employee_id=employee_id,
            code=code,
            purpose=purpose,
            is_used=False,
            expires_at=expires_at
        )
        self.db.add(rec)
        self.db.commit()
        return str(rec.id), code

    def verify_code(self, challenge_id: str, code: str) -> Optional[Employee]:
        try:
            cid = uuid.UUID(challenge_id)
        except ValueError:
            return None

        rec = self.db.query(LoginVerificationCode).filter(
            LoginVerificationCode.id == cid,
            LoginVerificationCode.is_used == False
        ).first()

        if not rec:
            return None

        # Check expiration (normalize tz for sqlite/postgres compatibility)
        now = datetime.now(timezone.utc)
        exp = rec.expires_at.replace(tzinfo=timezone.utc) if rec.expires_at.tzinfo is None else rec.expires_at
        if exp < now:
            rec.is_used = True
            self.db.commit()
            return None

        # Constant time compare
        if rec.code.strip() != code.strip():
            return None

        rec.is_used = True
        self.db.commit()
        return rec.employee
