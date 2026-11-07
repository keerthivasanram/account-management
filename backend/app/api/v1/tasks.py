import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse,
    TaskSubmitRequest, TaskApprovalRequest, TaskChangeRequest
)
from app.services.auth_service import get_current_employee
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Task Delegation & Workflow"])

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    project_id: Optional[uuid.UUID] = Query(None, description="Filter by project"),
    assigned_to: Optional[uuid.UUID] = Query(None, description="Filter by assignee"),
    my_tasks_only: bool = Query(False, description="Filter to tasks assigned to logged-in employee"),
    status: Optional[str] = Query(None, description="Filter by status (TODO, IN_PROGRESS, IN_REVIEW, APPROVED)"),
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH, URGENT)"),
    search: Optional[str] = Query(None, description="Search task title"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lists company tasks with full activity histories."""
    target_assignee = current_employee.id if my_tasks_only else assigned_to
    service = TaskService(db)
    return service.list_tasks(
        project_id=project_id,
        assigned_to=target_assignee,
        status_filter=status,
        priority=priority,
        search=search,
        skip=skip,
        limit=limit
    )

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Returns task details, current status, and immutable activity event history."""
    service = TaskService(db)
    return service.get_task(task_id)

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Creates and assigns a task. Dispatches notification and logs CREATED activity."""
    service = TaskService(db)
    return service.create_task(data, current_employee)

@router.post("/{task_id}/start", response_model=TaskResponse)
def start_task(
    task_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Marks task as IN_PROGRESS by the assignee."""
    service = TaskService(db)
    return service.update_task_status(
        task_id=task_id,
        new_status="IN_PROGRESS",
        actor=current_employee,
        action="STARTED",
        remarks="Employee began active work on deliverable."
    )

@router.post("/{task_id}/submit", response_model=TaskResponse)
def submit_task_for_review(
    task_id: uuid.UUID,
    req: TaskSubmitRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Submits deliverable for manager review. Transitions to IN_REVIEW."""
    service = TaskService(db)
    return service.submit_task(task_id, req, current_employee)

@router.post("/{task_id}/approve", response_model=TaskResponse)
def approve_task_deliverable(
    task_id: uuid.UUID,
    req: TaskApprovalRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Approves deliverable. Enforces separation of duties (manager/admin review)."""
    service = TaskService(db)
    return service.approve_task(task_id, req, current_employee)

@router.post("/{task_id}/request-changes", response_model=TaskResponse)
def request_task_changes(
    task_id: uuid.UUID,
    req: TaskChangeRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Requests revisions on task deliverable with required remarks."""
    service = TaskService(db)
    return service.request_changes(task_id, req, current_employee)
