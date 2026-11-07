from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID
from app.schemas.employee import EmployeeResponse

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

class EmployeeStatusBreakdown(BaseModel):
    total: int = 0
    connected: int = 0
    pending_connection: int = 0
    pending_approval: int = 0
    approved: int = 0
    rejected: int = 0

class EmployeeStatsSummary(BaseModel):
    capacity_target: int = 60
    assigned_count: int = 0
    registered_count: int = 0
    capacity_percentage: int = 0
    status_breakdown: EmployeeStatusBreakdown

class EmployeeDetailResponse(BaseModel):
    employee: EmployeeResponse
    stats: EmployeeStatsSummary
