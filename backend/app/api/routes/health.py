"""GET /health - dependency health check."""
from fastapi import APIRouter, Request
from ...models.responses import HealthResponse
from ...config import get_settings
from ...cache.store import get_cache

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings = get_settings()
    cache = get_cache()

    # Cloud LLM reachability (Foundry / Gemini / Ollama)
    granite_ok = bool(
        (settings.azure_openai_endpoint.strip() and settings.azure_openai_api_key.strip())
        or settings.gemini_api_key.strip()
    )
    if not granite_ok:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{settings.granite_ollama_url}/api/tags")
                granite_ok = r.status_code == 200
        except Exception:
            pass

    # Planetary Computer STAC reachability
    stac_ok = False
    try:
        import httpx
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get("https://planetarycomputer.microsoft.com/api/stac/v1")
            stac_ok = r.status_code == 200
    except Exception:
        pass

    # Google Earth Engine readiness
    gee_ok = False
    try:
        from ...tools.eudr.gee_tile_server import _init as _gee_init
        gee_ok = bool(_gee_init())
    except Exception:
        pass

    cache_ok = cache.is_writable()
    overall = "ok" if (granite_ok and stac_ok and cache_ok and gee_ok) else "degraded"

    # Cloud Telemetry Metadata
    cloud_telemetry = {
        "planetary_stac": {
            "name": "Planetary Computer STAC",
            "status": "online" if stac_ok else "degraded",
            "resolution": "10m Sentinel-2 L2A",
            "region": "West Europe",
        },
        "eurlex_rag": {
            "name": "EUR-Lex Primary Index",
            "status": "online" if (settings.azure_search_endpoint and settings.azure_search_api_key) else "local",
            "documents": 114,
            "region": "France Central",
            "tier": "Basic (Dedicated)",
        },
        "foundry_llm": {
            "name": "Microsoft Foundry LLM",
            "status": "online" if (settings.azure_openai_endpoint and settings.azure_openai_api_key) else "fallback",
            "model": settings.azure_openai_deployment or "gpt-5.4-mini",
            "region": "Sweden Central",
            "zone": "EUR Data Zone",
        },
        "gee_eo": {
            "name": "Multi-Sensor EO Tile Engine",
            "status": "online" if gee_ok else "offline",
            "layers": 9,
        },
    }

    return HealthResponse(
        status=overall,
        granite=granite_ok,
        stac=stac_ok,
        cache=cache_ok,
        version=settings.version,
        cloud_telemetry=cloud_telemetry,
    )
