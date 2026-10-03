from pydantic import BaseModel, Field, field_validator
from typing import List

SUPPORTED_PLATFORMS = {"whatsapp", "telegram", "discord", "facebook", "instagram"}
DEFAULT_ENABLED_PLATFORMS = ["whatsapp", "telegram", "discord"]

class PlatformPreferencesUpdate(BaseModel):
    enabled_platforms: List[str] = Field(..., description="List of enabled platform keys (whatsapp, telegram, discord, facebook, instagram)")

    @field_validator("enabled_platforms")
    def validate_platforms(cls, v: List[str]) -> List[str]:
        if not isinstance(v, list):
            raise ValueError("enabled_platforms must be a list of strings")
        cleaned = [p.lower().strip() for p in v if isinstance(p, str)]
        invalid = [p for p in cleaned if p not in SUPPORTED_PLATFORMS]
        if invalid:
            raise ValueError(f"Invalid platform(s): {', '.join(invalid)}. Supported platforms: {', '.join(sorted(SUPPORTED_PLATFORMS))}")
        return list(set(cleaned))

class PlatformPreferencesResponse(BaseModel):
    user_id: str
    enabled_platforms: List[str]
