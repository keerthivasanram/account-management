# Instagram Account Management Platform

An enterprise internal web platform built for companies managing thousands of Instagram accounts. It empowers employees to register, assign, and connect Instagram pages through official Meta OAuth flows while providing administrators with complete oversight, account allocation controls, approval workflows, and immutable audit logs.

Designed to scale to **5,000 Instagram accounts** with each employee responsible for approximately **50–60 accounts**.

---

## 1. High-Level Architecture

```text
                  EMPLOYEES / ADMINISTRATORS
                             |
                             v
               React 18 + Vite (Tailwind CSS)
                             |
                    HTTPS / REST API
                             |
                             v
                   FastAPI Backend (Python 3.12)
                             |
           +-----------------+-----------------+
           |                 |                 |
           v                 v                 v
     Auth Service     Account Service    Admin Service
           |                 |                 |
           +-----------------+-----------------+
                             |
                             v
               SQLAlchemy 2.x Repository Layer
                             |
         +-------------------+-------------------+
         |                                       |
         v                                       v
  [Initial Database]                     [Future Database]
 Supabase PostgreSQL                   Local Server PostgreSQL
         |
         v
  Meta OAuth Integration (Fernet Encrypted Tokens)
         |
         v
  Meta / Instagram Graph API
```

### Architectural Guardrails
1. **Frontend Isolation:** The React frontend never communicates directly with database tables containing sensitive records. All business logic and queries flow through FastAPI.
2. **Session-Derived Identity:** Employee IDs sent from the client are never trusted. Identity is strictly derived from the verified authentication session.
3. **Token Encryption:** Official Meta access tokens are encrypted with AES-128-CBC + HMAC-SHA256 (Fernet) before database persistence and decrypted only in memory when validating with Meta's Graph API.
4. **Database Portability:** Core business logic depends on standard PostgreSQL features, SQLAlchemy 2.x, and Alembic migrations. Moving from Supabase to a company-hosted PostgreSQL server requires zero code rewriting.

---

## 2. Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | React 18, Vite | High-performance SPA with fast HMR |
| **Styling** | Tailwind CSS, Lucide Icons | Clean, responsive dark-mode UI |
| **Backend** | FastAPI, Uvicorn | Python async REST API framework |
| **ORM & Migrations** | SQLAlchemy 2.x, Alembic | Repository pattern & declarative schema migrations |
| **Data Validation** | Pydantic v2 | Request/response typing and normalization |
| **Token Cryptography** | `cryptography` (Fernet) | Symmetric token encryption for Meta OAuth credentials |
| **Initial Database** | Supabase PostgreSQL | Cloud-hosted PostgreSQL with connection pooling |
| **Initial Auth** | Supabase Auth (JWT) | Secure JWT-based employee authentication |
| **Future Database** | Company PostgreSQL Server | Self-hosted PostgreSQL on internal network / VPN |
| **Containerization** | Docker, Docker Compose | Multi-container stack (Postgres + Backend + Nginx) |

---

## 3. Database Schema (PostgreSQL / Supabase)

The database schema is managed via **Alembic** (`backend/alembic/versions/001_initial_schema.py`):

1. **`employees`**:
   - `id` (UUID PK): Internal employee reference.
   - `auth_user_id` (UUID Unique): Reference to Supabase Auth ID (isolated from business logic).
   - `employee_code` (VARCHAR Unique): Unique employee identifier (e.g. `EMP-0001`).
   - `full_name`, `email` (Unique), `role` (`employee` | `admin`), `is_active`, `created_at`.
2. **`clients`**:
   - `id` (UUID PK), `name` (Unique), `description`, `is_active`, `created_at`.
3. **`campaigns`**:
   - `id` (UUID PK), `client_id` (FK `clients.id`), `name`, `description`, `is_active`, `created_at`.
4. **`instagram_accounts`**:
   - `id` (UUID PK), `username`, `username_normalized` (Unique, lowercase for case-insensitive duplicate prevention).
   - `profile_url`, `display_name`, `instagram_user_id` (Unique, official Meta account ID).
   - `account_created_date`, `niche`, `client_id` (FK), `campaign_id` (FK), `registered_by` (FK `employees.id`).
   - `status` (`pending_connection` | `connected` | `pending_approval` | `approved` | `rejected`).
   - `created_at`, `updated_at`.
5. **`account_connections`**:
   - `id` (UUID PK), `instagram_account_id` (FK Unique), `provider`, `provider_account_id`.
   - `encrypted_access_token` (TEXT): Fernet-encrypted long-lived access token.
   - `token_expires_at`, `granted_permissions` (JSON), `connection_status` (`connected` | `expired` | `revoked` | `failed` | `disconnected`), `last_validated_at`.
6. **`account_assignments`**:
   - `id` (UUID PK), `instagram_account_id` (FK), `employee_id` (FK), `assigned_by` (FK), `assigned_at`, `is_active`.
   - Decouples registration author from active operational responsibility.
7. **`account_verifications`**:
   - `id` (UUID PK), `instagram_account_id` (FK Unique), `profile_verified`, `connection_verified`, `ownership_verified`.
   - `approval_status` (`pending` | `approved` | `rejected`), `reviewed_by` (FK), `reviewed_at`, `remarks`.
8. **`audit_logs`**:
   - `id` (UUID PK), `actor_id` (FK), `action`, `entity_type`, `entity_id`, `metadata` (JSON with redacted secrets), `created_at`.

---

## 4. Project Directory Structure

```text
instagram-management/
│
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI (StatCard, StatusBadge, Navbar, Sidebar, Modal)
│   │   ├── context/               # AuthContext (Supabase Auth & Dev Login switcher)
│   │   ├── layouts/               # AppLayout (Sidebar + Navbar) & AdminRoute guard
│   │   ├── pages/
│   │   │   ├── Login/             # Supabase & Dev instant switcher login page
│   │   │   ├── Dashboard/         # Employee dashboard & KPIs
│   │   │   ├── RegisterAccount/   # 3-section short registration form with live duplicate check
│   │   │   ├── Accounts/          # Filterable account list, details drawer, Meta connect/disconnect
│   │   │   ├── Admin/             # Admin Overview, All Accounts, Employees Capacity, Clients, Audits
│   │   │   └── OAuthCallback/     # Meta OAuth callback redirect handler
│   │   ├── services/
│   │   │   ├── api.js             # Axios client with bearer token injection
│   │   │   └── supabase.js        # Supabase client initializer & auth helpers
│   │   ├── App.jsx                # Router configuration
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
│
├── backend/
│   ├── app/
│   │   ├── api/v1/                # Versioned REST endpoints (auth, employees, accounts, admin, integrations)
│   │   ├── core/                  # App settings (Pydantic Settings), database connection
│   │   ├── models/                # SQLAlchemy declarative models & GUID/JSONType definitions
│   │   ├── schemas/               # Pydantic v2 validation schemas
│   │   ├── repositories/          # Database queries & repository layer
│   │   ├── services/              # Business logic (AccountService, AdminService, AuthService, MetaService)
│   │   ├── security/              # Fernet encryption & cryptographic helpers
│   │   ├── integrations/meta/     # Meta OAuth dialog generator, state verification & Graph API client
│   │   └── main.py                # FastAPI initialization & seed data setup
│   ├── alembic/                   # Database migration environment and version scripts
│   ├── tests/                     # Pytest automated test suite (auth, accounts, crypto, admin, meta)
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── pytest.ini
│   └── Dockerfile
│
├── docker-compose.yml             # Docker stack (Postgres + Backend + Frontend Nginx)
├── .env.example                   # Annotated template for all configuration variables
└── README.md
```

---

## 5. Quickstart & Local Development

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ (tested on Node.js 20/25)
- npm or pnpm

### 5.1 Backend Setup

1. Open a terminal in `backend/`:
   ```bash
   cd backend
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows:** `venv\Scripts\activate`
   - **macOS / Linux:** `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy environment configuration:
   ```bash
   cp ../.env.example .env
   ```
5. Run database migrations:
   ```bash
   alembic upgrade head
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   Interactive API docs are available at: `http://127.0.0.1:8000/docs`

### 5.2 Frontend Setup

1. Open a separate terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser at `http://localhost:5173`.

### 5.3 Instant Demo / Dev Logins
If Supabase is not yet configured, the platform has a built-in development authentication bypass:
- **Administrator:** Click **"Administrator Access"** (`admin@company.internal`) on the login screen to access the Admin Overview, All Accounts, Employee Capacity tracker, and Clients/Campaigns.
- **Employee:** Click **"Sarah Jenkins"** (`employee1@company.internal`) or **"Marcus Vance"** (`employee2@company.internal`) to experience the employee registration flow.

---

## 6. Running the Automated Test Suite

The backend includes a comprehensive pytest suite covering cryptography, session authorization, account registration, duplicate checking, admin approvals, and Meta OAuth callbacks:

```bash
cd backend
venv\Scripts\pytest -v
```

All 15 tests run against an in-memory database and verify:
- ✅ Case-insensitive duplicate Instagram username detection (HTTP 409)
- ✅ Auto-derived employee identity from session
- ✅ Instagram profile URL format validation
- ✅ Employee dashboard metrics and account queries
- ✅ Admin review (approval/rejection) and account reassignment
- ✅ Fernet symmetric token encryption and decryption
- ✅ Meta OAuth state generation, HMAC signature verification, and callback handling

---

## 7. Supabase Setup Guide (Initial Cloud Deployment)

### 7.1 Create Project & Database
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your project reference ID, database password, and hosting region.

### 7.2 Database Connection String
1. In Supabase Dashboard, navigate to **Project Settings** > **Database**.
2. Under **Connection string**, select **URI**.
3. For server-side connection pooling, select **Transaction Mode** (Port `6543`) or Session Mode (Port `5432`):
   ```env
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. Set this in `backend/.env`.

### 7.3 Supabase Authentication Credentials
1. In Supabase Dashboard, navigate to **Project Settings** > **API**.
2. Copy:
   - **Project URL** -> `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **`anon` / `public` Key** -> `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - **`service_role` Key** -> `SUPABASE_SERVICE_ROLE_KEY` (Backend only, never expose to frontend)
   - **JWT Secret** -> `SUPABASE_JWT_SECRET` (Under API > JWT Settings)

### 7.4 Apply Alembic Migrations on Supabase
Run Alembic from the `backend/` directory pointing to your Supabase `DATABASE_URL`:
```bash
cd backend
alembic upgrade head
```
All 8 tables and indexes will be created cleanly on your Supabase PostgreSQL database.

---

## 8. Meta Developer App Setup Guide

To connect Instagram accounts via the official Meta Graph API:

1. Register at [developers.facebook.com](https://developers.facebook.com).
2. Click **Create App** and choose app type **Business**.
3. Under **Add products to your app**, add:
   - **Instagram Graph API**
   - **Facebook Login for Business**
4. Under **Facebook Login for Business** > **Settings**:
   - Add your redirect URI to **Valid OAuth Redirect URIs**:
     `http://localhost:5173/oauth/callback` (or your production URL `https://yourdomain.com/oauth/callback`).
5. Under **App Settings** > **Basic**:
   - Copy **App ID** -> `META_APP_ID` in `.env`.
   - Copy **App Secret** -> `META_APP_SECRET` in `.env`.
6. Configure requested scopes:
   - `instagram_basic`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
7. When running locally without live Meta credentials, the application automatically activates **Simulation Mode**, allowing testing of token encryption, callback handling, and connection status transitions seamlessly.

---

## 9. Docker Deployment

Deploy the entire platform (PostgreSQL + FastAPI backend + React/Nginx frontend) using Docker Compose:

```bash
# 1. Prepare environment variables
cp .env.example .env

# 2. Build and run containers
docker-compose up --build -d

# 3. Verify container status
docker-compose ps
```

- **Frontend:** `http://localhost` (or `http://localhost:5173`)
- **Backend API:** `http://localhost:8000/api/v1`
- **PostgreSQL:** Port `5432`

---

## 10. Future Migration from Supabase to Company Local Server

A core requirement is ensuring the platform can migrate from Supabase to a company-hosted PostgreSQL server without rewriting application code or business logic.

### Step-by-Step Migration Strategy

```text
[Supabase Cloud]                          [Company Local Server]
   PostgreSQL                                PostgreSQL 16
        |                                          |
        v                                          v
1. pg_dump (Data Only) -------------------> 2. pg_restore / psql
        |                                          |
        |                                   3. Run Alembic Head
        |                                          |
        +------- 4. Switch DATABASE_URL -----------+
```

1. **Deploy Local PostgreSQL Infrastructure:**
   - Provision a PostgreSQL 16 server on the company network/VPN.
   - Create the production database and user:
     ```sql
     CREATE DATABASE instagram_mgmt;
     CREATE USER app_user WITH ENCRYPTED PASSWORD 'secure_password';
     GRANT ALL PRIVILEGES ON DATABASE instagram_mgmt TO app_user;
     ```

2. **Run Alembic Migrations on Company Server:**
   - Update `DATABASE_URL` in backend to point to the local server.
   - Run:
     ```bash
     alembic upgrade head
     ```
   - This builds all tables, foreign keys, indexes, and constraints identically.

3. **Export Business Data from Supabase:**
   - Export application data using `pg_dump`:
     ```bash
     pg_dump -h [supabase_host] -U postgres -d postgres \
       --data-only \
       --table=employees \
       --table=clients \
       --table=campaigns \
       --table=instagram_accounts \
       --table=account_connections \
       --table=account_assignments \
       --table=account_verifications \
       --table=audit_logs \
       -f company_data_export.sql
     ```

4. **Import Data to Company PostgreSQL Server:**
   ```bash
   psql -h localhost -U app_user -d instagram_mgmt -f company_data_export.sql
   ```

5. **Verify Data Integrity:**
   - Confirm row counts match between Supabase and local PostgreSQL.
   - Verify foreign keys, UUID relationships, and active employee assignments.

6. **Authentication Transition (Supabase Auth -> Company Auth):**
   - Because `employees.auth_user_id` is decoupled from internal `employees.id`, authentication can be shifted to company LDAP, Active Directory, Keycloak, or local JWT authentication by swapping `AuthService.decode_token()` without changing account assignments or relationships!

7. **Switch Application Traffic:**
   - Update `DATABASE_URL` in production environment variables.
   - Point Nginx reverse proxy to the local backend.
   - Maintain the Supabase backup until full cutover is confirmed.

---

## 11. Security Checklist

- [x] **No frontend employee ID trusting:** Derived strictly from authenticated backend session token.
- [x] **Role-Based Access Control (RBAC):** Admin endpoints restricted via `require_admin` dependency.
- [x] **Fernet Token Encryption:** Meta OAuth tokens encrypted before database storage; plaintext tokens never returned in API responses or logs.
- [x] **Audit Trails:** Immutable logging of registrations, status transitions, approvals, and assignments.
- [x] **Case-Insensitive Uniqueness:** Instagram usernames normalized to lowercase with database-enforced unique constraints.
- [x] **Input Sanitization:** Pydantic v2 validation for usernames, profile URLs, dates, and foreign keys.

---

## 12. License
Internal Proprietary — All Rights Reserved.
