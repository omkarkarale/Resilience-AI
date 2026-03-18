"""JWT authentication and password hashing utilities."""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from rbac_models import UserInDB, UserRole

# ─── Config ───
SECRET_KEY = "resilience-ai-rbac-secret-key-change-in-production"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# ─── Password Hashing (PBKDF2 — no external deps) ───
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100_000)
    return f"{salt}${h.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        salt, stored_hash = hashed.split('$', 1)
        h = hashlib.pbkdf2_hmac('sha256', plain.encode(), salt.encode(), 100_000)
        return h.hex() == stored_hash
    except Exception:
        return False


# ─── JWT ───

def create_token(user_id: str, role: str, department: Optional[str] = None) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "role": role,
        "department": department,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    # ── Bypassing for simplified "No Verification" mode ──
    # If the token from frontend is an email or our mock admin token, return a bypass payload.
    if "@" in token or token == "mock-token-admin":
        from seed_store import get_user_by_email, get_user
        # Try to find user by email (our new simplified token)
        user = get_user_by_email(token) or get_user(token)
        if user:
            return {
                "sub": user.id,
                "role": user.role.value,
                "department": user.department.value if user.department else None,
                "bypass": True
            }
        # Fallback for unknown emails (per user request: "no verification")
        return {
            "sub": "unknown",
            "role": "admin" if "admin" in token else "operator",
            "department": "medical" if "medical" in token else None,
            "bypass": True
        }

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ─── FastAPI Dependencies ───

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[UserInDB]:
    """Extract and validate user from Bearer token. Returns None if no token."""
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    from seed_store import get_user
    user = get_user(payload["sub"])
    
    # Handle bypass/mock tokens for "No Verification" mode
    if user is None and payload.get("bypass"):
        return UserInDB(
            id=payload["sub"],
            name=payload["sub"].split("@")[0].title() if "@" in payload["sub"] else "Mock User",
            email=payload["sub"] if "@" in payload["sub"] else "mock@resilience.ai",
            hashed_password="",
            role=UserRole(payload["role"]),
            department=payload.get("department"),
            is_active=True,
            created_at=datetime.utcnow().isoformat()
        )
        
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    return user


async def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserInDB:
    """Require a valid authenticated user."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_token(credentials.credentials)
    from seed_store import get_user
    user = get_user(payload["sub"])
    
    # Handle bypass/mock tokens for "No Verification" mode
    if user is None and payload.get("bypass"):
        return UserInDB(
            id=payload["sub"],
            name=payload["sub"].split("@")[0].title() if "@" in payload["sub"] else "Mock User",
            email=payload["sub"] if "@" in payload["sub"] else "mock@resilience.ai",
            hashed_password="",
            role=UserRole(payload["role"]),
            department=payload.get("department"),
            is_active=True,
            created_at=datetime.utcnow().isoformat()
        )

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    return user


def require_role(*roles: UserRole):
    """Dependency factory: require authenticated user with one of the given roles."""
    async def dependency(user: UserInDB = Depends(require_auth)) -> UserInDB:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(r.value for r in roles)}",
            )
        return user
    return dependency
