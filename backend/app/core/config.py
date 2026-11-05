import os
import base64
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from cryptography.fernet import Fernet

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

    # Dev/Mock Auth mode when Supabase is not configured
    DEV_AUTH_BYPASS: bool = True

    @field_validator("TOKEN_ENCRYPTION_KEY", mode="before")
    @classmethod
    def assemble_encryption_key(cls, v: str) -> str:
        if v and len(v.strip()) > 0:
            return v.strip()
        # Fallback deterministic key for dev/testing if not set in .env
        # NEVER use this default in production
        return "v7yv-Xz6V_wZJ39gQ5t0Q8_1Jz9r-3m3e91uGz_lZpY="

settings = Settings()
