import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables from .env file
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "linkalias")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def create_indexes():
    """Create MongoDB unique indexes for users, user-specific aliases, and platform preferences."""
    try:
        if db_instance.db is not None:
            # 1. Unique index on users.email
            await db_instance.db["users"].create_index("email", unique=True)

            # 2. Compound unique index on aliases.(user_id, url)
            await db_instance.db["aliases"].create_index([("user_id", 1), ("url", 1)], unique=True)

            # 3. Index on aliases.user_id for efficient queries
            await db_instance.db["aliases"].create_index("user_id")

            # 4. Unique index on platform_preferences.user_id
            await db_instance.db["platform_preferences"].create_index("user_id", unique=True)

            print("[LinkAlias Backend] MongoDB indexes created / verified successfully.")
    except Exception as e:
        print(f"[LinkAlias Backend] Index creation notice: {e}")

async def connect_to_mongo():
    """Initialize MongoDB connection on application startup."""
    try:
        db_instance.client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        db_instance.db = db_instance.client[DATABASE_NAME]
        print(f"[LinkAlias Backend] Connected to MongoDB database: '{DATABASE_NAME}' at {MONGODB_URI}")
        await create_indexes()
    except Exception as e:
        print(f"[LinkAlias Backend] Warning: Could not connect to MongoDB: {e}")

async def close_mongo_connection():
    """Close MongoDB connection on application shutdown."""
    if db_instance.client:
        db_instance.client.close()
        print("[LinkAlias Backend] Closed MongoDB connection.")

def get_database():
    """Get reference to active MongoDB database instance."""
    return db_instance.db

def get_aliases_collection():
    """Get reference to 'aliases' collection."""
    if db_instance.db is not None:
        return db_instance.db["aliases"]
    return None

def get_users_collection():
    """Get reference to 'users' collection."""
    if db_instance.db is not None:
        return db_instance.db["users"]
    return None
