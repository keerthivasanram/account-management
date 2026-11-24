"""
Employee lifecycle & people management.

    invite  ->  INVITED  --(first sign-in)-->  ACTIVE  <-->  ON_LEAVE
                                                  |
                                              offboard  ->  OFFBOARDED  --(reactivate)--> ACTIVE

All mutations are permission-checked here (not only at the router) and audit-logged.
"""
import csv
import io
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import (
    ALL_ROLES, ROLE_RANK, Role, assignable_roles, can_manage_employee, has_permission, Perm,
)
from app.models.models import (
    AccountAssignment, Department, Employee, RegisteredDevice, Task,
)
from app.repositories.audit_repo import AuditRepository
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.notification_repo import NotificationRepository
from app.schemas.employee import (
    EMPLOYEE_STATUSES, EmployeeInvite, EmployeeResponse, EmployeeUpdate, ImportResult, OffboardRequest,
)
from app.services.employee_presenter import account_counts, report_counts, to_response, to_responses

OPEN_TASK_STATUSES = ("BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "CHANGES_REQUESTED", "BLOCKED")
CSV_COLUMNS = ["email", "full_name", "role", "department_code", "manager_email", "job_title", "joined_on"]


def _forbid(detail: str):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _bad(detail: str):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class EmployeeService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EmployeeRepository(db)
        self.audit = AuditRepository(db)
        self.notifications = NotificationRepository(db)

    # ------------------------------------------------------------------ helpers

    def _get(self, employee_id: uuid.UUID) -> Employee:
        emp = self.repo.get_by_id(employee_id)
        if not emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
        return emp

    def _present(self, emp: Employee) -> EmployeeResponse:
        return to_response(emp, account_counts(self.db, [emp.id]).get(emp.id),
                           report_counts(self.db, [emp.id]).get(emp.id, 0))

    def _check_role_change(self, actor: Employee, target: Optional[Employee], new_role: str) -> None:
        if new_role not in ALL_ROLES:
            _bad(f"Unknown role '{new_role}'. Valid roles: {', '.join(ALL_ROLES)}")
        if new_role not in assignable_roles(actor):
            _forbid("You are not allowed to grant this role.")
        if target is None:
            return
        if target.id == actor.id and new_role != target.role:
            _forbid("You cannot change your own role.")
        if target.role == Role.SUPER_ADMIN.value and new_role != Role.SUPER_ADMIN.value:
            if self.repo.count_by_role(Role.SUPER_ADMIN.value) <= 1:
                _bad("Cannot demote the last active super admin.")

    def _validate_manager(self, target: Optional[Employee], manager_id: uuid.UUID) -> Employee:
        manager = self.repo.get_by_id(manager_id)
        if not manager or not manager.is_active:
            _bad("Manager not found or inactive.")
        if ROLE_RANK.get(manager.role, 0) < ROLE_RANK[Role.MANAGER.value]:
            _bad("The selected manager must have the manager role (or higher).")
        if target is not None:
            if manager.id == target.id:
                _bad("An employee cannot report to themselves.")
            # Walk up the chain to prevent cycles (A -> B -> A)
            seen, cursor = set(), manager
            while cursor is not None and cursor.id not in seen:
                if cursor.id == target.id:
                    _bad("This would create a circular reporting line.")
                seen.add(cursor.id)
                cursor = cursor.manager
        return manager

    def _validate_department(self, department_id: uuid.UUID) -> Department:
        dept = self.db.get(Department, department_id)
        if not dept:
            _bad("Department not found.")
        return dept

    def revoke_sessions(self, target: Employee, actor: Employee, reason: str = "manual") -> None:
        target.token_version = (target.token_version or 0) + 1
        self.db.query(RegisteredDevice).filter(
            RegisteredDevice.employee_id == target.id, RegisteredDevice.status != "REVOKED"
        ).update({"status": "REVOKED"}, synchronize_session=False)
        self.db.commit()
        self.audit.log(action="employee_sessions_revoked", entity_type="employee", entity_id=target.id,
                       actor_id=actor.id, metadata={"reason": reason})

    # ------------------------------------------------------------------ reads

    def list(self, status_filter: Optional[str] = None, role: Optional[str] = None,
             department_id: Optional[uuid.UUID] = None, search: Optional[str] = None,
             skip: int = 0, limit: int = 500) -> List[EmployeeResponse]:
        q = self.db.query(Employee)
        if status_filter:
            q = q.filter(Employee.status == status_filter)
        if role:
            q = q.filter(Employee.role == role)
        if department_id:
            q = q.filter(Employee.department_id == department_id)
        if search:
            like = f"%{search.strip().lower()}%"
            from sqlalchemy import func, or_
            q = q.filter(or_(func.lower(Employee.full_name).like(like), func.lower(Employee.email).like(like),
                             func.lower(Employee.employee_code).like(like)))
        employees = q.order_by(Employee.created_at.desc()).offset(skip).limit(limit).all()
        return to_responses(self.db, employees)

    # ------------------------------------------------------------------ update

    def update(self, employee_id: uuid.UUID, data: EmployeeUpdate, actor: Employee) -> EmployeeResponse:
        emp = self._get(employee_id)
        if not can_manage_employee(actor, emp):
            _forbid("You are not allowed to modify this employee.")

        changes = data.model_dump(exclude_unset=True)
        before = {k: getattr(emp, k, None) for k in changes if hasattr(emp, k)}

        if data.role is not None and data.role != emp.role:
            self._check_role_change(actor, emp, data.role)
            emp.role = data.role
        if data.full_name is not None:
            emp.full_name = data.full_name.strip()
        if data.job_title is not None:
            emp.job_title = data.job_title.strip() or None
        if data.phone_number is not None:
            emp.phone_number = data.phone_number.strip() or None
        if data.joined_on is not None:
            emp.joined_on = data.joined_on

        if data.clear_department:
            emp.department_id = None
        elif data.department_id is not None:
            emp.department_id = self._validate_department(data.department_id).id

        if data.clear_manager:
            emp.manager_id = None
        elif data.manager_id is not None:
            emp.manager_id = self._validate_manager(emp, data.manager_id).id

        if data.status is not None and data.status != emp.status:
            if data.status not in EMPLOYEE_STATUSES:
                _bad(f"Unknown status. Valid: {', '.join(EMPLOYEE_STATUSES)}")
            if data.status == "OFFBOARDED":
                _bad("Use the offboarding workflow to offboard an employee.")
            if emp.status == "OFFBOARDED":
                _bad("Use the reactivate action to bring an offboarded employee back.")
            emp.status = data.status

        revoke = False
        if data.is_active is not None and data.is_active != emp.is_active:
            if emp.id == actor.id and not data.is_active:
                _forbid("You cannot deactivate your own account.")
            if not data.is_active and emp.role == Role.SUPER_ADMIN.value and self.repo.count_by_role(Role.SUPER_ADMIN.value) <= 1:
                _bad("Cannot deactivate the last active super admin.")
            emp.is_active = data.is_active
            if not data.is_active:
                emp.status = "OFFBOARDED"
                emp.offboarded_at = datetime.now(timezone.utc)
                revoke = True
            elif emp.status == "OFFBOARDED":
                emp.status = "ACTIVE"
                emp.offboarded_at = None

        self.db.commit()
        self.db.refresh(emp)
        if revoke:
            self.revoke_sessions(emp, actor, reason="deactivated")

        after = {k: getattr(emp, k, None) for k in before}
        self.audit.log(
            action="employee_profile_updated", entity_type="employee", entity_id=emp.id, actor_id=actor.id,
            metadata={"before": {k: str(v) if v is not None else None for k, v in before.items()},
                      "after": {k: str(v) if v is not None else None for k, v in after.items()}},
        )
        if "role" in changes and before.get("role") != emp.role:
            self.notifications.create(recipient_id=emp.id, title="Your role was updated",
                                      message=f"{actor.full_name} changed your role to {emp.role.replace('_', ' ')}.",
                                      type="INFO", link_url="/dashboard")
        return self._present(emp)

    # ------------------------------------------------------------------ invite / import

    def invite(self, data: EmployeeInvite, actor: Employee, notify: bool = True) -> EmployeeResponse:
        if not has_permission(actor, Perm.EMPLOYEES_MANAGE):
            _forbid("You are not allowed to invite employees.")
        email = data.email.lower().strip()
        if self.repo.get_by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An employee with this email already exists.")
        self._check_role_change(actor, None, data.role)
        dept_id = self._validate_department(data.department_id).id if data.department_id else None
        mgr_id = self._validate_manager(None, data.manager_id).id if data.manager_id else None

        count = self.repo.count() + 1
        code = f"EMP-{count:04d}"
        while self.repo.get_by_employee_code(code):
            count += 1
            code = f"EMP-{count:04d}"

        emp = Employee(
            id=uuid.uuid4(),
            # Placeholder identity; replaced by the IdP user id on first sign-in (matched by email)
            auth_user_id=uuid.uuid5(uuid.NAMESPACE_URL, f"invite:{email}:{uuid.uuid4()}"),
            employee_code=code, full_name=data.full_name.strip(), email=email, role=data.role,
            is_active=True, status="INVITED", department_id=dept_id, manager_id=mgr_id,
            job_title=data.job_title, joined_on=data.joined_on,
        )
        self.repo.create(emp)
        from app.core.permissions import ROLE_LABELS
        from app.services.email_service import send_invitation
        emailed = send_invitation(email, emp.full_name, actor.full_name, ROLE_LABELS.get(data.role, data.role))
        self.audit.log(action="employee_invited", entity_type="employee", entity_id=emp.id, actor_id=actor.id,
                       metadata={"email": email, "role": data.role, "employee_code": code, "emailed": emailed})
        if notify and mgr_id:
            self.notifications.create(recipient_id=mgr_id, title="New team member invited",
                                      message=f"{emp.full_name} ({code}) will join your team.",
                                      type="INFO", link_url="/manager")
        return self._present(emp)

    def import_csv(self, content: str, actor: Employee) -> ImportResult:
        if not has_permission(actor, Perm.EMPLOYEES_MANAGE):
            _forbid("You are not allowed to import employees.")
        reader = csv.DictReader(io.StringIO(content.lstrip("﻿")))
        if not reader.fieldnames or "email" not in reader.fieldnames or "full_name" not in reader.fieldnames:
            _bad(f"CSV must include at least 'email' and 'full_name' columns. Supported: {', '.join(CSV_COLUMNS)}")
        depts = {d.code.upper(): d.id for d in self.db.query(Department).all()}
        created, skipped, errors = 0, 0, []
        for line_no, row in enumerate(reader, start=2):
            if line_no > 1001:
                errors.append("Stopped after 1000 rows; split the file and import the rest separately.")
                break
            email = (row.get("email") or "").strip().lower()
            if not email:
                skipped += 1
                continue
            if self.repo.get_by_email(email):
                skipped += 1
                continue
            try:
                mgr = self.repo.get_by_email(row["manager_email"].strip()) if (row.get("manager_email") or "").strip() else None
                dept_code = (row.get("department_code") or "").strip().upper()
                if dept_code and dept_code not in depts:
                    raise ValueError(f"unknown department_code '{dept_code}'")
                joined = (row.get("joined_on") or "").strip()
                invite = EmployeeInvite(
                    email=email, full_name=(row.get("full_name") or "").strip() or email.split("@")[0],
                    role=(row.get("role") or "employee").strip().lower() or "employee",
                    department_id=depts.get(dept_code) if dept_code else None,
                    manager_id=mgr.id if mgr else None,
                    job_title=(row.get("job_title") or "").strip() or None,
                    joined_on=date.fromisoformat(joined) if joined else None,
                )
                self.invite(invite, actor, notify=False)
                created += 1
            except HTTPException as e:
                self.db.rollback()
                errors.append(f"Row {line_no} ({email}): {e.detail}")
            except Exception as e:  # validation / parse errors
                self.db.rollback()
                errors.append(f"Row {line_no} ({email}): {e}")
        self.audit.log(action="employees_imported", entity_type="employee", actor_id=actor.id,
                       metadata={"created": created, "skipped": skipped, "errors": len(errors)})
        return ImportResult(created=created, skipped=skipped, errors=errors[:100])

    def export_csv(self) -> str:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["employee_code", "full_name", "email", "role", "status", "department", "manager",
                         "job_title", "joined_on", "last_login_at", "assigned_accounts", "registered_accounts"])
        employees = self.db.query(Employee).order_by(Employee.employee_code).all()
        counts = account_counts(self.db, [e.id for e in employees])
        for e in employees:
            a, r = counts.get(e.id, (0, 0))
            writer.writerow([e.employee_code, e.full_name, e.email, e.role, e.status,
                             e.department.name if e.department else "", e.manager.email if e.manager else "",
                             e.job_title or "", e.joined_on or "", e.last_login_at or "", a, r])
        return buf.getvalue()

    # ------------------------------------------------------------------ offboarding

    def offboard(self, employee_id: uuid.UUID, req: OffboardRequest, actor: Employee) -> dict:
        emp = self._get(employee_id)
        if not can_manage_employee(actor, emp):
            _forbid("You are not allowed to offboard this employee.")
        if emp.id == actor.id:
            _forbid("You cannot offboard yourself.")
        if emp.status == "OFFBOARDED":
            _bad("Employee is already offboarded.")
        if emp.role == Role.SUPER_ADMIN.value and self.repo.count_by_role(Role.SUPER_ADMIN.value) <= 1:
            _bad("Cannot offboard the last active super admin.")

        successor = None
        if req.reassign_to:
            successor = self.repo.get_by_id(req.reassign_to)
            if not successor or not successor.is_active or successor.id == emp.id:
                _bad("Successor must be a different, active employee.")

        open_assignments = self.db.query(AccountAssignment).filter(
            AccountAssignment.employee_id == emp.id, AccountAssignment.is_active == True  # noqa: E712
        ).all()
        open_tasks = self.db.query(Task).filter(Task.assigned_to == emp.id, Task.status.in_(OPEN_TASK_STATUSES)).all()
        if (open_assignments or open_tasks) and successor is None:
            _bad(f"Employee still owns {len(open_assignments)} active account(s) and {len(open_tasks)} open task(s). "
                 "Choose a successor (reassign_to) to hand them over.")

        moved_accounts = 0
        for a in open_assignments:
            a.is_active = False
            self.db.add(AccountAssignment(instagram_account_id=a.instagram_account_id, employee_id=successor.id,
                                          assigned_by=actor.id, is_active=True))
            moved_accounts += 1
        for t in open_tasks:
            t.assigned_to = successor.id

        # Direct reports move up to the leaver's own manager (or the successor if they can manage)
        new_manager_id = emp.manager_id
        if new_manager_id is None and successor and ROLE_RANK.get(successor.role, 0) >= ROLE_RANK[Role.MANAGER.value]:
            new_manager_id = successor.id
        reports = self.db.query(Employee).filter(Employee.manager_id == emp.id).all()
        for r in reports:
            r.manager_id = new_manager_id
        self.db.query(Department).filter(Department.head_employee_id == emp.id).update(
            {"head_employee_id": None}, synchronize_session=False)

        emp.status = "OFFBOARDED"
        emp.is_active = False
        emp.offboarded_at = datetime.now(timezone.utc)
        self.db.commit()
        self.revoke_sessions(emp, actor, reason="offboarded")

        summary = {"accounts_reassigned": moved_accounts, "tasks_reassigned": len(open_tasks),
                   "reports_moved": len(reports), "successor_id": str(successor.id) if successor else None}
        self.audit.log(action="employee_offboarded", entity_type="employee", entity_id=emp.id, actor_id=actor.id,
                       metadata={**summary, "reason": req.reason,
                                 "effective_date": str(req.effective_date or date.today())})
        if successor and (moved_accounts or open_tasks):
            self.notifications.create(
                recipient_id=successor.id, title="Work handed over to you",
                message=f"You inherited {moved_accounts} account(s) and {len(open_tasks)} task(s) from {emp.full_name}.",
                type="TASK_ASSIGNED", link_url="/tasks")
        return {"employee": self._present(emp), **summary}

    def reactivate(self, employee_id: uuid.UUID, actor: Employee) -> EmployeeResponse:
        emp = self._get(employee_id)
        if not can_manage_employee(actor, emp):
            _forbid("You are not allowed to reactivate this employee.")
        if emp.status != "OFFBOARDED":
            _bad("Only offboarded employees can be reactivated.")
        emp.status = "ACTIVE"
        emp.is_active = True
        emp.offboarded_at = None
        self.db.commit()
        self.audit.log(action="employee_reactivated", entity_type="employee", entity_id=emp.id, actor_id=actor.id)
        return self._present(emp)
