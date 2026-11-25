from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from uuid import UUID

class DevLoginRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = "Test Employee"

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    auth_user_id: UUID
    employee_code: str
    full_name: str
    email: str
    role: str
    role_label: Optional[str] = None
    is_active: bool
    status: Optional[str] = None
    permissions: List[str] = []
