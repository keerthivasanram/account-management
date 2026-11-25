from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.employee import EmployeeResponse, EmployeeSelfUpdate
from app.services.employee_presenter import to_response, account_counts, report_counts
from app.repositories.audit_repo import AuditRepository
from app.schemas.account import AccountResponse
from app.services.auth_service import get_current_employee
from app.services.account_service import AccountService
from app.repositories.assignment_repo import AssignmentRepository
from app.repositories.account_repo import AccountRepository

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("/me", response_model=EmployeeResponse)
def get_my_profile(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Returns the logged-in employee's profile, reporting line and effective permissions."""
    counts = account_counts(db, [current_employee.id]).get(current_employee.id)
    reports = report_counts(db, [current_employee.id]).get(current_employee.id, 0)
    return to_response(current_employee, counts, reports, include_permissions=True, include_private=True)

@router.patch("/me", response_model=EmployeeResponse)
def update_my_profile(
    data: EmployeeSelfUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Self-service: contact details only. Role, department, manager are admin-controlled."""
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(current_employee, field, value)
    db.commit()
    db.refresh(current_employee)
    AuditRepository(db).log(action="employee_self_profile_updated", entity_type="employee",
                            entity_id=current_employee.id, actor_id=current_employee.id,
                            metadata={"fields": sorted(changes.keys())})
    return get_my_profile(current_employee, db)

@router.get("/me/accounts", response_model=List[AccountResponse])
def get_my_accounts(
    status: Optional[str] = Query(None, description="Filter by account status"),
    search: Optional[str] = Query(None, description="Search by username or display name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Returns all accounts registered by or assigned to the current employee."""
    acc_service = AccountService(db)
    return acc_service.list_accounts_for_employee(
        employee=current_employee,
        status_filter=status,
        search=search,
        skip=skip,
        limit=limit
    )

@router.get("/me/stats")
def get_my_dashboard_stats(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Returns dashboard statistics (total, connected, pending, approved, rejected) for the current employee,
    plus the company's per-person account target so employees can see "x of 60 assigned"."""
    from app.services.org_settings_service import OrgSettingsService
    acc_service = AccountService(db)
    org = OrgSettingsService(db)
    return {
        **acc_service.get_dashboard_counts(current_employee),
        "account_target_min": org.get("account_target_min"),
        "account_target_max": org.get("account_target_max"),
    }
