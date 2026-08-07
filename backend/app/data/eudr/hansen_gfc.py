"""
Hansen Global Forest Change (GFC) adapter.

Data: University of Maryland / Hansen et al. — annual tree cover loss 2001–2023.
URL pattern: https://storage.googleapis.com/earthenginepartners-hansen/GFC-2023-v1.11/

Bands available as Cloud-Optimized GeoTIFFs (30 m, WGS84):
  - treecover2000    : % tree cover in year 2000 (0–100)
  - lossyear         : year of tree cover loss (1=2001 … 23=2023), 0=no loss
  - gain             : binary gain 2000–2012
  - datamask         : land/water/no-data mask

Tile grid: 10°×10° tiles named {N/S}{lat}_{E/W}{lng}.tif
           e.g. N00_E010.tif covers 0–10°N, 10–20°E

EUDR cutoff: Dec 31 2020 → loss years 21, 22, 23 (lossyear values 21, 22, 23)
"""
from __future__ import annotations

import logging
import math
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

GFC_BASE = (
    "https://storage.googleapis.com/earthenginepartners-hansen/GFC-2023-v1.11"
)
EUDR_CUTOFF_YEAR = 21  # lossyear value for 2021 (post-Dec 2020 cutoff)


def _tile_name(lat: float, lng: float) -> str:
    """Return the Hansen GFC 10°×10° tile filename covering (lat, lng)."""
    lat_base = math.floor(lat / 10) * 10
    lng_base = math.floor(lng / 10) * 10
    ns = "N" if lat_base >= 0 else "S"
    ew = "E" if lng_base >= 0 else "W"
    lat_str = f"{abs(lat_base):02d}"
    lng_str = f"{abs(lng_base):03d}"
    return f"{ns}{lat_str}_{ew}{lng_str}"


def get_hrefs(bbox: tuple[float, float, float, float]) -> dict[str, str]:
    """
    Return GFC asset HREFs for the tile(s) covering a bbox.
    For cross-tile bboxes (>10°) this returns the dominant tile only.
    """
    center_lat = (bbox[1] + bbox[3]) / 2
    center_lng = (bbox[0] + bbox[2]) / 2
    tile = _tile_name(center_lat, center_lng)
    return {
        "treecover2000": f"{GFC_BASE}/Hansen_GFC-2023-v1.11_treecover2000_{tile}.tif",
        "lossyear":      f"{GFC_BASE}/Hansen_GFC-2023-v1.11_lossyear_{tile}.tif",
        "gain":          f"{GFC_BASE}/Hansen_GFC-2023-v1.11_gain_{tile}.tif",
        "datamask":      f"{GFC_BASE}/Hansen_GFC-2023-v1.11_datamask_{tile}.tif",
    }


async def read_forest_data(
    bbox: tuple[float, float, float, float],
) -> Optional[dict[str, np.ndarray]]:  # type: ignore[type-arg]
    """
    Read treecover2000 and lossyear arrays for the bbox.
    Returns dict with keys: treecover2000, lossyear.
    Returns None on failure (graceful degradation).
    """
    from ..cog_reader import stack_bands

    hrefs = get_hrefs(bbox)
    try:
        bands, _ = stack_bands(
            {"treecover2000": hrefs["treecover2000"], "lossyear": hrefs["lossyear"]},
            bbox,
            earthdata_token=None,  # Hansen GFC is public — no auth required
        )
        return bands
    except Exception as exc:
        logger.warning("Hansen GFC read failed (bbox=%s): %s", bbox, exc)
        return None


def compute_deforestation_stats(
    treecover2000: np.ndarray,  # type: ignore[type-arg]
    lossyear: np.ndarray,       # type: ignore[type-arg]
    area_ha: float,
) -> dict:
    """
    Compute EUDR-relevant deforestation statistics from GFC arrays.

    EUDR cutoff = Dec 31 2020 → only lossyear >= 21 counts as violation.
    """
    total_pixels = treecover2000.size

    # Pixels with ≥30% canopy cover in 2000 → "forest" per EUDR threshold
    forest_2000 = (treecover2000 >= 30).astype(np.uint8)
    forest_pct_2000 = float(forest_2000.mean() * 100)

    # Post-cutoff loss: lossyear 21, 22, 23 (2021, 2022, 2023)
    post_cutoff_loss = (lossyear >= EUDR_CUTOFF_YEAR) & (lossyear > 0) & forest_2000.astype(bool)
    loss_pixels = int(post_cutoff_loss.sum())

    # Loss years present
    loss_years_raw = np.unique(lossyear[post_cutoff_loss])
    loss_years = [int(2000 + int(y)) for y in loss_years_raw if y > 0]

    pixel_area_ha = area_ha / max(total_pixels, 1)
    loss_ha = float(loss_pixels * pixel_area_ha)
    loss_pct = float(loss_pixels / max(total_pixels, 1) * 100)

    # Forest cover in 2020 = 2000 forest minus losses in years 1–20
    pre_cutoff_loss = (lossyear >= 1) & (lossyear <= 20) & forest_2000.astype(bool)
    forest_2020 = forest_2000 & ~pre_cutoff_loss
    forest_pct_2020 = float(forest_2020.mean() * 100)

    return {
        "forest_cover_2000_pct": round(forest_pct_2000, 2),
        "forest_cover_2020_pct": round(forest_pct_2020, 2),
        "post_cutoff_loss_pct": round(loss_pct, 2),
        "post_cutoff_loss_ha": round(loss_ha, 3),
        "loss_years": loss_years,
        "has_post_cutoff_loss": loss_ha > 0,
        "total_pixels_analyzed": total_pixels,
    }
