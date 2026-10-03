from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime

from database.connection import get_database
from schemas.preferences import PlatformPreferencesUpdate, PlatformPreferencesResponse, DEFAULT_ENABLED_PLATFORMS
from models.preferences import PlatformPreferencesModel
from utils.auth import get_current_user

router = APIRouter(prefix="/preferences", tags=["Preferences"])

def get_preferences_collection():
    db = get_database()
    if db is not None:
        return db["platform_preferences"]
    return None

@router.get("/platforms", response_model=PlatformPreferencesResponse)
async def get_platform_preferences(current_user: dict = Depends(get_current_user)):
    """
    Retrieve platform preferences for the authenticated user.
    Defaults to enabling WhatsApp, Telegram, and Discord if no record exists yet.
    """
    user_id = current_user["id"]
    collection = get_preferences_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    doc = await collection.find_one({"user_id": user_id})
    return PlatformPreferencesModel.format_doc(user_id, doc)


@router.put("/platforms", response_model=PlatformPreferencesResponse)
async def update_platform_preferences(
    payload: PlatformPreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update platform preferences for the authenticated user.
    """
    user_id = current_user["id"]
    collection = get_preferences_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    now = datetime.utcnow()
    result = await collection.find_one_and_update(
        {"user_id": user_id},
        {"$set": {
            "enabled_platforms": payload.enabled_platforms,
            "updated_at": now
        }},
        upsert=True,
        return_document=True
    )

    return PlatformPreferencesModel.format_doc(user_id, result)
