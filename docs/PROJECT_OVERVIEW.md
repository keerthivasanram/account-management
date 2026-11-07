# SocialHub Enterprise OS — Project Overview

**Version:** 2.0  
**Architecture:** Single Organization / Single Tenant  
**Platform:** Web Application (Responsive Desktop / Tablet / Mobile)  
**Primary Database:** PostgreSQL  
**Backend:** NestJS + TypeScript  
**Frontend:** Next.js + React + TypeScript  

---

## 1. Executive Summary

SocialHub Enterprise OS is an all-in-one digital operating system and enterprise management platform designed to unify employee operations, secure company-managed communications, project and task delegation, document repositories, attendance and leave management, and high-scale social media publishing (Instagram & Facebook) under a unified Zero-Trust security perimeter.

The platform eliminates fractured tooling, replaces unencrypted third-party chat apps, provides traceable accountability, and defends against corporate data leakage with dynamic forensic watermarking, device registration, and continuous audit trails.

---

## 2. Core Objectives

1. **Workforce Management:** Centralize employee lifecycle, departments, teams, roles, designations, and reporting hierarchies.
2. **Task & Project Delegation:** End-to-end task assignment, multi-stage approval workflows, Kanban tracking, and immutable activity history.
3. **Secure Company Messaging:** Centralized internal communications (direct, group, department, project, announcement) with auditability, retention policies, and attachment access controls.
4. **Attendance & Leave Governance:** Server-timestamped check-ins, leave allowances, correction requests, and manager review pipelines.
5. **Confidential Document Management:** Private Amazon S3 storage with signed access URLs, classification tags, versioning, and malware scanning.
6. **Social Media Publishing:** Retain and scale SocialHub's core Meta OAuth, Instagram/Facebook account connections, hybrid scheduling, and outbox reconciliation engine.
7. **Zero-Trust Enterprise Security:** Mandatory MFA (Passkeys/TOTP), device registration, dynamic forensic watermarking, screen-capture alerting, and append-only audit event logging.
8. **Operational Intelligence:** Dedicated dashboards for Organizations, Employees, Managers, and Social Media managers.

---

## 3. Product Principles

- **Security by Design:** Security is a cross-cutting foundation at every API endpoint and database query, not an afterthought.
- **Least-Privilege Access:** Strict role-based and resource-level access control (RBAC).
- **Clear Accountability:** Every task modification, account connection, approval, and administrative intervention has an immutable actor log.
- **Independent Domain Boundaries:** Modular monolithic structure with cleanly decoupled domain services.
- **Reliable Async Processing:** Transactional outbox pattern backed by Redis and BullMQ workers.
- **Privacy & Data Minimization:** Transparent, necessary operational data collection without covert surveillance.

---

## 4. System Scope & Boundaries

- **Single-Organization Model:** Initial deployment serves a single enterprise entity with internal department hierarchies, while maintaining an `organization_id` foreign key across all business records to enable future multi-tenant expansion without schema restructuring.
- **Platform Scope:** Web-first responsive application optimized for desktop, laptop, and tablet viewports. Native mobile and desktop binaries are deferred to post-2.0 releases.
- **Screenshot Reality Check:** The browser environment cannot provide 100% kernel-level screenshot blocking. The platform employs defense-in-depth: dynamic forensic watermarking (steganographic and visible), keyboard interception, focus loss blurring, clipboard erasure, and real-time security incident alerts.

---

## 5. Twelve Functional Modules

| Module | Title | Core Focus |
|---|---|---|
| **01** | **Identity & Access Management** | Passkeys, TOTP MFA, device registration, session lifecycle, lockout |
| **02** | **Employee Management** | Employee directory, profile lifecycle, managerial reporting, offboarding |
| **03** | **Department & Team Management** | Organizational hierarchies, department heads, cross-functional teams |
| **04** | **Task Management** | Backlog-to-completion workflow, subtasks, dependencies, activity trail |
| **05** | **Project Management** | Milestones, Kanban boards, project discussion threads, deliverables |
| **06** | **Internal Messaging** | 1:1 direct, group, department, announcement channels, file attachments |
| **07** | **Attendance & Leave** | Check-in/out, leave applications, manager approvals, holiday calendars |
| **08** | **Document Management** | Private S3 buckets, classification levels, version control, signed URLs |
| **09** | **Social Media Management** | Meta OAuth, Instagram/Facebook publishing, hybrid queues, outbox sweeper |
| **10** | **Notification Center** | In-app, WebSockets, email notifications, user preferences |
| **11** | **Reports & Analytics** | Role-tailored dashboards (Org, Employee, Manager, Social) |
| **12** | **Enterprise Security Center** | Real-time incident logs, watermarking, device revocation, lockdown |
