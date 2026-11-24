-- =============================================================================
-- KLARVES: bring an existing Supabase database up to Alembic revision 007
-- =============================================================================
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (every statement is IF NOT EXISTS / guarded).
-- Equivalent to `alembic upgrade head` for revisions 004-007, for databases that
-- already have the base tables (from migrations 001-003 or from the dev server's create_all).
-- It runs as one transaction: if anything fails, nothing is applied.
-- =============================================================================

BEGIN;

-- 0. Pre-check: the base schema must exist. If this raises, run `alembic upgrade head` instead.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO missing
  FROM unnest(ARRAY['employees','departments','clients','campaigns','instagram_accounts',
                    'account_connections','account_assignments','audit_logs','oauth_states',
                    'projects','tasks','notifications','registered_devices','security_incidents']) AS t
  WHERE to_regclass('public.' || t) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Base tables missing (%). This database is not initialised; run `alembic upgrade head` from backend/ instead.', missing;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 004: tables that previously only existed via create_all, employee profile fields
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_at timestamptz NOT NULL,
  check_out_at timestamptz,
  total_hours double precision,
  status varchar(50) NOT NULL,
  ip_address varchar(100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_attendance_records_date ON attendance_records (date);
CREATE INDEX IF NOT EXISTS ix_attendance_records_employee_id ON attendance_records (employee_id);

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type varchar(50) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status varchar(50) NOT NULL,
  reviewed_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  review_remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ix_leave_requests_employee_id ON leave_requests (employee_id);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY,
  type varchar(50) NOT NULL,
  title varchar(255),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_conversations_department_id ON conversations (department_id);

CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_conversation_members_conversation_id ON conversation_members (conversation_id);
CREATE INDEX IF NOT EXISTS ix_conversation_members_employee_id ON conversation_members (employee_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_redacted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS ix_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS ix_messages_sender_id ON messages (sender_id);

CREATE TABLE IF NOT EXISTS login_verification_codes (
  id uuid PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  code varchar(20) NOT NULL,
  purpose varchar(50) NOT NULL,
  is_used boolean NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE login_verification_codes ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS ix_login_verification_codes_employee_id ON login_verification_codes (employee_id);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY,
  title varchar(255) NOT NULL,
  category varchar(100) NOT NULL,
  classification varchar(50) NOT NULL,
  file_url text NOT NULL,
  mime_type varchar(100) NOT NULL,
  file_size_bytes integer NOT NULL,
  owner_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  download_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_documents_owner_id ON documents (owner_id);
CREATE INDEX IF NOT EXISTS ix_documents_title ON documents (title);

CREATE TABLE IF NOT EXISTS document_access_logs (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  action varchar(50) NOT NULL,
  ip_address varchar(100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_document_access_logs_actor_id ON document_access_logs (actor_id);
CREATE INDEX IF NOT EXISTS ix_document_access_logs_document_id ON document_access_logs (document_id);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  media_type varchar(50) NOT NULL,
  caption text NOT NULL,
  media_url text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status varchar(50) NOT NULL,
  published_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_scheduled_posts_account_id ON scheduled_posts (account_id);
CREATE INDEX IF NOT EXISTS ix_scheduled_posts_campaign_id ON scheduled_posts (campaign_id);
CREATE INDEX IF NOT EXISTS ix_scheduled_posts_created_by ON scheduled_posts (created_by);
CREATE INDEX IF NOT EXISTS ix_scheduled_posts_project_id ON scheduled_posts (project_id);
CREATE INDEX IF NOT EXISTS ix_scheduled_posts_scheduled_at ON scheduled_posts (scheduled_at);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_number varchar(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_title varchar(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact varchar(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.departments'::regclass AND c.contype = 'f' AND a.attname = 'head_employee_id'
  ) THEN
    ALTER TABLE departments ADD CONSTRAINT fk_departments_head_employee_id
      FOREIGN KEY (head_employee_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_id ON audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS ix_instagram_accounts_client_id ON instagram_accounts (client_id);
CREATE INDEX IF NOT EXISTS ix_instagram_accounts_campaign_id ON instagram_accounts (campaign_id);
CREATE INDEX IF NOT EXISTS ix_account_connections_provider_account_id ON account_connections (provider_account_id);

-- -----------------------------------------------------------------------------
-- 005: roles & employee lifecycle, organisation settings
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'status') THEN
    ALTER TABLE employees ADD COLUMN status varchar(30) NOT NULL DEFAULT 'ACTIVE';
    UPDATE employees SET status = 'OFFBOARDED' WHERE is_active = false;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS ix_employees_status ON employees (status);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id uuid;
CREATE INDEX IF NOT EXISTS ix_employees_manager_id ON employees (manager_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_manager_id') THEN
    ALTER TABLE employees ADD CONSTRAINT fk_employees_manager_id
      FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS joined_on date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS offboarded_at timestamptz;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS org_settings (
  key varchar(100) PRIMARY KEY,
  value jsonb,
  updated_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 006: OAuth state tokens (~300 chars) overflowed varchar(255) -> Instagram connect failed
-- -----------------------------------------------------------------------------
ALTER TABLE oauth_states ALTER COLUMN state_token TYPE varchar(1024);

-- -----------------------------------------------------------------------------
-- 007: security alert details (affected records)
-- -----------------------------------------------------------------------------
ALTER TABLE security_incidents ADD COLUMN IF NOT EXISTS details jsonb;

-- -----------------------------------------------------------------------------
-- Record the schema version so future `alembic upgrade head` continues from here
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alembic_version (
  version_num varchar(64) NOT NULL,
  CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
ALTER TABLE alembic_version ALTER COLUMN version_num TYPE varchar(64);
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('007_security_incident_details');

COMMIT;

-- Verify (should return one row: 007_security_incident_details)
SELECT version_num FROM alembic_version;
