from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    head_employee_id: Optional[UUID] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    head_employee_id: Optional[UUID] = None

class DepartmentResponse(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    head_name: Optional[str] = None
    members_count: int = 0
    projects_count: int = 0
    created_at: datetime
