# SocialHub Enterprise OS — API Specification

**Base URL:** `/api/v1`  
**Protocol:** HTTPS / TLS 1.3  
**Content-Type:** `application/json`  
**Authentication:** Bearer Session Token / HttpOnly Cookie  

---

## 1. Authentication & Security Endpoints (`/api/v1/auth`)

### `POST /auth/login`
- **Body:** `{ "email": "employee@company.com", "password": "..." }`
- **Response 200 (Success):** Returns session and user profile.
- **Response 202 (MFA Required):** Returns `{ "mfa_required": true, "session_temp_token": "..." }`.

### `POST /auth/mfa/verify`
- **Body:** `{ "temp_token": "...", "totp_code": "123456" }`
- **Response 200:** Sets HttpOnly session cookie, returns profile.

### `POST /auth/passkeys/register-options` & `/auth/passkeys/register-verify`
- Generates and verifies FIDO2 WebAuthn registration challenges.

### `POST /auth/passkeys/auth-options` & `/auth/passkeys/auth-verify`
- Performs passwordless biometric login.

### `GET /auth/sessions` & `DELETE /auth/sessions/:id`
- Lists active sessions and terminates a specific session immediately.

---

## 2. Employee & Organization Endpoints (`/api/v1/employees`)

### `GET /employees`
- **Query:** `department_id`, `status`, `search`, `page`, `limit`
- **Response 200:** Paginated list of employees with capacity counts.

### `POST /employees` (Admin / HR)
- **Body:** `{ "full_name": "...", "email": "...", "department_id": "...", "designation_id": "...", "role": "EMPLOYEE" }`
- **Response 201:** Created employee with generated `EMP-XXXX` code.

### `GET /employees/:id`
- Returns full employee profile, assigned manager, department, active projects, and capacity metrics.

### `PATCH /employees/:id`
- Updates profile details, role, department, or active status.

### `POST /employees/:id/offboard`
- **Action:** Immediately suspends user, revokes all active sessions and registered devices, transfers tasks, and records audit trail.

---

## 3. Department & Team Endpoints (`/api/v1/departments`)

### `GET /departments` & `POST /departments`
- Manages organizational units and assigns department heads.

### `GET /departments/:id/members`
- Lists all employees and active projects within a department.

---

## 4. Task Management Endpoints (`/api/v1/tasks`)

### `GET /tasks`
- **Query:** `project_id`, `assigned_to`, `status`, `priority`, `search`, `page`, `limit`

### `POST /tasks`
- **Body:** `{ "project_id": "...", "title": "...", "description": "...", "assigned_to": "...", "priority": "HIGH", "due_date": "2026-12-01" }`
- **Response 201:** Created task. Triggers in-app/email notification to assignee via outbox event.

### `PATCH /tasks/:id`
- Updates task fields. Automatically records an immutable entry in `task_activity_events`.

### `POST /tasks/:id/submit`
- Submits deliverable for manager review (`status -> IN_REVIEW`).

### `POST /tasks/:id/approve`
- Manager approves task deliverable (`status -> APPROVED` -> `COMPLETED`).

### `POST /tasks/:id/request-changes`
- **Body:** `{ "remarks": "Need higher resolution creative" }` (`status -> CHANGES_REQUESTED`).

### `GET /tasks/:id/activity`
- Returns chronological, immutable history of every status, assignment, and comment change.

---

## 5. Project Management Endpoints (`/api/v1/projects`)

### `GET /projects` & `POST /projects`
- Lists and provisions company projects with milestones and budgets.

### `GET /projects/:id/analytics`
- Returns task progress completion percentage, overdue counts, and team allocation metrics.

---

## 6. Internal Messaging Endpoints (`/api/v1/conversations`)

### `GET /conversations`
- Lists all direct, group, and department channels the authenticated employee participates in.

### `POST /conversations`
- **Body:** `{ "type": "DIRECT|GROUP|DEPARTMENT|PROJECT", "title": "...", "participant_ids": ["..."] }`

### `GET /conversations/:id/messages`
- Returns paginated message stream with attachments, reactions, and replies.

### `POST /conversations/:id/messages`
- **Body:** `{ "content": "...", "reply_to_id": null, "attachment_ids": [] }`
- Scans for secrets/tokens before persistence, broadcasts event over WebSockets.

---

## 7. Attendance & Leave Endpoints (`/api/v1/attendance`)

### `POST /attendance/check-in` & `POST /attendance/check-out`
- Records attendance with authoritative server timestamp and IP.

### `GET /attendance/history`
- Returns current employee's monthly attendance log.

### `POST /leave-requests` & `POST /leave-requests/:id/approve`
- Manages time-off submissions and manager approval workflows.

---

## 8. Document Management Endpoints (`/api/v1/documents`)

### `POST /documents/upload-intent`
- Returns pre-signed S3 upload URL with strict content-length and MIME restrictions.

### `GET /documents/:id/download`
- Generates short-lived (60-second) pre-signed S3 download URL after validating authorization.

---

## 9. Security & Incident Endpoints (`/api/v1/security`)

### `POST /security/incidents`
- **Body:** `{ "event_type": "SCREENSHOT_KEY_DETECTED", "route": "/admin/employees", "key_combination": "PrintScreen" }`
- Records critical security event and dispatches real-time alert to administrators.

### `GET /security/incidents` & `POST /security/incidents/:id/resolve`
- Admin review dashboard for all security violations.

### `GET /security/devices` & `POST /security/devices/:id/revoke`
- Device registration oversight and instant revocation.
