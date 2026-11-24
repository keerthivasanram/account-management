# KLARVES — Operations Runbook

For whoever deploys and runs the platform. Covers configuration, first-time setup, migrations, scheduled jobs and how authentication works.

---

## 1. Required configuration (production)

If any of these are missing or unsafe, the API **refuses to start** when `ENVIRONMENT` is not `development` (`Settings.validate_for_production`).

| Variable | Requirement |
|---|---|
| `ENVIRONMENT` | `production` (anything other than `development` turns on the checks) |
| `DATABASE_URL` | PostgreSQL. SQLite is rejected |
| `DEV_AUTH_BYPASS` | `false` |
| `TOKEN_ENCRYPTION_KEY` | Unique Fernet key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `APP_JWT_SECRET` | ≥ 32 chars: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |

Recommended:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` | Password sign-in. Without the JWT secret, Supabase tokens are rejected |
| `SUPER_ADMIN_EMAILS` | Comma-separated founder emails. The only way to bootstrap a super admin |
| `AUTO_PROVISION_EMPLOYEES=false` | Invite-only: unknown sign-ins get a 403 until an admin invites them |
| `ALLOWED_EMAIL_DOMAINS` | If you keep auto-provisioning on, restrict it to your domain(s) |
| `BACKEND_CORS_ORIGINS` | JSON list of frontend origins |

> **Vercel note:** `ENVIRONMENT` defaults to `development`. A deployment without it keeps the dev login shortcuts **on**. Always set `ENVIRONMENT=production` on deployed environments.

---

## 2. First-time setup

1. Set the variables above, including `SUPER_ADMIN_EMAILS=you@company.com`.
2. Run migrations: `cd backend && alembic upgrade head`.
3. Start the API and sign in with that email. You are a super admin.
4. In **Super Admin → Company policy**, set account targets, leave allowances, session length and whether MFA is required.
5. In **Employees**, invite people one at a time or with **Import CSV** (columns: `email, full_name, role, department_code, manager_email, job_title, joined_on`). Set each person's manager so leave and task reviews route correctly.

---

## 3. Migrations

**Supabase:** see [`supabase/README.md`](../supabase/README.md). Run `01_upgrade_to_007.sql` (or `alembic upgrade head`), then **always** run `02_lock_down_data_api.sql`, which keeps the public anon key from reaching any table through Supabase's Data API.


- Production schema changes go through Alembic only. `create_all` and demo seeding run **only** in development.
- Revisions `004`–`006` are idempotent where it matters: `004` creates tables only if missing, so it is safe on databases where development servers already created them.
- `alembic/env.py` widens `alembic_version.version_num` to 64 chars, because our revision ids are longer than Alembic's default 32. This replaces the old `fix_alembic.py` script.
- CI fails if the models define a table or column that no migration creates (`alembic check`).

---

## 4. Scheduled job: Meta token health (daily)

```bash
cd backend
python -m app.jobs.token_health --dry-run   # report only
python -m app.jobs.token_health             # apply
```

- Marks expired `CONNECTED` tokens as `TOKEN_EXPIRED` and notifies the account owner(s) and admins.
- Warns owners `token_expiry_warning_days` ahead (a company-policy setting), at most once per account per 24 hours.

Scheduled by `.github/workflows/token-health.yml` (00:30 UTC daily). Add a `DATABASE_URL` repository secret; run it manually from the Actions tab with *dry run* first. Cron or Task Scheduler work too.

---

## 5. How authentication works

| Token | Issued by | Accepted when |
|---|---|---|
| Supabase JWT | Supabase password sign-in | Signature valid with `SUPABASE_JWT_SECRET` |
| App session JWT | `/auth/mfa/verify` (email code) and `/auth/dev-login` (dev only) | Signed with `APP_JWT_SECRET`, not expired, `token_version` matches the employee row |
| `dev-token-*` | Tests / local only | Only when `ENVIRONMENT=development` and `DEV_AUTH_BYPASS=true` |

- **Force logout:** incrementing `employees.token_version` (Employees → force logout, offboarding, or Super Admin → *Sign everyone out*) kills app sessions immediately. Supabase sessions last until their JWT expires; for an instant global sign-out, also revoke them in Supabase.
- **`require_mfa` policy:** Supabase sessions must be `aal2` (Supabase MFA). App sessions must come from the email-code step.
- **Email delivery** uses SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`). Sign-in codes and invitation emails are sent through it. In production without SMTP, `/auth/mfa/challenge` returns 503 for every address, so it can't reveal who has an account. Super Admin → Overview warns while SMTP is missing.

---

## 6. Health & audit

- **Super Admin → System health:** database latency, migration drift (current vs head), integrations, and auth posture.
- **Super Admin → Audit search:** filter by action, date range, or privileged changes only. Admins can read it; only super admins can change policy.
