from fastapi import APIRouter, HTTPException, Depends, status
from database.connection import get_users_collection
from schemas.user import UserRegister, UserLogin, TokenResponse, UserResponse
from models.user import UserModel
from utils.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegister):
    """
    Register a new user account.
    Hashes the password securely with bcrypt and stores the user in MongoDB.
    Returns HTTP 409 Conflict if email is already registered.
    """
    collection = get_users_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    email_lower = payload.email.lower().strip()

    # Check for existing email registration
    existing_user = await collection.find_one({"email": email_lower})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Hash password securely
    hashed_pw = hash_password(payload.password)

    # Build user document
    user_doc = UserModel.to_dict(
        name=payload.name,
        email=email_lower,
        password_hash=hashed_pw
    )

    await collection.insert_one(user_doc)

    return {"message": "User registered successfully"}


@router.post("/login", response_model=TokenResponse)
async def login_user(payload: UserLogin):
    """
    Authenticate user credentials and issue a signed JWT access token.
    Returns HTTP 401 Unauthorized if email or password is invalid.
    """
    collection = get_users_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    email_lower = payload.email.lower().strip()

    # Find user document
    user_doc = await collection.find_one({"email": email_lower})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Verify password hash
    stored_hash = user_doc.get("password_hash", "")
    if not verify_password(payload.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Extract user ID
    user_id = str(user_doc.get("_id")) if "_id" in user_doc else str(user_doc.get("id"))

    # Issue JWT token
    access_token = create_access_token(user_id=user_id, email=email_lower)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get profile details for the currently authenticated user.
    Requires a valid JWT Bearer token. Never returns password or password_hash.
    """
    return current_user
