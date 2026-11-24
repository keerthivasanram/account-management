"""Catch-up: tables that only ever existed via create_all, plus employee profile fields

Revision ID: 004_catch_up_missing_tables
Revises: 003_socialhub_enterprise_milestone1
Create Date: 2026-11-24 10:00:00.000000

Idempotent on purpose: development servers ran `Base.metadata.create_all`, so some
databases already contain these tables. Every step checks before it acts.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.types import GUID

revision: str = '004_catch_up_missing_tables'
down_revision: Union[str, None] = '003_socialhub_enterprise_milestone1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _insp():
    return sa.inspect(op.get_bind())


def _has_table(name):
    return _insp().has_table(name)


def _has_column(table, column):
    return column in {c["name"] for c in _insp().get_columns(table)}


def _index(name, table, cols, unique=False):
    if name not in {i["name"] for i in _insp().get_indexes(table)}:
        op.create_index(name, table, cols, unique=unique)


def _now():
    return sa.text('now()') if op.get_bind().dialect.name == 'postgresql' else sa.text('CURRENT_TIMESTAMP')


def upgrade() -> None:
    now = _now()

    if not _has_table('attendance_records'):
        op.create_table(
            'attendance_records',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('employee_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('check_in_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('check_out_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('total_hours', sa.Float(), nullable=True),
            sa.Column('status', sa.String(50), nullable=False),
            sa.Column('ip_address', sa.String(100), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
        )
    _index('ix_attendance_records_date', 'attendance_records', ['date'])
    _index('ix_attendance_records_employee_id', 'attendance_records', ['employee_id'])

    if not _has_table('leave_requests'):
        op.create_table(
            'leave_requests',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('employee_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('leave_type', sa.String(50), nullable=False),
            sa.Column('start_date', sa.Date(), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=False),
            sa.Column('reason', sa.Text(), nullable=False),
            sa.Column('status', sa.String(50), nullable=False),
            sa.Column('reviewed_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('review_remarks', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
            sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        )
    _index('ix_leave_requests_employee_id', 'leave_requests', ['employee_id'])

    if not _has_table('conversations'):
        op.create_table(
            'conversations',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('type', sa.String(50), nullable=False),
            sa.Column('title', sa.String(255), nullable=True),
            sa.Column('department_id', GUID(), sa.ForeignKey('departments.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
        )
    _index('ix_conversations_department_id', 'conversations', ['department_id'])

    if not _has_table('conversation_members'):
        op.create_table(
            'conversation_members',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('conversation_id', GUID(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('employee_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('joined_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
        )
    _index('ix_conversation_members_conversation_id', 'conversation_members', ['conversation_id'])
    _index('ix_conversation_members_employee_id', 'conversation_members', ['employee_id'])

    if not _has_table('messages'):
        op.create_table(
            'messages',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('conversation_id', GUID(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('sender_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('is_redacted', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
        )
    _index('ix_messages_conversation_id', 'messages', ['conversation_id'])
    _index('ix_messages_created_at', 'messages', ['created_at'])
    _index('ix_messages_sender_id', 'messages', ['sender_id'])

    if not _has_table('login_verification_codes'):
        op.create_table(
            'login_verification_codes',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('employee_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('code', sa.String(20), nullable=False),
            sa.Column('purpose', sa.String(50), nullable=False),
            sa.Column('is_used', sa.Boolean(), nullable=False),
            sa.Column('failed_attempts', sa.Integer(), server_default='0', nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
        )
    elif not _has_column('login_verification_codes', 'failed_attempts'):
        op.add_column('login_verification_codes',
                      sa.Column('failed_attempts', sa.Integer(), server_default='0', nullable=False))
    _index('ix_login_verification_codes_employee_id', 'login_verification_codes', ['employee_id'])

    if not _has_table('documents'):
        op.create_table(
            'documents',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('category', sa.String(100), nullable=False),
            sa.Column('classification', sa.String(50), nullable=False),
            sa.Column('file_url', sa.Text(), nullable=False),
            sa.Column('mime_type', sa.String(100), nullable=False),
            sa.Column('file_size_bytes', sa.Integer(), nullable=False),
            sa.Column('owner_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('download_count', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
        )
    _index('ix_documents_owner_id', 'documents', ['owner_id'])
    _index('ix_documents_title', 'documents', ['title'])

    if not _has_table('document_access_logs'):
        op.create_table(
            'document_access_logs',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('document_id', GUID(), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
            sa.Column('actor_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('action', sa.String(50), nullable=False),
            sa.Column('ip_address', sa.String(100), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
        )
    _index('ix_document_access_logs_actor_id', 'document_access_logs', ['actor_id'])
    _index('ix_document_access_logs_document_id', 'document_access_logs', ['document_id'])

    if not _has_table('scheduled_posts'):
        op.create_table(
            'scheduled_posts',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('account_id', GUID(), sa.ForeignKey('instagram_accounts.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_by', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('campaign_id', GUID(), sa.ForeignKey('campaigns.id', ondelete='SET NULL'), nullable=True),
            sa.Column('project_id', GUID(), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True),
            sa.Column('media_type', sa.String(50), nullable=False),
            sa.Column('caption', sa.Text(), nullable=False),
            sa.Column('media_url', sa.Text(), nullable=False),
            sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('status', sa.String(50), nullable=False),
            sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=now, nullable=False),
        )
    for col in ('account_id', 'campaign_id', 'created_by', 'project_id', 'scheduled_at'):
        _index(f'ix_scheduled_posts_{col}', 'scheduled_posts', [col])

    # Employee profile fields
    for name, type_ in (('phone_number', sa.String(50)), ('job_title', sa.String(100)),
                        ('bio', sa.Text()), ('emergency_contact', sa.String(255))):
        if not _has_column('employees', name):
            op.add_column('employees', sa.Column(name, type_, nullable=True))

    # Department head FK was declared in the model but never migrated
    if op.get_bind().dialect.name == 'postgresql':
        if not any(fk['constrained_columns'] == ['head_employee_id']
                   for fk in _insp().get_foreign_keys('departments')):
            op.create_foreign_key('fk_departments_head_employee_id', 'departments', 'employees',
                                  ['head_employee_id'], ['id'], ondelete='SET NULL')

    # Lookup indexes used by admin filters and audit search
    _index('ix_audit_logs_actor_id', 'audit_logs', ['actor_id'])
    _index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'])
    _index('ix_audit_logs_entity_id', 'audit_logs', ['entity_id'])
    _index('ix_instagram_accounts_client_id', 'instagram_accounts', ['client_id'])
    _index('ix_instagram_accounts_campaign_id', 'instagram_accounts', ['campaign_id'])
    _index('ix_account_connections_provider_account_id', 'account_connections', ['provider_account_id'])


def downgrade() -> None:
    for idx, table in (('ix_account_connections_provider_account_id', 'account_connections'),
                       ('ix_instagram_accounts_campaign_id', 'instagram_accounts'),
                       ('ix_instagram_accounts_client_id', 'instagram_accounts'),
                       ('ix_audit_logs_entity_id', 'audit_logs'),
                       ('ix_audit_logs_entity_type', 'audit_logs'),
                       ('ix_audit_logs_actor_id', 'audit_logs')):
        op.drop_index(idx, table_name=table)
    if op.get_bind().dialect.name == 'postgresql':
        op.drop_constraint('fk_departments_head_employee_id', 'departments', type_='foreignkey')
    for name in ('emergency_contact', 'bio', 'job_title', 'phone_number'):
        op.drop_column('employees', name)
    for table in ('scheduled_posts', 'document_access_logs', 'documents', 'login_verification_codes',
                  'messages', 'conversation_members', 'conversations', 'leave_requests', 'attendance_records'):
        op.drop_table(table)
