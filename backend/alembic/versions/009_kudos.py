"""Kudos between colleagues

Revision ID: 009_kudos
Revises: 008_mail_archive_and_support
Create Date: 2026-11-25 16:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.types import GUID

revision: str = '009_kudos'
down_revision: Union[str, None] = '008_mail_archive_and_support'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if 'kudos' in set(sa.inspect(op.get_bind()).get_table_names()):
        return
    op.create_table(
        'kudos',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('from_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
        sa.Column('to_id', GUID(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.String(280), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_kudos_from_id', 'kudos', ['from_id'])
    op.create_index('ix_kudos_to_id', 'kudos', ['to_id'])
    op.create_index('ix_kudos_created_at', 'kudos', ['created_at'])


def downgrade() -> None:
    op.drop_table('kudos')
