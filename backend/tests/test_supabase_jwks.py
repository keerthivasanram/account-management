"""Supabase projects with asymmetric (ES256) signing keys, verified via the project's JWKS."""
import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from app.core.config import settings
import app.services.auth_service as auth_service

PROJECT = "https://example-project.supabase.co"
KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())


@pytest.fixture(autouse=True)
def supabase_project(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", PROJECT)
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "")
    monkeypatch.setattr(auth_service, "supabase_signing_key", lambda token: KEY.public_key())


def token(key=KEY, **overrides):
    claims = {"sub": str(uuid.uuid4()), "email": "es256user@company.internal", "iss": f"{PROJECT}/auth/v1",
              "aud": "authenticated", "exp": int(time.time()) + 600, "aal": "aal1"}
    claims.update(overrides)
    return {"Authorization": "Bearer " + jwt.encode(claims, key, algorithm="ES256", headers={"kid": "k1"})}


def test_es256_token_accepted_and_provisions_employee(client, seed_data):
    r = client.get("/api/v1/auth/me", headers=token())
    assert r.status_code == 200 and r.json()["role"] == "employee"


def test_es256_wrong_issuer_rejected(client, seed_data):
    assert client.get("/api/v1/auth/me", headers=token(iss="https://evil.supabase.co/auth/v1")).status_code == 401


def test_es256_signed_by_other_key_rejected(client, seed_data):
    assert client.get("/api/v1/auth/me", headers=token(key=OTHER_KEY)).status_code == 401


def test_es256_expired_rejected(client, seed_data):
    r = client.get("/api/v1/auth/me", headers=token(exp=int(time.time()) - 5))
    assert r.status_code == 401 and "expired" in r.json()["detail"].lower()
