import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Text, Boolean, Date, DateTime, Float, Integer,
    ForeignKey, Index, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.types import GUID, JSONType

class Department(Base):
    __tablename__ = "departments"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(150), unique=True, nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    head_employee_id = Column(GUID, ForeignKey("employees.id", ondelete="SET NULL", use_alter=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    head = relationship("Employee", foreign_keys=[head_employee_id], post_update=True)
    members = relationship("Employee", back_populates="department", foreign_keys="Employee.department_id")
    projects = relationship("Project", back_populates="department")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    auth_user_id = Column(GUID, unique=True, nullable=False, index=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(String(50), nullable=False, default="employee")  # 'employee' or 'admin'
    is_active = Column(Boolean, nullable=False, default=True)
    department_id = Column(GUID, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    department = relationship("Department", back_populates="members", foreign_keys=[department_id])
    tasks_assigned = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")
    tasks_created = relationship("Task", back_populates="creator", foreign_keys="Task.created_by")
    projects_owned = relationship("Project", back_populates="owner", foreign_keys="Project.owner_id")
    devices = relationship("RegisteredDevice", back_populates="employee", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
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
    account_type = Column(String(50), nullable=False, default="BUSINESS")  # BUSINESS, CREATOR, PERSONAL
    allow_creator = Column(Boolean, nullable=False, default=False)
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
    connection_status = Column(String(50), nullable=False, default="NOT_CONNECTED")
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

class OAuthState(Base):
    __tablename__ = "oauth_states"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    state_token = Column(String(255), unique=True, nullable=False, index=True)
    employee_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(GUID, ForeignKey("instagram_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, nullable=False, default=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

    account = relationship("InstagramAccount")
    employee = relationship("Employee")

class Project(Base):
    __tablename__ = "projects"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(GUID, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(GUID, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), nullable=False, default="ACTIVE")  # PLANNING, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED
    priority = Column(String(20), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("Employee", foreign_keys=[owner_id], back_populates="projects_owned")
    department = relationship("Department", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to = Column(GUID, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False, index=True)
    created_by = Column(GUID, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False, index=True)
    priority = Column(String(20), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(50), nullable=False, default="TODO")  # BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, CHANGES_REQUESTED, APPROVED, COMPLETED, BLOCKED, CANCELLED
    due_date = Column(Date, nullable=True)
    estimated_effort_hours = Column(Float, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("Project", back_populates="tasks")
    assignee = relationship("Employee", foreign_keys=[assigned_to], back_populates="tasks_assigned")
    creator = relationship("Employee", foreign_keys=[created_by], back_populates="tasks_created")
    activity_events = relationship("TaskActivityEvent", back_populates="task", cascade="all, delete-orphan", order_by="TaskActivityEvent.created_at.desc()")

class TaskActivityEvent(Base):
    __tablename__ = "task_activity_events"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    task_id = Column(GUID, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(GUID, ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False, index=True)
    action = Column(String(100), nullable=False)  # CREATED, ASSIGNED, STARTED, SUBMITTED_FOR_REVIEW, CHANGES_REQUESTED, APPROVED, COMPLETED
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    remarks = Column(Text, nullable=True)
    extra_metadata = Column("metadata", JSONType, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    task = relationship("Task", back_populates="activity_events")
    actor = relationship("Employee")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    recipient_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False, default="INFO")  # TASK_ASSIGNED, TASK_REVIEW_REQUESTED, TASK_APPROVED, CHANGES_REQUESTED, SECURITY_ALERT
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    recipient = relationship("Employee", back_populates="notifications")

class RegisteredDevice(Base):
    __tablename__ = "registered_devices"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    employee_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    device_name = Column(String(255), nullable=False)
    device_fingerprint = Column(String(255), nullable=False, index=True)
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    ip_address = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="APPROVED")  # APPROVED, PENDING, REVOKED
    registered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="devices")

class SecurityIncident(Base):
    __tablename__ = "security_incidents"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    actor_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # SCREENSHOT_KEY_DETECTED, FOCUS_LOST_SUSPICIOUS, DEVTOOLS_OPENED, CLIPBOARD_PROTECTION
    severity = Column(String(20), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    route = Column(String(255), nullable=False)
    key_combination = Column(String(100), nullable=True)
    ip_address = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="OPEN")  # OPEN, RESOLVED, FALSE_POSITIVE
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    actor = relationship("Employee")

# ==============================================================================
# MODULE 06 — COMPANY-MANAGED INTERNAL MESSAGING
# ==============================================================================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    type = Column(String(50), nullable=False, default="DIRECT")  # DIRECT, DEPARTMENT, PROJECT, ANNOUNCEMENT
    title = Column(String(255), nullable=True)
    department_id = Column(GUID, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = Column(GUID, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    department = relationship("Department")
    creator = relationship("Employee", foreign_keys=[created_by])
    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at.asc()")

class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="members")
    employee = relationship("Employee")

class Message(Base):
    __tablename__ = "messages"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    is_redacted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("Employee")

# ==============================================================================
# MODULE 07 — ATTENDANCE & LEAVE MANAGEMENT
# ==============================================================================

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    employee_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in_at = Column(DateTime(timezone=True), nullable=False)
    check_out_at = Column(DateTime(timezone=True), nullable=True)
    total_hours = Column(Float, nullable=True)
    status = Column(String(50), nullable=False, default="PRESENT")  # PRESENT, HALF_DAY, LATE
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee = relationship("Employee")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    employee_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(String(50), nullable=False)  # SICK, CASUAL, ANNUAL, EMERGENCY
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED, CANCELLED
    reviewed_by = Column(GUID, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    review_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    employee = relationship("Employee", foreign_keys=[employee_id])
    reviewer = relationship("Employee", foreign_keys=[reviewed_by])

# ==============================================================================
# MODULE 01 EXTENSION — LOGIN VERIFICATION & MFA CHALLENGE
# ==============================================================================

class LoginVerificationCode(Base):
    __tablename__ = "login_verification_codes"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    employee_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(20), nullable=False)
    purpose = Column(String(50), nullable=False, default="LOGIN_2FA")  # LOGIN_2FA, DEVICE_VERIFY
    is_used = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    employee = relationship("Employee")

# ==============================================================================
# MODULE 08 — SECURE DOCUMENT MANAGEMENT & S3 REPOSITORY
# ==============================================================================

class Document(Base):
    __tablename__ = "documents"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False)  # POLICY, CONTRACT, BRAND_ASSET, FINANCIAL, BRIEF
    classification = Column(String(50), nullable=False, default="INTERNAL")  # PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
    file_url = Column(Text, nullable=False)
    mime_type = Column(String(100), nullable=False, default="application/pdf")
    file_size_bytes = Column(Integer, nullable=False, default=1024)
    owner_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    download_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("Employee")
    access_logs = relationship("DocumentAccessLog", back_populates="document", cascade="all, delete-orphan")

class DocumentAccessLog(Base):
    __tablename__ = "document_access_logs"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # VIEWED, DOWNLOADED
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    document = relationship("Document", back_populates="access_logs")
    actor = relationship("Employee")

# ==============================================================================
# MODULE 09 — SOCIAL MEDIA MANAGEMENT & SCHEDULED CONTENT PUBLISHING
# ==============================================================================

class ScheduledPost(Base):
    __tablename__ = "scheduled_posts"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    account_id = Column(GUID, ForeignKey("instagram_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(GUID, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    campaign_id = Column(GUID, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(GUID, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    media_type = Column(String(50), nullable=False, default="IMAGE")  # IMAGE, CAROUSEL, REELS, STORY
    caption = Column(Text, nullable=False)
    media_url = Column(Text, nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="DRAFT")  # DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED, FAILED
    published_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    account = relationship("InstagramAccount")
    creator = relationship("Employee")
    campaign = relationship("Campaign")
    project = relationship("Project")
