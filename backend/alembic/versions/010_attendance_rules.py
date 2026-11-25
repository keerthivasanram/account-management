"""Attendance rules: holidays, rotational week-off roster, attendance corrections

Revision ID: 010_attendance_rules
Revises: 009_kudos
Create Date: 2026-11-25 18:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.types import GUID

revision: str = '010_attendance_rules'
down_revision: Union[str, None] = '009_kudos'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if 'holidays' not in tables:
        op.create_table(
            'holidays',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('name', sa.String(120), nullable=False),
            sa.Column('created_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_holidays_date', 'holidays', ['date'], unique=True)
    if 'week_offs' not in tables:
        op.create_table(
            'week_offs',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('employee_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('set_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('employee_id', 'date', name='uq_week_offs_employee_date'),
        )
        op.create_index('ix_week_offs_employee_id', 'week_offs', ['employee_id'])
        op.create_index('ix_week_offs_date', 'week_offs', ['date'])
    if 'attendance_corrections' not in tables:
        op.create_table(
            'attendance_corrections',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('employee_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('check_in_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('check_out_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('reason', sa.Text(), nullable=False),
            sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
            sa.Column('requested_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('reviewed_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('remarks', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_attendance_corrections_employee_id', 'attendance_corrections', ['employee_id'])
        op.create_index('ix_attendance_corrections_date', 'attendance_corrections', ['date'])
        op.create_index('ix_attendance_corrections_status', 'attendance_corrections', ['status'])


def downgrade() -> None:
    op.drop_table('attendance_corrections')
    op.drop_table('week_offs')
    op.drop_table('holidays')
