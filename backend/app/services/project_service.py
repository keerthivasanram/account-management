import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import Project, Employee
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.repositories.project_repo import ProjectRepository
from app.repositories.department_repo import DepartmentRepository
from app.repositories.audit_repo import AuditRepository

class ProjectService:
    def __init__(self, db: Session):
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.dept_repo = DepartmentRepository(db)
        self.audit_repo = AuditRepository(db)

    def _build_response(self, p: Project) -> ProjectResponse:
        total_tasks = len(p.tasks) if p.tasks else 0
        completed = sum(1 for t in p.tasks if t.status in ("COMPLETED", "APPROVED")) if p.tasks else 0
        progress = round((completed / total_tasks) * 100) if total_tasks > 0 else 0

        return ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            department_id=p.department_id,
            status=p.status,
            priority=p.priority,
            start_date=p.start_date,
            end_date=p.end_date,
            owner_id=p.owner_id,
            owner_name=p.owner.full_name if p.owner else "Unknown",
            department_name=p.department.name if p.department else None,
            tasks_count=total_tasks,
            completed_tasks_count=completed,
            progress_percentage=progress,
            created_at=p.created_at
        )

    def list_projects(
        self,
        department_id: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        owner_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProjectResponse]:
        projects = self.project_repo.list(
            department_id=department_id,
            status=status_filter,
            search=search,
            owner_id=owner_id,
            skip=skip,
            limit=limit
        )
        return [self._build_response(p) for p in projects]

    def get_project(self, project_id: uuid.UUID) -> ProjectResponse:
        p = self.project_repo.get_by_id(project_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return self._build_response(p)

    def create_project(self, data: ProjectCreate, actor: Employee) -> ProjectResponse:
        if data.department_id:
            dept = self.dept_repo.get_by_id(data.department_id)
            if not dept:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected department does not exist")

        proj = Project(
            id=uuid.uuid4(),
            name=data.name.strip(),
            description=data.description,
            owner_id=actor.id,
            department_id=data.department_id,
            status=data.status or "ACTIVE",
            priority=data.priority or "MEDIUM",
            start_date=data.start_date,
            end_date=data.end_date
        )
        created = self.project_repo.create(proj)

        self.audit_repo.log(
            action="project_created",
            entity_type="project",
            entity_id=created.id,
            actor_id=actor.id,
            metadata={"name": created.name, "priority": created.priority}
        )

        return self.get_project(created.id)

    def update_project(self, project_id: uuid.UUID, data: ProjectUpdate, actor: Employee) -> ProjectResponse:
        proj = self.project_repo.get_by_id(project_id)
        if not proj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        if data.name is not None:
            proj.name = data.name.strip()
        if data.description is not None:
            proj.description = data.description
        if data.department_id is not None:
            proj.department_id = data.department_id
        if data.status is not None:
            proj.status = data.status
        if data.priority is not None:
            proj.priority = data.priority
        if data.start_date is not None:
            proj.start_date = data.start_date
        if data.end_date is not None:
            proj.end_date = data.end_date

        self.project_repo.update(proj)
        return self.get_project(proj.id)
