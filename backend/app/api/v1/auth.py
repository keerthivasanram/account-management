import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.auth import UserProfileResponse, DevLoginRequest
from app.services.auth_service import get_current_employee, AuthService
from app.security.tokens import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    current_employee: Employee = Depends(get_current_employee)
):
    """Returns the authenticated employee's profile."""
    return current_employee

@router.post("/dev-login")
def dev_login(req: DevLoginRequest, db: Session = Depends(get_db)):
    """
    Development-only shortcut login (disabled unless ENVIRONMENT=development and DEV_AUTH_BYPASS=true).
    The role is always the one stored in the database; it can never be chosen by the caller.
    Unknown emails are provisioned as regular employees.
    """
    if not settings.dev_auth_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    auth_service = AuthService(db)
    email = req.email.lower().strip()
    claims = {
        "sub": str(uuid.uuid5(uuid.NAMESPACE_URL, f"dev-login:{email}")),
        "email": email,
        "full_name": req.full_name or "Test User",
    }
    employee = auth_service.get_or_create_employee_profile(claims)
    return {
        "access_token": create_access_token(employee),
        "token_type": "bearer",
        "employee": {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "email": employee.email,
            "role": employee.role
        }
    }
