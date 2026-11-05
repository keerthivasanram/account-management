from typing import Optional, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import AccountAssignment

class AssignmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_active_assignment(self, account_id: UUID) -> Optional[AccountAssignment]:
        return (
            self.db.query(AccountAssignment)
            .filter(
                AccountAssignment.instagram_account_id == account_id,
                AccountAssignment.is_active == True
            )
            .first()
        )

    def assign_account(self, account_id: UUID, employee_id: UUID, assigned_by: UUID) -> AccountAssignment:
        # Deactivate current active assignments
        self.db.query(AccountAssignment).filter(
            AccountAssignment.instagram_account_id == account_id,
            AccountAssignment.is_active == True
        ).update({"is_active": False})

        # Create new active assignment
        assignment = AccountAssignment(
            instagram_account_id=account_id,
            employee_id=employee_id,
            assigned_by=assigned_by,
            is_active=True
        )
        self.db.add(assignment)
        self.db.commit()
        self.db.refresh(assignment)
        return assignment

    def count_assigned_accounts(self, employee_id: UUID) -> int:
        return (
            self.db.query(AccountAssignment)
            .filter(
                AccountAssignment.employee_id == employee_id,
                AccountAssignment.is_active == True
            )
            .count()
        )
