import uuid
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from app.models.models import Task, TaskActivityEvent

class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, task_id: UUID) -> Optional[Task]:
        return (
            self.db.query(Task)
            .options(
                joinedload(Task.project),
                joinedload(Task.assignee),
                joinedload(Task.creator),
                joinedload(Task.activity_events).joinedload(TaskActivityEvent.actor)
            )
            .filter(Task.id == task_id)
            .first()
        )

    def list(
        self,
        project_id: Optional[UUID] = None,
        assigned_to: Optional[UUID] = None,
        created_by: Optional[UUID] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        query = (
            self.db.query(Task)
            .options(
                joinedload(Task.project),
                joinedload(Task.assignee),
                joinedload(Task.creator),
                joinedload(Task.activity_events).joinedload(TaskActivityEvent.actor)
            )
        )

        if project_id:
            query = query.filter(Task.project_id == project_id)
        if assigned_to:
            query = query.filter(Task.assigned_to == assigned_to)
        if created_by:
            query = query.filter(Task.created_by == created_by)
        if status:
            query = query.filter(Task.status == status)
        if priority:
            query = query.filter(Task.priority == priority)
        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(Task.title.ilike(s))

        return query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()

    def create(self, task: Task) -> Task:
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task: Task) -> Task:
        self.db.commit()
        self.db.refresh(task)
        return task

    def log_activity(
        self,
        task_id: UUID,
        actor_id: UUID,
        action: str,
        previous_status: Optional[str] = None,
        new_status: Optional[str] = None,
        remarks: Optional[str] = None,
        extra_metadata: Optional[dict] = None
    ) -> TaskActivityEvent:
        event = TaskActivityEvent(
            id=uuid.uuid4(),
            task_id=task_id,
            actor_id=actor_id,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            remarks=remarks,
            extra_metadata=extra_metadata
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event
