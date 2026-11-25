"""
Role-based access control (RBAC) for KLARVES.

Roles, ordered by privilege:

    super_admin  Founders / owners. Everything, incl. managing admins, org settings, security policy.
    admin        Operations. Company-wide people & Instagram account operations; cannot touch admins.
    hr_senior    Senior HR. People, teams, logins, attendance and leave company-wide; no Instagram,
                 security or system settings.
    hr_junior    Junior HR. Company-wide view, invites employees, handles leave; changes to roles,
                 teams and offboarding stay with Senior HR.
    manager      Team lead (shown as "Team Lead"). Scoped to their direct reports / department.
    employee     Self-service only.

Rules of thumb
- Endpoints declare *permissions*, never roles: `Depends(require_permission(Perm.EMPLOYEES_MANAGE))`.
- Scope (whose record?) is enforced in services with the `is_manager_of` / `can_manage_employee` helpers.
- Token claims never carry roles; the role is read from the employees table on every request.
"""
from enum import Enum
from typing import Dict, FrozenSet, Iterable, List, Optional

from fastapi import Depends, HTTPException, status


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    HR_SENIOR = "hr_senior"
    HR_JUNIOR = "hr_junior"
    MANAGER = "manager"
    EMPLOYEE = "employee"


ALL_ROLES: List[str] = [r.value for r in Role]
ROLE_RANK: Dict[str, int] = {
    Role.EMPLOYEE.value: 0,
    Role.MANAGER.value: 1,
    Role.HR_JUNIOR.value: 1,   # HR roles rank with team leads: admins and above stay out of their reach
    Role.HR_SENIOR.value: 1,
    Role.ADMIN.value: 2,
    Role.SUPER_ADMIN.value: 3,
}
ROLE_LABELS: Dict[str, str] = {
    Role.SUPER_ADMIN.value: "Super Admin",
    Role.ADMIN.value: "Admin",
    Role.HR_SENIOR.value: "Senior HR",
    Role.HR_JUNIOR.value: "Junior HR",
    Role.MANAGER.value: "Team Lead",
    Role.EMPLOYEE.value: "Employee",
}


class Perm(str, Enum):
    # Self-service (everyone)
    SELF_SERVICE = "self:use"

    # People
    TEAM_READ = "team:read"                    # see own reports / department
    EMPLOYEES_READ_ALL = "employees:read_all"
    EMPLOYEES_MANAGE = "employees:manage"      # invite, edit, offboard, import, export
    ROLES_ASSIGN = "roles:assign"              # grant manager/employee
    ROLES_ASSIGN_ADMIN = "roles:assign_admin"  # grant/revoke admin & super_admin
    DEPARTMENTS_MANAGE = "departments:manage"

    # Work & approvals
    TASKS_REVIEW_TEAM = "tasks:review_team"
    TASKS_REVIEW_ALL = "tasks:review_all"
    LEAVE_APPROVE_TEAM = "leave:approve_team"
    LEAVE_APPROVE_ALL = "leave:approve_all"
    ATTENDANCE_READ_TEAM = "attendance:read_team"
    ATTENDANCE_READ_ALL = "attendance:read_all"

    # Instagram accounts & clients
    ACCOUNTS_READ_TEAM = "accounts:read_team"
    ACCOUNTS_MANAGE_ALL = "accounts:manage_all"  # approve, assign, rebalance
    CLIENTS_MANAGE = "clients:manage"

    # HR
    HR_PORTAL = "hr:portal"                    # HR overview (eagle view) and team routing pages
    EMPLOYEES_INVITE = "employees:invite"      # invite new employees (role: employee only)

    # Oversight
    ADMIN_PORTAL = "admin:portal"
    MANAGER_PORTAL = "manager:portal"
    AUDIT_READ = "audit:read"
    SECURITY_MANAGE = "security:manage"
    DOCUMENTS_RESTRICTED = "documents:restricted"

    # Super admin only
    SETTINGS_MANAGE = "settings:manage"
    SESSIONS_REVOKE_ANY = "sessions:revoke_any"
    SYSTEM_HEALTH = "system:health"


_EMPLOYEE: FrozenSet[Perm] = frozenset({Perm.SELF_SERVICE})

_MANAGER: FrozenSet[Perm] = _EMPLOYEE | {
    Perm.MANAGER_PORTAL,
    Perm.TEAM_READ,
    Perm.TASKS_REVIEW_TEAM,
    Perm.LEAVE_APPROVE_TEAM,
    Perm.ATTENDANCE_READ_TEAM,
    Perm.ACCOUNTS_READ_TEAM,
}

# Junior HR: sees everyone, invites employees and handles leave; no role / team / offboarding changes
_HR_JUNIOR: FrozenSet[Perm] = _EMPLOYEE | {
    Perm.HR_PORTAL,
    Perm.EMPLOYEES_READ_ALL,
    Perm.EMPLOYEES_INVITE,
    Perm.ATTENDANCE_READ_ALL,
    Perm.LEAVE_APPROVE_ALL,
}

# Senior HR: people, teams, logins, attendance and leave; no Instagram, security or system settings
_HR_SENIOR: FrozenSet[Perm] = _HR_JUNIOR | {
    Perm.EMPLOYEES_MANAGE,
    Perm.ROLES_ASSIGN,
    Perm.DEPARTMENTS_MANAGE,
}

_ADMIN: FrozenSet[Perm] = _MANAGER | {
    Perm.ADMIN_PORTAL,
    Perm.HR_PORTAL,
    Perm.EMPLOYEES_INVITE,
    Perm.EMPLOYEES_READ_ALL,
    Perm.EMPLOYEES_MANAGE,
    Perm.ROLES_ASSIGN,
    Perm.DEPARTMENTS_MANAGE,
    Perm.TASKS_REVIEW_ALL,
    Perm.LEAVE_APPROVE_ALL,
    Perm.ATTENDANCE_READ_ALL,
    Perm.ACCOUNTS_MANAGE_ALL,
    Perm.CLIENTS_MANAGE,
    Perm.AUDIT_READ,
    Perm.SECURITY_MANAGE,
    Perm.DOCUMENTS_RESTRICTED,
}

_SUPER_ADMIN: FrozenSet[Perm] = _ADMIN | {
    Perm.ROLES_ASSIGN_ADMIN,
    Perm.SETTINGS_MANAGE,
    Perm.SESSIONS_REVOKE_ANY,
    Perm.SYSTEM_HEALTH,
}

ROLE_PERMISSIONS: Dict[str, FrozenSet[Perm]] = {
    Role.EMPLOYEE.value: _EMPLOYEE,
    Role.MANAGER.value: _MANAGER,
    Role.HR_JUNIOR.value: _HR_JUNIOR,
    Role.HR_SENIOR.value: _HR_SENIOR,
    Role.ADMIN.value: _ADMIN,
    Role.SUPER_ADMIN.value: _SUPER_ADMIN,
}


# ---------------------------------------------------------------------------
# Predicates
# ---------------------------------------------------------------------------

def permissions_for(role: Optional[str]) -> FrozenSet[Perm]:
    return ROLE_PERMISSIONS.get(role or "", _EMPLOYEE)


def has_permission(employee, perm: Perm) -> bool:
    return employee is not None and perm in permissions_for(employee.role)


def is_super_admin(employee) -> bool:
    return employee is not None and employee.role == Role.SUPER_ADMIN.value


def is_admin(employee) -> bool:
    """True for admin *and* super_admin."""
    return employee is not None and employee.role in (Role.ADMIN.value, Role.SUPER_ADMIN.value)


def is_manager_of(actor, target) -> bool:
    """Actor directly manages target, or heads target's department."""
    if actor is None or target is None or actor.id == target.id:
        return False
    if ROLE_RANK.get(actor.role, 0) < ROLE_RANK[Role.MANAGER.value]:
        return False
    if getattr(target, "manager_id", None) == actor.id:
        return True
    dept = getattr(target, "department", None)
    return bool(dept is not None and dept.head_employee_id == actor.id)


def can_view_employee(actor, target) -> bool:
    if actor is None or target is None:
        return False
    if actor.id == target.id or has_permission(actor, Perm.EMPLOYEES_READ_ALL):
        return True
    return has_permission(actor, Perm.TEAM_READ) and is_manager_of(actor, target)


def can_manage_employee(actor, target) -> bool:
    """Edit profile / offboard / change department. Admins cannot manage admins or super admins."""
    if not has_permission(actor, Perm.EMPLOYEES_MANAGE) or target is None:
        return False
    if is_super_admin(actor):
        return True
    return ROLE_RANK.get(target.role, 0) < ROLE_RANK[Role.ADMIN.value]


def assignable_roles(actor) -> List[str]:
    if has_permission(actor, Perm.ROLES_ASSIGN_ADMIN):
        return list(ALL_ROLES)
    if has_permission(actor, Perm.ROLES_ASSIGN):
        # Senior HR and admins: team lead, employee, Junior HR. Senior HR / admin need a super admin.
        return [Role.MANAGER.value, Role.EMPLOYEE.value, Role.HR_JUNIOR.value]
    if has_permission(actor, Perm.EMPLOYEES_INVITE):
        return [Role.EMPLOYEE.value]
    return []


def can_review_task(reviewer, task) -> bool:
    """Task reviewers: admins, the task creator, the project owner, or the assignee's manager."""
    if has_permission(reviewer, Perm.TASKS_REVIEW_ALL):
        return True
    if task.created_by == reviewer.id:
        return True
    project = getattr(task, "project", None)
    if project is not None and project.owner_id == reviewer.id:
        return True
    return has_permission(reviewer, Perm.TASKS_REVIEW_TEAM) and is_manager_of(reviewer, getattr(task, "assignee", None))


def can_approve_leave(reviewer, requester) -> bool:
    if reviewer.id == requester.id:
        return False
    if has_permission(reviewer, Perm.LEAVE_APPROVE_ALL):
        return True
    return has_permission(reviewer, Perm.LEAVE_APPROVE_TEAM) and is_manager_of(reviewer, requester)


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

def require_permission(*perms: Perm):
    """Dependency factory: caller must hold *all* listed permissions."""
    from app.services.auth_service import get_current_employee  # local import avoids a cycle

    def _dependency(current_employee=Depends(get_current_employee)):
        missing = [p for p in perms if not has_permission(current_employee, p)]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_employee

    return _dependency


def require_any_permission(*perms: Perm):
    """Dependency factory: caller must hold *at least one* listed permission."""
    from app.services.auth_service import get_current_employee

    def _dependency(current_employee=Depends(get_current_employee)):
        if not any(has_permission(current_employee, p) for p in perms):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_employee

    return _dependency


def serialize_permissions(employee) -> List[str]:
    return sorted(p.value for p in permissions_for(getattr(employee, "role", None)))
