"""
Oxeous Tile Server & Auto-Healing GEE Tile Proxy
================================================
1. GET /tiles/{request_id}/overlay.png & /tiles/{request_id}/{z}/{x}/{y}.png
   Serves locally cached PNG overlays.
2. GET /tiles/gee/{spec_id}/{z}/{x}/{y}.png
   Enterprise auto-healing GEE tile proxy:
   - Exposes permanent, stable Oxeous tile URLs to MapLibre instead of ephemeral
     Google Earth Engine getMapId() URLs (which expire with 401 after ~1-2h).
   - Caches rendered PNG tiles in DiskCache/RAM for instant repeat loads.
   - On 401/403/404 or TTL expiry (>45 min), acquires a per-layer single-flight
     asyncio.Lock so only ONE worker re-mints the GEE getMapId() token while all
     concurrent tile requests wait cleanly and succeed without stampeding GEE.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse

from ...cache.store import get_cache
from ...config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tiles"])

# 45-min proactive refresh before GEE's ~1-2h token expiration
_GEE_SPEC_TTL_SECONDS = 45 * 60
_TILE_PNG_CACHE_TTL_SECONDS = 6 * 3600

# In-memory registry (backed by DiskCache for persistence) + single-flight refresh locks
_TILE_SPECS: dict[str, dict[str, Any]] = {}
_REFRESH_LOCKS: dict[str, asyncio.Lock] = {}
_HTTP_CLIENT: httpx.AsyncClient | None = None


def _get_http_client() -> httpx.AsyncClient:
    global _HTTP_CLIENT
    if _HTTP_CLIENT is None or _HTTP_CLIENT.is_closed:
        _HTTP_CLIENT = httpx.AsyncClient(
            timeout=httpx.Timeout(20.0, connect=8.0),
            limits=httpx.Limits(max_connections=80, max_keepalive_connections=30),
        )
    return _HTTP_CLIENT


def _get_lock(spec_id: str) -> asyncio.Lock:
    lock = _REFRESH_LOCKS.get(spec_id)
    if lock is None:
        lock = asyncio.Lock()
        _REFRESH_LOCKS[spec_id] = lock
    return lock


def get_public_base_url(request: Request) -> str:
    """Resolve public scheme + host safely behind Azure Container Apps / reverse proxies."""
    proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "http").split(",")[0].strip()
    host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc).split(",")[0].strip()
    return f"{proto}://{host}".rstrip("/")


def register_gee_tile_spec(
    *,
    layer_key: str,
    upstream_url: str,
    geometry: dict[str, Any] | None,
    bbox: tuple[float, float, float, float] | None,
    commodity: str,
    public_base_url: str,
) -> str:
    """
    Register a GEE layer specification and return a permanent auto-healing proxy URL:
      {public_base_url}/tiles/gee/{spec_id}/{z}/{x}/{y}.png
    """
    if not upstream_url or "{z}" not in upstream_url:
        return upstream_url

    geom_json = json.dumps(geometry, sort_keys=True) if geometry else str(bbox)
    raw_key = f"gee_spec_v1:{layer_key}:{commodity.lower()}:{geom_json}"
    spec_id = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:18]

    record = {
        "spec_id": spec_id,
        "layer_key": layer_key,
        "commodity": commodity,
        "geometry": geometry,
        "bbox": list(bbox) if bbox else None,
        "upstream_url": upstream_url,
        "minted_at": time.time(),
    }
    _TILE_SPECS[spec_id] = record
    try:
        get_cache().set(f"gee_tile_spec:{spec_id}", record, ttl=30 * 24 * 3600)
    except Exception:
        pass

    return f"{public_base_url}/tiles/gee/{spec_id}/{{z}}/{{x}}/{{y}}.png"


def _load_spec(spec_id: str) -> dict[str, Any] | None:
    spec = _TILE_SPECS.get(spec_id)
    if spec is not None:
        return spec
    try:
        cached = get_cache().get(f"gee_tile_spec:{spec_id}")
        if isinstance(cached, dict):
            _TILE_SPECS[spec_id] = cached
            return cached
    except Exception:
        pass
    return None


def _remint_layer_url_sync(spec: dict[str, Any]) -> str | None:
    """Re-mint a fresh GEE XYZ tile URL for the exact layer_key & geometry."""
    from ...tools.eudr import gee_tile_server as gts

    layer_key = str(spec.get("layer_key", "")).lower()
    geometry = spec.get("geometry")
    bbox_list = spec.get("bbox")
    bbox = tuple(bbox_list) if isinstance(bbox_list, (list, tuple)) and len(bbox_list) == 4 else None
    commodity = str(spec.get("commodity") or "coffee")

    res: dict[str, Any] = {}
    if "pwri" in layer_key or "intersection" in layer_key:
        res = gts.get_pwri_intersection_tiles(bbox=bbox, geometry=geometry)
    elif "treecover" in layer_key:
        res = gts.get_hansen_treecover_tiles(bbox=bbox, geometry=geometry)
    elif "hansen" in layer_key or "loss" in layer_key:
        res = gts.get_hansen_loss_tiles(bbox=bbox, geometry=geometry)
    elif "jrc" in layer_key or "gfc2020" in layer_key:
        res = gts.get_jrc_gfc2020_tiles(bbox=bbox, geometry=geometry)
    elif "radd" in layer_key or "radar" in layer_key:
        res = gts.get_radd_alerts_tiles(bbox=bbox, geometry=geometry)
    elif "natural" in layer_key:
        res = gts.get_natural_forest_tiles(bbox=bbox, geometry=geometry)
    elif "typology" in layer_key:
        res = gts.get_forest_typology_tiles(bbox=bbox, geometry=geometry)
    elif "driver" in layer_key:
        res = gts.get_wri_drivers_tiles(bbox=bbox, geometry=geometry)
    elif "worldcover" in layer_key or "esa" in layer_key:
        res = gts.get_esa_worldcover_tiles(bbox=bbox, geometry=geometry)
    elif "protected" in layer_key or "wdpa" in layer_key:
        res = gts.get_protected_areas_tiles(bbox=bbox, geometry=geometry)
    elif "commodity" in layer_key:
        res = gts.get_commodity_tiles(commodity, bbox=bbox, geometry=geometry)
    else:
        res = gts.get_pwri_intersection_tiles(bbox=bbox, geometry=geometry)

    return res.get("tile_url") if res.get("available") else None


async def _ensure_fresh_upstream_url(spec_id: str, force: bool = False) -> str | None:
    spec = _load_spec(spec_id)
    if spec is None:
        return None

    now = time.time()
    if not force and (now - float(spec.get("minted_at", 0))) < _GEE_SPEC_TTL_SECONDS and spec.get("upstream_url"):
        return str(spec["upstream_url"])

    lock = _get_lock(spec_id)
    async with lock:
        # Double-check after acquiring single-flight lock (another coroutine may have already refreshed it!)
        spec = _load_spec(spec_id)
        if spec is None:
            return None
        if not force and (time.time() - float(spec.get("minted_at", 0))) < _GEE_SPEC_TTL_SECONDS and spec.get("upstream_url"):
            return str(spec["upstream_url"])
        if force and (time.time() - float(spec.get("minted_at", 0))) < 15.0 and spec.get("upstream_url"):
            # Just refreshed seconds ago by a sibling tile request
            return str(spec["upstream_url"])

        logger.info("Auto-healing GEE tile token for spec=%s (%s)", spec_id, spec.get("layer_key"))
        fresh_url = await asyncio.to_thread(_remint_layer_url_sync, spec)
        if fresh_url:
            spec["upstream_url"] = fresh_url
            spec["minted_at"] = time.time()
            _TILE_SPECS[spec_id] = spec
            try:
                get_cache().set(f"gee_tile_spec:{spec_id}", spec, ttl=30 * 24 * 3600)
            except Exception:
                pass
            return fresh_url
        return spec.get("upstream_url")


@router.get("/tiles/gee/{spec_id}/{z}/{x}/{y}.png")
async def proxy_gee_tile(spec_id: str, z: int, x: int, y: int) -> Response:
    """
    Auto-healing XYZ tile endpoint for MapLibre.
    Transparently refreshes expired GEE map IDs (401/403) via single-flight locking
    and caches rendered PNG tiles for instant zoom/pan performance.
    """
    tile_cache_key = f"gee_png:{spec_id}:{z}:{x}:{y}"
    cache = get_cache()
    cached_png = cache.get(tile_cache_key)
    if isinstance(cached_png, (bytes, bytearray)) and len(cached_png) > 0:
        return Response(
            content=bytes(cached_png),
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=21600",
                "X-Oxeous-Tile-Cache": "HIT",
            },
        )

    upstream_tmpl = await _ensure_fresh_upstream_url(spec_id, force=False)
    if not upstream_tmpl:
        raise HTTPException(status_code=404, detail="Unknown tile layer specification")

    client = _get_http_client()
    target_url = upstream_tmpl.replace("{z}", str(z)).replace("{x}", str(x)).replace("{y}", str(y))

    try:
        upstream_res = await client.get(target_url)
    except httpx.RequestError as exc:
        logger.warning("Upstream GEE tile fetch error: %s", exc)
        raise HTTPException(status_code=502, detail="Upstream satellite tile server unreachable")

    # Auto-heal on GEE token expiry (401 / 403 / 404)
    if upstream_res.status_code in (401, 403, 404):
        refreshed_tmpl = await _ensure_fresh_upstream_url(spec_id, force=True)
        if refreshed_tmpl and refreshed_tmpl != upstream_tmpl:
            retry_url = refreshed_tmpl.replace("{z}", str(z)).replace("{x}", str(x)).replace("{y}", str(y))
            try:
                upstream_res = await client.get(retry_url)
            except httpx.RequestError as exc:
                raise HTTPException(status_code=502, detail=f"Upstream tile retry failed: {exc}")

    if upstream_res.status_code != 200:
        raise HTTPException(status_code=upstream_res.status_code, detail="Upstream satellite tile unavailable")

    png_bytes = upstream_res.content
    try:
        cache.set(tile_cache_key, png_bytes, ttl=_TILE_PNG_CACHE_TTL_SECONDS)
    except Exception:
        pass

    return Response(
        content=png_bytes,
        media_type=upstream_res.headers.get("content-type", "image/png"),
        headers={
            "Cache-Control": "public, max-age=21600",
            "X-Oxeous-Tile-Cache": "MISS",
        },
    )


@router.get("/tiles/{request_id}/overlay.png")
@router.get("/tiles/{request_id}/{z}/{x}/{y}.png")
async def get_overlay(
    request_id: str,
    z: int | None = None,
    x: int | None = None,
    y: int | None = None,
) -> FileResponse:
    settings = get_settings()
    path = os.path.join(settings.tile_cache_dir, f"{request_id}.png")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Tile not found")
    return FileResponse(
        path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
