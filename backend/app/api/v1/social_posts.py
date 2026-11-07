import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.services.auth_service import get_current_employee, require_admin
from app.repositories.social_post_repo import SocialPostRepository
from app.repositories.account_repo import AccountRepository
from app.schemas.social_post import ScheduledPostCreate, ScheduledPostResponse, PostReviewRequest

router = APIRouter(prefix="/social/posts", tags=["Social Media Management & Publishing"])

@router.get("", response_model=List[ScheduledPostResponse])
def list_posts(
    account_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists scheduled and published social media posts."""
    repo = SocialPostRepository(db)
    posts = repo.list_posts(account_id=account_id, status=status_filter)
    return [
        ScheduledPostResponse(
            id=p.id,
            account_id=p.account_id,
            account_username=p.account.username if p.account else None,
            created_by=p.created_by,
            creator_name=p.creator.full_name if p.creator else "Unknown",
            creator_code=p.creator.employee_code if p.creator else None,
            campaign_id=p.campaign_id,
            project_id=p.project_id,
            media_type=p.media_type,
            caption=p.caption,
            media_url=p.media_url,
            scheduled_at=p.scheduled_at,
            status=p.status,
            published_at=p.published_at,
            error_message=p.error_message,
            created_at=p.created_at
        )
        for p in posts
    ]

@router.post("", response_model=ScheduledPostResponse, status_code=status.HTTP_201_CREATED)
def create_scheduled_post(
    payload: ScheduledPostCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Creates a new post draft or schedules publishing."""
    acc_repo = AccountRepository(db)
    account = acc_repo.get_by_id(payload.account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Target Instagram account not found.")

    repo = SocialPostRepository(db)
    post = repo.create_post(
        account_id=payload.account_id,
        created_by=current_employee.id,
        caption=payload.caption,
        media_url=payload.media_url,
        media_type=payload.media_type.upper(),
        scheduled_at=payload.scheduled_at,
        campaign_id=payload.campaign_id,
        project_id=payload.project_id
    )
    return ScheduledPostResponse(
        id=post.id,
        account_id=post.account_id,
        account_username=account.username,
        created_by=post.created_by,
        creator_name=current_employee.full_name,
        creator_code=current_employee.employee_code,
        campaign_id=post.campaign_id,
        project_id=post.project_id,
        media_type=post.media_type,
        caption=post.caption,
        media_url=post.media_url,
        scheduled_at=post.scheduled_at,
        status=post.status,
        created_at=post.created_at
    )

@router.patch("/{post_id}/review", response_model=ScheduledPostResponse)
def review_post(
    post_id: uuid.UUID,
    payload: PostReviewRequest,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin action: approves or rejects a scheduled social media post."""
    if payload.status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Review status must be APPROVED or REJECTED.")

    repo = SocialPostRepository(db)
    post = repo.review_post(post_id, payload.status, payload.remarks)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    return ScheduledPostResponse(
        id=post.id,
        account_id=post.account_id,
        account_username=post.account.username if post.account else None,
        created_by=post.created_by,
        creator_name=post.creator.full_name if post.creator else "Unknown",
        creator_code=post.creator.employee_code if post.creator else None,
        campaign_id=post.campaign_id,
        project_id=post.project_id,
        media_type=post.media_type,
        caption=post.caption,
        media_url=post.media_url,
        scheduled_at=post.scheduled_at,
        status=post.status,
        published_at=post.published_at,
        error_message=post.error_message,
        created_at=post.created_at
    )

@router.post("/{post_id}/publish-now", response_model=ScheduledPostResponse)
def publish_now(
    post_id: uuid.UUID,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Executes immediate publication of an approved post to Meta Graph API."""
    repo = SocialPostRepository(db)
    post = repo.get_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    published_post = repo.publish_post(post_id)
    return ScheduledPostResponse(
        id=published_post.id,
        account_id=published_post.account_id,
        account_username=published_post.account.username if published_post.account else None,
        created_by=published_post.created_by,
        creator_name=published_post.creator.full_name if published_post.creator else "Unknown",
        creator_code=published_post.creator.employee_code if published_post.creator else None,
        campaign_id=published_post.campaign_id,
        project_id=published_post.project_id,
        media_type=published_post.media_type,
        caption=published_post.caption,
        media_url=published_post.media_url,
        scheduled_at=published_post.scheduled_at,
        status=published_post.status,
        published_at=published_post.published_at,
        error_message=published_post.error_message,
        created_at=published_post.created_at
    )
