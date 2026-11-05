import uuid
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import InstagramAccount, Employee, AccountAssignment
from app.schemas.account import (
    AccountCreate, AccountUpdate, AccountResponse,
    AccountCheckDuplicateResponse, AccountStatusResponse,
    ConnectionBrief, VerificationBrief, AssignmentBrief
)
from app.repositories.account_repo import AccountRepository
from app.repositories.assignment_repo import AssignmentRepository
from app.repositories.verification_repo import VerificationRepository
from app.repositories.connection_repo import ConnectionRepository
from app.repositories.client_repo import ClientRepository
from app.repositories.campaign_repo import CampaignRepository
from app.repositories.audit_repo import AuditRepository

class AccountService:
    def __init__(self, db: Session):
        self.db = db
        self.account_repo = AccountRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.verification_repo = VerificationRepository(db)
        self.connection_repo = ConnectionRepository(db)
        self.client_repo = ClientRepository(db)
        self.campaign_repo = CampaignRepository(db)
        self.audit_repo = AuditRepository(db)

    def check_duplicate(self, username: str) -> AccountCheckDuplicateResponse:
        clean = username.strip().lstrip("@").lower()
        existing = self.account_repo.get_by_username_normalized(clean)
        if existing:
            return AccountCheckDuplicateResponse(
                is_duplicate=True,
                username=username,
                message=f"Instagram account '@{existing.username}' is already registered in the system.",
                existing_account_id=existing.id
            )
        return AccountCheckDuplicateResponse(
            is_duplicate=False,
            username=username,
            message="Username is available for registration."
        )

    def register_account(self, data: AccountCreate, employee: Employee) -> AccountResponse:
        clean_username = data.username.strip().lstrip("@")
        normalized = clean_username.lower()

        # Enforce uniqueness check
        existing = self.account_repo.get_by_username_normalized(normalized)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Instagram account '@{data.username}' is already registered."
            )

        # Validate client and campaign if supplied
        if data.client_id:
            client = self.client_repo.get_by_id(data.client_id)
            if not client:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected client does not exist.")
        if data.campaign_id:
            campaign = self.campaign_repo.get_by_id(data.campaign_id)
            if not campaign:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected campaign does not exist.")
            if data.client_id and campaign.client_id != data.client_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campaign does not belong to the selected client.")

        # 1. Create account record (employee ID is ALWAYS derived from authenticated session)
        new_account = InstagramAccount(
            id=uuid.uuid4(),
            username=clean_username,
            username_normalized=normalized,
            profile_url=data.profile_url,
            display_name=data.display_name,
            account_created_date=data.account_created_date,
            niche=data.niche,
            client_id=data.client_id,
            campaign_id=data.campaign_id,
            registered_by=employee.id,
            status="pending_connection"
        )
        created_acc = self.account_repo.create(new_account)

        # 2. Automatically create initial assignment to registering employee
        self.assignment_repo.assign_account(
            account_id=created_acc.id,
            employee_id=employee.id,
            assigned_by=employee.id
        )

        # 3. Automatically initialize verification record
        self.verification_repo.create_or_init(
            account_id=created_acc.id,
            profile_verified=True,
            connection_verified=False,
            ownership_verified=False,
            approval_status="pending"
        )

        # 4. Audit log
        self.audit_repo.log(
            action="account_registered",
            entity_type="instagram_account",
            entity_id=created_acc.id,
            actor_id=employee.id,
            metadata={
                "username": clean_username,
                "registered_by_code": employee.employee_code,
                "status": "pending_connection"
            }
        )

        # Reload with relationships
        full_account = self.account_repo.get_by_id(created_acc.id)
        return self._build_account_response(full_account)

    def list_accounts_for_employee(
        self,
        employee: Employee,
        status_filter: Optional[str] = None,
        client_id: Optional[uuid.UUID] = None,
        campaign_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AccountResponse]:
        # Regular employees can only see their registered or assigned accounts
        target_employee_id = None if employee.role == "admin" else employee.id

        accounts = self.account_repo.list(
            employee_id=target_employee_id,
            status=status_filter,
            client_id=client_id,
            campaign_id=campaign_id,
            search=search,
            skip=skip,
            limit=limit
        )
        return [self._build_account_response(acc) for acc in accounts]

    def get_account_by_id(self, account_id: uuid.UUID, employee: Employee) -> AccountResponse:
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        # Authorization check: employee must be owner/assigned or admin
        if employee.role != "admin":
            is_owner = (account.registered_by == employee.id)
            is_assigned = any(a.employee_id == employee.id and a.is_active for a in account.assignments)
            if not (is_owner or is_assigned):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view this account."
                )

        return self._build_account_response(account)

    def update_account(self, account_id: uuid.UUID, data: AccountUpdate, employee: Employee) -> AccountResponse:
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        # Authorization check
        if employee.role != "admin":
            is_owner = (account.registered_by == employee.id)
            is_assigned = any(a.employee_id == employee.id and a.is_active for a in account.assignments)
            if not (is_owner or is_assigned):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to update this account."
                )

        if data.display_name is not None:
            account.display_name = data.display_name
        if data.profile_url is not None:
            account.profile_url = data.profile_url
        if data.niche is not None:
            account.niche = data.niche
        if data.client_id is not None:
            account.client_id = data.client_id
        if data.campaign_id is not None:
            account.campaign_id = data.campaign_id

        self.account_repo.update(account)

        self.audit_repo.log(
            action="account_updated",
            entity_type="instagram_account",
            entity_id=account.id,
            actor_id=employee.id,
            metadata={"updated_fields": list(data.model_dump(exclude_unset=True).keys())}
        )

        full_account = self.account_repo.get_by_id(account.id)
        return self._build_account_response(full_account)

    def get_account_status(self, account_id: uuid.UUID, employee: Employee) -> AccountStatusResponse:
        acc_resp = self.get_account_by_id(account_id, employee)
        conn = acc_resp.connection
        ver = acc_resp.verification
        return AccountStatusResponse(
            account_id=acc_resp.id,
            username=acc_resp.username,
            status=acc_resp.status,
            connection_status=conn.connection_status if conn else "disconnected",
            approval_status=ver.approval_status if ver else "pending",
            profile_verified=ver.profile_verified if ver else False,
            connection_verified=ver.connection_verified if ver else False,
            ownership_verified=ver.ownership_verified if ver else False,
            remarks=ver.remarks if ver else None,
            last_validated_at=conn.last_validated_at if conn else None
        )

    def get_dashboard_counts(self, employee: Employee) -> Dict[str, int]:
        target_employee_id = None if employee.role == "admin" else employee.id
        return self.account_repo.get_status_counts(target_employee_id)

    def _build_account_response(self, acc: InstagramAccount) -> AccountResponse:
        # Resolve active assignment
        active_assignment = None
        for a in acc.assignments:
            if a.is_active:
                active_assignment = AssignmentBrief(
                    employee_id=a.employee_id,
                    employee_name=a.employee.full_name if a.employee else "Unknown",
                    employee_code=a.employee.employee_code if a.employee else "EMP-XXXX",
                    assigned_at=a.assigned_at,
                    is_active=a.is_active
                )
                break

        conn_brief = None
        if acc.connection:
            conn_brief = ConnectionBrief(
                provider=acc.connection.provider,
                provider_account_id=acc.connection.provider_account_id,
                connection_status=acc.connection.connection_status,
                token_expires_at=acc.connection.token_expires_at,
                last_validated_at=acc.connection.last_validated_at
            )

        ver_brief = None
        if acc.verification:
            ver_brief = VerificationBrief(
                profile_verified=acc.verification.profile_verified,
                connection_verified=acc.verification.connection_verified,
                ownership_verified=acc.verification.ownership_verified,
                approval_status=acc.verification.approval_status,
                remarks=acc.verification.remarks,
                reviewed_at=acc.verification.reviewed_at
            )

        return AccountResponse(
            id=acc.id,
            username=acc.username,
            username_normalized=acc.username_normalized,
            profile_url=acc.profile_url,
            display_name=acc.display_name,
            instagram_user_id=acc.instagram_user_id,
            account_created_date=acc.account_created_date,
            niche=acc.niche,
            client_id=acc.client_id,
            client_name=acc.client.name if acc.client else None,
            campaign_id=acc.campaign_id,
            campaign_name=acc.campaign.name if acc.campaign else None,
            registered_by=acc.registered_by,
            registered_by_name=acc.creator.full_name if acc.creator else None,
            status=acc.status,
            created_at=acc.created_at,
            updated_at=acc.updated_at,
            connection=conn_brief,
            verification=ver_brief,
            active_assignment=active_assignment
        )
