"""
Geocoder — resolves location strings to WGS84 bounding boxes using Nominatim.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_USER_AGENT = "Oxeous/0.1 (earth-observation-platform)"
_MAX_AOI_DEG2 = 4.0


async def resolve_bbox(location: str) -> tuple[float, float, float, float]:
    """
    Resolve a location name to [minLng, minLat, maxLng, maxLat].
    Returns a 1°×1° box around the centroid if the Nominatim bbox is too large.
    Raises ValueError if the location cannot be found.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            _NOMINATIM_URL,
            params={"q": location, "format": "json", "limit": 1},
            headers={"User-Agent": _USER_AGENT},
        )
        resp.raise_for_status()
        results = resp.json()

    if not results:
        raise ValueError(f"Location '{location}' not found via Nominatim")

    r = results[0]
    bb = r["boundingbox"]  # [minLat, maxLat, minLng, maxLng]
    min_lat, max_lat = float(bb[0]), float(bb[1])
    min_lng, max_lng = float(bb[2]), float(bb[3])

    lat_c = (min_lat + max_lat) / 2
    lng_c = (min_lng + max_lng) / 2

    # Clamp to MAX_AOI_DEG2
    area = abs((max_lng - min_lng) * (max_lat - min_lat))
    if area > _MAX_AOI_DEG2:
        logger.info("Nominatim bbox for '%s' too large (%.2f deg²), clamping to 1°×1°", location, area)
        min_lng, max_lng = lng_c - 0.5, lng_c + 0.5
        min_lat, max_lat = lat_c - 0.5, lat_c + 0.5

    return (min_lng, min_lat, max_lng, max_lat)
