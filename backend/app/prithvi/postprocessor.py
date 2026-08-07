"""
Prithvi Postprocessor — converts inference mask to GeoTIFF tiles + hotspot GeoJSON.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

import numpy as np

from ..models.requests import AnalysisRequest
from ..models.responses import GeoJSONFeatureCollection
from ..data import tile_renderer
from ..config import get_settings

logger = logging.getLogger(__name__)


def process_output(
    mask: np.ndarray,  # type: ignore[type-arg]
    geotiff_meta: dict[str, Any],
    request: AnalysisRequest,
    job_id: str,
) -> tuple[Optional[str], Optional[GeoJSONFeatureCollection], dict[str, Any]]:
    """
    Convert (H, W) float32 mask to PNG tile and GeoJSON hotspots.
    Returns (tile_url, geojson, statistics).
    """
    settings = get_settings()
    tile_dir = settings.tile_cache_dir
    os.makedirs(tile_dir, exist_ok=True)

    # Normalize to [0, 1]
    mask_f = mask.astype(np.float32)
    if mask_f.max() > 1.0:
        mask_f = (mask_f - mask_f.min()) / (mask_f.max() - mask_f.min() + 1e-8)

    png_bytes = tile_renderer.array_to_png(mask_f, colormap="viridis", vmin=0, vmax=1)
    tile_path = os.path.join(tile_dir, f"{job_id}.png")
    with open(tile_path, "wb") as f:
        f.write(png_bytes)

    tile_url = f"/tiles/{job_id}/overlay.png"

    threshold = 0.6
    high_change = (mask_f > threshold).sum()
    statistics = {
        "high_change_pixels": int(high_change),
        "high_change_area_km2": round(float(high_change) * 0.0009, 2),
        "mean_change_probability": round(float(mask_f.mean()), 4),
        "max_change_probability": round(float(mask_f.max()), 4),
        "model": "Prithvi-EO-2.0-100M",
    }

    hotspots = _generate_hotspots(mask_f, geotiff_meta, threshold, request.bbox)
    return tile_url, hotspots, statistics


def _generate_hotspots(
    mask: np.ndarray,  # type: ignore[type-arg]
    meta: dict[str, Any],
    threshold: float,
    bbox: tuple[float, float, float, float],
) -> Optional[GeoJSONFeatureCollection]:
    try:
        ys, xs = np.where(mask > threshold)
        if len(ys) == 0:
            return GeoJSONFeatureCollection()

        # Sample up to 15 hotspots
        indices = np.random.choice(len(ys), min(15, len(ys)), replace=False)
        h, w = mask.shape
        lat_step = (bbox[3] - bbox[1]) / h
        lng_step = (bbox[2] - bbox[0]) / w

        features = []
        for i in indices:
            lat = bbox[3] - ys[i] * lat_step
            lng = bbox[0] + xs[i] * lng_step
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {"change_probability": round(float(mask[ys[i], xs[i]]), 3)},
            })
        return GeoJSONFeatureCollection(features=features)
    except Exception as exc:
        logger.warning("Hotspot generation failed: %s", exc)
        return None
