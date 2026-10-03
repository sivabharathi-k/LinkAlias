from datetime import datetime
from typing import Dict, Any, List, Optional
from schemas.preferences import DEFAULT_ENABLED_PLATFORMS

class PlatformPreferencesModel:
    """Helper model for constructing and formatting user-specific platform preferences MongoDB documents."""

    @staticmethod
    def to_dict(user_id: str, enabled_platforms: List[str], updated_at: Optional[datetime] = None) -> Dict[str, Any]:
        return {
            "user_id": str(user_id),
            "enabled_platforms": enabled_platforms,
            "updated_at": updated_at or datetime.utcnow()
        }

    @staticmethod
    def format_doc(user_id: str, doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Format preferences document or return defaults if record does not exist yet."""
        if not doc:
            return {
                "user_id": str(user_id),
                "enabled_platforms": DEFAULT_ENABLED_PLATFORMS
            }
        return {
            "user_id": str(doc.get("user_id", user_id)),
            "enabled_platforms": doc.get("enabled_platforms", DEFAULT_ENABLED_PLATFORMS)
        }
