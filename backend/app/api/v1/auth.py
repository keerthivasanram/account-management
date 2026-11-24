import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.auth import UserProfileResponse, DevLoginRequest
from app.services.auth_service import get_current_employee, AuthService
from app.security.tokens import issue_session
from app.core.permissions import ROLE_LABELS, serialize_permissions

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    current_employee: Employee = Depends(get_current_employee)
):
    """Returns the authenticated employee's identity, role and effective permissions."""
    return UserProfileResponse(
        id=current_employee.id,
        auth_user_id=current_employee.auth_user_id,
        employee_code=current_employee.employee_code,
        full_name=current_employee.full_name,
        email=current_employee.email,
        role=current_employee.role,
        role_label=ROLE_LABELS.get(current_employee.role, current_employee.role),
        is_active=current_employee.is_active,
        status=current_employee.status,
        permissions=serialize_permissions(current_employee),
    )

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
    existing = auth_service.employee_repo.get_by_email(email)
    claims = {
        # Reuse the stored identity so dev logins never re-link an existing profile
        "sub": str(existing.auth_user_id) if existing and existing.status != "INVITED"
               else str(uuid.uuid5(uuid.NAMESPACE_URL, f"dev-login:{email}")),
        "email": email,
        "full_name": req.full_name or "Test User",
    }
    employee = auth_service.get_or_create_employee_profile(claims)
    return {
        "access_token": issue_session(db, employee),
        "token_type": "bearer",
        "employee": {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "email": employee.email,
            "role": employee.role
        }
    }
