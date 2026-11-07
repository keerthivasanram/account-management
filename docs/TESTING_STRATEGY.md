# SocialHub Enterprise OS — Testing & Verification Strategy

**Frameworks:** Jest (Unit/Integration), Playwright (E2E), Supertest (API Integration)  
**Security Standard:** OWASP ASVS Level 2 Verification  

---

## 1. Testing Pyramid & Verification Levels

```text
               / \
              /E2E\             Playwright (Critical User Journeys)
             /-----\
            /  INT  \           Supertest + TestContainers (API & DB)
           /---------\
          /   UNIT    \         Jest (Business Logic & Crypto)
         /-------------\
```

---

## 2. Mandatory Security Acceptance Tests

Every production module must pass these 12 non-negotiable security tests before merge:

| ID | Test Scenario | Expected Outcome | Failure Condition |
|---|---|---|---|
| **SEC-01** | Employee A attempts to query Employee B's restricted records (`GET /employees/:id`). | HTTP 403 Forbidden | Any employee PII returned |
| **SEC-02** | Marketing employee attempts to access Engineering project documentation without assignment. | HTTP 403 Forbidden | File metadata or content returned |
| **SEC-03** | Unapproved device attempts to call authenticated API without completing step-up verification. | HTTP 401 / Device Pending status | Session access granted |
| **SEC-04** | Revoked session token attempts subsequent protected API calls. | HTTP 401 Unauthorized | API execution succeeds |
| **SEC-05** | Unauthorized employee attempts to generate pre-signed S3 download URL for confidential contract. | HTTP 403 Forbidden | Valid S3 URL issued |
| **SEC-06** | Employee attempts to self-approve their own submitted task or leave request. | HTTP 403 Forbidden | Request transitions to APPROVED |
| **SEC-07** | Terminated employee attempts to execute API actions with an unexpired bearer token. | HTTP 401 Unauthorized | Active session preserved |
| **SEC-08** | Rogue user attempts SQL injection or parameter tampering on task filter queries. | Query parameterized; HTTP 400 or valid filtered set | Database syntax error or leaked rows |
| **SEC-09** | Secret / Meta OAuth token leakage in application logs or API error responses. | Redacted / Encrypted | Plaintext `EAAG...` in response or logs |
| **SEC-10** | Screenshot keystroke simulation (`PrintScreen`, `Win+Shift+S`) on web client. | Clipboard cleared, security beacon dispatched to `/security/incidents` | No event recorded |
| **SEC-11** | Non-privileged user attempts to modify or truncate `audit_events` or `task_activity_events`. | HTTP 403 / DB Permission Denied | Row modified or deleted |
| **SEC-12** | Concurrent duplicate publication request to Meta Graph API for identical post. | Idempotency key blocks second request | Duplicate Instagram post published |

---

## 3. Automated CI Pipeline Execution

- Every pull request executes:
  1. TypeScript type checking (`tsc --noEmit`).
  2. ESLint security rules (`eslint-plugin-security`).
  3. Secret scanning (detects leaked tokens or private keys).
  4. Unit test suite with minimum 85% branch coverage on core security and task modules.
  5. Docker container vulnerability scanning (`trivy`).
