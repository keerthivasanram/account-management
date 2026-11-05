from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.employee import EmployeeResponse
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
    """Returns detailed profile of the currently logged-in employee."""
    assign_repo = AssignmentRepository(db)
    acc_repo = AccountRepository(db)
    assigned_count = assign_repo.count_assigned_accounts(current_employee.id)
    registered_count = acc_repo.count(employee_id=current_employee.id)

    return EmployeeResponse(
        id=current_employee.id,
        auth_user_id=current_employee.auth_user_id,
        employee_code=current_employee.employee_code,
        full_name=current_employee.full_name,
        email=current_employee.email,
        role=current_employee.role,
        is_active=current_employee.is_active,
        created_at=current_employee.created_at,
        assigned_accounts_count=assigned_count,
        registered_accounts_count=registered_count
    )

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
    """Returns dashboard statistics (total, connected, pending, approved, rejected) for the current employee."""
    acc_service = AccountService(db)
    return acc_service.get_dashboard_counts(current_employee)
