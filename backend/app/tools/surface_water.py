"""
Surface Water Extent Tool — OPERA DSWx water classification raster.
"""
from __future__ import annotations

import logging
import os

from ..models.requests import AnalysisRequest
from ..models.responses import AnalysisResponse, DataProvenance, LegendSpec
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
    cache_key = cache.make_key("dswx", bbox, dates_key, request.preferred_product)

    if cached := cache.get(cache_key):
        return AnalysisResponse(**cached)

    items = await stac_client.search_items(
        collection="OPERA_DSWX_HLS",
        bbox=bbox,
        date_start=request.current_period.start,
        date_end=request.current_period.end,
        earthdata_token=token,
    )

    coverage = CoverageQuality.unavailable
    tile_url = None
    statistics: dict = {}
    acquisition_dates: list[str] = []
    cloud_cover = 0.0

    if items:
        best = stac_client.get_best_item(items)
        if best:
            acq = best.get("properties", {}).get("datetime", "")[:10]
            if acq:
                acquisition_dates.append(acq)
            cloud_cover = best.get("properties", {}).get("eo:cloud_cover", 0.0)

            # B01 = WTR (Water Classification) band
            href = stac_client.get_asset_href(best, "B01") or stac_client.get_asset_href(best, "WTR")
            if href:
                try:
                    data, profile = cog_reader.read_window(href, bbox, token)
                    import numpy as np
                    wtr = data[0].astype(float)
                    total_pixels = wtr.size
                    water_pixels = int((wtr == 1).sum())
                    partial_pixels = int((wtr == 2).sum())
                    statistics = {
                        "water_pixels": water_pixels,
                        "partial_water_pixels": partial_pixels,
                        "total_pixels": total_pixels,
                        "water_area_km2": round(water_pixels * 0.0009, 2),
                        "water_pct": round(water_pixels / max(total_pixels, 1) * 100, 2),
                    }
                    png_bytes = tile_renderer.array_to_png(
                        wtr.astype("float32"), colormap="Blues", vmin=0, vmax=3
                    )
                    tile_path = os.path.join(settings.tile_cache_dir, f"{request_id}.png")
                    os.makedirs(settings.tile_cache_dir, exist_ok=True)
                    with open(tile_path, "wb") as f:
                        f.write(png_bytes)
                    tile_url = f"/tiles/{request_id}/overlay.png"
                    coverage = CoverageQuality.good if cloud_cover < 20 else CoverageQuality.partial
                except Exception as exc:
                    logger.error("DSWx COG read failed: %s", exc)
                    coverage = CoverageQuality.poor
            else:
                coverage = CoverageQuality.poor

    result = AnalysisResponse(
        request_id=request_id,
        analysis_type=request.analysis_type,
        tile_url=tile_url,
        statistics=statistics,
        provenance=DataProvenance(
            source="OPERA_L3_DSWX-HLS_V1",
            acquisition_dates=acquisition_dates,
            spatial_resolution_m=30,
            cloud_cover_pct=cloud_cover,
            processing_level="L3",
        ),
        explanation="",
        follow_up_suggestions=[
            "Compare with previous week to track flooding extent",
            "Overlay with NDMI to assess vegetation stress from waterlogging",
            "Run Prithvi AI analysis for advanced flood segmentation",
        ],
        coverage_quality=coverage,
        legend=LegendSpec(
            title="Surface Water Extent",
            colormap="Blues",
            min=0,
            max=3,
            units="class",
        ),
    )
    cache.set(cache_key, result.model_dump())
    return result
