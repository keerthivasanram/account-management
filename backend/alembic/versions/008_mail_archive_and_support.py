"""Mail archive flag on notifications; Help & support tickets

Revision ID: 008_mail_archive_and_support
Revises: 007_security_incident_details
Create Date: 2026-11-25 14:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.types import GUID

revision: str = '008_mail_archive_and_support'
down_revision: Union[str, None] = '007_security_incident_details'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    if 'archived_at' not in {c['name'] for c in insp.get_columns('notifications')}:
        op.add_column('notifications', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))
        op.create_index('ix_notifications_archived_at', 'notifications', ['archived_at'])

    tables = set(insp.get_table_names())
    if 'support_tickets' not in tables:
        op.create_table(
            'support_tickets',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('reference', sa.String(20), nullable=False),
            sa.Column('created_by', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('category', sa.String(30), nullable=False, server_default='OTHER'),
            sa.Column('subject', sa.String(200), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('attachment_ref', sa.Text(), nullable=True),
            sa.Column('status', sa.String(20), nullable=False, server_default='OPEN'),
            sa.Column('assigned_to', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_support_tickets_reference', 'support_tickets', ['reference'], unique=True)
        op.create_index('ix_support_tickets_created_by', 'support_tickets', ['created_by'])
        op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])
        op.create_index('ix_support_tickets_assigned_to', 'support_tickets', ['assigned_to'])
    if 'support_ticket_messages' not in tables:
        op.create_table(
            'support_ticket_messages',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('ticket_id', GUID(), sa.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False),
            sa.Column('author_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_support_ticket_messages_ticket_id', 'support_ticket_messages', ['ticket_id'])


def downgrade() -> None:
    op.drop_table('support_ticket_messages')
    op.drop_table('support_tickets')
    op.drop_index('ix_notifications_archived_at', 'notifications')
    op.drop_column('notifications', 'archived_at')
