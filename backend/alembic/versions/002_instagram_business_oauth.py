"""Instagram Business Setup, Account Eligibility and Single-Use OAuth States

Revision ID: 002_instagram_business_oauth
Revises: 001_initial_schema
Create Date: 2026-11-05 23:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_instagram_business_oauth'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add account_type and allow_creator to instagram_accounts
    op.add_column(
        'instagram_accounts',
        sa.Column('account_type', sa.String(length=50), nullable=False, server_default='BUSINESS')
    )
    op.add_column(
        'instagram_accounts',
        sa.Column('allow_creator', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )

    # 2. Create oauth_states table for short-lived, single-use state verification
    op.create_table(
        'oauth_states',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('state_token', sa.String(length=255), nullable=False),
        sa.Column('employee_id', sa.UUID(), nullable=False),
        sa.Column('account_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['instagram_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('state_token')
    )
    op.create_index('ix_oauth_states_state_token', 'oauth_states', ['state_token'])
    op.create_index('ix_oauth_states_account_id', 'oauth_states', ['account_id'])
    op.create_index('ix_oauth_states_employee_id', 'oauth_states', ['employee_id'])

def downgrade() -> None:
    op.drop_index('ix_oauth_states_employee_id', table_name='oauth_states')
    op.drop_index('ix_oauth_states_account_id', table_name='oauth_states')
    op.drop_index('ix_oauth_states_state_token', table_name='oauth_states')
    op.drop_table('oauth_states')
    op.drop_column('instagram_accounts', 'allow_creator')
    op.drop_column('instagram_accounts', 'account_type')
