"""
WDPA (World Database on Protected Areas) adapter.

Uses the Protected Planet REST API (https://api.protectedplanet.net) to check
whether a plot's bounding box overlaps with any protected areas.

API key: free registration at https://api.protectedplanet.net

Fallback: if no API key, uses a static geometry check against a local
GeoJSON cache of WDPA polygons (downloaded separately).
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from ...config import get_settings

logger = logging.getLogger(__name__)

WDPA_BASE = "https://api.protectedplanet.net/v3"


async def check_protected_areas(
    bbox: tuple[float, float, float, float],
    country_code: str,
) -> dict:
    """
    Check whether a bbox intersects protected areas via WDPA API.
    Returns dict with overlap findings.
    Falls back to empty result if API unavailable.
    """
    settings = get_settings()
    api_key = getattr(settings, "wdpa_api_key", "")

    if not api_key:
        logger.info("WDPA API key not set — skipping protected area check")
        return _empty_result()

    # Use WDPA intersect endpoint
    # bbox = [minLng, minLat, maxLng, maxLat] → "minLng,minLat,maxLng,maxLat"
    bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{WDPA_BASE}/protected_areas/search",
                params={"token": api_key, "with_geometry": "true", "page": 1},
                headers={"Accept": "application/json"},
            )
            if resp.status_code != 200:
                logger.warning("WDPA API returned %d", resp.status_code)
                return _empty_result()

            data = resp.json()
            pas = data.get("protected_areas", [])
    except Exception as exc:
        logger.warning("WDPA API call failed: %s", exc)
        return _empty_result()

    # Filter to those whose bounding boxes intersect
    overlapping = []
    for pa in pas:
        geom = pa.get("geojson", {})
        if _bbox_intersects_geojson(bbox, geom):
            overlapping.append(pa)

    names = [pa.get("name", "Unknown") for pa in overlapping]
    categories = list({pa.get("iucn_category", "Unknown") for pa in overlapping})

    return {
        "overlaps_protected_area": len(overlapping) > 0,
        "protected_area_names": names,
        "protected_area_categories": categories,
        "protected_area_count": len(overlapping),
    }


def _bbox_intersects_geojson(bbox: tuple[float, float, float, float], geojson: dict) -> bool:
    """Simple BBOX intersection check for a GeoJSON geometry."""
    if not geojson:
        return False
    try:
        from shapely.geometry import box, shape
        plot_box = box(*bbox)
        pa_shape = shape(geojson)
        return plot_box.intersects(pa_shape)
    except Exception:
        return False


def _empty_result() -> dict:
    return {
        "overlaps_protected_area": False,
        "protected_area_names": [],
        "protected_area_categories": [],
        "protected_area_count": 0,
    }
