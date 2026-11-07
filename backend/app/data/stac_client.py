"""
STAC client - queries Microsoft Planetary Computer STAC, NASA LPCLOUD, CMR-STAC, and OPERA STAC endpoints.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

import httpx
import pystac_client

logger = logging.getLogger(__name__)

# STAC API endpoints
PLANETARY_COMPUTER_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
LPCLOUD_STAC = "https://cmr.earthdata.nasa.gov/stac/LPCLOUD"
CMR_STAC     = "https://cmr.earthdata.nasa.gov/stac"
OPERA_STAC   = "https://cmr.earthdata.nasa.gov/stac/ASF"

# Collection names
COLLECTIONS = {
    "SENTINEL2_L2A":   "sentinel-2-l2a",
    "COP_DEM_30":      "cop-dem-glo-30",
    "ESA_WORLDCOVER":  "esa-worldcover",
    "HLS_VI_NDMI":     "HLSS30_VI.v2.0",
    "HLS_VI_NDVI":     "HLSS30_VI.v2.0",
    "HLS_S30":         "HLSS30.v2.0",
    "HLS_L30":         "HLSL30.v2.0",
    "OPERA_DSWX_HLS":  "OPERA_L3_DSWX-HLS_V1",
    "OPERA_DIST_ALERT":"OPERA_L3_DIST-ALERT-HLS_V1",
}

PC_NATIVE_COLLECTIONS = {"sentinel-2-l2a", "cop-dem-glo-30", "esa-worldcover", "io-lulc-annual-v02"}


async def search_items(
    collection: str,
    bbox: tuple[float, float, float, float],
    date_start: str,
    date_end: str,
    max_cloud_pct: int = 20,
    max_items: int = 10,
    earthdata_token: Optional[str] = None,
) -> list[dict[str, Any]]:
    """
    Search a NASA STAC collection for items matching bbox and date range.
    Returns a list of STAC item dicts sorted by cloud cover (ascending).
    """
    collection_id = COLLECTIONS.get(collection, collection)
    if collection_id in PC_NATIVE_COLLECTIONS:
        endpoint = PLANETARY_COMPUTER_STAC
    else:
        endpoint = LPCLOUD_STAC if "HLS" in collection else CMR_STAC

    headers: dict[str, str] = {}
    if earthdata_token:
        headers["Authorization"] = f"Bearer {earthdata_token}"

    try:
        client = pystac_client.Client.open(endpoint, headers=headers)
        search = client.search(
            collections=[collection_id],
            bbox=list(bbox),
            datetime=f"{date_start}/{date_end}",
            max_items=max_items,
            query={"eo:cloud_cover": {"lt": max_cloud_pct}},
        )
        items = list(search.items())
        logger.info(
            "STAC search %s: found %d items for bbox=%s dates=%s/%s",
            collection_id, len(items), bbox, date_start, date_end,
        )
        # Sort by cloud cover
        items.sort(key=lambda i: i.properties.get("eo:cloud_cover", 999))
        return [item.to_dict() for item in items[:max_items]]

    except Exception as exc:
        logger.error("STAC search failed for %s: %s", collection, exc)
        return []


def get_asset_href(item: dict[str, Any], band_key: str) -> Optional[str]:
    """Extract the HREF for a specific band asset from a STAC item."""
    assets = item.get("assets", {})
    if band_key in assets:
        return assets[band_key].get("href")
    # Try case-insensitive
    for key, asset in assets.items():
        if key.lower() == band_key.lower():
            return asset.get("href")
    return None


def get_best_item(items: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    """Return the item with lowest cloud cover from a list."""
    if not items:
        return None
    return min(items, key=lambda i: i.get("properties", {}).get("eo:cloud_cover", 999))


async def search_planetary_computer_bitemporal(
    lng: float,
    lat: float,
    max_cloud_pct: float = 25.0,
) -> dict[str, Any]:
    """
    Query Microsoft Planetary Computer STAC API concurrently for:
      - Window A (Dry / Planting Window): Nov-Apr low-cloud Sentinel-2 L2A scene
      - Window B (Peak Canopy / Harvest Window): May-Oct low-cloud Sentinel-2 L2A scene
      - Terrain Elevation: Copernicus 30m Global DEM (cop-dem-glo-30)
    Used by Fields of The World (FTW) bi-temporal agricultural parcel delineation.
    """
    point_geom = {"type": "Point", "coordinates": [round(lng, 6), round(lat, 6)]}

    async def _query_window(client: httpx.AsyncClient, collections: list[str], dt_range: Optional[str], cloud_filter: bool) -> list[dict[str, Any]]:
        body: dict[str, Any] = {
            "collections": collections,
            "intersects": point_geom,
            "limit": 4,
        }
        if dt_range:
            body["datetime"] = dt_range
        if cloud_filter:
            body["query"] = {"eo:cloud_cover": {"lt": max_cloud_pct}}
        try:
            resp = await client.post(f"{PLANETARY_COMPUTER_STAC}/search", json=body)
            if resp.status_code == 200:
                feats = resp.json().get("features", [])
                feats.sort(key=lambda f: f.get("properties", {}).get("eo:cloud_cover", 999.0))
                return feats
        except Exception as exc:
            logger.debug("Planetary Computer STAC window search warning: %s", exc)
        return []

    async with httpx.AsyncClient(timeout=8.0) as client:
        win_a_feats, win_b_feats, dem_feats = await asyncio.gather(
            _query_window(client, ["sentinel-2-l2a"], "2024-11-01T00:00:00Z/2025-04-30T23:59:59Z", True),
            _query_window(client, ["sentinel-2-l2a"], "2025-05-01T00:00:00Z/2025-11-30T23:59:59Z", True),
            _query_window(client, ["cop-dem-glo-30"], None, False),
        )
        # Fallback with relaxed cloud threshold if deeply tropical/cloudy season
        if not win_a_feats:
            win_a_feats = await _query_window(client, ["sentinel-2-l2a"], "2024-01-01T00:00:00Z/2025-04-30T23:59:59Z", False)
        if not win_b_feats:
            win_b_feats = await _query_window(client, ["sentinel-2-l2a"], "2025-05-01T00:00:00Z/2026-10-31T23:59:59Z", False)

    def _summarize_s2(feat: Optional[dict[str, Any]], label: str) -> Optional[dict[str, Any]]:
        if not feat:
            return None
        props = feat.get("properties", {})
        return {
            "window": label,
            "scene_id": feat.get("id", ""),
            "datetime": str(props.get("datetime", ""))[:10],
            "cloud_cover_pct": round(float(props.get("eo:cloud_cover", 0.0) or 0.0), 1),
            "mgrs_tile": props.get("s2:mgrs_tile", ""),
            "platform": props.get("platform", "Sentinel-2"),
        }

    return {
        "stac_catalog": "planetarycomputer.microsoft.com/api/stac/v1",
        "window_a": _summarize_s2(win_a_feats[0] if win_a_feats else None, "Window A (Planting / Dry)"),
        "window_b": _summarize_s2(win_b_feats[0] if win_b_feats else None, "Window B (Peak Canopy / Harvest)"),
        "dem_tile_id": dem_feats[0].get("id") if dem_feats else None,
    }
