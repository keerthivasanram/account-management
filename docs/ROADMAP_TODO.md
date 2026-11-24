# KLARVES — Pending To-Do List

Status key: ☐ not started · ◐ in progress · ☑ done. Update this file as items close.
Owner: **You** means a deployment/account/legal action only you can take. **Code** means it gets built in the repo.

---

## A. Before deploying the current branch (from Phases 0–6)

| # | Item | Owner | Status |
|---|---|---|---|
| A1 | Set `ENVIRONMENT=production` on Vercel (default `development` leaves dev login shortcuts on) | You | ☐ |
| A2 | Set secrets: `APP_JWT_SECRET`, a unique `TOKEN_ENCRYPTION_KEY`, `SUPER_ADMIN_EMAILS`; choose `AUTO_PROVISION_EMPLOYEES=false` or `ALLOWED_EMAIL_DOMAINS` | You | ☐ |
| A3 | Run `alembic upgrade head` against Supabase (004–006 are safe on an existing DB) | You | ☐ |
| A4 | Connect an email/SMS provider for login codes (`TODO(delivery)` in `backend/app/api/v1/mfa.py`); until then code sign-in only works in development | Code + You (provider account) | ☐ |
| A5 | Schedule `python -m app.jobs.token_health` daily | You | ☐ |
| A6 | Delete obsolete `backend/fix_alembic.py` | You | ☐ |
| A7 | Push branch `feat/rbac-and-management-dashboards`, open PR, let CI run | You / Code | ☐ |

## B. Security features (from the monitoring plan)

| # | Item | Owner | Status |
|---|---|---|---|
| B1 | Meta/Instagram tokens stay server-side; no API response or desktop client ever exposes them (verified, regression test added) | Code | ☑ |
| B2 | **Protected-field copy events:** log employee, record ID, field, time and action when someone copies a protected field inside Klarves. Never log the copied text | Code | ☑ |
| B3 | **Loss alerts:** bulk employee exports, many account reassignments in a short window, unusual copy volume, and later screenshot downloads. Each alert lists the affected records | Code | ☑ |
| B4 | De-duplicate screenshot-key incident alerts (today every key press notifies every admin) | Code | ☑ |
| B5 | Require MFA for screen viewers and screenshot access (depends on A4 or Supabase MFA) | Code | ☐ |

Implementation notes (B2–B4): mark a value with `<Protected type id field>` (frontend) to make copies auditable. Thresholds live in Company policy (`alert_copies_per_10_minutes`, `alert_reassignments_per_hour`). Alerts appear under Security with the affected records attached. Exports and reassignments alert founders only.

## C. Screen sharing & screenshots (Windows + macOS)

Order: C1 → C2 → C3 → C4 → C5. Nothing in C ships before A1–A4.

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
