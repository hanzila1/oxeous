"""
Vegetation Moisture Change Tool — NDMI delta from HLS S30 COG reads.
"""
from __future__ import annotations

import base64
import io
import logging
import os
from typing import Any

import numpy as np

from ..models.requests import AnalysisRequest
from ..models.responses import AnalysisResponse, DataProvenance, LegendSpec
from ..models.enums import CoverageQuality
from ..data import stac_client, cog_reader, index_compute, tile_renderer
from ..cache.store import get_cache
from ..config import get_settings

logger = logging.getLogger(__name__)

# HLS S30 band names for NDMI: NIR=B8A, SWIR1=B11
NDMI_BANDS = {"NIR": "B8A", "SWIR1": "B11"}


async def run(request: AnalysisRequest, request_id: str) -> AnalysisResponse:
    settings = get_settings()
    cache = get_cache()
    bbox = request.bbox

    # ── Check cache ──────────────────────────────────────────────────────────
    dates_key = f"{request.current_period.start}_{request.current_period.end}"
    if request.comparison_period:
        dates_key += f"_{request.comparison_period.start}_{request.comparison_period.end}"
    cache_key = cache.make_key("ndmi", bbox, dates_key, request.preferred_product)

    if cached := cache.get(cache_key):
        logger.info("Cache hit for %s", cache_key)
        return AnalysisResponse(**cached)

    # ── STAC search ──────────────────────────────────────────────────────────
    token = settings.nasa_earthdata_token

    current_items = await stac_client.search_items(
        collection=request.preferred_product,
        bbox=bbox,
        date_start=request.current_period.start,
        date_end=request.current_period.end,
        earthdata_token=token,
    )

    comparison_items: list[dict[str, Any]] = []
    if request.comparison_period:
        comparison_items = await stac_client.search_items(
            collection=request.preferred_product,
            bbox=bbox,
            date_start=request.comparison_period.start,
            date_end=request.comparison_period.end,
            earthdata_token=token,
        )

    # ── Coverage quality ─────────────────────────────────────────────────────
    has_current = bool(current_items)
    has_comparison = bool(comparison_items) or request.comparison_period is None

    if not has_current and not has_comparison:
        coverage = CoverageQuality.unavailable
    elif not has_current or not has_comparison:
        coverage = CoverageQuality.poor
    else:
        best = stac_client.get_best_item(current_items)
        cc = best.get("properties", {}).get("eo:cloud_cover", 100) if best else 100
        coverage = CoverageQuality.good if cc < 20 else CoverageQuality.partial

    # ── Compute NDMI delta ────────────────────────────────────────────────────
    acquisition_dates: list[str] = []
    delta = None
    profile: dict = {}
    cloud_cover = 0.0

    if has_current and current_items:
        current_best = stac_client.get_best_item(current_items)
        if current_best:
            acq = current_best.get("properties", {}).get("datetime", "")[:10]
            if acq:
                acquisition_dates.append(acq)
            cloud_cover = current_best.get("properties", {}).get("eo:cloud_cover", 0.0)
            current_bands, profile = await _read_ndmi_bands(current_best, bbox, token)
            if current_bands:
                current_ndmi = index_compute.ndmi(**current_bands)

                if comparison_items:
                    comp_best = stac_client.get_best_item(comparison_items)
                    if comp_best:
                        comp_acq = comp_best.get("properties", {}).get("datetime", "")[:10]
                        if comp_acq:
                            acquisition_dates.insert(0, comp_acq)
                        comp_bands, _ = await _read_ndmi_bands(comp_best, bbox, token)
                        if comp_bands:
                            comp_ndmi = index_compute.ndmi(**comp_bands)
                            delta = index_compute.index_change(comp_ndmi, current_ndmi)
                else:
                    # No comparison period — return current NDMI as static layer
                    delta = current_ndmi

    # ── Generate PNG tile ─────────────────────────────────────────────────────
    tile_url: str | None = None
    statistics: dict = {}

    if delta is not None:
        png_bytes = tile_renderer.array_to_png(delta, colormap="RdYlGn", vmin=-0.5, vmax=0.5)

        # Save PNG to tile dir and expose via /tiles endpoint
        tile_path = os.path.join(settings.tile_cache_dir, f"{request_id}.png")
        os.makedirs(settings.tile_cache_dir, exist_ok=True)
        with open(tile_path, "wb") as f:
            f.write(png_bytes)

        tile_url = f"/tiles/{request_id}/overlay.png"
        statistics = index_compute.compute_statistics(delta)
    else:
        statistics = {"data_available": 0}

    provenance = DataProvenance(
        source="HLS.S30.v2.0",
        acquisition_dates=acquisition_dates,
        spatial_resolution_m=30,
        cloud_cover_pct=cloud_cover,
        processing_level="L30 SR",
        doi="10.5067/HLS/HLSS30.002",
    )

    legend = LegendSpec(
        title="NDMI Change",
        colormap="RdYlGn",
        min=-0.5,
        max=0.5,
        units="Δ NDMI",
    )

    result = AnalysisResponse(
        request_id=request_id,
        analysis_type=request.analysis_type,
        tile_url=tile_url,
        statistics={k: round(v, 3) if isinstance(v, float) else v for k, v in statistics.items()},
        provenance=provenance,
        explanation="",  # filled in by Granite after this
        follow_up_suggestions=[
            "Compare with NDVI to assess vegetation greenness",
            "Overlay FIRMS fire data to check for thermal stress",
            "Run Prithvi AI analysis on the worst-affected hotspot",
        ],
        coverage_quality=coverage,
        legend=legend,
    )

    # Cache the result
    cache.set(cache_key, result.model_dump())
    return result


async def _read_ndmi_bands(
    item: dict,
    bbox: tuple[float, float, float, float],
    token: str | None,
) -> tuple[dict, dict]:
    """Read NIR and SWIR1 bands from a STAC item."""
    hrefs: dict[str, str] = {}
    for key, band in NDMI_BANDS.items():
        href = stac_client.get_asset_href(item, band)
        if href:
            hrefs[band] = href

    if len(hrefs) < 2:
        logger.warning("Missing bands for NDMI — found: %s", list(hrefs.keys()))
        return {}, {}

    try:
        raw, profile = cog_reader.stack_bands(hrefs, bbox, token)
        # Map band keys to logical names
        return {"nir": raw[NDMI_BANDS["NIR"]], "swir1": raw[NDMI_BANDS["SWIR1"]]}, profile
    except Exception as exc:
        logger.error("COG read failed: %s", exc)
        return {}, {}
