from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

EMPLOYEE_STATUSES = ("INVITED", "ACTIVE", "ON_LEAVE", "OFFBOARDED")


class EmployeeBase(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "employee"
    is_active: bool = True


class EmployeeCreate(EmployeeBase):
    auth_user_id: Optional[UUID] = None
    employee_code: Optional[str] = None


class EmployeeUpdate(BaseModel):
    """Admin-side edit. Every field optional; only provided fields change."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    department_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    job_title: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=50)
    joined_on: Optional[date] = None
    # Explicitly clear nullable relations (None above means "unchanged")
    clear_department: bool = False
    clear_manager: bool = False


class EmployeeSelfUpdate(BaseModel):
    """Fields an employee may edit on their own profile."""
    phone_number: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=2000)
    emergency_contact: Optional[str] = Field(None, max_length=255)


class EmployeeInvite(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    role: str = "employee"
    department_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    job_title: Optional[str] = Field(None, max_length=100)
    joined_on: Optional[date] = None


class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    auth_user_id: UUID
    employee_code: str
    created_at: datetime
    assigned_accounts_count: int = 0
    registered_accounts_count: int = 0

    status: str = "ACTIVE"
    role_label: Optional[str] = None
    job_title: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    emergency_contact: Optional[str] = None
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None
    manager_id: Optional[UUID] = None
    manager_name: Optional[str] = None
    joined_on: Optional[date] = None
    last_login_at: Optional[datetime] = None
    offboarded_at: Optional[datetime] = None
    direct_reports_count: int = 0
    permissions: List[str] = []


class OffboardRequest(BaseModel):
    """Reassign everything the leaver owns, then lock the account."""
    reassign_to: Optional[UUID] = Field(None, description="Employee who inherits accounts & open tasks")
    reason: Optional[str] = Field(None, max_length=500)
    effective_date: Optional[date] = None


class ImportResult(BaseModel):
    created: int
    skipped: int
    errors: List[str]
