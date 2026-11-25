"""Publishing workflow with role scoping.

States: DRAFT -> PENDING_APPROVAL -> APPROVED (scheduled) -> PUBLISHED | FAILED
                         \-> REJECTED (back to the author, editable, resubmittable)

Who sees what:
  - admins (accounts:manage_all): every post
  - managers (accounts:read_team): their own, their team's, and posts on accounts they can use
  - employees: posts they created, and posts on accounts registered by / assigned to them
Who does what:
  - authors create on accounts they can use, edit/withdraw while DRAFT / REJECTED / PENDING
  - admins review; never their own post (separation of duties)
"""
import uuid
from datetime import datetime, timezone
from typing import Iterable, List, Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import Perm, has_permission
from app.models.models import AccountAssignment, Employee, InstagramAccount, ScheduledPost
from app.repositories.audit_repo import AuditRepository
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.notification_repo import NotificationRepository
from app.schemas.social_post import ScheduledPostCreate, ScheduledPostResponse, ScheduledPostUpdate
from app.services.storage_service import StorageService

EDITABLE = {"DRAFT", "REJECTED"}
WITHDRAWABLE = EDITABLE | {"PENDING_APPROVAL"}
ALL_STATUSES = {"DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "PUBLISHED", "FAILED"}
MEDIA_TYPES = {"IMAGE", "CAROUSEL", "REELS", "STORY"}


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class PostService:
    def __init__(self, db: Session, storage: Optional[StorageService] = None):
        self.db = db
        self.storage = storage or StorageService()
        self.notes = NotificationRepository(db)
        self.audit = AuditRepository(db)

    # ------------------------------------------------------------------ access

    def _account_ids_for(self, emp: Employee) -> List[uuid.UUID]:
        assigned = [a.instagram_account_id for a in self.db.query(AccountAssignment.instagram_account_id)
                    .filter(AccountAssignment.employee_id == emp.id, AccountAssignment.is_active == True)]  # noqa: E712
        owned = [a.id for a in self.db.query(InstagramAccount.id).filter(InstagramAccount.registered_by == emp.id)]
        return list({*assigned, *owned})

    def can_use_account(self, emp: Employee, account: InstagramAccount) -> bool:
        if has_permission(emp, Perm.ACCOUNTS_MANAGE_ALL):
            return True
        if account.registered_by == emp.id:
            return True
        return any(a.employee_id == emp.id and a.is_active for a in account.assignments)

    def _visibility(self, viewer: Employee):
        """SQL condition for posts the viewer may see (None = everything)."""
        if has_permission(viewer, Perm.ACCOUNTS_MANAGE_ALL):
            return None
        conds = [ScheduledPost.created_by == viewer.id]
        accounts = self._account_ids_for(viewer)
        if accounts:
            conds.append(ScheduledPost.account_id.in_(accounts))
        if has_permission(viewer, Perm.ACCOUNTS_READ_TEAM):
            team = [e.id for e in EmployeeRepository(self.db).list_team(viewer, include_inactive=True)]
            if team:
                conds.append(ScheduledPost.created_by.in_(team))
        return or_(*conds)

    def _query(self):
        return self.db.query(ScheduledPost).options(joinedload(ScheduledPost.account), joinedload(ScheduledPost.creator))

    def _get_visible(self, viewer: Employee, post_id: uuid.UUID) -> ScheduledPost:
        q = self._query().filter(ScheduledPost.id == post_id)
        cond = self._visibility(viewer)
        if cond is not None:
            q = q.filter(cond)
        post = q.first()
        if not post:
            raise HTTPException(status_code=404, detail="Post not found.")
        return post

    def _get_own(self, viewer: Employee, post_id: uuid.UUID) -> ScheduledPost:
        post = self._get_visible(viewer, post_id)
        if post.created_by != viewer.id:
            raise HTTPException(status_code=403, detail="Only the author can change this post.")
        return post

    # ------------------------------------------------------------------ responses

    def to_responses(self, posts: Iterable[ScheduledPost]) -> List[ScheduledPostResponse]:
        posts = list(posts)
        previews = self.storage.signed_urls(p.media_url for p in posts)
        out = []
        for p in posts:
            out.append(ScheduledPostResponse(
                id=p.id, account_id=p.account_id,
                account_username=p.account.username if p.account else None,
                created_by=p.created_by,
                creator_name=p.creator.full_name if p.creator else "Unknown",
                creator_code=p.creator.employee_code if p.creator else None,
                campaign_id=p.campaign_id, project_id=p.project_id,
                media_type=p.media_type, caption=p.caption, media_url=p.media_url,
                media_preview_url=previews.get(p.media_url),
                scheduled_at=p.scheduled_at, status=p.status, published_at=p.published_at,
                review_note=p.error_message if p.status == "REJECTED" else None,
                error_message=p.error_message if p.status == "FAILED" else None,
                created_at=p.created_at,
            ))
        return out

    def to_response(self, post: ScheduledPost) -> ScheduledPostResponse:
        return self.to_responses([post])[0]

    # ------------------------------------------------------------------ queries

    def list(self, viewer: Employee, statuses: Optional[List[str]] = None,
             account_id: Optional[uuid.UUID] = None, mine_only: bool = False) -> List[ScheduledPost]:
        q = self._query()
        cond = self._visibility(viewer)
        if cond is not None:
            q = q.filter(cond)
        if mine_only:
            q = q.filter(ScheduledPost.created_by == viewer.id)
        if statuses:
            bad = set(statuses) - ALL_STATUSES
            if bad:
                raise HTTPException(status_code=400, detail=f"Unknown status: {', '.join(sorted(bad))}.")
            q = q.filter(ScheduledPost.status.in_(statuses))
        if account_id:
            q = q.filter(ScheduledPost.account_id == account_id)
        return q.order_by(ScheduledPost.scheduled_at.asc()).limit(500).all()

    def get(self, viewer: Employee, post_id: uuid.UUID) -> ScheduledPost:
        return self._get_visible(viewer, post_id)

    # ------------------------------------------------------------------ authoring

    def _check_submittable(self, account: InstagramAccount, scheduled_at: datetime) -> None:
        if _aware(scheduled_at) <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Pick a time in the future.")
        if account.status == "rejected":
            raise HTTPException(status_code=409, detail=f"@{account.username} was rejected, so it can't publish.")

    def _validate_fields(self, viewer: Employee, media_url: Optional[str], media_type: Optional[str]) -> None:
        if media_type is not None and media_type.upper() not in MEDIA_TYPES:
            raise HTTPException(status_code=400, detail="Media type must be IMAGE, CAROUSEL, REELS or STORY.")
        if media_url is not None and not StorageService.owns_ref(media_url, viewer.id):
            raise HTTPException(status_code=403, detail="Attach media you uploaded yourself.")

    def create(self, viewer: Employee, data: ScheduledPostCreate) -> ScheduledPost:
        account = self.db.query(InstagramAccount).options(joinedload(InstagramAccount.assignments)) \
            .filter(InstagramAccount.id == data.account_id).first()
        if not account or not self.can_use_account(viewer, account):
            # 404 either way: don't confirm accounts you can't use exist
            raise HTTPException(status_code=404, detail="Choose one of your assigned accounts.")
        self._validate_fields(viewer, data.media_url, data.media_type)
        if data.submit:
            self._check_submittable(account, data.scheduled_at)
        post = ScheduledPost(
            id=uuid.uuid4(), account_id=account.id, created_by=viewer.id,
            caption=data.caption.strip(), media_url=data.media_url, media_type=data.media_type.upper(),
            scheduled_at=data.scheduled_at, campaign_id=data.campaign_id, project_id=data.project_id,
            status="PENDING_APPROVAL" if data.submit else "DRAFT",
        )
        self.db.add(post)
        self.db.commit()
        self.audit.log(action="post_created", entity_type="scheduled_post", entity_id=post.id, actor_id=viewer.id,
                       metadata={"account": account.username, "status": post.status})
        return self._get_visible(viewer, post.id)

    def update(self, viewer: Employee, post_id: uuid.UUID, data: ScheduledPostUpdate) -> ScheduledPost:
        post = self._get_own(viewer, post_id)
        if post.status not in EDITABLE:
            raise HTTPException(status_code=409, detail="Only drafts and posts that need changes can be edited.")
        self._validate_fields(viewer, data.media_url, data.media_type)
        for field in ("caption", "media_url", "scheduled_at"):
            val = getattr(data, field)
            if val is not None:
                setattr(post, field, val.strip() if field == "caption" else val)
        if data.media_type is not None:
            post.media_type = data.media_type.upper()
        if data.submit:
            self._check_submittable(post.account, post.scheduled_at)
            post.status = "PENDING_APPROVAL"
            post.error_message = None
        self.db.commit()
        return self._get_visible(viewer, post.id)

    def withdraw(self, viewer: Employee, post_id: uuid.UUID) -> None:
        post = self._get_own(viewer, post_id)
        if post.status not in WITHDRAWABLE:
            raise HTTPException(status_code=409, detail="Scheduled or published posts can't be deleted here.")
        self.db.delete(post)
        self.db.commit()
        self.audit.log(action="post_deleted", entity_type="scheduled_post", entity_id=post_id, actor_id=viewer.id,
                       metadata={"status": post.status})

    # ------------------------------------------------------------------ review

    def review(self, reviewer: Employee, post_id: uuid.UUID, decision: str, remarks: Optional[str]) -> ScheduledPost:
        if decision not in ("APPROVED", "REJECTED"):
            raise HTTPException(status_code=400, detail="Review status must be APPROVED or REJECTED.")
        post = self._get_visible(reviewer, post_id)
        if post.created_by == reviewer.id:
            raise HTTPException(status_code=403, detail="Someone else has to approve your own post.")
        if post.status != "PENDING_APPROVAL":
            raise HTTPException(status_code=409, detail="Only posts awaiting approval can be reviewed.")
        note = (remarks or "").strip()
        if decision == "REJECTED" and not note:
            raise HTTPException(status_code=400, detail="Tell the author what needs to change.")
        if decision == "APPROVED" and _aware(post.scheduled_at) <= datetime.now(timezone.utc):
            raise HTTPException(status_code=409, detail="The scheduled time has passed. Ask the author to pick a new time.")
        post.status = decision
        post.error_message = note or None
        self.db.commit()
        handle = f"@{post.account.username}" if post.account else "your account"
        if decision == "APPROVED":
            self.notes.create(recipient_id=post.created_by, title=f"Post approved: {handle}",
                              message=f"{reviewer.full_name} approved your post for {handle}. It's scheduled.",
                              type="POST_APPROVED", link_url="/social/posts?tab=scheduled")
        else:
            self.notes.create(recipient_id=post.created_by, title=f"Changes needed: {handle}",
                              message=f"{reviewer.full_name}: {note}",
                              type="POST_REJECTED", link_url="/social/posts?tab=drafts")
        self.audit.log(action=f"post_{decision.lower()}", entity_type="scheduled_post", entity_id=post.id,
                       actor_id=reviewer.id, metadata={"remarks": note or None})
        return self._get_visible(reviewer, post.id)
