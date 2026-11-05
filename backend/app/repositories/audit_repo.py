from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from app.models.models import AuditLog

class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        action: str,
        entity_type: str,
        entity_id: Optional[UUID] = None,
        actor_id: Optional[UUID] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        # Sanitize metadata to never include tokens or secrets
        safe_meta = {}
        if metadata:
            for k, v in metadata.items():
                if any(secret_term in k.lower() for secret_term in ["token", "secret", "password", "key", "auth"]):
                    safe_meta[k] = "[REDACTED]"
                else:
                    safe_meta[k] = v

        entry = AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            extra_metadata=safe_meta
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def list(
        self,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        actor_id: Optional[UUID] = None
    ) -> List[AuditLog]:
        query = self.db.query(AuditLog).options(joinedload(AuditLog.actor))
        if action:
            query = query.filter(AuditLog.action == action)
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if actor_id:
            query = query.filter(AuditLog.actor_id == actor_id)
        return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
