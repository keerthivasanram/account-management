"""People change requests: Junior HR prepares role / team changes, Senior HR approves

Revision ID: 012_people_change_requests
Revises: 011_payroll_periods
Create Date: 2026-11-25 22:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.types import GUID, JSONType

revision: str = '012_people_change_requests'
down_revision: Union[str, None] = '011_payroll_periods'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if 'people_change_requests' in set(sa.inspect(op.get_bind()).get_table_names()):
        return
    op.create_table(
        'people_change_requests',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('employee_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
        sa.Column('payload', JSONType(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('requested_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_people_change_requests_employee_id', 'people_change_requests', ['employee_id'])
    op.create_index('ix_people_change_requests_status', 'people_change_requests', ['status'])


def downgrade() -> None:
    op.drop_table('people_change_requests')
