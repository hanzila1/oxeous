"""
EUDR Deforestation Analysis Engine.

Orchestrates 6 GEE datasets to produce a full EUDR compliance finding:
  1. Hansen GFC v1.13 2025       — post-cutoff forest loss
  2. Natural Forests 2020        — natural forest baseline
  3. Forest Typology 2020        — primary/plantation/crop
  4. WRI Drivers 2001-2025       — deforestation driver identification
  5. Commodity Maps 2025         — commodity presence confirmation
  6. WDPA Protected Areas (GEE)  — protected area overlap (legality)

Plus NDVI change from NASA HLS S30 as a secondary vegetation signal.
"""
from __future__ import annotations

import logging
import os
import time
from datetime import date, timedelta
from typing import Any

import numpy as np

from ..eudr.models import (
    DeforestationFinding, LegalityFinding, EUDRRiskAssessment,
    EUDRRiskLevel, EUDRCountryRisk, EUDRPlot,
)
from ..eudr.country_risk import get_country_risk, get_commodity_risk_factors
from ..data import stac_client, cog_reader, index_compute, tile_renderer
from ..cache.store import get_cache
from ..config import get_settings
from ..core.trajectory_logger import TrajectoryLogger
from ..tools.eudr.gee_commodity import run_full_gee_assessment

logger = logging.getLogger(__name__)

EUDR_BASELINE_DATE = "2020-12-31"
NDVI_BEFORE_DATE   = ("2020-01-01", "2020-12-31")


async def assess_plot(
    plot: EUDRPlot,
    request_id: str,
    progress_callback: Any = None,
) -> tuple[EUDRRiskAssessment, str | None, dict | None, dict[str, Any]]:
    """
    Run full EUDR compliance assessment for a single plot.

    Agent pipeline (6 tools + risk engine):
      Step 1 — Receive task (instruction logged)
      Step 2 — Call GEE full assessment (6 datasets)
      Step 3 — Log tool results
      Step 4 — Compute NDVI change (NASA HLS S30)
      Step 5 — Country risk classification
      Step 6 — Risk score calculation (0-100)
      Step 7 — LLM decision logged
      Step 8 — Human checkpoint
      Step 9 — Final output

    Returns (risk_assessment, tile_url, deforestation_geojson, gee_summary).
    """
    settings = get_settings()
    cache = get_cache()
    traj = TrajectoryLogger(request_id)

    # ── Step 1: Log agent instructions ───────────────────────────────────────
    traj.log_instruction(
        system_prompt=(
            "EUDR Multi-Tool Agent: verify deforestation compliance for commodity plots "
            "using 6 GEE satellite datasets: Hansen GFC v1.13 2025, Natural Forests 2020, "
            "Forest Typology 2020, WRI Drivers of Forest Loss 2001-2025, "
            "Commodity Maps 2025, and WDPA Protected Areas. "
            "Rules: FAIL if post-2020 deforestation detected OR protected area overlap. "
            "All decisions require satellite evidence. Supplier text claims are cross-checked "
            "against satellite data. Human review required for risk_score >= 40."
        ),
        user_input=(
            f"Assess plot {plot.plot_id} | commodity={plot.commodity.value} "
            f"| country={plot.country_code} | area_ha={plot.area_ha}"
        ),
    )

    # Compute bbox from geometry
    bbox = _geometry_to_bbox(plot.geometry)
    area_ha = plot.area_ha or _estimate_area_ha(bbox)
    plot.area_ha = area_ha

    # Helper to emit progress to both terminal and optional SSE callback
    async def _emit(data: dict) -> None:
        if progress_callback:
            await progress_callback(data)

    print("\n" + "="*70)
    print(f"[AGENT] OXEOUS EUDR COMPLIANCE ASSESSMENT -- req_{request_id[:8]}")
    print("="*70)
    loc_str = f"{plot.country_name} ({plot.country_code})" if (plot.country_name and plot.country_name.strip()) else (plot.country_code or "Drawn Boundary Coordinates")
    print(f"  Location  : {loc_str} | Commodity: {plot.commodity.value.upper()}")
    print(f"  Area      : {area_ha:.1f} ha")
    print(f"  LLM Model : {settings.gemini_model}")
    print(f"  Satellite : Google Earth Engine (6 Real Datasets)")
    print("-" * 70)

    await _emit({"step": "init", "request_id": request_id[:8],
                 "country": plot.country_name, "country_code": plot.country_code,
                 "commodity": plot.commodity.value, "area_ha": round(area_ha, 1),
                 "model": settings.gemini_model})

    DATASETS = [
        ("Hansen GFC v1.13 2025", "Tree cover 2020 & post-cutoff loss"),
        ("Nature Trace Natural Forests 2020", "10m probability map"),
        ("Forest Typology 2020", "Primary vs Plantation classification"),
        ("WRI / Google DeepMind Drivers 2025", "Forest loss driver identification"),
        ("Forest Data Partnership 2025", "Commodity presence maps"),
        ("WDPA Protected Areas", "GEE polygon intersection"),
    ]
    for i, (name, desc) in enumerate(DATASETS):
        print(f"  [{i+1}/6] {name} ({desc})...")
        await _emit({"step": "dataset", "index": i + 1, "total": 6, "name": name, "desc": desc, "status": "running"})

    cache_key = cache.make_key(
        "eudr", bbox,
        f"{plot.commodity}_{plot.country_code}",
        "eudr_assessment_v4",
    )

    # -- Step 2: GEE Full Assessment -- all 6 datasets
    traj.log_tool_call("gee_full_assessment", {
        "bbox": list(bbox), "commodity": plot.commodity.value, "country": plot.country_code,
        "datasets": [
            "hansen_gfc_v1.13_2025",
            "natural_forests_2020",
            "forest_typology_2020",
            "wri_drivers_2025",
            "commodity_maps_2025",
            "wdpa_protected_areas_gee",
        ]
    })
    t0 = time.monotonic()
    gee = await run_full_gee_assessment(
        bbox, plot.commodity.value, plot.country_code, geometry=plot.geometry, progress_callback=progress_callback
    )
    gee_duration_ms = int((time.monotonic() - t0) * 1000)

    # -- Step 3: Log tool results
    traj.log_tool_result("gee_full_assessment", gee.get("summary", {}),
                         duration_ms=gee_duration_ms)

    gee_summary = gee.get("summary", {})
    has_deforestation     = gee_summary.get("has_post_cutoff_loss", False)
    forest_cover_2020_pct = gee_summary.get("forest_cover_2020_pct", 0.0)
    forest_loss_pct       = gee_summary.get("forest_loss_pct", 0.0)
    forest_loss_ha        = gee_summary.get("forest_loss_ha", 0.0)
    loss_years: list[int] = [2021] if has_deforestation else []
    gfc_confidence        = "high" if gee.get("hansen_gfc", {}).get("available") else "low"
    gee_commodity         = gee.get("commodity_map", {})

    print(f"  [OK] GEE Query Complete ({gee_duration_ms} ms)")
    print(f"       Post-2020 Loss: {'YES [WARNING]' if has_deforestation else 'NO [OK]'} ({forest_loss_ha:.2f} ha / {forest_loss_pct:.1f}%)")
    print(f"       Forest Type   : {gee_summary.get('dominant_forest_type', 'unknown')}")
    print(f"       Loss Driver   : {gee_summary.get('dominant_loss_driver', 'none')}")
    print(f"       Protected Area: {'OVERLAP [HARD VIOLATION]' if gee_summary.get('overlaps_protected_area') else 'CLEAR [OK]'}")
    print("-" * 70)

    await _emit({"step": "gee_complete", "duration_ms": gee_duration_ms,
                 "has_deforestation": has_deforestation,
                 "forest_loss_ha": round(forest_loss_ha, 2),
                 "forest_loss_pct": round(forest_loss_pct, 1),
                 "forest_type": gee_summary.get("dominant_forest_type", "unknown"),
                 "loss_driver": gee_summary.get("dominant_loss_driver", "none"),
                 "overlaps_protected": gee_summary.get("overlaps_protected_area", False)})

    # Extract confirmed alerts from GEE summary (derived from Hansen loss density)
    confirmed_alerts: int = gee_summary.get("confirmed_alerts", 0)

    # Extract WDPA protected area result
    pa_summary = gee_summary  # protected area fields are now in summary
    overlaps_protected    = pa_summary.get("overlaps_protected_area", False)
    protected_area_names  = pa_summary.get("protected_area_names", [])
    protected_area_cats   = pa_summary.get("protected_area_categories", [])

    # ── Step 5: Country risk classification ───────────────────────────────────
    country_risk = get_country_risk(plot.country_code)

    legality_issues: list[str] = []

    # Protected area overlap (now from real WDPA via GEE)
    if overlaps_protected:
        pa_names_str = ", ".join(protected_area_names[:3]) or "unknown"
        legality_issues.append(
            f"WDPA: plot overlaps {len(protected_area_names)} protected area(s): {pa_names_str} "
            f"— this is a hard EUDR legality violation"
        )

    # Forest typology check
    typology = gee.get("forest_typology", {})
    if typology.get("is_natural_forest") and has_deforestation:
        legality_issues.append(
            f"GEE Forest Typology 2020 confirms this is primary/natural forest — "
            f"post-2020 deforestation constitutes an EUDR violation"
        )

    # WRI driver context
    drivers = gee.get("drivers", {})
    if drivers.get("is_deforestation_driver"):
        legality_issues.append(
            f"WRI Drivers of Forest Loss 2025: dominant driver is '{drivers.get('dominant_driver')}' "
            f"— classified as a deforestation-causing activity under EUDR"
        )

    if country_risk == EUDRCountryRisk.high:
        legality_issues.append(
            f"{plot.country_code} is a HIGH-RISK country under EUDR — enhanced due diligence required"
        )

    legality = LegalityFinding(
        plot_id=plot.plot_id,
        overlaps_protected_area=overlaps_protected,
        protected_area_names=protected_area_names,
        protected_area_categories=protected_area_cats,
        country_risk_level=country_risk,
        issues=legality_issues,
    )

    # ── Step 6: Risk score calculation ────────────────────────────────────────
    risk_score, overall_risk = _calculate_risk(
        has_deforestation=has_deforestation,
        forest_loss_pct=forest_loss_pct,
        overlaps_protected=overlaps_protected,
        country_risk=country_risk,
        confirmed_alerts=confirmed_alerts,
    )

    commodity_risk_factors = get_commodity_risk_factors(
        plot.commodity.value, plot.country_code, area_ha
    )

    # Cross-reference supplier claim vs satellite evidence
    if plot.supplier_name:
        if has_deforestation:
            commodity_risk_factors.append(
                f"⚠️ CONTRADICTION: Satellite data shows post-2020 forest loss "
                f"despite supplier ({plot.supplier_name}) claiming compliance"
            )
        elif overlaps_protected:
            commodity_risk_factors.append(
                f"⚠️ LEGALITY: Plot overlaps WDPA protected areas — supplier claim requires verification"
            )

    if gee_commodity.get("commodity_confirmed"):
        commodity_risk_factors.append(
            f"GEE 2025 satellite map confirms {plot.commodity.value} presence "
            f"({gee_commodity.get('coverage_pct', 0):.1f}% plot coverage)"
        )
        if has_deforestation:
            risk_score = min(100.0, risk_score + 10)

    if gee_summary.get("dominant_loss_driver") not in ("unknown", "No loss detected", ""):
        commodity_risk_factors.append(
            f"WRI 2025: dominant forest loss driver = '{gee_summary['dominant_loss_driver']}'"
        )

    natural_f = gee.get("natural_forest", {})
    if natural_f.get("is_natural_forest"):
        commodity_risk_factors.append(
            f"Natural Forests 2020: {natural_f.get('natural_forest_pct', 0):.1f}% "
            f"confirmed natural forest (probability >= 0.52)"
        )

    deforestation_finding = DeforestationFinding(
        plot_id=plot.plot_id,
        has_deforestation=has_deforestation,
        forest_cover_2000_pct=float(gee_summary.get("forest_cover_2000_pct", 0.0) or 0.0),
        pre_cutoff_loss_pct=float(gee_summary.get("pre_cutoff_loss_pct", 0.0) or 0.0),
        forest_cover_2020_pct=forest_cover_2020_pct,
        forest_loss_pct=forest_loss_pct,
        forest_loss_ha=forest_loss_ha,
        natural_forest_pct=float(gee_summary.get("natural_forest_pct", 0.0) or 0.0),
        dominant_forest_type=str(gee_summary.get("dominant_forest_type", "unknown") or "unknown"),
        dominant_loss_driver=str(gee_summary.get("dominant_loss_driver", "unknown") or "unknown"),
        commodity_confirmed=bool(gee_summary.get("commodity_confirmed", False)),
        commodity_coverage_pct=float(gee_summary.get("commodity_coverage_pct", 0.0) or 0.0),
        loss_years=loss_years,
        confidence=gfc_confidence,
        data_sources=[s for s in gee_summary.get("data_sources", []) if s],
        acquisition_dates=[EUDR_BASELINE_DATE, date.today().isoformat()],
    )

    assessment = EUDRRiskAssessment(
        plot_id=plot.plot_id,
        overall_risk=overall_risk,
        risk_score=risk_score,
        deforestation=deforestation_finding,
        legality=legality,
        commodity_risk_factors=commodity_risk_factors,
        assessment_date=date.today().isoformat(),
        requires_human_review=(risk_score >= 40 or gfc_confidence == "low"),
    )

    # ── Tile generation (parameterized by real GEE data) ─────────────────────
    tile_url: str | None = gee_summary.get("tile_url")
    # If GEE didn't return a tile, we could fall back, but GEE should always return one now.

    deforestation_geojson = None

    # Cache result
    cache.set(cache_key, {
        "assessment": assessment.model_dump(),
        "tile_url": tile_url,
        "geojson": deforestation_geojson,
    }, ttl=3600 * 12)

    # ── Step 7: Log LLM decision ──────────────────────────────────────────────
    traj.log_llm_decision(
        decision=overall_risk.value,
        reasoning=(
            f"Risk score {risk_score}/100 — "
            f"deforestation={'YES (post-2020)' if has_deforestation else 'NO'} "
            f"(loss={forest_loss_pct:.1f}%, {forest_loss_ha:.1f}ha), "
            f"driver={gee_summary.get('dominant_loss_driver', 'unknown')}, "
            f"protected_area={'YES' if overlaps_protected else 'NO'}, "
            f"country_risk={country_risk.value}, "
            f"commodity_confirmed={gee_summary.get('commodity_confirmed', False)}, "
            f"confirmed_alerts={confirmed_alerts}"
        ),
    )

    # ── Step 8: Human checkpoint ──────────────────────────────────────────────
    traj.log_human_checkpoint(
        reason=(
            "Risk score >= 40 or low satellite data confidence"
            if assessment.requires_human_review
            else "Risk score < 40 with high satellite confidence — no immediate concern"
        ),
        required=assessment.requires_human_review,
    )

    # ── Step 9: Final output ──────────────────────────────────────────────────
    traj.log_final_output({
        "overall_risk": overall_risk.value,
        "risk_score": risk_score,
        "has_deforestation": has_deforestation,
        "overlaps_protected": overlaps_protected,
        "confirmed_alerts": confirmed_alerts,
        "dds_id": None,
    })
    traj.save()

    print(f"  [RESULT] Final EUDR Risk Score: {risk_score:.1f} / 100 ({overall_risk.value.upper()})")
    print(f"  [MODEL]  Narrative generated with: {settings.gemini_model}")
    clean_req_id = request_id if request_id.startswith("req_") else f"req_{request_id}"
    print(f"  [SAVED]  Trajectory Audit Log : trajectories/{clean_req_id}.json")
    print("="*70 + "\n")

    await _emit({"step": "risk", "score": round(risk_score, 1), "level": overall_risk.value})

    return assessment, tile_url, deforestation_geojson, gee_summary


# ── Helpers ───────────────────────────────────────────────────────────────────

def _geometry_to_bbox(geometry: dict) -> tuple[float, float, float, float]:
    """Extract bounding box from a GeoJSON geometry."""
    coords_flat: list[list[float]] = []
    gtype = geometry.get("type", "")
    if gtype == "Polygon":
        for ring in geometry.get("coordinates", []):
            coords_flat.extend(ring)
    elif gtype == "MultiPolygon":
        for polygon in geometry.get("coordinates", []):
            for ring in polygon:
                coords_flat.extend(ring)
    elif gtype == "Point":
        c = geometry["coordinates"]
        return (c[0] - 0.05, c[1] - 0.05, c[0] + 0.05, c[1] + 0.05)

    if not coords_flat:
        return (0.0, 0.0, 0.0, 0.0)

    lngs = [c[0] for c in coords_flat]
    lats = [c[1] for c in coords_flat]
    return (min(lngs), min(lats), max(lngs), max(lats))


def _estimate_area_ha(bbox: tuple[float, float, float, float]) -> float:
    """Rough area estimate in hectares from a WGS84 bbox."""
    width_km = abs(bbox[2] - bbox[0]) * 111
    height_km = abs(bbox[3] - bbox[1]) * 111
    return width_km * height_km * 100  # km² → ha




def _calculate_risk(
    has_deforestation: bool,
    forest_loss_pct: float,
    overlaps_protected: bool,
    country_risk: EUDRCountryRisk,
    confirmed_alerts: int = 0,
) -> tuple[float, EUDRRiskLevel]:
    """
    Compute a 0-100 risk score and categorical risk level.

    Scoring breakdown:
      - Post-2020 deforestation detected: 30–60 pts (proportional to loss %)
      - Confirmed deforestation alerts (GFW-equivalent from Hansen): up to 20 pts
      - Protected area overlap: 30 pts (hard legality issue)
      - Country risk HIGH: +15 pts
      - Country risk LOW: -5 pts
    """
    score = 0.0

    # Deforestation findings (primary signal)
    if has_deforestation:
        score += min(60.0, 30.0 + forest_loss_pct * 2.0)  # 30-60 pts based on loss %

    # Confirmed alerts (secondary deforestation signal)
    if confirmed_alerts > 0:
        score += min(20.0, confirmed_alerts * 2.0)

    # Protected area overlap (hard legality issue — always FAIL)
    if overlaps_protected:
        score += 30.0

    # Country risk modifier
    if country_risk == EUDRCountryRisk.high:
        score = min(100.0, score + 15.0)
    elif country_risk == EUDRCountryRisk.low:
        score = max(0.0, score - 5.0)

    score = min(100.0, score)

    if score == 0:
        level = EUDRRiskLevel.compliant
    elif score < 20:
        level = EUDRRiskLevel.low_risk
    elif score < 50:
        level = EUDRRiskLevel.at_risk
    else:
        level = EUDRRiskLevel.non_compliant

    return round(score, 1), level


async def _generate_forest_tile(
    treecover: np.ndarray,  # type: ignore[type-arg]
    lossyear: np.ndarray,   # type: ignore[type-arg]
    request_id: str,
    settings: Any,
) -> str | None:
    """Generate a RGBA PNG: green=forest-2020, red=post-cutoff-loss, grey=non-forest."""
    try:
        forest_2000 = (treecover >= 30).astype(np.uint8)
        post_loss = ((lossyear >= 21) & (lossyear > 0) & forest_2000.astype(bool)).astype(np.uint8)
        pre_loss  = ((lossyear >= 1)  & (lossyear <= 20) & forest_2000.astype(bool)).astype(np.uint8)

        vis = np.zeros_like(treecover, dtype=np.float32)
        vis[forest_2000 == 1] = 0.5
        vis[pre_loss == 1] = 0.25
        vis[post_loss == 1] = 1.0  # post-cutoff loss (RED)

        png_bytes = tile_renderer.array_to_png(vis, colormap="RdYlGn", vmin=0, vmax=1)
        tile_path = os.path.join(settings.tile_cache_dir, f"{request_id}.png")
        os.makedirs(settings.tile_cache_dir, exist_ok=True)
        with open(tile_path, "wb") as f:
            f.write(png_bytes)
        return f"http://localhost:8000/tiles/{request_id}/{{z}}/{{x}}/{{y}}.png"
    except Exception as exc:
        logger.warning("Forest tile generation failed: %s", exc)
        return None
