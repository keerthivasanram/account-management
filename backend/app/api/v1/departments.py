import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services.auth_service import get_current_employee, require_admin
from app.services.department_service import DepartmentService

router = APIRouter(prefix="/departments", tags=["Departments & Teams"])

@router.get("", response_model=List[DepartmentResponse])
def list_departments(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists all organization departments with member and project counts."""
    service = DepartmentService(db)
    return service.list_departments()

@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(
    dept_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Retrieves department details."""
    service = DepartmentService(db)
    return service.get_department(dept_id)

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    data: DepartmentCreate,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Creates a new organizational department (Admin only)."""
    service = DepartmentService(db)
    return service.create_department(data, admin)

@router.patch("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: uuid.UUID,
    data: DepartmentUpdate,
    admin: Employee = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Updates department details or assigns department head (Admin only)."""
    service = DepartmentService(db)
    return service.update_department(dept_id, data, admin)
