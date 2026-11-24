"""
Backend-issued session tokens.

Used for sessions that are not minted by Supabase (MFA login, development login).
Tokens are HS256 JWTs signed with APP_JWT_SECRET and carry only identity — never
role or permissions. Authorization is always resolved from the database row.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
from fastapi import HTTPException, status

from app.core.config import settings


def create_access_token(employee) -> str:
    secret = settings.jwt_signing_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session signing is not configured.",
        )
    now = datetime.now(timezone.utc)
    payload = {
        "iss": settings.APP_JWT_ISSUER,
        "sub": str(employee.auth_user_id),
        "eid": str(employee.id),
        "tv": int(getattr(employee, "token_version", 0) or 0),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES)).timestamp()),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def is_app_token(token: str) -> bool:
    """Cheap pre-check (no verification) used only to route to the right verifier."""
    try:
        claims = jwt.decode(token, options={"verify_signature": False})
    except jwt.PyJWTError:
        return False
    return claims.get("iss") == settings.APP_JWT_ISSUER


def decode_app_token(token: str) -> Dict[str, Any]:
    secret = settings.jwt_signing_secret
    if not secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session signing is not configured.")
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            issuer=settings.APP_JWT_ISSUER,
            options={"require": ["exp", "iat", "sub", "iss"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")
