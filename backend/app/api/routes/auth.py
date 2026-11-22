"""
Oxeous Authentication Router (/auth/register, /auth/login, /auth/me)
====================================================================
Lightweight, zero-extra-dependency enterprise account system backed by SQLite,
PBKDF2-SHA256 salted password hashes (260k iterations), and HMAC-SHA256 signed
JWT-compatible Bearer tokens (7-day expiry).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from ...config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

TOKEN_TTL_SECONDS = 7 * 24 * 3600  # 7 days
PBKDF2_ITERATIONS = 260_000
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# -- SQLite persistence -------------------------------------------------------

def _db_path() -> str:
    settings = get_settings()
    if settings.auth_db_path:
        os.makedirs(os.path.dirname(os.path.abspath(settings.auth_db_path)), exist_ok=True)
        return settings.auth_db_path
    os.makedirs(settings.tile_cache_dir, exist_ok=True)
    return os.path.join(settings.tile_cache_dir, "oxeous_users.db")


@contextmanager
def _get_conn() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(_db_path(), timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                organization TEXT NOT NULL DEFAULT '',
                role TEXT NOT NULL DEFAULT 'operator',
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
        yield conn
    finally:
        conn.close()


# -- Password hashing (PBKDF2-HMAC-SHA256) -----------------------------------

def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${base64.urlsafe_b64encode(dk).decode('ascii')}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, iter_str, salt, b64_hash = stored.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iter_str),
        )
        computed = base64.urlsafe_b64encode(dk).decode("ascii")
        return hmac.compare_digest(computed, b64_hash)
    except Exception:
        return False


# -- Signed Bearer Tokens (HS256 JWT format) ---------------------------------

def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    pad = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _create_token(user: dict[str, Any]) -> str:
    secret = get_settings().auth_secret_key.encode("utf-8")
    now = int(time.time())
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode("utf-8"))
    payload = _b64url_encode(
        json.dumps(
            {
                "sub": user["id"],
                "email": user["email"],
                "name": user["full_name"],
                "org": user["organization"],
                "role": user["role"],
                "iat": now,
                "exp": now + TOKEN_TTL_SECONDS,
            },
            separators=(",", ":"),
        ).encode("utf-8")
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    sig = _b64url_encode(hmac.new(secret, signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def _decode_token(token: str) -> dict[str, Any]:
    secret = get_settings().auth_secret_key.encode("utf-8")
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token")
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = _b64url_encode(hmac.new(secret, signing_input, hashlib.sha256).digest())
    if not hmac.compare_digest(sig_b64, expected_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed session token")
    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")
    return payload


def _row_to_public_user(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "email": row["email"],
        "full_name": row["full_name"],
        "organization": row["organization"],
        "role": row["role"],
        "created_at": row["created_at"],
    }


def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    claims = _decode_token(token)
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (claims.get("sub"),)).fetchone()
    if row is None:
        # Container may have restarted with ephemeral storage; trust valid cryptographically signed claims
        return {
            "id": claims.get("sub", ""),
            "email": claims.get("email", ""),
            "full_name": claims.get("name", "Oxeous Operator"),
            "organization": claims.get("org", ""),
            "role": claims.get("role", "operator"),
            "created_at": "",
        }
    return _row_to_public_user(row)


# -- Schemas ------------------------------------------------------------------

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=200)
    password: str = Field(..., min_length=8, max_length=128)
    organization: str = Field(default="", max_length=160)
    access_code: str = Field(..., min_length=3, max_length=64)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=200)
    password: str = Field(..., min_length=1, max_length=128)


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    expires_in: int = TOKEN_TTL_SECONDS
    user: dict[str, Any]


# -- Endpoints ----------------------------------------------------------------

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest) -> AuthResponse:
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid work email address.")

    valid_codes = [
        c.strip().upper()
        for c in get_settings().access_invite_codes.split(",")
        if c.strip()
    ]
    supplied_code = body.access_code.strip().upper()
    if not any(hmac.compare_digest(supplied_code, vc) for vc in valid_codes):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid enterprise access code. Request a B2B pilot invite to unlock registration.",
        )

    full_name = body.full_name.strip()
    organization = body.organization.strip()
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    pw_hash = _hash_password(body.password)

    with _get_conn() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Please sign in.",
            )
        conn.execute(
            """
            INSERT INTO users (id, email, full_name, organization, role, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, email, full_name, organization, "operator", pw_hash, created_at),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    user = _row_to_public_user(row)
    return AuthResponse(token=_create_token(user), user=user)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest) -> AuthResponse:
    email = body.email.strip().lower()
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if row is None or not _verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user = _row_to_public_user(row)
    return AuthResponse(token=_create_token(user), user=user)


@router.get("/me")
async def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"authenticated": True, "user": user}
