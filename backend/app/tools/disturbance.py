"""
Land Disturbance Tool — OPERA DIST alert raster + hotspot GeoJSON.
"""
from __future__ import annotations

import logging
import os
from typing import Any

import numpy as np

from ..models.requests import AnalysisRequest
from ..models.responses import AnalysisResponse, DataProvenance, GeoJSONFeatureCollection, LegendSpec
from ..models.enums import CoverageQuality
from ..data import stac_client, cog_reader, tile_renderer
from ..cache.store import get_cache
from ..config import get_settings

logger = logging.getLogger(__name__)


async def run(request: AnalysisRequest, request_id: str) -> AnalysisResponse:
    settings = get_settings()
    cache = get_cache()
    bbox = request.bbox
    token = settings.nasa_earthdata_token

    dates_key = f"{request.current_period.start}_{request.current_period.end}"
    cache_key = cache.make_key("dist", bbox, dates_key, request.preferred_product)

    if cached := cache.get(cache_key):
        return AnalysisResponse(**cached)

    items = await stac_client.search_items(
        collection="OPERA_DIST_ALERT",
        bbox=bbox,
        date_start=request.current_period.start,
        date_end=request.current_period.end,
        earthdata_token=token,
    )

    coverage = CoverageQuality.unavailable
    tile_url = None
    statistics: dict = {}
    acquisition_dates: list[str] = []
    geojson_hotspots: dict[str, Any] | None = None

    if items:
        best = stac_client.get_best_item(items)
        if best:
            acq = best.get("properties", {}).get("datetime", "")[:10]
            if acq:
                acquisition_dates.append(acq)

            # VEG-DIST-STATUS band (1 = initial disturbance, 2 = provisional, 3 = confirmed)
            href = stac_client.get_asset_href(best, "VEG-DIST-STATUS") or stac_client.get_asset_href(best, "B02")
            if href:
                try:
                    data, profile = cog_reader.read_window(href, bbox, token)
                    dist = data[0].astype(float)
                    confirmed = int((dist >= 2).sum())
                    initial = int((dist == 1).sum())
                    statistics = {
                        "confirmed_disturbance_pixels": confirmed,
                        "initial_disturbance_pixels": initial,
                        "disturbance_area_km2": round((confirmed + initial) * 0.0009, 2),
                        "pct_disturbed": round((confirmed + initial) / max(dist.size, 1) * 100, 2),
                    }
                    png_bytes = tile_renderer.array_to_png(
                        dist.astype("float32"), colormap="YlOrRd", vmin=0, vmax=3
                    )
                    tile_path = os.path.join(settings.tile_cache_dir, f"{request_id}.png")
                    os.makedirs(settings.tile_cache_dir, exist_ok=True)
                    with open(tile_path, "wb") as f:
                        f.write(png_bytes)
                    tile_url = f"/tiles/{request_id}/overlay.png"

                    # Generate simple hotspot GeoJSON (centroid of confirmed pixels)
                    geojson_hotspots = _make_hotspot_geojson(dist, profile, bbox, threshold=2)
                    coverage = CoverageQuality.good
                except Exception as exc:
                    logger.error("DIST COG read failed: %s", exc)
                    coverage = CoverageQuality.poor
            else:
                coverage = CoverageQuality.poor

    result = AnalysisResponse(
        request_id=request_id,
        analysis_type=request.analysis_type,
        tile_url=tile_url,
        geojson_hotspots=GeoJSONFeatureCollection(**geojson_hotspots) if geojson_hotspots else None,
        statistics=statistics,
        provenance=DataProvenance(
            source="OPERA_L3_DIST-ALERT-HLS_V1",
            acquisition_dates=acquisition_dates,
            spatial_resolution_m=30,
            cloud_cover_pct=0.0,
            processing_level="L3",
        ),
        explanation="",
        follow_up_suggestions=[
            "Show surface water extent in the same area",
            "Compare vegetation moisture before and after disturbance",
            "Run Prithvi AI analysis to characterize disturbance type",
        ],
        coverage_quality=coverage,
        legend=LegendSpec(
            title="Disturbance Alert",
            colormap="YlOrRd",
            min=0,
            max=3,
            units="class",
        ),
    )
    cache.set(cache_key, result.model_dump())
    return result


def _make_hotspot_geojson(
    dist: np.ndarray,  # type: ignore[type-arg]
    profile: dict,
    bbox: tuple[float, float, float, float],
    threshold: float = 2,
) -> dict:
    """Generate a simple GeoJSON FeatureCollection from disturbance centroids."""
    try:
        from rasterio.transform import rowcol, xy

        transform = profile.get("transform")
        rows, cols = np.where(dist >= threshold)
        if len(rows) == 0:
            return {"type": "FeatureCollection", "features": []}

        # Sample up to 20 hotspot pixels
        sample_idx = np.random.choice(len(rows), min(20, len(rows)), replace=False)
        features = []
        for i in sample_idx:
            lng, lat = xy(transform, int(rows[i]), int(cols[i]))
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {"disturbance_class": int(dist[rows[i], cols[i]])},
            })
        return {"type": "FeatureCollection", "features": features}
    except Exception as exc:
        logger.warning("Hotspot GeoJSON generation failed: %s", exc)
        return {"type": "FeatureCollection", "features": []}
