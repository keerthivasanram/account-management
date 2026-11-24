import os
import base64
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from cryptography.fernet import Fernet

DEV_FALLBACK_FERNET_KEY = "v7yv-Xz6V_wZJ39gQ5t0Q8_1Jz9r-3m3e91uGz_lZpY="
DEV_FALLBACK_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me-0000"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "Instagram Account Management Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database: Supabase PostgreSQL or local PostgreSQL via DATABASE_URL; sqlite fallback for local dev
    DATABASE_URL: str = "sqlite:///./app.db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Supabase Auth Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Token Encryption Key (Fernet 32-byte url-safe base64 key)
    TOKEN_ENCRYPTION_KEY: str = ""

    # Meta OAuth Credentials
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    META_REDIRECT_URI: str = "http://localhost:5173/oauth/callback"
    META_API_VERSION: str = "v19.0"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # Dev/Mock Auth mode when Supabase is not configured.
    # Only honoured when ENVIRONMENT == "development"; production startup refuses it.
    DEV_AUTH_BYPASS: bool = True

    # Backend-issued session tokens (MFA login, dev login). HS256 signing secret.
    APP_JWT_SECRET: str = ""
    APP_JWT_ISSUER: str = "klarves-api"
    ACCESS_TOKEN_TTL_MINUTES: int = 480

    # Comma-separated list of emails that are provisioned as super_admin on first login
    # and re-asserted on every startup. This is the only way to bootstrap a super admin.
    SUPER_ADMIN_EMAILS: str = ""

    # Onboarding policy. When False, only invited employees (or SUPER_ADMIN_EMAILS) can sign in.
    AUTO_PROVISION_EMPLOYEES: bool = True
    # Optional comma-separated allowlist of email domains for auto-provisioning, e.g. "klarves.com"
    ALLOWED_EMAIL_DOMAINS: str = ""

    # MFA brute-force protection
    MFA_MAX_ATTEMPTS: int = 5

    @field_validator("TOKEN_ENCRYPTION_KEY", mode="before")
    @classmethod
    def assemble_encryption_key(cls, v: str) -> str:
        if v and len(v.strip()) > 0:
            return v.strip()
        # Fallback deterministic key for dev/testing only.
        # validate_for_production() refuses to start if this is in use outside development.
        return DEV_FALLBACK_FERNET_KEY

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"

    @property
    def dev_auth_enabled(self) -> bool:
        """Dev shortcuts (dev tokens, /auth/dev-login, MFA code hints) are only ever on in development."""
        return self.is_development and self.DEV_AUTH_BYPASS

    @property
    def jwt_signing_secret(self) -> str:
        if self.APP_JWT_SECRET:
            return self.APP_JWT_SECRET
        if self.is_development:
            return DEV_FALLBACK_JWT_SECRET
        return ""

    @property
    def super_admin_emails(self) -> List[str]:
        return [e.strip().lower() for e in self.SUPER_ADMIN_EMAILS.split(",") if e.strip()]

    @property
    def allowed_email_domains(self) -> List[str]:
        return [d.strip().lower().lstrip("@") for d in self.ALLOWED_EMAIL_DOMAINS.split(",") if d.strip()]

    def validate_for_production(self) -> List[str]:
        """Returns a list of fatal misconfigurations. Empty list == safe to start."""
        if self.is_development:
            return []
        problems = []
        if self.DEV_AUTH_BYPASS:
            problems.append("DEV_AUTH_BYPASS must be false outside development")
        if self.TOKEN_ENCRYPTION_KEY == DEV_FALLBACK_FERNET_KEY:
            problems.append("TOKEN_ENCRYPTION_KEY must be set to a unique Fernet key")
        if not self.APP_JWT_SECRET or len(self.APP_JWT_SECRET) < 32:
            problems.append("APP_JWT_SECRET must be set (>= 32 chars)")
        if self.DATABASE_URL.startswith("sqlite"):
            problems.append("DATABASE_URL must point to PostgreSQL outside development")
        return problems

settings = Settings()
