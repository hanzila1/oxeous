"""
Global Forest Watch (GFW) GLAD/RADD alert adapter.

GFW provides near-real-time forest disturbance alerts:
  - GLAD Alerts (Hansen/UMD): weekly, 30m, tropics
  - RADD Alerts (Wageningen): bi-weekly, 10m, humid tropics

GFW REST API: https://data-api.globalforestwatch.org
  GET /dataset/gfw_integrated_alerts/latest/query
  Params: geostore_id or geometry + sql

No API key required for basic queries.

Brazil-specific: MapBiomas Annual Land Use/Land Cover (LULC) series is also
included as a high-quality commodity-area reference for Brazil.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

GFW_API_BASE = "https://data-api.globalforestwatch.org"
MAPBIOMAS_BASE = "https://storage.googleapis.com/mapbiomas-public/brasil"


async def query_glad_alerts(
    bbox: tuple[float, float, float, float],
    date_start: str,
    date_end: str,
) -> dict[str, Any]:
    """
    Query GFW integrated deforestation alerts for a bbox and date range.
    Returns summary of alert counts and confidence levels.
    """
    # Build a simple rectangular GeoJSON for the query
    geojson = {
        "type": "Polygon",
        "coordinates": [[
            [bbox[0], bbox[1]], [bbox[2], bbox[1]],
            [bbox[2], bbox[3]], [bbox[0], bbox[3]],
            [bbox[0], bbox[1]],
        ]],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{GFW_API_BASE}/dataset/gfw_integrated_alerts/latest/query",
                json={
                    "geometry": geojson,
                    "sql": (
                        f"SELECT confirmed_count, unconfirmed_count, "
                        f"SUM(area__ha) as total_area_ha "
                        f"FROM data "
                        f"WHERE alert__date >= '{date_start}' "
                        f"AND alert__date <= '{date_end}'"
                    ),
                },
                timeout=30,
            )
            if resp.status_code == 200:
                data = resp.json()
                rows = data.get("data", [])
                if rows:
                    row = rows[0]
                    return {
                        "source": "GFW Integrated Alerts (GLAD+RADD)",
                        "confirmed_alerts": int(row.get("confirmed_count", 0)),
                        "unconfirmed_alerts": int(row.get("unconfirmed_count", 0)),
                        "total_alert_area_ha": float(row.get("total_area_ha", 0) or 0),
                        "date_range": f"{date_start}/{date_end}",
                    }
    except Exception as exc:
        logger.warning("GFW GLAD query failed: %s", exc)

    return {
        "source": "GFW Integrated Alerts",
        "confirmed_alerts": 0,
        "unconfirmed_alerts": 0,
        "total_alert_area_ha": 0.0,
        "date_range": f"{date_start}/{date_end}",
        "note": "GFW query unavailable",
    }


async def get_mapbiomas_lulc_brazil(
    bbox: tuple[float, float, float, float],
    year: int = 2022,
) -> Optional[dict[str, Any]]:
    """
    MapBiomas Brazil Land Use / Land Cover for a given year.
    Useful for commodity-area verification in Brazil (Amazon, Cerrado, Pampa).
    MapBiomas annual COG tiles are accessible from GCS.
    Class 3 = Forest Formation, 11 = Wetland, 15 = Pasture, 20 = Sugar Cane,
    39 = Soybean, 46 = Coffee, 35 = Palm Oil
    """
    # MapBiomas Collection 8 COG URL pattern
    href = (
        f"{MAPBIOMAS_BASE}/collection8/mapbiomas_collection80_integration_v1_amazonia_{year}.tif"
    )
    try:
        from ..cog_reader import read_window
        import numpy as np

        data, _ = read_window(href, bbox, earthdata_token=None)
        lulc = data[0]
        total = lulc.size

        CLASS_NAMES = {
            3: "Forest Formation", 4: "Savanna Formation", 11: "Wetland",
            15: "Pasture", 20: "Sugar Cane", 35: "Palm Oil",
            39: "Soybean", 46: "Coffee", 48: "Other Temporary Crops",
        }
        counts: dict[str, int] = {}
        for cls_id, cls_name in CLASS_NAMES.items():
            cnt = int((lulc == cls_id).sum())
            if cnt > 0:
                counts[cls_name] = cnt

        return {
            "source": f"MapBiomas Brazil Collection 8 ({year})",
            "year": year,
            "land_use_classes": counts,
            "dominant_class": CLASS_NAMES.get(
                int(np.bincount(lulc.astype(np.uint8).flatten()).argmax()), "Unknown"
            ),
        }
    except Exception as exc:
        logger.warning("MapBiomas read failed (bbox=%s, year=%d): %s", bbox, year, exc)
        return None
