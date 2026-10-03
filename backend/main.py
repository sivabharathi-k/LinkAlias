from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from database.connection import connect_to_mongo, close_mongo_connection, get_database
from routes.alias_routes import router as alias_router
from routes.auth_routes import router as auth_router
from routes.preferences_routes import router as preferences_router

app = FastAPI(
    title="LinkAlias API",
    description="REST API backend for LinkAlias user authentication, alias management, and platform preferences",
    version="2.1.0"
)

# CORS Configuration
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Application Lifecycle Events
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

# Root Endpoint
@app.get("/", tags=["Health"])
async def root():
    return {"message": "LinkAlias API is running"}

# Health Check Endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    db = get_database()
    db_status = "connected" if db is not None else "disconnected"
    return {
        "status": "ok",
        "database": db_status
    }

# Include API Routers
app.include_router(auth_router)
app.include_router(alias_router)
app.include_router(preferences_router)

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
