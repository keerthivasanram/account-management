from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from app.models.models import Department

class DepartmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, dept_id: UUID) -> Optional[Department]:
        return (
            self.db.query(Department)
            .options(joinedload(Department.head), joinedload(Department.members), joinedload(Department.projects))
            .filter(Department.id == dept_id)
            .first()
        )

    def get_by_name(self, name: str) -> Optional[Department]:
        return self.db.query(Department).filter(Department.name.ilike(name.strip())).first()

    def get_by_code(self, code: str) -> Optional[Department]:
        return self.db.query(Department).filter(Department.code == code.strip().upper()).first()

    def list(self) -> List[Department]:
        return (
            self.db.query(Department)
            .options(joinedload(Department.head), joinedload(Department.members), joinedload(Department.projects))
            .order_by(Department.name.asc())
            .all()
        )

    def create(self, dept: Department) -> Department:
        self.db.add(dept)
        self.db.commit()
        self.db.refresh(dept)
        return dept

    def update(self, dept: Department) -> Department:
        self.db.commit()
        self.db.refresh(dept)
        return dept

    def delete(self, dept: Department) -> None:
        self.db.delete(dept)
        self.db.commit()
