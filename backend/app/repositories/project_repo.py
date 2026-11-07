from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.models import Project

class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, project_id: UUID) -> Optional[Project]:
        return (
            self.db.query(Project)
            .options(joinedload(Project.owner), joinedload(Project.department), joinedload(Project.tasks))
            .filter(Project.id == project_id)
            .first()
        )

    def list(
        self,
        department_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        owner_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Project]:
        query = (
            self.db.query(Project)
            .options(joinedload(Project.owner), joinedload(Project.department), joinedload(Project.tasks))
        )

        if department_id:
            query = query.filter(Project.department_id == department_id)
        if status:
            query = query.filter(Project.status == status)
        if owner_id:
            query = query.filter(Project.owner_id == owner_id)
        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(Project.name.ilike(s))

        return query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, project: Project) -> Project:
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def update(self, project: Project) -> Project:
        self.db.commit()
        self.db.refresh(project)
        return project
