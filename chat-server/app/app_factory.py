from __future__ import annotations
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes.health import router as health_router
from app.api.routes.chat import router as chat_router
from app.core.settings import settings
from app.db.session import init_pool, close_pool


def create_api_app() -> FastAPI:
    api = FastAPI(title="Python Chat Server")
    api.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.cors_origin == "*" else [settings.cors_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    os.makedirs(settings.upload_dir, exist_ok=True)
    api.mount("/uploads/chat", StaticFiles(directory=settings.upload_dir), name="chat-uploads")
    api.include_router(health_router)
    api.include_router(chat_router)

    @api.on_event("startup")
    async def on_startup():
        await init_pool()

    @api.on_event("shutdown")
    async def on_shutdown():
        await close_pool()

    return api
