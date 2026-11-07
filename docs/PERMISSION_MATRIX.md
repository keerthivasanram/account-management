# SocialHub Enterprise OS — Permission Matrix (RBAC)

**Version:** 2.0  
**Enforcement:** Server-side NestJS Guards & PostgreSQL Row-Level Security (RLS)  

---

## 1. Enterprise Roles

| Role Key | Name | Primary Scope |
|---|---|---|
| `SUPER_ADMIN` | Super Administrator | Organization-wide administration, policy overrides, all modules |
| `SECURITY_ADMIN` | Security Administrator | Security Center, device approvals, audit inspection, session revocation |
| `HR_ADMIN` | Human Resources Admin | Employee records, departments, designations, offboarding, leave balances |
| `DEPARTMENT_MANAGER`| Department Manager | Department workflows, team management, task assignments, approvals |
| `PROJECT_MANAGER` | Project Manager | Project creation, Kanban boards, milestones, budget allocation |
| `SOCIAL_MEDIA_MANAGER`| Social Media Manager | Meta OAuth accounts, social publishing, calendar, campaigns |
| `APPROVER` | Workflow Approver | Task deliverables, content drafts, attendance corrections |
| `EMPLOYEE` | Employee / Staff | Assigned tasks, direct/group chat, attendance check-in, personal profile |
| `AUDITOR` | Compliance Auditor | Read-only access to audit logs, security events, and historical records |

---

## 2. Cross-Module Permission Matrix

Legend:
- **C** = Create
- **R** = Read / View
- **U** = Update / Edit
- **D** = Delete
- **A** = Approve / Reject
- **X** = Export / Download

| Module / Resource | SUPER_ADMIN | SECURITY_ADMIN | HR_ADMIN | DEPT_MANAGER | PROJ_MANAGER | SOCIAL_MANAGER | EMPLOYEE | AUDITOR |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Identity & Sessions** | C R U D A X | C R U D A X | R | R | - | - | R (Self) | R |
| **Device Approvals** | C R U D A | C R U D A | - | - | - | - | - | R |
| **Employee Directory** | C R U D X | R | C R U D X | R (Dept) | R (Proj) | R | R (Basic) | R |
| **Employee Offboarding**| C U A | R | C U A | - | - | - | - | R |
| **Departments & Teams** | C R U D | R | C R U D | R U (Team) | R | - | R | R |
| **Projects** | C R U D A X | R | R | C R U (Dept) | C R U D A X | R (Linked) | R (Assigned) | R |
| **Tasks** | C R U D A | R | R | C R U D A | C R U D A | C R U (Social) | R U (Assigned)| R |
| **Task Approvals** | A | - | - | A (Dept) | A (Proj) | A (Social) | - | R |
| **Internal Messaging** | R (Admin) | R (Audit) | - | C R U (Dept) | C R U (Proj) | C R U (Social)| C R U (Direct)| R (Audit) |
| **Attendance & Leave** | R A X | - | C R U A X | R A (Dept) | - | - | C R (Self) | R |
| **Documents (Confidential)**| C R U D A X| R (Audit) | C R U D (HR)| C R U (Dept)| C R U (Proj) | C R (Assets) | R (Assigned)| R |
| **Meta Accounts & OAuth** | C R U D A | - | - | - | - | C R U D A | R (Assigned) | R |
| **Social Publishing** | C R U D A | - | - | - | - | C R U D A | C R (Draft) | R |
| **Security Incidents** | C R U D A X | C R U D A X | R (HR Rel) | - | - | - | - | R |
| **Audit Trails** | R X | R X | R (HR Logs) | - | - | - | - | R X |

---

## 3. Strict Security Guardrails

1. **Separation of Duties:** Employees can never approve their own task deliverables, leave requests, or content publications.
2. **Administrative Chat Privacy:** Super Administrators cannot silently monitor private 1:1 direct messages. Administrative access to messages requires an active security investigation flag and automatically generates a high-severity audit event.
3. **Frontend Guard Rule:** UI visibility is cosmetic. All actions enforce strict NestJS `@UseGuards(RolesGuard, ResourceGuard)` validation before executing any database operation.
