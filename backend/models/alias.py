from datetime import datetime
from typing import Dict, Any, Optional

class AliasModel:
    """Helper model for constructing and formatting user-owned alias MongoDB documents."""

    @staticmethod
    def to_dict(user_id: str, url: str, alias: str, created_at: Optional[datetime] = None, updated_at: Optional[datetime] = None) -> Dict[str, Any]:
        now = datetime.utcnow()
        return {
            "user_id": str(user_id),
            "url": url,
            "alias": alias,
            "created_at": created_at or now,
            "updated_at": updated_at or now
        }

    @staticmethod
    def format_doc(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Strip internal MongoDB fields and format clean JSON payload."""
        if not doc:
            return None
        doc_id = str(doc.get("_id")) if "_id" in doc else str(doc.get("id"))
        return {
            "id": doc_id,
            "user_id": str(doc.get("user_id")),
            "url": doc.get("url"),
            "alias": doc.get("alias"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at")
        }
