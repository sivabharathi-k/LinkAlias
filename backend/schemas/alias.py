from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class AliasCreate(BaseModel):
    url: str = Field(..., description="Target original URL (must be valid HTTP/HTTPS)")
    alias: str = Field(..., min_length=1, max_length=255, description="Custom alias name")

    @field_validator("url")
    def validate_url(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            raise ValueError("URL cannot be empty")
        trimmed = v.strip()
        if not (trimmed.startswith("http://") or trimmed.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return trimmed

    @field_validator("alias")
    def validate_alias(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Alias cannot be empty")
        return v.strip()

class AliasUpdate(BaseModel):
    url: str = Field(..., description="Target original URL to update")
    alias: str = Field(..., min_length=1, max_length=255, description="New custom alias name")

    @field_validator("url")
    def validate_url(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            raise ValueError("URL cannot be empty")
        trimmed = v.strip()
        if not (trimmed.startswith("http://") or trimmed.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return trimmed

    @field_validator("alias")
    def validate_alias(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Alias cannot be empty")
        return v.strip()

class AliasDelete(BaseModel):
    url: str = Field(..., description="Target original URL to delete")

    @field_validator("url")
    def validate_url(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            raise ValueError("URL cannot be empty")
        trimmed = v.strip()
        if not (trimmed.startswith("http://") or trimmed.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return trimmed

class AliasResponse(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    url: str
    alias: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
