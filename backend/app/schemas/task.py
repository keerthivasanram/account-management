from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: UUID
    assigned_to: UUID
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    due_date: Optional[date] = None
    estimated_effort_hours: Optional[float] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[UUID] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    estimated_effort_hours: Optional[float] = None

class TaskSubmitRequest(BaseModel):
    deliverable_notes: Optional[str] = None

class TaskApprovalRequest(BaseModel):
    remarks: Optional[str] = None

class TaskChangeRequest(BaseModel):
    remarks: str

class TaskAssignRequest(BaseModel):
    assigned_to: UUID

class TaskActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    actor_id: UUID
    actor_name: Optional[str] = None
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    project_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    assigned_to: UUID
    assignee_name: Optional[str] = None
    assignee_code: Optional[str] = None
    created_by: UUID
    creator_name: Optional[str] = None
    priority: str
    status: str
    due_date: Optional[date] = None
    estimated_effort_hours: Optional[float] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    activity_events: List[TaskActivityResponse] = []
