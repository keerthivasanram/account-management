# KLARVES — Roles & Permissions

**Source of truth:** [`backend/app/core/permissions.py`](../backend/app/core/permissions.py). This document mirrors it; if they disagree, the code wins.

**Enforcement:** FastAPI dependencies (`require_permission(Perm.X)`) on every protected route, plus scope checks in services (whose record is it?). The frontend reads the same permission list from `/auth/me` and only hides UI; it never grants access.

---

## 1. Roles

| Role | Who | Scope |
|---|---|---|
| `super_admin` | Founders / owners | Everything, incl. granting admin, company policy, system health, emergency sign-out |
| `admin` | HR / operations | Company-wide people, accounts, clients, approvals, audit. **Cannot** modify admins or super admins, or change policy |
| `manager` | People managers, department heads | Their **team** = direct reports (`manager_id`) + members of departments they head (`head_employee_id`) |
| `employee` | Everyone else | Self-service |

Roles are stored on `employees.role` and read from the database on every request. Tokens never carry roles.

**How someone becomes a super admin:** only through `SUPER_ADMIN_EMAILS` (applied on first sign-in and re-applied on each API start), or by another super admin in the console.

---

## 2. Permission matrix

| Permission | Employee | Manager | Admin | Super admin |
|---|:-:|:-:|:-:|:-:|
| `self:use` (own profile, tasks, attendance, leave) | ✓ | ✓ | ✓ | ✓ |
| `manager:portal`, `team:read` | | ✓ | ✓ | ✓ |
| `tasks:review_team` / `leave:approve_team` / `attendance:read_team` / `accounts:read_team` | | ✓ | ✓ | ✓ |
| `admin:portal` | | | ✓ | ✓ |
| `employees:read_all`, `employees:manage` (invite, import, edit, offboard, force logout) | | | ✓ | ✓ |
| `roles:assign` (grant manager / employee) | | | ✓ | ✓ |
| `departments:manage`, `clients:manage`, `accounts:manage_all` | | | ✓ | ✓ |
| `tasks:review_all`, `leave:approve_all`, `attendance:read_all` | | | ✓ | ✓ |
| `audit:read`, `security:manage`, `documents:restricted` | | | ✓ | ✓ |
| `roles:assign_admin` (grant / revoke admin & super admin) | | | | ✓ |
| `settings:manage` (company policy) | | | | ✓ |
| `sessions:revoke_any` (sign everyone out) | | | | ✓ |
| `system:health` | | | | ✓ |

---

## 3. Guardrails (enforced in code, covered by tests)

1. **Separation of duties:** nobody reviews their own task or approves their own leave.
2. **Task reviewers:** admins, the task creator, the project owner, or the assignee's manager. The task must be `IN_REVIEW`.
3. **Leave approvers:** the requester's manager / department head, or an admin. A request can be decided only once.
4. **Role hierarchy:** admins can't edit admins or super admins, and can only grant `manager` / `employee`. Nobody can change their own role. The last active super admin can't be demoted, deactivated or offboarded.
5. **Reporting lines:** a manager must hold `manager` or a higher role, and cycles (A → B → A) are rejected.
6. **Offboarding** hands over active Instagram accounts, open tasks and direct reports to a successor, then revokes sessions and trusted devices and blocks sign-in. History is kept.
7. **Every mutation** of people, roles or policy writes an audit log entry, with before/after values where relevant.
