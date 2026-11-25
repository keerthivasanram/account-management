"""Month close: locked payroll periods with an exported snapshot

Revision ID: 011_payroll_periods
Revises: 010_attendance_rules
Create Date: 2026-11-25 20:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.types import GUID, JSONType

revision: str = '011_payroll_periods'
down_revision: Union[str, None] = '010_attendance_rules'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if 'payroll_periods' in set(sa.inspect(op.get_bind()).get_table_names()):
        return
    op.create_table(
        'payroll_periods',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('month', sa.String(7), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='LOCKED'),
        sa.Column('snapshot', JSONType(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('locked_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
        sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reopened_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reopened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reopen_reason', sa.Text(), nullable=True),
    )
    op.create_index('ix_payroll_periods_month', 'payroll_periods', ['month'], unique=True)


def downgrade() -> None:
    op.drop_table('payroll_periods')
