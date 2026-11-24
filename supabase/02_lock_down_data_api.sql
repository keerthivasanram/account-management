-- =============================================================================
-- KLARVES: close the Supabase Data API on all application tables
-- =============================================================================
-- Why: Supabase publishes every table in the `public` schema through its REST/GraphQL
-- Data API. The anon key ships inside the frontend bundle, so without this anyone can
-- try to read or write employees, audit logs, encrypted Meta tokens, etc. directly.
--
-- KLARVES never uses the Data API: the frontend only uses Supabase *Auth*, and the
-- FastAPI backend connects with the database owner role (DATABASE_URL), which is not
-- affected by RLS and keeps its privileges. So we:
--   1. enable Row Level Security on every table with NO policies (= deny all), and
--   2. revoke table privileges from the `anon` and `authenticated` API roles,
--   3. stop future tables in `public` from being auto-granted to those roles.
--
-- Run AFTER 01_upgrade_to_007.sql. Safe to re-run. Re-run after adding new tables
-- (or keep step 3, which covers tables created later by the owner role).
-- =============================================================================

BEGIN;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Future tables/sequences/functions created by the current role are not exposed either
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

COMMIT;

-- Verify: every row should show rls_enabled = true and api_can_read = false
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') AS api_can_read
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY 1;
