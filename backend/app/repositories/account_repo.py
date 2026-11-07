from typing import Optional, List, Dict
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from app.models.models import InstagramAccount, AccountAssignment, AccountConnection, AccountVerification

class AccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, account_id: UUID) -> Optional[InstagramAccount]:
        return (
            self.db.query(InstagramAccount)
            .options(
                joinedload(InstagramAccount.connection),
                joinedload(InstagramAccount.verification),
                joinedload(InstagramAccount.assignments).joinedload(AccountAssignment.employee),
                joinedload(InstagramAccount.client),
                joinedload(InstagramAccount.campaign),
                joinedload(InstagramAccount.creator)
            )
            .filter(InstagramAccount.id == account_id)
            .first()
        )

    def get_by_username_normalized(self, username: str) -> Optional[InstagramAccount]:
        clean = username.strip().lower()
        return self.db.query(InstagramAccount).filter(InstagramAccount.username_normalized == clean).first()

    def get_by_instagram_user_id(self, ig_user_id: str) -> Optional[InstagramAccount]:
        if not ig_user_id:
            return None
        return self.db.query(InstagramAccount).filter(InstagramAccount.instagram_user_id == ig_user_id.strip()).first()

    def list(
        self,
        employee_id: Optional[UUID] = None,
        registered_by: Optional[UUID] = None,
        assigned_to: Optional[UUID] = None,
        status: Optional[str] = None,
        client_id: Optional[UUID] = None,
        campaign_id: Optional[UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[InstagramAccount]:
        query = (
            self.db.query(InstagramAccount)
            .options(
                joinedload(InstagramAccount.connection),
                joinedload(InstagramAccount.verification),
                joinedload(InstagramAccount.assignments).joinedload(AccountAssignment.employee),
                joinedload(InstagramAccount.client),
                joinedload(InstagramAccount.campaign),
                joinedload(InstagramAccount.creator)
            )
        )

        if registered_by:
            query = query.filter(InstagramAccount.registered_by == registered_by)
        elif assigned_to:
            query = query.join(
                AccountAssignment,
                (AccountAssignment.instagram_account_id == InstagramAccount.id) & (AccountAssignment.is_active == True)
            ).filter(AccountAssignment.employee_id == assigned_to)
        elif employee_id:
            # Match if registered by this employee OR currently assigned to this employee
            query = query.outerjoin(
                AccountAssignment,
                (AccountAssignment.instagram_account_id == InstagramAccount.id) & (AccountAssignment.is_active == True)
            ).filter(
                or_(
                    InstagramAccount.registered_by == employee_id,
                    AccountAssignment.employee_id == employee_id
                )
            )

        if status:
            query = query.filter(InstagramAccount.status == status)

        if client_id:
            query = query.filter(InstagramAccount.client_id == client_id)

        if campaign_id:
            query = query.filter(InstagramAccount.campaign_id == campaign_id)

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(InstagramAccount.username).like(s),
                    func.lower(InstagramAccount.display_name).like(s)
                )
            )

        return query.order_by(InstagramAccount.created_at.desc()).offset(skip).limit(limit).all()

    def count(self, employee_id: Optional[UUID] = None) -> int:
        query = self.db.query(InstagramAccount)
        if employee_id:
            query = query.outerjoin(
                AccountAssignment,
                (AccountAssignment.instagram_account_id == InstagramAccount.id) & (AccountAssignment.is_active == True)
            ).filter(
                or_(
                    InstagramAccount.registered_by == employee_id,
                    AccountAssignment.employee_id == employee_id
                )
            )
        return query.count()

    def count_registered(self, employee_id: UUID) -> int:
        return self.db.query(InstagramAccount).filter(InstagramAccount.registered_by == employee_id).count()

    def get_status_counts(self, employee_id: Optional[UUID] = None, registered_by: Optional[UUID] = None) -> Dict[str, int]:
        counts = {
            "total": 0,
            "connected": 0,
            "pending_connection": 0,
            "pending_approval": 0,
            "approved": 0,
            "rejected": 0
        }

        query = self.db.query(InstagramAccount.status, func.count(InstagramAccount.id))
        if registered_by:
            query = query.filter(InstagramAccount.registered_by == registered_by)
        elif employee_id:
            query = query.outerjoin(
                AccountAssignment,
                (AccountAssignment.instagram_account_id == InstagramAccount.id) & (AccountAssignment.is_active == True)
            ).filter(
                or_(
                    InstagramAccount.registered_by == employee_id,
                    AccountAssignment.employee_id == employee_id
                )
            )

        results = query.group_by(InstagramAccount.status).all()
        for status_val, count_val in results:
            if status_val in counts:
                counts[status_val] = count_val
            counts["total"] += count_val

        return counts

    def create(self, account: InstagramAccount) -> InstagramAccount:
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def update(self, account: InstagramAccount) -> InstagramAccount:
        self.db.commit()
        self.db.refresh(account)
        return account
