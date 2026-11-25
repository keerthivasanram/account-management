import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Perm, require_permission
from app.models.models import Employee
from app.repositories.social_post_repo import SocialPostRepository
from app.schemas.social_post import (
    PostReviewRequest, ScheduledPostCreate, ScheduledPostResponse, ScheduledPostUpdate,
)
from app.services.auth_service import get_current_employee
from app.services.post_service import PostService
from app.services.storage_service import MAX_BYTES, StorageService

router = APIRouter(prefix="/social/posts", tags=["Social Media Management & Publishing"])


@router.get("", response_model=List[ScheduledPostResponse])
def list_posts(
    status_filter: Optional[str] = Query(None, description="One status or a comma-separated list"),
    account_id: Optional[uuid.UUID] = None,
    mine: bool = Query(False, description="Only posts I created"),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Posts the caller may see: their own and their accounts' (employees), plus their team's
    (managers), or everything (admins)."""
    statuses = [s.strip().upper() for s in status_filter.split(",") if s.strip()] if status_filter else None
    svc = PostService(db)
    return svc.to_responses(svc.list(current_employee, statuses, account_id, mine_only=mine), current_employee)


@router.post("/media")
async def upload_media(
    file: UploadFile = File(..., description="JPG/PNG image or MP4/MOV video, up to 50 MB"),
    current_employee: Employee = Depends(get_current_employee),
):
    """Uploads post media to private storage. Returns a reference to attach to a post."""
    data = await file.read(MAX_BYTES + 1)
    return StorageService().upload(data, (file.content_type or "").lower(), current_employee.id)


@router.post("", response_model=ScheduledPostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: ScheduledPostCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Saves a draft (submit=false) or sends it for approval (submit=true). Only on accounts you can use."""
    svc = PostService(db)
    return svc.to_response(svc.create(current_employee, payload))


@router.get("/{post_id}", response_model=ScheduledPostResponse)
def get_post(post_id: uuid.UUID, current_employee: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    svc = PostService(db)
    return svc.to_response(svc.get(current_employee, post_id), current_employee)


@router.patch("/{post_id}", response_model=ScheduledPostResponse)
def update_post(
    post_id: uuid.UUID,
    payload: ScheduledPostUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Edits your draft or a post that needs changes; submit=true sends it (back) for approval."""
    svc = PostService(db)
    return svc.to_response(svc.update(current_employee, post_id, payload))


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: uuid.UUID, current_employee: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Deletes your draft, or withdraws a post that's awaiting approval."""
    PostService(db).withdraw(current_employee, post_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{post_id}/review", response_model=ScheduledPostResponse)
def review_post(
    post_id: uuid.UUID,
    payload: PostReviewRequest,
    reviewer: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Admins, or the author's team lead: approve (schedules it) or send back with a reason. Never your own post."""
    svc = PostService(db)
    return svc.to_response(svc.review(reviewer, post_id, payload.status, payload.remarks), reviewer)


@router.post("/{post_id}/publish-now", response_model=ScheduledPostResponse)
def publish_now(
    post_id: uuid.UUID,
    admin: Employee = Depends(require_permission(Perm.ACCOUNTS_MANAGE_ALL)),
    db: Session = Depends(get_db),
):
    """Admin: marks an approved post as published.
    NOTE: does not call the Instagram Graph API yet; real publishing is a separate step."""
    svc = PostService(db)
    post = svc.get(admin, post_id)
    if post.status != "APPROVED":
        raise HTTPException(status_code=409, detail="Only approved posts can be published.")
    SocialPostRepository(db).publish_post(post_id)
    return svc.to_response(svc.get(admin, post_id))
