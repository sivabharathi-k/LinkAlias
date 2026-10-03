from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List
from datetime import datetime

from database.connection import get_aliases_collection
from schemas.alias import AliasCreate, AliasUpdate, AliasDelete, AliasResponse
from models.alias import AliasModel
from utils.auth import get_current_user

router = APIRouter(prefix="/aliases", tags=["Aliases"])

@router.post("", response_model=AliasResponse, status_code=status.HTTP_201_CREATED)
async def create_alias(
    payload: AliasCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new link alias record owned by the authenticated user.
    Returns HTTP 400 Bad Request if an alias for the given URL already exists for this user.
    """
    user_id = current_user["id"]
    collection = get_aliases_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    # Check for existing duplicate record for THIS user
    existing = await collection.find_one({"user_id": user_id, "url": payload.url})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Alias for URL '{payload.url}' already exists for your account. Use PUT /aliases to update."
        )

    now = datetime.utcnow()
    doc = AliasModel.to_dict(
        user_id=user_id,
        url=payload.url,
        alias=payload.alias,
        created_at=now,
        updated_at=now
    )
    await collection.insert_one(doc)

    return AliasModel.format_doc(doc)


@router.get("", response_model=List[AliasResponse])
async def get_all_aliases(
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve all link aliases owned by the authenticated user.
    """
    user_id = current_user["id"]
    collection = get_aliases_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    cursor = collection.find({"user_id": user_id})
    aliases = []
    async for doc in cursor:
        aliases.append(AliasModel.format_doc(doc))

    return aliases


@router.get("/by-url", response_model=AliasResponse)
async def get_alias_by_url(
    url: str = Query(..., description="Target original URL to look up"),
    current_user: dict = Depends(get_current_user)
):
    """
    Look up a single link alias by its original URL for the authenticated user.
    """
    if not url or not url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query parameter 'url' cannot be empty"
        )

    user_id = current_user["id"]
    normalized_url = url.strip()
    collection = get_aliases_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    doc = await collection.find_one({"user_id": user_id, "url": normalized_url})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alias not found"
        )

    return AliasModel.format_doc(doc)


@router.put("", response_model=AliasResponse)
async def update_alias(
    payload: AliasUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an existing link alias by URL owned by the authenticated user.
    """
    user_id = current_user["id"]
    collection = get_aliases_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    now = datetime.utcnow()
    result = await collection.find_one_and_update(
        {"user_id": user_id, "url": payload.url},
        {"$set": {"alias": payload.alias, "updated_at": now}},
        return_document=True
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alias not found"
        )

    return AliasModel.format_doc(result)


@router.delete("")
async def delete_alias(
    payload: AliasDelete,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an alias record owned by the authenticated user.
    """
    user_id = current_user["id"]
    collection = get_aliases_collection()
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    result = await collection.delete_one({"user_id": user_id, "url": payload.url})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alias not found"
        )

    return {
        "message": "Alias deleted successfully",
        "url": payload.url
    }
