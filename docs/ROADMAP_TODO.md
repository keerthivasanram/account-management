# KLARVES — Pending To-Do List

Status key: ☐ not started · ◐ in progress · ☑ done. Update this file as items close.
Owner: **You** means a deployment/account/legal action only you can take. **Code** means it gets built in the repo.

---

## A. Before deploying the current branch (from Phases 0–6)

| # | Item | Owner | Status |
|---|---|---|---|
| A1 | Set `ENVIRONMENT=production` on Vercel (default `development` leaves dev login shortcuts on) | You | ☐ |
| A2 | Set secrets: `APP_JWT_SECRET`, a unique `TOKEN_ENCRYPTION_KEY`, `SUPER_ADMIN_EMAILS`; choose `AUTO_PROVISION_EMPLOYEES=false` or `ALLOWED_EMAIL_DOMAINS` | You | ☐ |
| A3 | Database: Supabase project migrated to revision 007 with `alembic upgrade head` (2026-11-25). Future schema changes: `alembic upgrade head` | Code | ☑ |
| A4 | Email delivery: SMTP sender built for sign-in codes and invitations. **You:** create an SMTP account (Workspace / M365 / SES / Resend / Brevo) and set `SMTP_*`, `FRONTEND_URL` | Code ☑ · You ☐ | ◐ |
| A5 | Daily token check: GitHub Actions workflow `token-health.yml` built. **You:** add the `DATABASE_URL` repository secret | Code ☑ · You ☐ | ◐ |
| A6 | Delete obsolete `backend/fix_alembic.py` (untracked; superseded by `alembic/env.py`) | You | ☐ |
| A7 | Branch `feat/rbac-and-management-dashboards` pushed; open the PR and let CI run | You | ◐ |
| A8 | Supabase Data API lockdown applied: RLS on all 27 tables, `anon`/`authenticated` revoked (2026-11-25). Re-run `supabase/02_lock_down_data_api.sql` after adding tables | Code | ☑ |
| A9 | Supabase → Authentication → URL Configuration: set Site URL to the app's address (local `http://localhost:5173`) so confirmation/reset links land on the app | You | ☐ |

## B. Security features (from the monitoring plan)

| # | Item | Owner | Status |
|---|---|---|---|
| B1 | Meta/Instagram tokens stay server-side; no API response or desktop client ever exposes them (verified, regression test added) | Code | ☑ |
| B2 | **Protected-field copy events:** log employee, record ID, field, time and action when someone copies a protected field inside Klarves. Never log the copied text | Code | ☑ |
| B3 | **Loss alerts:** bulk employee exports, many account reassignments in a short window, unusual copy volume, and later screenshot downloads. Each alert lists the affected records | Code | ☑ |
| B4 | De-duplicate screenshot-key incident alerts (today every key press notifies every admin) | Code | ☑ |
| B5 | Require MFA for screen viewers and screenshot access | Code | ⏸ on hold with C |

Implementation notes (B2–B4): mark a value with `<Protected type id field>` (frontend) to make copies auditable. Thresholds live in Company policy (`alert_copies_per_10_minutes`, `alert_reassignments_per_hour`). Alerts appear under Security with the affected records attached. Exports and reassignments alert founders only.

## C. Screen sharing & screenshots (Windows + macOS)

**⏸ On hold** until the local network is set up. Order when resumed: C1 → C2 → C3 → C4 → C5. Nothing in C ships before A1–A4. Recommended approach: browser-based sharing first (OS picker, no installer), desktop client only if needed.

| # | Item | Owner | Status |
|---|---|---|---|
| C0 | Written monitoring policy + employee acknowledgement; check local privacy/employment law (consent, notice, retention) | You (HR/legal) | ☐ |
| C1 | Test the existing web app on one Windows PC and one Mac (Chrome/Edge + Safari) | You | ☐ |
| C2 | **Screen session backend:** manager requests a session with a reason → employee accepts/declines → time-boxed session; team-scope + permission check on start; full audit trail | Code | ☐ |
| C3 | **Live viewing:** employee picks a work window or display through the OS picker; stopping sharing ends the stream immediately; default to a single window | Code | ☐ |
| C4 | **Screenshots:** separate permission from live viewing; employee is shown when one is saved; private storage with case ID, expiry date, and a view/download log; auto-deletion | Code | ☐ |
| C5 | Signed desktop client (only if the browser approach isn't enough): needs an Apple Developer ID + notarization and a Windows code-signing certificate | You (certs) + Code | ☐ |
| C6 | Endpoint DLP for copying *outside* Klarves (e.g. Microsoft Purview on managed devices) | You (IT) | ☐ |

### Pilot acceptance test (C2–C4)
One Windows PC, one Mac, two employees on different teams:
1. The authorised manager can view the employee's selected work window.
2. A manager from the other team is denied.
3. When the employee stops sharing, the stream ends immediately.
4. Every saved screenshot has a traceable viewer and a deletion date.

## D. Employee workspace follow-ups (added 2026-11-25)

Phases 1–5 of the employee workspace are built: navigation, Add / Import accounts, Publishing, My workspace dashboard, Mail, Help & support, Team messages, kudos / anniversaries / content idea.

| # | Item | Owner | Status |
|---|---|---|---|
| D1 | **End-to-end test, one employee:** add an account → admin approves → approval arrives in Mail → create and schedule a post → admin approves → post shows on the dashboard. Run against a disposable test database, not production | Code | ☐ |
| D2 | **Real Instagram publishing:** call Meta's content-publishing API (create media container → publish; poll status for Reels), mark FAILED with Meta's reason. Today "Publish now" only marks a post as published | Code | ☐ |
| D3 | **Scheduled publishing job:** publish approved posts at their time (Vercel Cron or a worker hitting a protected endpoint), with retries and a FAILED state | Code | ☐ |
| D4 | **Meta app review** for `instagram_content_publish` (and business verification) before D2/D3 can post to real accounts | You | ☐ |
| D5 | Set `SUPABASE_SERVICE_ROLE_KEY` on the production backend (Vercel) so media and screenshot uploads work there; local `.env` is done | You | ☐ |
