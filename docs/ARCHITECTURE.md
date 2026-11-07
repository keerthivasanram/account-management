# SocialHub Enterprise OS — System Architecture

**Version:** 2.0  
**Pattern:** Modular Monolith API Gateway + Background Asynchronous Workers  
**Target Infrastructure:** AWS Cloud (CloudFront, WAF, ECS/Docker, RDS PostgreSQL, ElastiCache Redis, S3, KMS)  

---

## 1. High-Level Architectural Diagram

```text
                    EMPLOYEES / ADMINISTRATORS
                               |
                               v
                     CLOUDFRONT + AWS WAF
                               |
                               v
                    NEXT.JS WEB APPLICATION
                               |
                               v
                      NESTJS API GATEWAY
                               |
                 CENTRAL IDENTITY & SECURITY
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
   HR MODULE              TASK MODULE             CHAT MODULE
  (Employees,             (Projects,              (Channels,
   Departments,            Assignments,            Direct Messages,
   Attendance)             Workflows)              Attachments)
       |                       |                       |
       +-----------------------+-----------------------+
                               |
                               v
                          POSTGRESQL
                               |
                      TRANSACTIONAL OUTBOX
                               |
                               v
                         REDIS + BULLMQ
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
  NOTIFICATION            MEDIA WORKER            SOCIAL WORKERS
  WORKER                  (Image/Video            (Meta Instagram &
  (Email & In-App)         Processing)             Facebook Publishers)
                               |
                               v
                      SECURITY MONITORING
                               |
                               v
                    AUDIT TRAILS + ALERTS
```

---

## 2. Technology Stack & Component Justification

| Layer | Technology | Engineering Rationale |
|---|---|---|
| **Frontend Framework** | Next.js (React 18/19, App Router) | Server-side rendering (SSR), optimized bundle chunking, fast routing, and clean API isolation. |
| **Frontend Language** | TypeScript | Strong typing across data models, API responses, and form states. |
| **Backend API** | NestJS | Robust modular architecture, dependency injection, declarative controllers, pipes, guards, and native OpenAPI generation. |
| **Primary Database** | PostgreSQL 16+ | Enterprise ACID compliance, UUID support, JSONB indexing, relational integrity, and Row-Level Security (RLS). |
| **ORM & Migrations** | Prisma + Reviewed SQL Migrations | Type-safe query building with Prisma, combined with custom SQL migrations for complex indices and security policies. |
| **Queue & Cache** | Redis 7+ with BullMQ | High-throughput distributed background job queuing, exponential retry backoff, and pub/sub caching. |
| **Real-time Engine** | WebSockets (NestJS Gateway / Socket.io) | Authenticated bi-directional communication for messaging, typing indicators, live notifications, and security alerts. |
| **Media & File Storage**| Amazon S3 (Private Buckets) | Encrypted storage at rest with short-lived presigned download URLs. Zero public bucket exposure. |
| **Authentication** | WebAuthn/FIDO2 Passkeys + TOTP MFA | Phishing-resistant biometric hardware authentication supplemented by RFC 6238 TOTP. |
| **Cryptographic Layer** | AWS KMS & Envelope Encryption | KMS key management for Meta OAuth long-lived tokens and sensitive credentials. |
| **Containerization** | Docker & Multi-stage Builds | Consistent environment parity across development, staging, and AWS ECS. |

---

## 3. Core Architectural Patterns

### 3.1 Modular Monolith
The core backend application is organized into self-contained domain modules within a single deployable service. Each module exposes a strict service interface and data access layer, preventing direct cross-module table tampering:
- `AuthModule`
- `EmployeeModule`
- `DepartmentModule`
- `TaskModule`
- `ProjectModule`
- `ChatModule`
- `AttendanceModule`
- `DocumentModule`
- `SocialPublishingModule`
- `NotificationModule`
- `AnalyticsModule`
- `SecurityModule`

### 3.2 Transactional Outbox Pattern
To prevent distributed transaction failures where database writes succeed but background jobs fail to enqueue, all asynchronous workflows write an outbox record inside the primary database transaction:
```sql
INSERT INTO tasks (...) VALUES (...);
INSERT INTO outbox_events (id, event_type, payload, status) 
VALUES (gen_random_uuid(), 'TASK_ASSIGNED', '{"task_id": "..."}', 'PENDING');
-- Commit happens atomically
```
An independent Outbox Relay worker polls or listens for pending outbox events and pushes them into BullMQ queues with idempotency keys.

### 3.3 Real-Time WebSocket Architecture
- WebSockets provide reactive push events for chat, task status updates, and critical security incident notifications.
- All WebSocket connections undergo handshake JWT/Session token authentication.
- Room subscriptions (e.g., `conversation:{id}` or `project:{id}`) are verified against server-side authorization policies before joining.
- PostgreSQL remains the sole source of truth; WebSocket payloads act as synchronization signals.
