"""
ESA WorldCover 2020 adapter — 10 m global land cover at EUDR cutoff date.

WorldCover 2020 tiles are publicly available as Cloud-Optimized GeoTIFFs on S3:
  s3://esa-worldcover/v100/2020/map/ESA_WorldCover_10m_2020_v100_{tile}_Map.tif

Class values relevant to EUDR:
  10 = Tree cover  ← FOREST (EUDR relevant)
  20 = Shrubland
  30 = Grassland
  40 = Cropland   ← commodity production area
  50 = Built-up
  60 = Bare/sparse vegetation
  70 = Snow/ice
  80 = Permanent water
  90 = Herbaceous wetland
  95 = Mangroves   ← FOREST (EUDR relevant)
  100 = Moss/lichen
"""
from __future__ import annotations

import logging
import math
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

WORLDCOVER_S3 = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v100/2020/map"
FOREST_CLASSES = {10, 95}   # Tree cover + Mangroves


def _tile_name(lat: float, lng: float) -> str:
    """Return ESA WorldCover 3°×3° tile name for a coordinate."""
    lat_base = math.floor(lat / 3) * 3
    lng_base = math.floor(lng / 3) * 3
    ns = "N" if lat_base >= 0 else "S"
    ew = "E" if lng_base >= 0 else "W"
    return f"{ns}{abs(lat_base):02d}{ew}{abs(lng_base):03d}"


def get_href(bbox: tuple[float, float, float, float]) -> str:
    center_lat = (bbox[1] + bbox[3]) / 2
    center_lng = (bbox[0] + bbox[2]) / 2
    tile = _tile_name(center_lat, center_lng)
    return f"{WORLDCOVER_S3}/ESA_WorldCover_10m_2020_v100_{tile}_Map.tif"


async def read_landcover(
    bbox: tuple[float, float, float, float],
) -> Optional[np.ndarray]:  # type: ignore[type-arg]
    """
    Read ESA WorldCover 2020 land-cover classification for a bbox.
    Returns 2D uint8 array of class values. None on failure.
    """
    from ..cog_reader import read_window

    href = get_href(bbox)
    try:
        data, _ = read_window(href, bbox, earthdata_token=None)
        return data[0].astype(np.uint8)
    except Exception as exc:
        logger.warning("ESA WorldCover read failed (bbox=%s): %s", bbox, exc)
        return None


def compute_forest_stats(
    landcover: np.ndarray,  # type: ignore[type-arg]
    area_ha: float,
) -> dict:
    """Compute forest-cover statistics from WorldCover classification."""
    total = landcover.size
    forest_pixels = int(sum((landcover == cls).sum() for cls in FOREST_CLASSES))
    cropland_pixels = int((landcover == 40).sum())

    pixel_area_ha = area_ha / max(total, 1)

    return {
        "worldcover_forest_pct": round(forest_pixels / max(total, 1) * 100, 2),
        "worldcover_forest_ha": round(forest_pixels * pixel_area_ha, 3),
        "worldcover_cropland_pct": round(cropland_pixels / max(total, 1) * 100, 2),
        "dominant_class": int(np.bincount(landcover.flatten()).argmax()),
        "source": "ESA WorldCover 2020 v100",
        "resolution_m": 10,
    }
