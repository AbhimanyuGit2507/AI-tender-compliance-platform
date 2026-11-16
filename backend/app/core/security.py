"""
BidKaro — Security: JWT authentication, password hashing, and dependencies.
"""
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

_bearer = HTTPBearer(auto_error=False)


# ── Password ────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT ─────────────────────────────────────────────────────────────

class TokenPayload(BaseModel):
    sub: str          # user UUID
    tenant_id: str
    role: str
    is_anonymous: bool = False
    exp: datetime


def create_access_token(
    user_id: UUID,
    tenant_id: UUID,
    role: str,
    is_anonymous: bool = False,
    expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES,
) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "role": role,
        "is_anonymous": is_anonymous,
        "exp": expire,
    }
    return jwt.encode(payload, settings.app_secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    settings = get_settings()
    try:
        data = jwt.decode(token, settings.app_secret_key, algorithms=[ALGORITHM])
        return TokenPayload(**data)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


# ── FastAPI Dependencies ────────────────────────────────────────────

class CurrentUser(BaseModel):
    user_id: UUID
    tenant_id: UUID
    role: str
    is_anonymous: bool


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> CurrentUser:
    """
    Dependency that returns the authenticated user.
    Anonymous users get a 401; use get_optional_user for public endpoints.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = decode_token(credentials.credentials)
    return CurrentUser(
        user_id=UUID(payload.sub),
        tenant_id=UUID(payload.tenant_id),
        role=payload.role,
        is_anonymous=payload.is_anonymous,
    )


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> CurrentUser | None:
    """
    Dependency for endpoints that work for both anonymous and authenticated users.
    Returns None for unauthenticated requests.
    """
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_role(*roles: str):
    """Dependency factory: enforces that the current user has one of the given roles."""
    async def _check(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(roles)}",
            )
        return user
    return _check


async def require_admin_user(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """
    Enforces that the current user has administrative permissions.
    Permits users with role 'admin' or 'superadmin', or user matching admin email in configuration.
    """
    if user.role in ("admin", "superadmin"):
        return user

    from sqlalchemy import select
    from app.models import User
    res = await db.execute(select(User.email).where(User.id == user.user_id))
    email = res.scalar_one_or_none()

    settings = get_settings()
    admin_emails = [e.strip().lower() for e in getattr(settings, "admin_emails", "").split(",") if e.strip()]
    if email and email.strip().lower() in admin_emails:
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Administrative access required. Access denied.",
    )


# ── Google OAuth2 SSO ───────────────────────────────────────────────

class GoogleUserInfo(BaseModel):
    sub: str
    email: str
    name: str | None = None
    picture: str | None = None
    email_verified: bool = True


async def verify_google_token(credential: str) -> GoogleUserInfo:
    """
    Verify Google OAuth2 ID Token or Access Token via Google's official endpoints.
    Accepts:
      1. OpenID Connect JWT ID Token (via https://oauth2.googleapis.com/tokeninfo?id_token=...)
      2. OAuth2 Access Token (via https://www.googleapis.com/oauth2/v3/userinfo or tokeninfo?access_token=...)
    Strict production verification: No mocks, no test bypasses.
    """
    import httpx

    cred = credential.strip() if credential else ""
    if not cred:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential token cannot be empty",
        )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. If it looks like a JWT ID token (3 segments separated by dots)
            if cred.count(".") == 2:
                id_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={cred}"
                res = await client.get(id_url)
                if res.status_code == 200:
                    data = res.json()
                    email = data.get("email")
                    sub = data.get("sub")
                    if email and sub:
                        return GoogleUserInfo(
                            sub=sub,
                            email=email,
                            name=data.get("name"),
                            picture=data.get("picture"),
                            email_verified=data.get("email_verified", "true") in ("true", True),
                        )

            # 2. Try as OAuth2 Access Token via Google's official userinfo endpoint
            userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            res = await client.get(userinfo_url, headers={"Authorization": f"Bearer {cred}"})
            if res.status_code == 200:
                data = res.json()
                email = data.get("email")
                sub = data.get("sub")
                if email and sub:
                    return GoogleUserInfo(
                        sub=sub,
                        email=email,
                        name=data.get("name"),
                        picture=data.get("picture"),
                        email_verified=data.get("email_verified", True) in ("true", True),
                    )

            # 3. Fallback: try tokeninfo with access_token parameter
            token_url = f"https://oauth2.googleapis.com/tokeninfo?access_token={cred}"
            res = await client.get(token_url)
            if res.status_code == 200:
                data = res.json()
                email = data.get("email")
                sub = data.get("sub") or data.get("user_id")
                if email and sub:
                    return GoogleUserInfo(
                        sub=sub,
                        email=email,
                        name=data.get("name"),
                        picture=data.get("picture"),
                        email_verified=data.get("email_verified", "true") in ("true", True),
                    )

            # 4. Fallback: try tokeninfo with id_token even if count != 2
            if cred.count(".") != 2:
                id_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={cred}"
                res = await client.get(id_url)
                if res.status_code == 200:
                    data = res.json()
                    email = data.get("email")
                    sub = data.get("sub")
                    if email and sub:
                        return GoogleUserInfo(
                            sub=sub,
                            email=email,
                            name=data.get("name"),
                            picture=data.get("picture"),
                            email_verified=data.get("email_verified", "true") in ("true", True),
                        )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Google authentication credentials. Please sign in again.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {str(e)}",
        )

