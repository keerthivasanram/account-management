import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Text, Boolean, Date, DateTime,
    ForeignKey, Index, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.types import GUID, JSONType

class Employee(Base):
    __tablename__ = "employees"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    auth_user_id = Column(GUID, unique=True, nullable=False, index=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(String(50), nullable=False, default="employee")  # 'employee' or 'admin'
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    registered_accounts = relationship(
        "InstagramAccount",
        back_populates="creator",
        foreign_keys="InstagramAccount.registered_by"
    )
    assignments = relationship(
        "AccountAssignment",
        back_populates="employee",
        foreign_keys="AccountAssignment.employee_id"
    )
    assignments_created = relationship(
        "AccountAssignment",
        foreign_keys="AccountAssignment.assigned_by"
    )
    reviews_conducted = relationship(
        "AccountVerification",
        foreign_keys="AccountVerification.reviewed_by"
    )
    audit_events = relationship(
        "AuditLog",
        back_populates="actor",
        foreign_keys="AuditLog.actor_id"
    )

class Client(Base):
    __tablename__ = "clients"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    campaigns = relationship("Campaign", back_populates="client", cascade="all, delete-orphan")
    accounts = relationship("InstagramAccount", back_populates="client")

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    client_id = Column(GUID, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    client = relationship("Client", back_populates="campaigns")
    accounts = relationship("InstagramAccount", back_populates="campaign")

class InstagramAccount(Base):
    __tablename__ = "instagram_accounts"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    username = Column(String(100), nullable=False)
    # Normalized username field for unique constraint (case-insensitive)
    username_normalized = Column(String(100), unique=True, nullable=False, index=True)
    profile_url = Column(Text, nullable=False)
    display_name = Column(String(255), nullable=False)
    instagram_user_id = Column(String(100), unique=True, nullable=True, index=True)
    account_created_date = Column(Date, nullable=False)
    niche = Column(String(100), nullable=True)
    client_id = Column(GUID, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    campaign_id = Column(GUID, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    registered_by = Column(GUID, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending_connection")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship("Employee", back_populates="registered_accounts", foreign_keys=[registered_by])
    client = relationship("Client", back_populates="accounts")
    campaign = relationship("Campaign", back_populates="accounts")
    connection = relationship("AccountConnection", back_populates="account", uselist=False, cascade="all, delete-orphan")
    verification = relationship("AccountVerification", back_populates="account", uselist=False, cascade="all, delete-orphan")
    assignments = relationship("AccountAssignment", back_populates="account", cascade="all, delete-orphan")

class AccountConnection(Base):
    __tablename__ = "account_connections"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    instagram_account_id = Column(GUID, ForeignKey("instagram_accounts.id", ondelete="CASCADE"), unique=True, nullable=False)
    provider = Column(String(50), nullable=False, default="meta_oauth")
    provider_account_id = Column(String(100), nullable=True, index=True)
    encrypted_access_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    granted_permissions = Column(JSONType, nullable=True)
    connection_status = Column(String(50), nullable=False, default="disconnected")
    last_validated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    account = relationship("InstagramAccount", back_populates="connection")

class AccountAssignment(Base):
    __tablename__ = "account_assignments"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    instagram_account_id = Column(GUID, ForeignKey("instagram_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(GUID, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_by = Column(GUID, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    account = relationship("InstagramAccount", back_populates="assignments")
    employee = relationship("Employee", back_populates="assignments", foreign_keys=[employee_id])
    assigner = relationship("Employee", foreign_keys=[assigned_by], overlaps="assignments_created")

class AccountVerification(Base):
    __tablename__ = "account_verifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    instagram_account_id = Column(GUID, ForeignKey("instagram_accounts.id", ondelete="CASCADE"), unique=True, nullable=False)
    profile_verified = Column(Boolean, nullable=False, default=False)
    connection_verified = Column(Boolean, nullable=False, default=False)
    ownership_verified = Column(Boolean, nullable=False, default=False)
    approval_status = Column(String(50), nullable=False, default="pending")  # pending, approved, rejected
    reviewed_by = Column(GUID, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    remarks = Column(Text, nullable=True)

    account = relationship("InstagramAccount", back_populates="verification")
    reviewer = relationship("Employee", foreign_keys=[reviewed_by], overlaps="reviews_conducted")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    actor_id = Column(GUID, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(GUID, nullable=True, index=True)
    extra_metadata = Column("metadata", JSONType, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    actor = relationship("Employee", back_populates="audit_events")
