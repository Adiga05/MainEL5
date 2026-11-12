"""Password hashing, JWT tokens, and role-based auth dependencies."""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.database import get_db

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ── Password helpers using standard PBKDF2-HMAC-SHA256 ────

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${key.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed or "$" not in hashed:
        # Fallback for plain comparison or legacy
        return plain == hashed
    salt, key_hex = hashed.split("$", 1)
    computed = hashlib.pbkdf2_hmac(
        'sha256',
        plain.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return secrets.compare_digest(computed.hex(), key_hex)


# ── JWT helpers using PyJWT ──────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


# ── Auth dependencies ────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Decode JWT and return User row."""
    from app.models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(roles: List[str]):
    """Enforce role-based access control."""
    def dependency(user=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: requires role in {roles}",
            )
        return user
    return dependency


def get_current_admin(user=Depends(get_current_user)):
    return require_role(["admin"])(user)


def get_current_driver(user=Depends(get_current_user)):
    return require_role(["driver", "admin"])(user)
