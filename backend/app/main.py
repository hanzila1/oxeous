"""
Oxeous FastAPI application - main entry point.
"""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .utils.logging import configure_logging
from .core.granite_client import GraniteClient
from .api.routes import chat, health, tiles, jobs, export, eudr

# -- Configure logging ---------------------------------------------------------
settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)

# -- Create tile cache directory -----------------------------------------------
os.makedirs(settings.tile_cache_dir, exist_ok=True)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Oxeous API",
        version=settings.version,
        description="Map-first conversational Earth observation & EUDR spatial compliance platform.",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # -- CORS ------------------------------------------------------------------
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"^https:\/\/.*\.azurestaticapps\.net$|^http:\/\/localhost(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -- Lifecycle -------------------------------------------------------------
    @app.on_event("startup")
    async def startup() -> None:
        granite = GraniteClient()
        app.state.granite = granite
        active_provider = (
            "azure" if (settings.azure_openai_api_key and settings.azure_openai_endpoint) else settings.granite_deployment
        )
        active_model = (
            settings.azure_openai_deployment
            if active_provider == "azure"
            else (settings.gemini_model if settings.granite_deployment == "gemini" else settings.granite_model)
        )
        logger.info(
            "Oxeous API v%s started | LLM=%s | model=%s",
            settings.version,
            active_provider,
            active_model,
        )

    @app.on_event("shutdown")
    async def shutdown() -> None:
        await app.state.granite.aclose()

    # -- Routes ----------------------------------------------------------------
    app.include_router(health.router)
    app.include_router(chat.router)
    app.include_router(tiles.router)
    app.include_router(jobs.router)
    app.include_router(export.router)
    app.include_router(eudr.router)

    return app


app = create_app()
