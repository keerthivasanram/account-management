import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import Task, TaskActivityEvent, Employee, Project
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskActivityResponse,
    TaskSubmitRequest, TaskApprovalRequest, TaskChangeRequest
)
from app.repositories.task_repo import TaskRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.employee_repo import EmployeeRepository
from app.repositories.notification_repo import NotificationRepository
from app.repositories.audit_repo import AuditRepository

class TaskService:
    def __init__(self, db: Session):
        self.db = db
        self.task_repo = TaskRepository(db)
        self.project_repo = ProjectRepository(db)
        self.emp_repo = EmployeeRepository(db)
        self.notif_repo = NotificationRepository(db)
        self.audit_repo = AuditRepository(db)

    def _build_response(self, t: Task) -> TaskResponse:
        events = []
        if t.activity_events:
            for ev in t.activity_events:
                events.append(
                    TaskActivityResponse(
                        id=ev.id,
                        task_id=ev.task_id,
                        actor_id=ev.actor_id,
                        actor_name=ev.actor.full_name if ev.actor else "System",
                        action=ev.action,
                        previous_status=ev.previous_status,
                        new_status=ev.new_status,
                        remarks=ev.remarks,
                        created_at=ev.created_at
                    )
                )

        return TaskResponse(
            id=t.id,
            project_id=t.project_id,
            project_name=t.project.name if t.project else None,
            title=t.title,
            description=t.description,
            assigned_to=t.assigned_to,
            assignee_name=t.assignee.full_name if t.assignee else "Unassigned",
            assignee_code=t.assignee.employee_code if t.assignee else None,
            created_by=t.created_by,
            creator_name=t.creator.full_name if t.creator else "System",
            priority=t.priority,
            status=t.status,
            due_date=t.due_date,
            estimated_effort_hours=t.estimated_effort_hours,
            completed_at=t.completed_at,
            created_at=t.created_at,
            updated_at=t.updated_at,
            activity_events=events
        )

    def list_tasks(
        self,
        project_id: Optional[uuid.UUID] = None,
        assigned_to: Optional[uuid.UUID] = None,
        created_by: Optional[uuid.UUID] = None,
        status_filter: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[TaskResponse]:
        tasks = self.task_repo.list(
            project_id=project_id,
            assigned_to=assigned_to,
            created_by=created_by,
            status=status_filter,
            priority=priority,
            search=search,
            skip=skip,
            limit=limit
        )
        return [self._build_response(t) for t in tasks]

    def get_task(self, task_id: uuid.UUID) -> TaskResponse:
        t = self.task_repo.get_by_id(task_id)
        if not t:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        return self._build_response(t)

    def create_task(self, data: TaskCreate, creator: Employee) -> TaskResponse:
        project = self.project_repo.get_by_id(data.project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected project does not exist")

        assignee = self.emp_repo.get_by_id(data.assigned_to)
        if not assignee:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned employee does not exist")

        task = Task(
            id=uuid.uuid4(),
            project_id=data.project_id,
            title=data.title.strip(),
            description=data.description,
            assigned_to=data.assigned_to,
            created_by=creator.id,
            priority=data.priority or "MEDIUM",
            status="TODO",
            due_date=data.due_date,
            estimated_effort_hours=data.estimated_effort_hours
        )
        created = self.task_repo.create(task)

        # 1. Log immutable creation event
        self.task_repo.log_activity(
            task_id=created.id,
            actor_id=creator.id,
            action="CREATED",
            previous_status=None,
            new_status="TODO",
            remarks=f"Task created and assigned to {assignee.full_name} ({assignee.employee_code})"
        )

        # 2. Dispatch notification to assignee
        if assignee.id != creator.id:
            self.notif_repo.create(
                recipient_id=assignee.id,
                title="New Task Assigned",
                message=f"{creator.full_name} assigned you a new task: '{created.title}'",
                type="TASK_ASSIGNED",
                link_url=f"/tasks"
            )

        # 3. Audit trail
        self.audit_repo.log(
            action="task_created",
            entity_type="task",
            entity_id=created.id,
            actor_id=creator.id,
            metadata={"title": created.title, "assigned_to": assignee.employee_code}
        )

        return self.get_task(created.id)

    def update_task_status(
        self,
        task_id: uuid.UUID,
        new_status: str,
        actor: Employee,
        action: str,
        remarks: Optional[str] = None
    ) -> TaskResponse:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        prev_status = task.status
        task.status = new_status
        if new_status in ("COMPLETED", "APPROVED"):
            task.completed_at = datetime.now(timezone.utc)

        self.task_repo.update(task)

        # Log immutable activity event
        self.task_repo.log_activity(
            task_id=task.id,
            actor_id=actor.id,
            action=action,
            previous_status=prev_status,
            new_status=new_status,
            remarks=remarks
        )

        return self.get_task(task.id)

    def submit_task(self, task_id: uuid.UUID, req: TaskSubmitRequest, employee: Employee) -> TaskResponse:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Employee can only submit their own assigned task
        if employee.role != "admin" and task.assigned_to != employee.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only submit tasks assigned to you.")

        updated = self.update_task_status(
            task_id=task_id,
            new_status="IN_REVIEW",
            actor=employee,
            action="SUBMITTED_FOR_REVIEW",
            remarks=req.deliverable_notes or "Work submitted for manager review."
        )

        # Notify manager / creator
        if task.created_by != employee.id:
            self.notif_repo.create(
                recipient_id=task.created_by,
                title="Task Submitted for Review",
                message=f"{employee.full_name} submitted '{task.title}' for review.",
                type="TASK_REVIEW_REQUESTED",
                link_url="/tasks"
            )

        return updated

    def approve_task(self, task_id: uuid.UUID, req: TaskApprovalRequest, manager: Employee) -> TaskResponse:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Separation of duties: Cannot self-approve own restricted task unless admin
        if manager.role != "admin" and task.assigned_to == manager.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Separation of duties required: you cannot approve your own task.")

        updated = self.update_task_status(
            task_id=task_id,
            new_status="APPROVED",
            actor=manager,
            action="APPROVED",
            remarks=req.remarks or "Deliverable reviewed and approved."
        )

        # Notify assignee
        self.notif_repo.create(
            recipient_id=task.assigned_to,
            title="Task Approved",
            message=f"{manager.full_name} approved your task '{task.title}'!",
            type="TASK_APPROVED",
            link_url="/tasks"
        )

        return updated

    def request_changes(self, task_id: uuid.UUID, req: TaskChangeRequest, manager: Employee) -> TaskResponse:
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        updated = self.update_task_status(
            task_id=task_id,
            new_status="CHANGES_REQUESTED",
            actor=manager,
            action="CHANGES_REQUESTED",
            remarks=req.remarks
        )

        # Notify assignee
        self.notif_repo.create(
            recipient_id=task.assigned_to,
            title="Changes Requested on Task",
            message=f"{manager.full_name} requested changes on '{task.title}': {req.remarks}",
            type="CHANGES_REQUESTED",
            link_url="/tasks"
        )

        return updated
