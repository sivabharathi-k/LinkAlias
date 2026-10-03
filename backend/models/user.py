from datetime import datetime
from typing import Dict, Any, Optional

class UserModel:
    """Helper model for user document formatting."""

    @staticmethod
    def to_dict(name: str, email: str, password_hash: str, created_at: Optional[datetime] = None) -> Dict[str, Any]:
        now = datetime.utcnow()
        return {
            "name": name.strip(),
            "email": email.lower().strip(),
            "password_hash": password_hash,
            "created_at": created_at or now
        }

    @staticmethod
    def format_doc(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Format user document for response (strictly strips password and password_hash)."""
        if not doc:
            return None
        user_id = str(doc.get("_id")) if "_id" in doc else str(doc.get("id"))
        return {
            "id": user_id,
            "name": doc.get("name"),
            "email": doc.get("email"),
            "created_at": doc.get("created_at")
        }
