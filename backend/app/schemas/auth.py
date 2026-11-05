from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID

class DevLoginRequest(BaseModel):
    email: EmailStr
    role: Optional[str] = "employee"
    full_name: Optional[str] = "Test Employee"

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    auth_user_id: UUID
    employee_code: str
    full_name: str
    email: str
    role: str
    is_active: bool
