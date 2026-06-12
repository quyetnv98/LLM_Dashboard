from fastapi import APIRouter

from app.api.v1.endpoints import (
    deleting,
    process,
    search,
    statics,
    tagging,
    user_model,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(search.router)
api_router.include_router(statics.router)
api_router.include_router(user_model.router)
api_router.include_router(process.router)
api_router.include_router(tagging.router)
api_router.include_router(deleting.router)
