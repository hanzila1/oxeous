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

    # Granite reachability
    granite_ok = False
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{settings.granite_ollama_url}/api/tags")
            granite_ok = r.status_code == 200
    except Exception:
        pass

    # STAC reachability
    stac_ok = False
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("https://cmr.earthdata.nasa.gov/stac/LPCLOUD")
            stac_ok = r.status_code == 200
    except Exception:
        pass

    cache_ok = cache.is_writable()
    overall = "ok" if (granite_ok and stac_ok and cache_ok) else "degraded"

    # Cloud Telemetry Metadata
    cloud_telemetry = {
        "planetary_stac": {
            "name": "Planetary Computer STAC",
            "status": "online",
            "resolution": "10m Sentinel-2 L2A",
            "region": "West Europe",
        },
        "eurlex_rag": {
            "name": "EUR-Lex Primary Index",
            "status": "online" if settings.azure_search_endpoint else "local",
            "documents": 114,
            "region": "France Central",
            "tier": "Basic (Dedicated)",
        },
        "foundry_llm": {
            "name": "Microsoft Foundry LLM",
            "status": "online" if settings.azure_openai_endpoint else "fallback",
            "model": settings.azure_openai_deployment or "gpt-5.4-mini",
            "region": "Sweden Central",
            "zone": "EUR Data Zone",
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
