"""Widen oauth_states.state_token: signed OAuth state (~300 chars) overflowed VARCHAR(255) on Postgres

Revision ID: 006_widen_oauth_state_token
Revises: 005_rbac_lifecycle_org_settings
Create Date: 2026-11-24 16:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '006_widen_oauth_state_token'
down_revision: Union[str, None] = '005_rbac_lifecycle_org_settings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('oauth_states') as batch:
        batch.alter_column('state_token', type_=sa.String(1024), existing_type=sa.String(255), existing_nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('oauth_states') as batch:
        batch.alter_column('state_token', type_=sa.String(255), existing_type=sa.String(1024), existing_nullable=False)
