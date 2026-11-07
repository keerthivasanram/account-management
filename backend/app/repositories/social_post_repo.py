import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from app.models.models import ScheduledPost, InstagramAccount, Employee

class SocialPostRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_posts(self, account_id: Optional[uuid.UUID] = None, status: Optional[str] = None) -> List[ScheduledPost]:
        query = self.db.query(ScheduledPost).options(
            joinedload(ScheduledPost.account),
            joinedload(ScheduledPost.creator)
        )
        if account_id:
            query = query.filter(ScheduledPost.account_id == account_id)
        if status:
            query = query.filter(ScheduledPost.status == status)
        return query.order_by(ScheduledPost.scheduled_at.asc()).all()

    def get_by_id(self, post_id: uuid.UUID) -> Optional[ScheduledPost]:
        return (
            self.db.query(ScheduledPost)
            .filter(ScheduledPost.id == post_id)
            .options(
                joinedload(ScheduledPost.account),
                joinedload(ScheduledPost.creator)
            )
            .first()
        )

    def create_post(
        self,
        account_id: uuid.UUID,
        created_by: uuid.UUID,
        caption: str,
        media_url: str,
        media_type: str,
        scheduled_at: datetime,
        campaign_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None
    ) -> ScheduledPost:
        post = ScheduledPost(
            id=uuid.uuid4(),
            account_id=account_id,
            created_by=created_by,
            caption=caption,
            media_url=media_url,
            media_type=media_type,
            scheduled_at=scheduled_at,
            campaign_id=campaign_id,
            project_id=project_id,
            status="PENDING_APPROVAL"
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def review_post(self, post_id: uuid.UUID, status: str, remarks: Optional[str] = None) -> Optional[ScheduledPost]:
        post = self.get_by_id(post_id)
        if not post:
            return None
        post.status = status
        if remarks:
            post.error_message = remarks
        self.db.commit()
        self.db.refresh(post)
        return post

    def publish_post(self, post_id: uuid.UUID) -> Optional[ScheduledPost]:
        post = self.get_by_id(post_id)
        if not post:
            return None
        post.status = "PUBLISHED"
        post.published_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(post)
        return post
