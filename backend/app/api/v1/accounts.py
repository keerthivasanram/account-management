import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Employee
from app.schemas.account import (
    AccountCreate, AccountUpdate, AccountResponse,
    AccountCheckDuplicateRequest, AccountCheckDuplicateResponse,
    AccountStatusResponse
)
from app.services.auth_service import get_current_employee
from app.services.account_service import AccountService

router = APIRouter(prefix="/accounts", tags=["Instagram Accounts"])

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def register_account(
    data: AccountCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    Registers a new Instagram account.
    Employee ID is automatically derived from the authenticated session.
    Verifies duplicate accounts and initializes assignment & verification records.
    """
    acc_service = AccountService(db)
    return acc_service.register_account(data, current_employee)

@router.post("/check-duplicate", response_model=AccountCheckDuplicateResponse)
def check_duplicate_username(
    data: AccountCheckDuplicateRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Checks whether an Instagram username is already registered (case-insensitive)."""
    acc_service = AccountService(db)
    return acc_service.check_duplicate(data.username)

@router.get("", response_model=List[AccountResponse])
def list_accounts(
    status: Optional[str] = Query(None, description="Filter by status"),
    client_id: Optional[uuid.UUID] = Query(None, description="Filter by client ID"),
    campaign_id: Optional[uuid.UUID] = Query(None, description="Filter by campaign ID"),
    search: Optional[str] = Query(None, description="Search username or display name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    Lists accounts accessible to the current user.
    Employees see accounts they registered or are assigned to. Administrators see all.
    """
    acc_service = AccountService(db)
    return acc_service.list_accounts_for_employee(
        employee=current_employee,
        status_filter=status,
        client_id=client_id,
        campaign_id=campaign_id,
        search=search,
        skip=skip,
        limit=limit
    )

@router.get("/{account_id}", response_model=AccountResponse)
def get_account_detail(
    account_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Retrieves full details for a single account with ownership/admin permission validation."""
    acc_service = AccountService(db)
    return acc_service.get_account_by_id(account_id, current_employee)

@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Updates mutable fields of an account (display name, profile url, niche, client, campaign)."""
    acc_service = AccountService(db)
    return acc_service.update_account(account_id, data, current_employee)

@router.get("/{account_id}/status", response_model=AccountStatusResponse)
def get_account_status(
    account_id: uuid.UUID,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Retrieves connection health, validation timestamp, and verification/approval status."""
    acc_service = AccountService(db)
    return acc_service.get_account_status(account_id, current_employee)
