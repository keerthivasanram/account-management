from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class EmployeeBase(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "employee"
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    auth_user_id: Optional[UUID] = None
    employee_code: Optional[str] = None

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    auth_user_id: UUID
    employee_code: str
    created_at: datetime
    assigned_accounts_count: int = 0
    registered_accounts_count: int = 0
