from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Full name of user")
    email: EmailStr = Field(..., description="Valid user email address")
    password: str = Field(..., min_length=6, max_length=100, description="Password (minimum 6 characters)")

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("password")
    def validate_password(cls, v: str) -> str:
        if not v or len(v.strip()) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v.strip()

class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: Optional[datetime] = None
