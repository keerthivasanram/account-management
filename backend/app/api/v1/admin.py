import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.employee import EmployeeResponse, EmployeeUpdate, EmployeeInvite, OffboardRequest, ImportResult
from app.services.employee_service import EmployeeService, CSV_COLUMNS
from app.repositories.audit_repo import AuditRepository
from app.schemas.account import AccountResponse
from app.schemas.client import ClientCreate, ClientResponse
from app.schemas.campaign import CampaignCreate, CampaignResponse
from app.schemas.admin import (
    ApprovalRequest, AssignmentRequest, AdminStatsResponse, EmployeeDetailResponse
)
from app.schemas.audit import AuditLogResponse
from app.core.permissions import Perm, require_permission, ROLE_LABELS, assignable_roles, can_manage_employee
from app.services.auth_service import require_admin, get_current_employee
from app.services.admin_service import AdminService
from app.services.account_service import AccountService

router = APIRouter(prefix="/admin", tags=["Administrator Operations"])

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_dashboard_stats(
    admin: Employee = Depends(require_permission(Perm.ADMIN_PORTAL)),
    db: Session = Depends(get_db)
):
    """Returns platform-wide metrics and KPIs for the administrator dashboard."""
    admin_service = AdminService(db)
    return admin_service.get_stats()

@router.get("/overview")
def get_admin_overview(
    admin: Employee = Depends(require_permission(Perm.ADMIN_PORTAL)),
    db: Session = Depends(get_db)
):
    """Admin dashboard snapshot: people, today's attendance, approvals queue, accounts, workload, Meta token health."""
    from app.services.admin_overview_service import AdminOverviewService
    return AdminOverviewService(db).build()

@router.get("/employees", response_model=List[EmployeeResponse])
def list_all_employees(
    status_filter: Optional[str] = Query(None, alias="status", description="INVITED | ACTIVE | ON_LEAVE | OFFBOARDED"),
    role: Optional[str] = Query(None),
    department_id: Optional[uuid.UUID] = Query(None),
    search: Optional[str] = Query(None, description="Name, email or employee code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_READ_ALL)),
    db: Session = Depends(get_db)
):
    """Lists employees with account counts, reporting line and lifecycle status."""
    return EmployeeService(db).list(status_filter=status_filter, role=role, department_id=department_id,
                                    search=search, skip=skip, limit=limit)

@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def invite_employee(
    data: EmployeeInvite,
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)),
    db: Session = Depends(get_db)
):
    """Invites a new employee. They are linked automatically the first time they sign in with this email."""
    return EmployeeService(db).invite(data, admin)

@router.post("/employees/import", response_model=ImportResult)
async def import_employees(
    file: UploadFile = File(..., description="CSV with columns: " + ", ".join(CSV_COLUMNS)),
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)),
    db: Session = Depends(get_db)
):
    """Bulk-invites employees from a CSV (max 1000 rows, 1 MB). Existing emails are skipped."""
    raw = await file.read(1_048_577)
    if len(raw) > 1_048_576:
        raise HTTPException(status_code=413, detail="CSV must be 1 MB or smaller.")
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded.")
    return EmployeeService(db).import_csv(content, admin)

@router.get("/employees/export")
def export_employees(
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)),
    db: Session = Depends(get_db)
):
    """Downloads the employee directory as CSV."""
    AuditRepository(db).log(action="employees_exported", entity_type="employee", actor_id=admin.id)
    return Response(
        content=EmployeeService(db).export_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="employees.csv"'},
    )

@router.get("/meta")
def get_people_form_options(
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_READ_ALL)),
    db: Session = Depends(get_db)
):
    """Everything the people-management forms need in one call."""
    from app.models.models import Department
    from app.services.org_settings_service import OrgSettingsService
    managers = (db.query(Employee)
                .filter(Employee.is_active == True, Employee.role.in_(["manager", "admin", "super_admin"]))  # noqa: E712
                .order_by(Employee.full_name).all())
    org = OrgSettingsService(db)
    return {
        "roles": [{"value": r, "label": ROLE_LABELS[r]} for r in assignable_roles(admin)],
        "all_roles": [{"value": r, "label": l} for r, l in ROLE_LABELS.items()],
        "departments": [{"id": str(d.id), "name": d.name, "code": d.code}
                        for d in db.query(Department).order_by(Department.name).all()],
        "managers": [{"id": str(m.id), "name": m.full_name, "role": m.role, "employee_code": m.employee_code}
                     for m in managers],
        "statuses": ["INVITED", "ACTIVE", "ON_LEAVE", "OFFBOARDED"],
        "account_target_min": org.get("account_target_min"),
        "account_target_max": org.get("account_target_max"),
    }

@router.get("/roles")
def list_assignable_roles(
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_READ_ALL)),
):
    """Roles the caller may grant, with labels (drives the role dropdown)."""
    return [{"value": r, "label": ROLE_LABELS[r]} for r in assignable_roles(admin)]

@router.post("/employees/{employee_id}/offboard")
def offboard_employee(
    employee_id: uuid.UUID,
    req: OffboardRequest,
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)),
    db: Session = Depends(get_db)
):
    """Offboards an employee: hands over accounts/tasks/reports, revokes sessions & devices, locks login."""
    return EmployeeService(db).offboard(employee_id, req, admin)

@router.post("/employees/{employee_id}/reactivate", response_model=EmployeeResponse)
def reactivate_employee(
    employee_id: uuid.UUID,
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)),
    db: Session = Depends(get_db)
):
    return EmployeeService(db).reactivate(employee_id, admin)

@router.post("/employees/{employee_id}/revoke-sessions", status_code=status.HTTP_204_NO_CONTENT)
def revoke_employee_sessions(
    employee_id: uuid.UUID,
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)),
    db: Session = Depends(get_db)
):
    """Force-logout: invalidates every backend-issued session and trusted device for the employee."""
    svc = EmployeeService(db)
    target = svc._get(employee_id)
    if not can_manage_employee(admin, target) and target.id != admin.id:
        raise HTTPException(status_code=403, detail="You are not allowed to manage this employee.")
    svc.revoke_sessions(target, admin)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/employees/{employee_id}", response_model=EmployeeDetailResponse)
def get_employee_details(
    employee_id: uuid.UUID,
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_READ_ALL)),
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
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_READ_ALL)),
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
    admin: Employee = Depends(require_permission(Perm.EMPLOYEES_MANAGE)),
    db: Session = Depends(get_db)
):
    """Updates role, department, manager, status or profile fields (role-hierarchy rules enforced)."""
    return EmployeeService(db).update(employee_id, data, admin)

@router.get("/accounts", response_model=List[AccountResponse])
def list_all_accounts(
    status: Optional[str] = Query(None, description="Filter by status"),
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    campaign_id: Optional[uuid.UUID] = Query(None, description="Filter by campaign ID"),
    search: Optional[str] = Query(None, description="Search username or display name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: Employee = Depends(require_permission(Perm.ACCOUNTS_MANAGE_ALL)),
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
    admin: Employee = Depends(require_permission(Perm.ACCOUNTS_MANAGE_ALL)),
    db: Session = Depends(get_db)
):
    """Approves or rejects an Instagram account registration with remarks."""
    admin_service = AdminService(db)
    return admin_service.review_account(account_id, req, admin)

@router.post("/accounts/{account_id}/assign")
def assign_account_to_employee(
    account_id: uuid.UUID,
    req: AssignmentRequest,
    admin: Employee = Depends(require_permission(Perm.ACCOUNTS_MANAGE_ALL)),
    db: Session = Depends(get_db)
):
    """Assigns or reassigns an Instagram account to a specific employee."""
    admin_service = AdminService(db)
    return admin_service.assign_account(account_id, req, admin)

# Clients & Campaigns
@router.post("/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    data: ClientCreate,
    admin: Employee = Depends(require_permission(Perm.CLIENTS_MANAGE)),
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
    admin: Employee = Depends(require_permission(Perm.CLIENTS_MANAGE)),
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
    admin: Employee = Depends(require_permission(Perm.AUDIT_READ)),
    db: Session = Depends(get_db)
):
    """Returns platform audit trail logs with actor details and safe metadata."""
    admin_service = AdminService(db)
    return admin_service.list_audit_logs(skip=skip, limit=limit, action=action, entity_type=entity_type)
