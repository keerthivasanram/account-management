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
from app.security.tokens import is_app_token, decode_app_token

security_scheme = HTTPBearer(auto_error=False)

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.employee_repo = EmployeeRepository(db)

    def decode_token(self, token: str) -> Dict[str, Any]:
        """
        Verifies a bearer token and returns its claims. Accepted, in order:
        1. Dev tokens ('dev-token-admin', 'dev-token-employee-{n}') — development only.
        2. Backend-issued session JWTs (MFA / dev login), signed with APP_JWT_SECRET.
        3. Supabase Auth JWTs, signed with SUPABASE_JWT_SECRET.
        Tokens are never accepted without signature verification. Role claims inside
        tokens are ignored; authorization always comes from the employees table.
        """
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is missing"
            )

        if token.startswith("dev-token-"):
            if not settings.dev_auth_enabled:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")
            if token.startswith("dev-token-admin"):
                return {
                    "sub": "00000000-0000-0000-0000-000000000001",
                    "email": "admin@company.internal",
                    "full_name": "System Administrator",
                }
            if token.startswith("dev-token-employee"):
                parts = token.split("-")
                identifier = parts[-1] if len(parts) > 3 else "1"
                digits = "".join(filter(str.isdigit, identifier))
                num = int(digits) if digits else 1
                dev_uuid = f"00000000-0000-0000-0000-0000000000{num % 90 + 10:02d}"
                return {
                    "sub": dev_uuid,
                    "email": f"employee{num}@company.internal",
                    "full_name": f"Employee {num}",
                }
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")

        if is_app_token(token):
            claims = decode_app_token(token)
            claims["_app_token"] = True
            return claims

        if settings.SUPABASE_JWT_SECRET:
            try:
                return jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")
            except jwt.PyJWTError:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
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
            if employee and not claims.get("_app_token"):
                if not employee.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Employee profile is deactivated"
                    )
                # Link existing (e.g. invited) profile with the identity provider's user id
                employee.auth_user_id = auth_user_id
                return self.employee_repo.update(employee)

        # App-issued tokens are only minted for existing employees; never auto-provision from them.
        if claims.get("_app_token"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Employee profile not found.")

        # First-time provisioning. Role is NEVER taken from token claims (Supabase user_metadata
        # is user-editable). Everyone starts as 'employee'; super admins are bootstrapped from
        # the SUPER_ADMIN_EMAILS setting and admins are promoted in-app.
        user_meta = claims.get("user_metadata", {}) or {}
        role = "super_admin" if email and email in settings.super_admin_emails else "employee"

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
    """FastAPI Dependency: restricts endpoint to admins and super admins."""
    if current_employee.role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to administrators only."
        )
    return current_employee
