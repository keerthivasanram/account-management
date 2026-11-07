import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.employee import EmployeeResponse, EmployeeUpdate
from app.schemas.account import AccountResponse
from app.schemas.client import ClientCreate, ClientResponse
from app.schemas.campaign import CampaignCreate, CampaignResponse
from app.schemas.admin import (
    ApprovalRequest, AssignmentRequest, AdminStatsResponse, EmployeeDetailResponse
)
from app.schemas.audit import AuditLogResponse
from app.services.auth_service import require_admin, get_current_employee
from app.services.admin_service import AdminService
from app.services.account_service import AccountService

router = APIRouter(prefix="/admin", tags=["Administrator Operations"])

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_dashboard_stats(
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns platform-wide metrics and KPIs for the administrator dashboard."""
    admin_service = AdminService(db)
    return admin_service.get_stats()

@router.get("/employees", response_model=List[EmployeeResponse])
def list_all_employees(
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lists all employees with their registered and assigned account counts (tracking 50-60 target)."""
    admin_service = AdminService(db)
    return admin_service.list_employees_with_stats()

@router.get("/employees/{employee_id}", response_model=EmployeeDetailResponse)
def get_employee_details(
    employee_id: uuid.UUID,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns detailed profile and account statistics for a specific employee."""
    admin_service = AdminService(db)
    return admin_service.get_employee_details(employee_id)

@router.get("/employees/{employee_id}/accounts", response_model=List[AccountResponse])
def list_employee_accounts(
    employee_id: uuid.UUID,
    filter_type: str = Query("created", description="'created' for accounts registered by employee, 'assigned' for assigned accounts, 'all' for both"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search username or display name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lists accounts created by or assigned to a specific employee for admin review."""
    admin_service = AdminService(db)
    return admin_service.list_employee_accounts(
        employee_id=employee_id,
        filter_type=filter_type,
        status_filter=status,
        search=search,
        skip=skip,
        limit=limit
    )

@router.patch("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee_profile(
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Updates an employee's role (employee/admin) or active status."""
    admin_service = AdminService(db)
    return admin_service.update_employee(employee_id, data, admin)

@router.get("/accounts", response_model=List[AccountResponse])
def list_all_accounts(
    status: Optional[str] = Query(None, description="Filter by status"),
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    campaign_id: Optional[uuid.UUID] = Query(None, description="Filter by campaign ID"),
    search: Optional[str] = Query(None, description="Search username or display name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lists all accounts across the entire platform with full relationship details."""
    acc_service = AccountService(db)
    return acc_service.list_accounts_for_employee(
        employee=admin,
        status_filter=status,
        client_id=client_id,
        campaign_id=campaign_id,
        search=search,
        skip=skip,
        limit=limit
    )

@router.patch("/accounts/{account_id}/approval")
def review_account_registration(
    account_id: uuid.UUID,
    req: ApprovalRequest,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approves or rejects an Instagram account registration with remarks."""
    admin_service = AdminService(db)
    return admin_service.review_account(account_id, req, admin)

@router.post("/accounts/{account_id}/assign")
def assign_account_to_employee(
    account_id: uuid.UUID,
    req: AssignmentRequest,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assigns or reassigns an Instagram account to a specific employee."""
    admin_service = AdminService(db)
    return admin_service.assign_account(account_id, req, admin)

# Clients & Campaigns
@router.post("/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    data: ClientCreate,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Creates a new client record."""
    admin_service = AdminService(db)
    return admin_service.create_client(data, admin)

@router.get("/clients", response_model=List[ClientResponse])
def list_clients(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists all clients in the system (accessible to staff for registration dropdowns)."""
    admin_service = AdminService(db)
    return admin_service.list_clients()

@router.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    data: CampaignCreate,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Creates a new campaign for a specific client."""
    admin_service = AdminService(db)
    return admin_service.create_campaign(data, admin)

@router.get("/campaigns", response_model=List[CampaignResponse])
def list_campaigns(
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists campaigns, optionally filtered by client (accessible to staff for registration dropdowns)."""
    admin_service = AdminService(db)
    return admin_service.list_campaigns(client_id=client_id)

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns platform audit trail logs with actor details and safe metadata."""
    admin_service = AdminService(db)
    return admin_service.list_audit_logs(skip=skip, limit=limit, action=action, entity_type=entity_type)
