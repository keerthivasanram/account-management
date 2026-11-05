import uuid
import jwt
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import Employee
from app.repositories.employee_repo import EmployeeRepository

security_scheme = HTTPBearer(auto_error=False)

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.employee_repo = EmployeeRepository(db)

    def decode_token(self, token: str) -> Dict[str, Any]:
        """
        Decodes and verifies a JWT token.
        Supports:
        1. Dev mock tokens: 'dev-token-admin' or 'dev-token-employee-{name}'
        2. Supabase Auth JWTs (HS256 with SUPABASE_JWT_SECRET or unsignable dev payload)
        """
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is missing"
            )

        # Handle development mock bypass tokens
        if settings.DEV_AUTH_BYPASS:
            if token.startswith("dev-token-admin"):
                return {
                    "sub": "00000000-0000-0000-0000-000000000001",
                    "email": "admin@company.internal",
                    "role": "admin",
                    "full_name": "System Administrator",
                    "app_metadata": {"role": "admin"}
                }
            elif token.startswith("dev-token-employee"):
                parts = token.split("-")
                identifier = parts[-1] if len(parts) > 3 else "1"
                # Deterministic UUID for dev employee
                dev_uuid = f"00000000-0000-0000-0000-0000000000{int(identifier) % 90 + 10:02d}"
                return {
                    "sub": dev_uuid,
                    "email": f"employee{identifier}@company.internal",
                    "role": "employee",
                    "full_name": f"Employee {identifier}",
                    "app_metadata": {"role": "employee"}
                }

        # Validate with Supabase JWT Secret if configured
        if settings.SUPABASE_JWT_SECRET:
            try:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
                return payload
            except jwt.PyJWTError as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid authentication token: {str(e)}"
                )

        # Fallback: unverified decode if in dev mode
        if settings.ENVIRONMENT == "development":
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                return payload
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify token. Please configure SUPABASE_JWT_SECRET."
        )

    def get_or_create_employee_profile(self, claims: Dict[str, Any]) -> Employee:
        """
        Resolves the employee record from the authenticated auth_user_id.
        If first time login, automatically creates the employee profile.
        """
        sub_str = claims.get("sub")
        if not sub_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token sub claim is missing"
            )

        try:
            auth_user_id = uuid.UUID(sub_str)
        except ValueError:
            auth_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, sub_str)

        # Look up by auth_user_id
        employee = self.employee_repo.get_by_auth_user_id(auth_user_id)
        if employee:
            if not employee.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Employee profile is deactivated"
                )
            return employee

        # If not found by auth_user_id, check by email
        email = claims.get("email", "").lower().strip()
        if email:
            employee = self.employee_repo.get_by_email(email)
            if employee:
                # Link existing profile with new auth_user_id
                employee.auth_user_id = auth_user_id
                return self.employee_repo.update(employee)

        # First-time provisioning: determine role
        role = "employee"
        app_meta = claims.get("app_metadata", {})
        user_meta = claims.get("user_metadata", {})
        if app_meta.get("role") == "admin" or user_meta.get("role") == "admin" or claims.get("role") == "admin":
            role = "admin"
        if email.startswith("admin@"):
            role = "admin"

        full_name = (
            user_meta.get("full_name")
            or claims.get("full_name")
            or (email.split("@")[0].replace(".", " ").title() if email else "New Employee")
        )

        # Generate unique employee code
        count = self.employee_repo.count() + 1
        employee_code = f"EMP-{count:04d}"
        while self.employee_repo.get_by_employee_code(employee_code):
            count += 1
            employee_code = f"EMP-{count:04d}"

        new_employee = Employee(
            id=uuid.uuid4(),
            auth_user_id=auth_user_id,
            employee_code=employee_code,
            full_name=full_name,
            email=email or f"user_{auth_user_id.hex[:8]}@company.internal",
            role=role,
            is_active=True
        )
        return self.employee_repo.create(new_employee)

def get_current_employee(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Employee:
    """FastAPI Dependency: extracts and verifies authenticated employee profile."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )

    auth_service = AuthService(db)
    claims = auth_service.decode_token(credentials.credentials)
    employee = auth_service.get_or_create_employee_profile(claims)
    return employee

def require_admin(
    current_employee: Employee = Depends(get_current_employee)
) -> Employee:
    """FastAPI Dependency: restricts endpoint to employees with 'admin' role."""
    if current_employee.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to administrators only."
        )
    return current_employee
