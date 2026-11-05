from pydantic import BaseModel, HttpUrl, field_validator, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
import re

class AccountBase(BaseModel):
    username: str
    profile_url: str
    display_name: str
    account_created_date: date
    account_type: str = "BUSINESS"  # BUSINESS, CREATOR, PERSONAL
    allow_creator: bool = False
    niche: Optional[str] = None
    client_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None

    @field_validator("account_type")
    @classmethod
    def validate_account_type(cls, v: str) -> str:
        clean = v.upper().strip()
        if clean not in ("BUSINESS", "CREATOR", "PERSONAL"):
            raise ValueError("Account type must be BUSINESS, CREATOR, or PERSONAL.")
        if clean == "PERSONAL":
            raise ValueError("Personal Instagram accounts are not eligible for official API publishing. An Instagram Professional account (Business or Creator) is required.")
        return clean

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean = v.strip().lstrip("@")
        if not (1 <= len(clean) <= 30):
            raise ValueError("Instagram username must be between 1 and 30 characters.")
        if not re.match(r"^[a-zA-Z0-9._]+$", clean):
            raise ValueError("Instagram username can only contain letters, numbers, periods, and underscores.")
        return clean

    @field_validator("profile_url")
    @classmethod
    def validate_profile_url(cls, v: str) -> str:
        url = v.strip()
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"
        if "instagram.com" not in url:
            raise ValueError("Profile URL must be a valid Instagram URL (e.g. https://www.instagram.com/username).")
        return url

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    display_name: Optional[str] = None
    profile_url: Optional[str] = None
    niche: Optional[str] = None
    account_type: Optional[str] = None
    allow_creator: Optional[bool] = None
    client_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None

class AccountCheckDuplicateRequest(BaseModel):
    username: str

class AccountCheckDuplicateResponse(BaseModel):
    is_duplicate: bool
    username: str
    message: str
    existing_account_id: Optional[UUID] = None

class ConnectionBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: str
    provider_account_id: Optional[str] = None
    connection_status: str
    token_expires_at: Optional[datetime] = None
    last_validated_at: Optional[datetime] = None

class VerificationBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    profile_verified: bool
    connection_verified: bool
    ownership_verified: bool
    approval_status: str
    remarks: Optional[str] = None
    reviewed_at: Optional[datetime] = None

class AssignmentBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: UUID
    employee_name: str
    employee_code: str
    assigned_at: datetime
    is_active: bool

class AccountResponse(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username_normalized: str
    instagram_user_id: Optional[str] = None
    registered_by: UUID
    registered_by_name: Optional[str] = None
    client_name: Optional[str] = None
    campaign_name: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    # Sub-objects
    connection: Optional[ConnectionBrief] = None
    verification: Optional[VerificationBrief] = None
    active_assignment: Optional[AssignmentBrief] = None

class AccountStatusResponse(BaseModel):
    account_id: UUID
    username: str
    status: str
    connection_status: str
    approval_status: str
    profile_verified: bool
    connection_verified: bool
    ownership_verified: bool
    remarks: Optional[str] = None
    last_validated_at: Optional[datetime] = None
