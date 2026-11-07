import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.services.auth_service import get_current_employee
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Project Management"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    department_id: Optional[uuid.UUID] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, PLANNING, COMPLETED)"),
    search: Optional[str] = Query(None, description="Search project name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists enterprise projects with task completion metrics."""
    service = ProjectService(db)
    return service.list_projects(
        department_id=department_id,
        status_filter=status,
        search=search,
        skip=skip,
        limit=limit
    )

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Returns project details, status, and task summary."""
    service = ProjectService(db)
    return service.get_project(project_id)

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Provisions a new company project."""
    service = ProjectService(db)
    return service.create_project(data, current_employee)

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Updates project milestone, status, or parameters."""
    service = ProjectService(db)
    return service.update_project(project_id, data, current_employee)
