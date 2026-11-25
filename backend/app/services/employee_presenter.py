"""Single place that turns an Employee row into the API response shape."""
from typing import Dict, Iterable, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import ROLE_LABELS, serialize_permissions
from app.models.models import AccountAssignment, Employee, InstagramAccount
from app.schemas.employee import EmployeeResponse


def account_counts(db: Session, employee_ids: Iterable[UUID]) -> Dict[UUID, Tuple[int, int]]:
    """{employee_id: (assigned_active, registered)} in two grouped queries instead of 2N."""
    ids = list(employee_ids)
    if not ids:
        return {}
    assigned = dict(
        db.query(AccountAssignment.employee_id, func.count(AccountAssignment.id))
        .filter(AccountAssignment.employee_id.in_(ids), AccountAssignment.is_active == True)  # noqa: E712
        .group_by(AccountAssignment.employee_id).all()
    )
    registered = dict(
        db.query(InstagramAccount.registered_by, func.count(InstagramAccount.id))
        .filter(InstagramAccount.registered_by.in_(ids))
        .group_by(InstagramAccount.registered_by).all()
    )
    return {i: (assigned.get(i, 0), registered.get(i, 0)) for i in ids}


def report_counts(db: Session, employee_ids: Iterable[UUID]) -> Dict[UUID, int]:
    ids = list(employee_ids)
    if not ids:
        return {}
    return dict(
        db.query(Employee.manager_id, func.count(Employee.id))
        .filter(Employee.manager_id.in_(ids), Employee.is_active == True)  # noqa: E712
        .group_by(Employee.manager_id).all()
    )


def to_response(
    emp: Employee,
    counts: Optional[Tuple[int, int]] = None,
    reports: int = 0,
    include_permissions: bool = False,
    include_private: bool = False,
) -> EmployeeResponse:
    assigned, registered = counts or (0, 0)
    return EmployeeResponse(
        id=emp.id,
        auth_user_id=emp.auth_user_id,
        employee_code=emp.employee_code,
        full_name=emp.full_name,
        email=emp.email,
        role=emp.role,
        role_label=ROLE_LABELS.get(emp.role, emp.role.title()),
        is_active=emp.is_active,
        status=emp.status or ("ACTIVE" if emp.is_active else "OFFBOARDED"),
        created_at=emp.created_at,
        assigned_accounts_count=assigned,
        registered_accounts_count=registered,
        job_title=emp.job_title,
        phone_number=emp.phone_number,
        bio=emp.bio if include_private else None,
        emergency_contact=emp.emergency_contact if include_private else None,
        department_id=emp.department_id,
        department_name=emp.department.name if emp.department else None,
        manager_id=emp.manager_id,
        manager_name=emp.manager.full_name if emp.manager else None,
        joined_on=emp.joined_on,
        last_login_at=emp.last_login_at,
        offboarded_at=emp.offboarded_at,
        direct_reports_count=reports,
        permissions=serialize_permissions(emp) if include_permissions else [],
    )


def to_responses(db: Session, employees: List[Employee]) -> List[EmployeeResponse]:
    ids = [e.id for e in employees]
    counts = account_counts(db, ids)
    reports = report_counts(db, ids)
    return [to_response(e, counts.get(e.id), reports.get(e.id, 0)) for e in employees]
