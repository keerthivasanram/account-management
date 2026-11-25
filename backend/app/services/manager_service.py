"""Manager workspace: team roster with today's status, workload flags, and a unified approvals inbox."""
from collections import Counter
from datetime import date
from typing import Dict, List

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import Perm, ROLE_LABELS, can_review_task, has_permission
from app.models.models import AttendanceRecord, Employee, LeaveRequest, Project, Task
from app.repositories.employee_repo import EmployeeRepository
from app.services.employee_presenter import account_counts
from app.services.leave_service import LeaveService, leave_days
from app.services.org_settings_service import OrgSettingsService

OPEN = ("BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "CHANGES_REQUESTED", "BLOCKED")


def workload_flag(role: str, assigned: int, lo: int, hi: int) -> str:
    if role != "employee":
        return "N/A"
    if assigned > hi:
        return "OVER"
    if assigned < lo:
        return "UNDER"
    return "OK"


class ManagerService:
    def __init__(self, db: Session):
        self.db = db
        self.employees = EmployeeRepository(db)

    def overview(self, manager: Employee) -> dict:
        today = date.today()
        team = self.employees.list_team(manager)
        ids = [e.id for e in team]
        org = OrgSettingsService(self.db)
        lo, hi = org.get("account_target_min"), org.get("account_target_max")

        attendance: Dict = {}
        on_leave = set()
        open_tasks: Counter = Counter()
        overdue: Counter = Counter()
        if ids:
            for rec in self.db.query(AttendanceRecord).filter(AttendanceRecord.employee_id.in_(ids),
                                                              AttendanceRecord.date == today).all():
                attendance[rec.employee_id] = "CHECKED_OUT" if rec.check_out_at else "PRESENT"
            on_leave = {r.employee_id for r in self.db.query(LeaveRequest.employee_id).filter(
                LeaveRequest.employee_id.in_(ids), LeaveRequest.status == "APPROVED",
                LeaveRequest.start_date <= today, LeaveRequest.end_date >= today).all()}
            for t in self.db.query(Task.assigned_to, Task.due_date).filter(
                    Task.assigned_to.in_(ids), Task.status.in_(OPEN)).all():
                open_tasks[t.assigned_to] += 1
                if t.due_date and t.due_date < today:
                    overdue[t.assigned_to] += 1
        counts = account_counts(self.db, ids)

        members = []
        for e in team:
            assigned = counts.get(e.id, (0, 0))[0]
            if e.status == "INVITED":
                today_status = "NOT_STARTED"
            else:
                today_status = "ON_LEAVE" if e.id in on_leave else attendance.get(e.id, "NOT_CHECKED_IN")
            members.append({
                "id": str(e.id), "full_name": e.full_name, "employee_code": e.employee_code,
                "job_title": e.job_title, "role": e.role, "role_label": ROLE_LABELS.get(e.role, e.role),
                "status": e.status, "department_name": e.department.name if e.department else None,
                "reports_directly": e.manager_id == manager.id,
                "today": today_status,
                "open_tasks": open_tasks[e.id], "overdue_tasks": overdue[e.id],
                "assigned_accounts": assigned,
                "workload": "N/A" if e.status != "ACTIVE" else workload_flag(e.role, assigned, lo, hi),
            })

        approvals = self.approvals(manager)
        return {
            "team_size": len(team),
            "present_today": sum(1 for m in members if m["today"] in ("PRESENT", "CHECKED_OUT")),
            "on_leave_today": sum(1 for m in members if m["today"] == "ON_LEAVE"),
            "not_checked_in": sum(1 for m in members if m["today"] == "NOT_CHECKED_IN"),
            "open_tasks": sum(open_tasks.values()),
            "overdue_tasks": sum(overdue.values()),
            "pending_task_reviews": len(approvals["tasks"]),
            "pending_leave_requests": len(approvals["leaves"]),
            "pending_post_reviews": len(approvals["posts"]),
            "pending_account_requests": len(approvals["accounts"]),
            "workload_flags": sum(1 for m in members if m["workload"] in ("OVER", "UNDER")),
            "account_target_min": lo,
            "account_target_max": hi,
            "members": members,
        }

    def approvals(self, reviewer: Employee) -> dict:
        q = (self.db.query(Task)
             .options(joinedload(Task.assignee).joinedload(Employee.department), joinedload(Task.project))
             .filter(Task.status == "IN_REVIEW", Task.assigned_to != reviewer.id))
        if not has_permission(reviewer, Perm.TASKS_REVIEW_ALL):
            team_ids = [e.id for e in self.employees.list_team(reviewer)]
            owned_projects = [p.id for p in self.db.query(Project.id).filter(Project.owner_id == reviewer.id).all()]
            conds = [Task.created_by == reviewer.id]
            if team_ids:
                conds.append(Task.assigned_to.in_(team_ids))
            if owned_projects:
                conds.append(Task.project_id.in_(owned_projects))
            q = q.filter(or_(*conds))
        tasks = [t for t in q.order_by(Task.updated_at.asc()).limit(200).all() if can_review_task(reviewer, t)]

        leaves = LeaveService(self.db).pending_for_reviewer(reviewer)

        # Team posts awaiting approval and team account requests (team leads decide these too)
        from app.models.models import ScheduledPost
        from app.services.team_accounts_service import TeamAccountsService
        team = [e.id for e in self.employees.list_team(reviewer)]
        posts = []
        if team:
            posts = (self.db.query(ScheduledPost).options(joinedload(ScheduledPost.account), joinedload(ScheduledPost.creator))
                     .filter(ScheduledPost.status == "PENDING_APPROVAL", ScheduledPost.created_by.in_(team))
                     .order_by(ScheduledPost.scheduled_at.asc()).limit(200).all())
        account_requests = TeamAccountsService(self.db).requests(reviewer)
        return {
            "posts": [{
                "id": str(p.id), "account_username": p.account.username if p.account else None,
                "creator_name": p.creator.full_name if p.creator else None, "caption": p.caption,
                "media_type": p.media_type, "scheduled_at": p.scheduled_at,
            } for p in posts],
            "accounts": account_requests,
            "tasks": [{
                "id": str(t.id), "title": t.title, "priority": t.priority, "due_date": t.due_date,
                "project_name": t.project.name if t.project else None,
                "assignee_name": t.assignee.full_name if t.assignee else None,
                "assignee_code": t.assignee.employee_code if t.assignee else None,
                "submitted_at": t.updated_at,
            } for t in tasks],
            "leaves": [{
                "id": str(l.id), "employee_name": l.employee.full_name if l.employee else None,
                "employee_code": l.employee.employee_code if l.employee else None,
                "leave_type": l.leave_type, "start_date": l.start_date, "end_date": l.end_date,
                "days": leave_days(l.start_date, l.end_date), "reason": l.reason, "requested_at": l.created_at,
            } for l in leaves],
        }
