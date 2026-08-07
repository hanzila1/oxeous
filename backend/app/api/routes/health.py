"""GET /health — dependency health check."""
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

    return HealthResponse(
        status=overall,
        granite=granite_ok,
        stac=stac_ok,
        cache=cache_ok,
        version=settings.version,
    )
