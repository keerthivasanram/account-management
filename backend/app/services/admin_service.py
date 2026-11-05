import uuid
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import Employee, InstagramAccount, Client, Campaign, AccountAssignment, AuditLog
from app.schemas.employee import EmployeeResponse, EmployeeUpdate
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.schemas.admin import ApprovalRequest, AssignmentRequest, AdminStatsResponse, EmployeeAssignmentStat
from app.schemas.audit import AuditLogResponse
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.account_repo import AccountRepository
from app.repositories.client_repo import ClientRepository
from app.repositories.campaign_repo import CampaignRepository
from app.repositories.assignment_repo import AssignmentRepository
from app.repositories.verification_repo import VerificationRepository
from app.repositories.audit_repo import AuditRepository

class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.employee_repo = EmployeeRepository(db)
        self.account_repo = AccountRepository(db)
        self.client_repo = ClientRepository(db)
        self.campaign_repo = CampaignRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.verification_repo = VerificationRepository(db)
        self.audit_repo = AuditRepository(db)

    def get_stats(self) -> AdminStatsResponse:
        status_counts = self.account_repo.get_status_counts()
        total_employees = self.employee_repo.count()
        total_clients = len(self.client_repo.list())
        total_campaigns = len(self.campaign_repo.list())

        return AdminStatsResponse(
            total_accounts=status_counts["total"],
            connected_accounts=status_counts["connected"],
            pending_accounts=status_counts["pending_connection"] + status_counts["pending_approval"],
            approved_accounts=status_counts["approved"],
            rejected_accounts=status_counts["rejected"],
            total_employees=total_employees,
            total_clients=total_clients,
            total_campaigns=total_campaigns
        )

    def list_employees_with_stats(self) -> List[EmployeeResponse]:
        employees = self.employee_repo.list(limit=500)
        results = []
        for emp in employees:
            assigned = self.assignment_repo.count_assigned_accounts(emp.id)
            registered = self.account_repo.count(employee_id=emp.id)
            results.append(
                EmployeeResponse(
                    id=emp.id,
                    auth_user_id=emp.auth_user_id,
                    employee_code=emp.employee_code,
                    full_name=emp.full_name,
                    email=emp.email,
                    role=emp.role,
                    is_active=emp.is_active,
                    created_at=emp.created_at,
                    assigned_accounts_count=assigned,
                    registered_accounts_count=registered
                )
            )
        return results

    def update_employee(self, employee_id: uuid.UUID, data: EmployeeUpdate, admin: Employee) -> EmployeeResponse:
        emp = self.employee_repo.get_by_id(employee_id)
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        if data.full_name is not None:
            emp.full_name = data.full_name
        if data.role is not None:
            emp.role = data.role
        if data.is_active is not None:
            emp.is_active = data.is_active

        self.employee_repo.update(emp)

        self.audit_repo.log(
            action="employee_profile_updated",
            entity_type="employee",
            entity_id=emp.id,
            actor_id=admin.id,
            metadata={"updates": data.model_dump(exclude_unset=True)}
        )

        assigned = self.assignment_repo.count_assigned_accounts(emp.id)
        registered = self.account_repo.count(employee_id=emp.id)
        return EmployeeResponse(
            id=emp.id,
            auth_user_id=emp.auth_user_id,
            employee_code=emp.employee_code,
            full_name=emp.full_name,
            email=emp.email,
            role=emp.role,
            is_active=emp.is_active,
            created_at=emp.created_at,
            assigned_accounts_count=assigned,
            registered_accounts_count=registered
        )

    def review_account(self, account_id: uuid.UUID, req: ApprovalRequest, admin: Employee) -> Dict[str, Any]:
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        status_val = req.approval_status.lower()
        if status_val not in ["approved", "rejected", "pending"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Approval status must be 'approved', 'rejected', or 'pending'."
            )

        # Update verification record
        self.verification_repo.review(
            account_id=account_id,
            approval_status=status_val,
            reviewed_by=admin.id,
            remarks=req.remarks
        )

        # Update account status
        account.status = status_val
        self.account_repo.update(account)

        # Log audit entry
        self.audit_repo.log(
            action=f"account_{status_val}",
            entity_type="instagram_account",
            entity_id=account.id,
            actor_id=admin.id,
            metadata={"remarks": req.remarks, "new_status": status_val}
        )

        return {
            "success": True,
            "account_id": account.id,
            "approval_status": status_val,
            "remarks": req.remarks
        }

    def assign_account(self, account_id: uuid.UUID, req: AssignmentRequest, admin: Employee) -> Dict[str, Any]:
        account = self.account_repo.get_by_id(account_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

        target_emp = self.employee_repo.get_by_id(req.employee_id)
        if not target_emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target employee not found")
        if not target_emp.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign account to an inactive employee")

        assignment = self.assignment_repo.assign_account(
            account_id=account.id,
            employee_id=target_emp.id,
            assigned_by=admin.id
        )

        self.audit_repo.log(
            action="account_assigned",
            entity_type="instagram_account",
            entity_id=account.id,
            actor_id=admin.id,
            metadata={
                "assigned_to_employee_id": str(target_emp.id),
                "assigned_to_code": target_emp.employee_code,
                "assigned_to_name": target_emp.full_name
            }
        )

        return {
            "success": True,
            "account_id": account.id,
            "assigned_to_id": target_emp.id,
            "assigned_to_name": target_emp.full_name,
            "assigned_to_code": target_emp.employee_code
        }

    # Client operations
    def create_client(self, data: ClientCreate, admin: Employee) -> ClientResponse:
        existing = self.client_repo.get_by_name(data.name)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A client with this name already exists.")

        client = Client(
            id=uuid.uuid4(),
            name=data.name.strip(),
            description=data.description,
            is_active=data.is_active
        )
        created = self.client_repo.create(client)
        self.audit_repo.log(
            action="client_created",
            entity_type="client",
            entity_id=created.id,
            actor_id=admin.id,
            metadata={"name": created.name}
        )
        return ClientResponse(
            id=created.id,
            name=created.name,
            description=created.description,
            is_active=created.is_active,
            created_at=created.created_at,
            campaigns_count=0,
            accounts_count=0
        )

    def list_clients(self) -> List[ClientResponse]:
        clients = self.client_repo.list()
        res = []
        for c in clients:
            camp_count = len(c.campaigns)
            acc_count = len(c.accounts)
            res.append(ClientResponse(
                id=c.id,
                name=c.name,
                description=c.description,
                is_active=c.is_active,
                created_at=c.created_at,
                campaigns_count=camp_count,
                accounts_count=acc_count
            ))
        return res

    # Campaign operations
    def create_campaign(self, data: CampaignCreate, admin: Employee) -> CampaignResponse:
        client = self.client_repo.get_by_id(data.client_id)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

        camp = Campaign(
            id=uuid.uuid4(),
            client_id=client.id,
            name=data.name.strip(),
            description=data.description,
            is_active=data.is_active
        )
        created = self.campaign_repo.create(camp)
        self.audit_repo.log(
            action="campaign_created",
            entity_type="campaign",
            entity_id=created.id,
            actor_id=admin.id,
            metadata={"name": created.name, "client_id": str(client.id)}
        )
        return CampaignResponse(
            id=created.id,
            client_id=created.client_id,
            client_name=client.name,
            name=created.name,
            description=created.description,
            is_active=created.is_active,
            created_at=created.created_at,
            accounts_count=0
        )

    def list_campaigns(self, client_id: Optional[uuid.UUID] = None) -> List[CampaignResponse]:
        campaigns = self.campaign_repo.list(client_id=client_id)
        res = []
        for camp in campaigns:
            acc_count = len(camp.accounts)
            res.append(CampaignResponse(
                id=camp.id,
                client_id=camp.client_id,
                client_name=camp.client.name if camp.client else None,
                name=camp.name,
                description=camp.description,
                is_active=camp.is_active,
                created_at=camp.created_at,
                accounts_count=acc_count
            ))
        return res

    # Audit log operations
    def list_audit_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None,
        entity_type: Optional[str] = None
    ) -> List[AuditLogResponse]:
        logs = self.audit_repo.list(skip=skip, limit=limit, action=action, entity_type=entity_type)
        res = []
        for l in logs:
            res.append(AuditLogResponse(
                id=l.id,
                actor_id=l.actor_id,
                actor_name=l.actor.full_name if l.actor else "System",
                actor_code=l.actor.employee_code if l.actor else None,
                action=l.action,
                entity_type=l.entity_type,
                entity_id=l.entity_id,
                extra_metadata=l.extra_metadata,
                created_at=l.created_at
            ))
        return res
