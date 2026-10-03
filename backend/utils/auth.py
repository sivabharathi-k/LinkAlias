import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database.connection import get_database

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "linkalias-super-secret-key-change-this-in-production-2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

security_bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash a plain text password using bcrypt."""
    pw_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain text password against a stored bcrypt hash."""
    try:
        pw_bytes = plain_password.encode('utf-8')
        hash_bytes = password_hash.encode('utf-8')
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False

def create_access_token(user_id: str, email: str, expires_delta: timedelta = None) -> str:
    """Generate a signed JWT access token."""
    delta = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + delta
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_bearer)) -> Dict[str, Any]:
    """
    FastAPI security dependency that validates the JWT Bearer token.
    Extracts and returns the authenticated user payload.
    Raises HTTP 401 Unauthorized if missing, expired, or invalid.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")

        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"}
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    # Find user document by _id or email
    from bson import ObjectId
    user_doc = None
    try:
        if ObjectId.is_valid(user_id):
            user_doc = await db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        pass

    if not user_doc:
        user_doc = await db["users"].find_one({"email": email})

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id_str = str(user_doc.get("_id")) if "_id" in user_doc else str(user_doc.get("id"))

    return {
        "id": user_id_str,
        "name": user_doc.get("name"),
        "email": user_doc.get("email"),
        "created_at": user_doc.get("created_at")
    }
