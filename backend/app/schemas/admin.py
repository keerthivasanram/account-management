from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ApprovalRequest(BaseModel):
    approval_status: str  # "approved" or "rejected"
    remarks: Optional[str] = None

class AssignmentRequest(BaseModel):
    employee_id: UUID

class AdminStatsResponse(BaseModel):
    total_accounts: int
    connected_accounts: int
    pending_accounts: int
    approved_accounts: int
    rejected_accounts: int
    total_employees: int
    total_clients: int
    total_campaigns: int

class EmployeeAssignmentStat(BaseModel):
    employee_id: UUID
    full_name: str
    employee_code: str
    email: str
    assigned_count: int
    registered_count: int
    target_count: int = 60
