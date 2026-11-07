"""SocialHub Enterprise OS 2.0 Milestone 1 Schema

Revision ID: 003_socialhub_enterprise_milestone1
Revises: 002_instagram_business_oauth
Create Date: 2026-11-06 11:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_socialhub_enterprise_milestone1'
down_revision: Union[str, None] = '002_instagram_business_oauth'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Departments table
    op.create_table(
        'departments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('head_employee_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['head_employee_id'], ['employees.id'], ondelete='SET NULL', use_alter=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_departments_code', 'departments', ['code'])
    op.create_index('ix_departments_name', 'departments', ['name'])

    # 2. Add department_id to employees
    op.add_column(
        'employees',
        sa.Column('department_id', sa.UUID(), nullable=True)
    )
    op.create_foreign_key('fk_employees_department_id', 'employees', 'departments', ['department_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_employees_department_id', 'employees', ['department_id'])

    # 3. Projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('department_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='ACTIVE'),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='MEDIUM'),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_id'], ['employees.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_projects_name', 'projects', ['name'])
    op.create_index('ix_projects_owner_id', 'projects', ['owner_id'])
    op.create_index('ix_projects_department_id', 'projects', ['department_id'])

    # 4. Tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assigned_to', sa.UUID(), nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='MEDIUM'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='TODO'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('estimated_effort_hours', sa.Float(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['assigned_to'], ['employees.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by'], ['employees.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tasks_project_id', 'tasks', ['project_id'])
    op.create_index('ix_tasks_assigned_to', 'tasks', ['assigned_to'])
    op.create_index('ix_tasks_created_by', 'tasks', ['created_by'])

    # 5. Task Activity Events (Immutable History)
    op.create_table(
        'task_activity_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('task_id', sa.UUID(), nullable=False),
        sa.Column('actor_id', sa.UUID(), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('previous_status', sa.String(length=50), nullable=True),
        sa.Column('new_status', sa.String(length=50), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['employees.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_task_activity_events_task_id', 'task_activity_events', ['task_id'])
    op.create_index('ix_task_activity_events_actor_id', 'task_activity_events', ['actor_id'])

    # 6. Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('recipient_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False, server_default='INFO'),
        sa.Column('link_url', sa.String(length=255), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['recipient_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_recipient_id', 'notifications', ['recipient_id'])

    # 7. Registered Devices table
    op.create_table(
        'registered_devices',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('employee_id', sa.UUID(), nullable=False),
        sa.Column('device_name', sa.String(length=255), nullable=False),
        sa.Column('device_fingerprint', sa.String(length=255), nullable=False),
        sa.Column('browser', sa.String(length=100), nullable=True),
        sa.Column('os', sa.String(length=100), nullable=True),
        sa.Column('ip_address', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='APPROVED'),
        sa.Column('registered_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_registered_devices_employee_id', 'registered_devices', ['employee_id'])
    op.create_index('ix_registered_devices_device_fingerprint', 'registered_devices', ['device_fingerprint'])

    # 8. Security Incidents table
    op.create_table(
        'security_incidents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('actor_id', sa.UUID(), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='MEDIUM'),
        sa.Column('route', sa.String(length=255), nullable=False),
        sa.Column('key_combination', sa.String(length=100), nullable=True),
        sa.Column('ip_address', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_security_incidents_actor_id', 'security_incidents', ['actor_id'])
    op.create_index('ix_security_incidents_event_type', 'security_incidents', ['event_type'])

def downgrade() -> None:
    op.drop_table('security_incidents')
    op.drop_table('registered_devices')
    op.drop_table('notifications')
    op.drop_table('task_activity_events')
    op.drop_table('tasks')
    op.drop_table('projects')
    op.drop_constraint('fk_employees_department_id', 'employees', type_='foreignkey')
    op.drop_column('employees', 'department_id')
    op.drop_table('departments')
