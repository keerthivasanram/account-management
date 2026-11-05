"""Initial database schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-11-05 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. employees
    op.create_table(
        'employees',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('auth_user_id', sa.UUID(), nullable=False),
        sa.Column('employee_code', sa.String(length=50), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='employee'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('auth_user_id'),
        sa.UniqueConstraint('employee_code'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_employees_email', 'employees', ['email'])
    op.create_index('ix_employees_employee_code', 'employees', ['employee_code'])
    op.create_index('ix_employees_auth_user_id', 'employees', ['auth_user_id'])

    # 2. clients
    op.create_table(
        'clients',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # 3. campaigns
    op.create_table(
        'campaigns',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('client_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_campaigns_client_id', 'campaigns', ['client_id'])

    # 4. instagram_accounts
    op.create_table(
        'instagram_accounts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('username_normalized', sa.String(length=100), nullable=False),
        sa.Column('profile_url', sa.Text(), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('instagram_user_id', sa.String(length=100), nullable=True),
        sa.Column('account_created_date', sa.Date(), nullable=False),
        sa.Column('niche', sa.String(length=100), nullable=True),
        sa.Column('client_id', sa.UUID(), nullable=True),
        sa.Column('campaign_id', sa.UUID(), nullable=True),
        sa.Column('registered_by', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending_connection'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['registered_by'], ['employees.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username_normalized'),
        sa.UniqueConstraint('instagram_user_id')
    )
    op.create_index('ix_instagram_accounts_username_norm', 'instagram_accounts', ['username_normalized'])
    op.create_index('ix_instagram_accounts_registered_by', 'instagram_accounts', ['registered_by'])

    # 5. account_connections
    op.create_table(
        'account_connections',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('instagram_account_id', sa.UUID(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='meta_oauth'),
        sa.Column('provider_account_id', sa.String(length=100), nullable=True),
        sa.Column('encrypted_access_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('granted_permissions', sa.JSON(), nullable=True),
        sa.Column('connection_status', sa.String(length=50), nullable=False, server_default='disconnected'),
        sa.Column('last_validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['instagram_account_id'], ['instagram_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('instagram_account_id')
    )

    # 6. account_assignments
    op.create_table(
        'account_assignments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('instagram_account_id', sa.UUID(), nullable=False),
        sa.Column('employee_id', sa.UUID(), nullable=False),
        sa.Column('assigned_by', sa.UUID(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.ForeignKeyConstraint(['assigned_by'], ['employees.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['instagram_account_id'], ['instagram_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_account_assignments_acc_id', 'account_assignments', ['instagram_account_id'])
    op.create_index('ix_account_assignments_emp_id', 'account_assignments', ['employee_id'])

    # 7. account_verifications
    op.create_table(
        'account_verifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('instagram_account_id', sa.UUID(), nullable=False),
        sa.Column('profile_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('connection_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('ownership_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('approval_status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('reviewed_by', sa.UUID(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['instagram_account_id'], ['instagram_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['employees.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('instagram_account_id')
    )

    # 8. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('actor_id', sa.UUID(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['employees.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])

def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('account_verifications')
    op.drop_table('account_assignments')
    op.drop_table('account_connections')
    op.drop_table('instagram_accounts')
    op.drop_table('campaigns')
    op.drop_table('clients')
    op.drop_table('employees')
