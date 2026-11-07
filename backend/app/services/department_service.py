import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import Department, Employee
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.repositories.department_repo import DepartmentRepository
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.audit_repo import AuditRepository

class DepartmentService:
    def __init__(self, db: Session):
        self.db = db
        self.dept_repo = DepartmentRepository(db)
        self.emp_repo = EmployeeRepository(db)
        self.audit_repo = AuditRepository(db)

    def list_departments(self) -> List[DepartmentResponse]:
        departments = self.dept_repo.list()
        res = []
        for d in departments:
            res.append(
                DepartmentResponse(
                    id=d.id,
                    name=d.name,
                    code=d.code,
                    description=d.description,
                    head_employee_id=d.head_employee_id,
                    head_name=d.head.full_name if d.head else None,
                    members_count=len(d.members) if d.members else 0,
                    projects_count=len(d.projects) if d.projects else 0,
                    created_at=d.created_at
                )
            )
        return res

    def get_department(self, dept_id: uuid.UUID) -> DepartmentResponse:
        d = self.dept_repo.get_by_id(dept_id)
        if not d:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        return DepartmentResponse(
            id=d.id,
            name=d.name,
            code=d.code,
            description=d.description,
            head_employee_id=d.head_employee_id,
            head_name=d.head.full_name if d.head else None,
            members_count=len(d.members) if d.members else 0,
            projects_count=len(d.projects) if d.projects else 0,
            created_at=d.created_at
        )

    def create_department(self, data: DepartmentCreate, actor: Employee) -> DepartmentResponse:
        if self.dept_repo.get_by_code(data.code):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Department code '{data.code}' already exists")
        if self.dept_repo.get_by_name(data.name):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Department name '{data.name}' already exists")

        dept = Department(
            id=uuid.uuid4(),
            name=data.name.strip(),
            code=data.code.strip().upper(),
            description=data.description,
            head_employee_id=data.head_employee_id
        )
        created = self.dept_repo.create(dept)

        self.audit_repo.log(
            action="department_created",
            entity_type="department",
            entity_id=created.id,
            actor_id=actor.id,
            metadata={"name": created.name, "code": created.code}
        )

        return self.get_department(created.id)

    def update_department(self, dept_id: uuid.UUID, data: DepartmentUpdate, actor: Employee) -> DepartmentResponse:
        dept = self.dept_repo.get_by_id(dept_id)
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

        if data.name is not None:
            dept.name = data.name.strip()
        if data.code is not None:
            dept.code = data.code.strip().upper()
        if data.description is not None:
            dept.description = data.description
        if data.head_employee_id is not None:
            dept.head_employee_id = data.head_employee_id

        updated = self.dept_repo.update(dept)
        return self.get_department(updated.id)
