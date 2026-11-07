from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    department_id: Optional[UUID] = None
    status: str = "ACTIVE"
    priority: str = "MEDIUM"
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[UUID] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    owner_name: Optional[str] = None
    department_name: Optional[str] = None
    tasks_count: int = 0
    completed_tasks_count: int = 0
    progress_percentage: int = 0
    created_at: datetime
