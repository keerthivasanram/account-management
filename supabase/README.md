# Running the KLARVES database changes on Supabase

Two files, run **in this order** in **Supabase Dashboard → SQL Editor → New query** (paste the whole file, click **Run**).

| Order | File | What it does | Safe to re-run |
|---|---|---|---|
| 1 | `01_upgrade_to_007.sql` | Brings the schema to Alembic revision 007: missing tables (attendance, leave, chat, documents, scheduled posts, login codes), employee lifecycle/manager fields, company settings table, the OAuth `state_token` fix, security-alert details. Records version 007 in `alembic_version` | Yes |
| 2 | `02_lock_down_data_api.sql` | Turns on Row Level Security for every table and removes `anon` / `authenticated` access, so nobody can read the tables through Supabase's public Data API with the anon key | Yes |

Each file runs as a single transaction: if any statement fails, nothing is changed.

## Before you run
1. **Back up:** Dashboard → Database → Backups (or `pg_dump`). Note: free-tier projects have no automatic backups.
2. If you have **staging and production**, run on staging first and click through the app.

## How to check it worked
- File 1 ends by printing `007_security_incident_details`.
- File 2 ends with a table list: every row must show `rls_enabled = true` and `api_can_read = false`.
- Start the backend and open **Super Admin → System health**. "Migrations up to date" should be green.

## If file 1 stops with "Base tables missing"
The database was never initialised. Don't use the SQL files. Run the migrations from the backend instead:
```bash
cd backend
# DATABASE_URL = Supabase "Session pooler" or direct connection string
alembic upgrade head
```
Then run file 2.

## Alternative to file 1
If you can connect from your machine, `alembic upgrade head` (from `backend/`, with `DATABASE_URL` pointing at Supabase) does the same as file 1. Use one or the other. **File 2 is needed either way.**

## After the lockdown
- The backend keeps working: it connects as the database owner through `DATABASE_URL`, which RLS doesn't restrict.
- Supabase **Auth** (sign-in) is unaffected.
- If you later want the frontend to query a table directly through Supabase, write an explicit RLS policy and grant for that table only.
