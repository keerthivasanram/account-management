"""Security incident details (server-side loss alerts list affected records)

Revision ID: 007_security_incident_details
Revises: 006_widen_oauth_state_token
Create Date: 2026-11-25 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.types import JSONType

revision: str = '007_security_incident_details'
down_revision: Union[str, None] = '006_widen_oauth_state_token'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if 'details' not in {c['name'] for c in sa.inspect(op.get_bind()).get_columns('security_incidents')}:
        op.add_column('security_incidents', sa.Column('details', JSONType(), nullable=True))


def downgrade() -> None:
    op.drop_column('security_incidents', 'details')
