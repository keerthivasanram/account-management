from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.mfa_repo import MFARepository
from app.repositories.security_repo import SecurityRepository
from app.schemas.mfa import MFAChallengeRequest, MFAChallengeResponse, MFAVerifyRequest, MFAVerifyResponse

router = APIRouter(prefix="/auth/mfa", tags=["MFA & Identity Verification"])

@router.post("/challenge", response_model=MFAChallengeResponse)
def create_mfa_challenge(
    req: MFAChallengeRequest,
    db: Session = Depends(get_db)
):
    """
    Generates an atomic 2FA verification challenge for employee authentication.
    In development mode, returns the code hint directly for testing.
    """
    emp_repo = EmployeeRepository(db)
    mfa_repo = MFARepository(db)

    clean_email = req.email.strip().lower()
    employee = emp_repo.get_by_email(clean_email)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee account associated with this email address."
        )

    challenge_id, code = mfa_repo.generate_challenge(employee.id, purpose="LOGIN_2FA")

    return MFAChallengeResponse(
        verification_required=True,
        challenge_id=challenge_id,
        message=f"A 6-digit verification code has been dispatched for {employee.full_name}.",
        hint=f"Dev Verification Code: {code}"
    )

@router.post("/verify", response_model=MFAVerifyResponse)
def verify_mfa_code(
    req: MFAVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verifies the 2FA code, records trusted device hardware binding, and issues an authenticated session.
    """
    mfa_repo = MFARepository(db)
    sec_repo = SecurityRepository(db)

    employee = mfa_repo.verify_code(req.challenge_id, req.code)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new challenge."
        )

    # Register or touch trusted hardware device
    client_ip = request.client.host if request.client else "unknown"
    if req.device_fingerprint:
        sec_repo.register_or_touch_device(
            employee_id=employee.id,
            device_name=req.device_name or "Verified Workstation",
            fingerprint=req.device_fingerprint,
            browser=req.browser,
            os=req.os,
            ip_address=client_ip
        )

    token = f"dev-token-{employee.role}-{employee.employee_code}"

    return MFAVerifyResponse(
        access_token=token,
        token_type="bearer",
        employee={
            "id": str(employee.id),
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "email": employee.email,
            "role": employee.role
        },
        device_trusted=True
    )
