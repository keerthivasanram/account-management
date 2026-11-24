from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Employee

class EmployeeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, employee_id: UUID) -> Optional[Employee]:
        return self.db.query(Employee).filter(Employee.id == employee_id).first()

    def get_by_auth_user_id(self, auth_user_id: UUID) -> Optional[Employee]:
        return self.db.query(Employee).filter(Employee.auth_user_id == auth_user_id).first()

    def get_by_email(self, email: str) -> Optional[Employee]:
        return self.db.query(Employee).filter(func.lower(Employee.email) == email.lower().strip()).first()

    def get_by_employee_code(self, code: str) -> Optional[Employee]:
        return self.db.query(Employee).filter(Employee.employee_code == code.strip()).first()

    def list(self, skip: int = 0, limit: int = 100, role: Optional[str] = None, is_active: Optional[bool] = None,
             roles: Optional[List[str]] = None) -> List[Employee]:
        query = self.db.query(Employee)
        if role:
            query = query.filter(Employee.role == role)
        if roles:
            query = query.filter(Employee.role.in_(roles))
        if is_active is not None:
            query = query.filter(Employee.is_active == is_active)
        return query.order_by(Employee.created_at.desc()).offset(skip).limit(limit).all()

    def count(self) -> int:
        return self.db.query(Employee).count()

    def create(self, employee: Employee) -> Employee:
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def update(self, employee: Employee) -> Employee:
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def list_direct_reports(self, manager_id: UUID) -> List[Employee]:
        return self.db.query(Employee).filter(Employee.manager_id == manager_id).order_by(Employee.full_name).all()

    def list_team(self, manager: Employee, include_inactive: bool = False) -> List[Employee]:
        """Direct reports plus members of departments the manager heads (deduplicated)."""
        from app.models.models import Department
        headed = [d.id for d in self.db.query(Department.id).filter(Department.head_employee_id == manager.id).all()]
        query = self.db.query(Employee).filter(Employee.id != manager.id)
        cond = Employee.manager_id == manager.id
        if headed:
            cond = cond | Employee.department_id.in_(headed)
        query = query.filter(cond)
        if not include_inactive:
            query = query.filter(Employee.is_active == True)  # noqa: E712
        return query.order_by(Employee.full_name).all()

    def count_by_role(self, role: str, active_only: bool = True) -> int:
        q = self.db.query(Employee).filter(Employee.role == role)
        if active_only:
            q = q.filter(Employee.is_active == True)  # noqa: E712
        return q.count()
