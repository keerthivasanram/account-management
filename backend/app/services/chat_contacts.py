"""Who an employee may message in Team messages.

Employees: their manager, their department (incl. its head) and, for managers, their team.
Administrators: everyone active. Keeps conversations to the people someone works with.
"""
from typing import List

from sqlalchemy.orm import Session

from app.core.permissions import Perm, has_permission
from app.models.models import Department, Employee
from app.repositories.employee_repo import EmployeeRepository


def contacts_for(db: Session, me: Employee) -> List[Employee]:
    active = db.query(Employee).filter(Employee.is_active == True, Employee.status != "OFFBOARDED", Employee.id != me.id)  # noqa: E712
    if has_permission(me, Perm.ADMIN_PORTAL):
        return active.order_by(Employee.full_name).all()
    ids = set()
    if me.manager_id:
        ids.add(me.manager_id)
    if me.department_id:
        ids.update(e.id for e in db.query(Employee.id).filter(Employee.department_id == me.department_id))
        dept = db.query(Department).filter(Department.id == me.department_id).first()
        if dept and dept.head_employee_id:
            ids.add(dept.head_employee_id)
    if has_permission(me, Perm.TEAM_READ):
        ids.update(e.id for e in EmployeeRepository(db).list_team(me))
    ids.discard(me.id)
    if not ids:
        return []
    return active.filter(Employee.id.in_(ids)).order_by(Employee.full_name).all()
