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

    def list(self, skip: int = 0, limit: int = 100, role: Optional[str] = None, is_active: Optional[bool] = None) -> List[Employee]:
        query = self.db.query(Employee)
        if role:
            query = query.filter(Employee.role == role)
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
