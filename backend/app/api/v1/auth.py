from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.auth import UserProfileResponse, DevLoginRequest
from app.services.auth_service import get_current_employee, AuthService

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
    Development endpoint for quick employee/admin authentication without live Supabase credentials.
    Returns a test Bearer token that can be passed in Authorization headers.
    """
    auth_service = AuthService(db)
    claims = {
        "sub": f"00000000-0000-0000-0000-{abs(hash(req.email)) % 900000000000 + 100000000000}",
        "email": req.email,
        "role": req.role or "employee",
        "full_name": req.full_name or "Test User",
        "app_metadata": {"role": req.role or "employee"}
    }
    employee = auth_service.get_or_create_employee_profile(claims)
    token = f"dev-token-{req.role}-{employee.employee_code}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "employee": {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "email": employee.email,
            "role": employee.role
        }
    }
