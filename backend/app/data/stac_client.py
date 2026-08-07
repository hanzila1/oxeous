"""
STAC client — queries NASA LPCLOUD, CMR-STAC, and OPERA STAC endpoints.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import pystac_client

logger = logging.getLogger(__name__)

# STAC API endpoints
LPCLOUD_STAC = "https://cmr.earthdata.nasa.gov/stac/LPCLOUD"
CMR_STAC     = "https://cmr.earthdata.nasa.gov/stac"
OPERA_STAC   = "https://cmr.earthdata.nasa.gov/stac/ASF"

# Collection names
COLLECTIONS = {
    "HLS_VI_NDMI":     "HLSS30_VI.v2.0",
    "HLS_VI_NDVI":     "HLSS30_VI.v2.0",
    "HLS_S30":         "HLSS30.v2.0",
    "HLS_L30":         "HLSL30.v2.0",
    "OPERA_DSWX_HLS":  "OPERA_L3_DSWX-HLS_V1",
    "OPERA_DIST_ALERT":"OPERA_L3_DIST-ALERT-HLS_V1",
}


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
