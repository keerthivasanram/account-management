"""Startup bootstrap: super-admin assertion (all environments) and dev role fixtures."""
import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Department, Employee
from app.repositories.audit_repo import AuditRepository

DEV_SUPER_ADMIN_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
DEV_MANAGER_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")
DEV_EMPLOYEE_ID = uuid.UUID("00000000-0000-0000-0000-000000000011")
MKT_DEPT_ID = uuid.UUID("44444444-4444-4444-4444-444444444441")


def ensure_super_admins(db: Session) -> int:
    """Promote any existing employee listed in SUPER_ADMIN_EMAILS. Returns number promoted."""
    promoted = 0
    audit = AuditRepository(db)
    for email in settings.super_admin_emails:
        emp = db.query(Employee).filter(Employee.email == email).first()
        if emp and emp.role != "super_admin":
            previous = emp.role
            emp.role = "super_admin"
            audit.log(action="super_admin_bootstrapped", entity_type="employee", entity_id=emp.id,
                      actor_id=None, metadata={"previous_role": previous, "source": "SUPER_ADMIN_EMAILS"})
            promoted += 1
    db.commit()
    return promoted


def seed_dev_role_fixtures(db: Session) -> None:
    """One login per role for local development (see the login page quick-switcher)."""
    def upsert(emp_id, email, code, name, role, **extra):
        emp = db.query(Employee).filter(Employee.email == email).first()
        if emp:
            return emp
        emp = Employee(id=emp_id, auth_user_id=emp_id, employee_code=code, full_name=name, email=email,
                       role=role, is_active=True, status="ACTIVE", joined_on=date(2026, 1, 5), **extra)
        db.add(emp)
        db.flush()
        return emp

    upsert(DEV_SUPER_ADMIN_ID, "superadmin@company.internal", "EMP-0000", "Founder (Super Admin)", "super_admin",
           job_title="Founder & CEO")
    dept = db.get(Department, MKT_DEPT_ID)
    manager = upsert(DEV_MANAGER_ID, "manager1@company.internal", "EMP-0100", "Priya Nair", "manager",
                     job_title="Marketing Manager", department_id=dept.id if dept else None)
    if dept and dept.head_employee_id is None:
        dept.head_employee_id = manager.id
    employee = db.query(Employee).filter(Employee.email == "employee1@company.internal").first()
    if employee and employee.manager_id is None:
        employee.manager_id = manager.id
    db.commit()
