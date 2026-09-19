"""
Authentication and JWT security module for AarogyaQ.

Provides standard library HMAC-SHA256 JWT token generation, verification,
credential validation, and FastAPI dependency injection for role-based access control.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any

from fastapi import Request, HTTPException, status, Depends
from pydantic import BaseModel

SECRET_KEY = "aarogyaq-clinical-cdss-secure-jwt-hmac-sha256-key"
ALGORITHM = "HS256"
DEFAULT_EXPIRE_SECONDS = 12 * 3600  # 12 hours

# Verified clinical accounts for demonstration & ER operations
CLINICAL_USERS: Dict[str, Dict[str, str]] = {
    "nurse": {
        "username": "nurse",
        "password": "nurse123",
        "name": "Nurse Rahul",
        "role": "Nurse",
        "email": "nurse@aarogyaq.gov.in",
    },
    "doctor": {
        "username": "doctor",
        "password": "doctor123",
        "name": "Dr. Arvind Swamy",
        "role": "Doctor",
        "email": "doctor@aarogyaq.gov.in",
    },
    "admin": {
        "username": "admin",
        "password": "admin123",
        "name": "SysAdmin",
        "role": "Administrator",
        "email": "admin@aarogyaq.gov.in",
    },
}


class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    name: str
    email: str


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def create_access_token(claims: Dict[str, Any], expires_in: int = DEFAULT_EXPIRE_SECONDS) -> str:
    """Generate an HS256-signed JWT token using standard library HMAC-SHA256."""
    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = dict(claims)
    now = int(time.time())
    payload["iat"] = now
    payload["exp"] = now + expires_in

    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    header_b64 = _b64url_encode(header_bytes)
    payload_b64 = _b64url_encode(payload_bytes)

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and verify an HS256-signed JWT token."""
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT token structure")

    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(sig_b64)

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("JWT signature verification failed")

    payload_json = _b64url_decode(payload_b64).decode("utf-8")
    payload = json.loads(payload_json)

    if "exp" in payload and int(payload["exp"]) < int(time.time()):
        raise ValueError("JWT token has expired")

    return payload


def authenticate_user(username: str, password: str, expected_role: Optional[str] = None) -> Optional[Dict[str, str]]:
    """Validate user credentials against registered clinical users."""
    user = CLINICAL_USERS.get(username.lower().strip())
    if not user:
        return None
    if user["password"] != password:
        return None
    if expected_role and user["role"].lower() != expected_role.lower():
        # User specified a role mismatch
        return None
    return user


async def get_current_user(request: Request) -> Dict[str, Any]:
    """FastAPI dependency to extract and validate the Bearer token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Bearer token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = decode_access_token(token)
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
