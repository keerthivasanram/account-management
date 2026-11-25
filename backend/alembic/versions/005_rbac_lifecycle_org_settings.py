"""RBAC + employee lifecycle: reporting lines, status, session revocation, org settings

Revision ID: 005_rbac_lifecycle_org_settings
Revises: 004_catch_up_missing_tables
Create Date: 2026-11-24 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.types import GUID, JSONType

revision: str = '005_rbac_lifecycle_org_settings'
down_revision: Union[str, None] = '004_catch_up_missing_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols(table):
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    existing = _cols('employees')
    if 'status' not in existing:
        op.add_column('employees', sa.Column('status', sa.String(30), nullable=False, server_default='ACTIVE'))
        op.execute("UPDATE employees SET status = 'OFFBOARDED' WHERE is_active = false")
        op.create_index('ix_employees_status', 'employees', ['status'])
    if 'manager_id' not in existing:
        op.add_column('employees', sa.Column('manager_id', GUID(), nullable=True))
        op.create_index('ix_employees_manager_id', 'employees', ['manager_id'])
        if op.get_bind().dialect.name == 'postgresql':
            op.create_foreign_key('fk_employees_manager_id', 'employees', 'employees',
                                  ['manager_id'], ['id'], ondelete='SET NULL')
    if 'joined_on' not in existing:
        op.add_column('employees', sa.Column('joined_on', sa.Date(), nullable=True))
    if 'offboarded_at' not in existing:
        op.add_column('employees', sa.Column('offboarded_at', sa.DateTime(timezone=True), nullable=True))
    if 'last_login_at' not in existing:
        op.add_column('employees', sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True))
    if 'token_version' not in existing:
        op.add_column('employees', sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'))

    if not sa.inspect(op.get_bind()).has_table('org_settings'):
        op.create_table(
            'org_settings',
            sa.Column('key', sa.String(100), primary_key=True),
            sa.Column('value', JSONType(), nullable=True),
            sa.Column('updated_by', GUID(), sa.ForeignKey('employees.id', ondelete='SET NULL'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table('org_settings')
    if op.get_bind().dialect.name == 'postgresql':
        op.drop_constraint('fk_employees_manager_id', 'employees', type_='foreignkey')
    op.drop_index('ix_employees_manager_id', table_name='employees')
    op.drop_index('ix_employees_status', table_name='employees')
    for col in ('token_version', 'last_login_at', 'offboarded_at', 'joined_on', 'manager_id', 'status'):
        op.drop_column('employees', col)
