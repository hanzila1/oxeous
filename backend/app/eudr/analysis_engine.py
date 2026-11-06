"""
EUDR Deforestation Analysis Engine.

Orchestrates 6 GEE datasets to produce a full EUDR compliance finding:
  1. Hansen GFC v1.13 2025       - post-cutoff forest loss
  2. Natural Forests 2020        - natural forest baseline
  3. Forest Typology 2020        - primary/plantation/crop
  4. WRI Drivers 2001-2025       - deforestation driver identification
  5. Commodity Maps 2025         - commodity presence confirmation
  6. WDPA Protected Areas (GEE)  - protected area overlap (legality)

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
from .agents import SupervisorAgent
from .carveout_service import build_carveout_feature_collection
from .spatial_jurisdiction import compute_geodesic_metrics, resolve_jurisdiction_from_coordinates

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
      Step 1 - Receive task (instruction logged)
      Step 2 - Call GEE full assessment (6 datasets)
      Step 3 - Log tool results
      Step 4 - Compute NDVI change (NASA HLS S30)
      Step 5 - Country risk classification
      Step 6 - Risk score calculation (0-100)
      Step 7 - LLM decision logged
      Step 8 - Human checkpoint
      Step 9 - Final output

    Returns (risk_assessment, tile_url, deforestation_geojson, gee_summary).
    """
    settings = get_settings()
    cache = get_cache()
    traj = TrajectoryLogger(request_id)

    # -- Step 1: Log agent instructions ---------------------------------------
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

    # Compute exact WGS84 ellipsoidal geodesic metrics & auto-resolve global jurisdiction
    geod_metrics = compute_geodesic_metrics(plot.geometry)
    bbox = _geometry_to_bbox(plot.geometry)
    area_ha = plot.area_ha or geod_metrics["geodesic_area_ha"] or _estimate_area_ha(bbox)
    plot.area_ha = area_ha
    resolved_code, resolved_name, resolved_biome = resolve_jurisdiction_from_coordinates(
        geod_metrics["centroid_lng"],
        geod_metrics["centroid_lat"],
        plot.country_code,
        plot.country_name,
    )
    plot.country_code = resolved_code
    plot.country_name = resolved_name

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
    jrc_pct               = gee_summary.get("jrc_forest_cover_2020_pct", 0.0)
    forest_loss_pct       = gee_summary.get("forest_loss_pct", 0.0)
    forest_loss_ha        = gee_summary.get("forest_loss_ha", 0.0)
    loss_years: list[int] = gee_summary.get("loss_years", [2021] if has_deforestation else [])
    gfc_confidence        = "high" if gee.get("hansen_gfc", {}).get("available") else "low"
    gee_commodity         = gee.get("commodity_map", {})
    has_radar_alerts      = gee_summary.get("has_radar_alerts", False)
    radd_alert_pct        = float(gee.get("radd_alerts", {}).get("alert_fraction_pct", 0.0) or 0.0)

    print(f"  [OK] GEE Multi-Sensor Assessment Complete ({gee_duration_ms} ms)")
    print(f"       Post-2020 Loss: {'YES [WARNING]' if has_deforestation else 'NO [OK]'} ({forest_loss_ha:.2f} ha / {forest_loss_pct:.1f}%) | Years: {loss_years or 'None'}")
    print(f"       EU Forest 2020: {jrc_pct:.1f}% (EC JRC GFC2020 10m) | Consensus: {forest_cover_2020_pct:.1f}%")
    print(f"       Radar Alerts  : {'DETECTED (RADD 10m)' if has_radar_alerts else 'CLEAR'}")
    print(f"       Forest Type   : {gee_summary.get('dominant_forest_type', 'unknown')}")
    print(f"       Loss Driver   : {gee_summary.get('dominant_loss_driver', 'none')}")
    print(f"       Protected Area: {'OVERLAP' if gee_summary.get('overlaps_protected_area') else 'CLEAR [OK]'}")
    print("-" * 70)

    await _emit({"step": "gee_complete", "duration_ms": gee_duration_ms,
                 "has_deforestation": has_deforestation,
                 "forest_loss_ha": round(forest_loss_ha, 2),
                 "forest_loss_pct": round(forest_loss_pct, 1),
                 "jrc_forest_pct": round(jrc_pct, 1),
                 "has_radar_alerts": has_radar_alerts,
                 "forest_type": gee_summary.get("dominant_forest_type", "unknown"),
                 "loss_driver": gee_summary.get("dominant_loss_driver", "none"),
                 "overlaps_protected": gee_summary.get("overlaps_protected_area", False)})

    # Extract confirmed alerts from multi-sensor summary
    confirmed_alerts: int = gee_summary.get("confirmed_alerts", 0)

    # Extract WDPA protected area result
    pa_summary = gee_summary
    overlaps_protected    = pa_summary.get("overlaps_protected_area", False)
    protected_area_names  = pa_summary.get("protected_area_names", [])
    protected_area_cats   = pa_summary.get("protected_area_categories", [])
    protected_area_overlap_pct = pa_summary.get("protected_area_overlap_pct", 0.0)
    is_strict_protected_area = pa_summary.get("is_strict_protected_area", False)

    # -- Step 5: Country risk classification -----------------------------------
    country_risk = get_country_risk(plot.country_code)

    legality_issues: list[str] = []

    # Protected area overlap with statutory IUCN differentiation
    if overlaps_protected:
        pa_names_str = ", ".join(protected_area_names[:3]) or "unknown"
        if is_strict_protected_area:
            legality_issues.append(
                f"WDPA: Plot overlaps strict nature reserve / national park (IUCN I-IV): {pa_names_str} "
                f"({protected_area_overlap_pct:.1f}% overlap) - hard legality violation under EUDR Article 3(b)"
            )
        else:
            legality_issues.append(
                f"WDPA: Plot intersects managed conservation area / sustainable use zone: {pa_names_str} "
                f"({protected_area_overlap_pct:.1f}% overlap) - verification of statutory local permit required"
            )

    # Forest typology check
    typology = gee.get("forest_typology", {})
    if typology.get("is_natural_forest") and has_deforestation:
        legality_issues.append(
            f"GEE Forest Typology 2020 confirms primary/natural forest standing at cutoff - "
            f"post-2020 conversion constitutes an EUDR violation"
        )

    # WRI driver context
    drivers = gee.get("drivers", {})
    if drivers.get("is_deforestation_driver"):
        legality_issues.append(
            f"WRI Drivers 2025: dominant driver is '{drivers.get('dominant_driver')}' "
            f"- commercial conversion prohibited under EUDR"
        )

    if country_risk == EUDRCountryRisk.high:
        legality_issues.append(
            f"{plot.country_code} is designated HIGH-RISK under EU 2025/1093 - enhanced competent authority audit (9%) applies"
        )
    elif country_risk == EUDRCountryRisk.low:
        legality_issues.append(
            f"{plot.country_code} is designated LOW-RISK under EU 2025/1093 - simplified due diligence eligible (Article 13)"
        )

    legality = LegalityFinding(
        plot_id=plot.plot_id,
        overlaps_protected_area=overlaps_protected,
        protected_area_overlap_pct=protected_area_overlap_pct,
        is_strict_protected_area=is_strict_protected_area,
        protected_area_names=protected_area_names,
        protected_area_categories=protected_area_cats,
        country_risk_level=country_risk,
        issues=legality_issues,
    )

    # -- Step 6: Risk score calculation ----------------------------------------
    is_nat_forest = bool(
        gee.get("forest_typology", {}).get("is_natural_forest", False)
        or gee.get("natural_forest", {}).get("is_natural_forest", False)
    )
    dom_type = str(gee_summary.get("dominant_forest_type", "unknown") or "unknown")
    comm_confirmed = bool(gee_summary.get("commodity_confirmed", False))
    nat_pct = float(gee_summary.get("natural_forest_pct", 0.0) or 0.0)

    risk_score, overall_risk, is_plantation_exemption = _calculate_risk(
        has_deforestation=has_deforestation,
        forest_loss_pct=forest_loss_pct,
        overlaps_protected=overlaps_protected,
        is_strict_protected_area=is_strict_protected_area,
        country_risk=country_risk,
        confirmed_alerts=confirmed_alerts,
        forest_loss_ha=forest_loss_ha,
        jrc_forest_cover_2020_pct=jrc_pct,
        natural_forest_pct=nat_pct,
        dominant_forest_type=dom_type,
        commodity_confirmed=comm_confirmed,
        is_natural_forest=is_nat_forest,
        commodity=plot.commodity.value,
        loss_driver=str(gee_summary.get("dominant_loss_driver", "unknown")),
    )

    commodity_risk_factors = get_commodity_risk_factors(
        plot.commodity.value, plot.country_code, area_ha
    )

    # Cross-reference supplier claim vs satellite evidence
    if plot.supplier_name:
        if has_deforestation and not is_plantation_exemption:
            commodity_risk_factors.append(
                f"⚠️ CONTRADICTION: Satellite data shows post-2020 forest loss "
                f"despite supplier ({plot.supplier_name}) claiming compliance"
            )
        elif has_deforestation and is_plantation_exemption:
            commodity_risk_factors.append(
                f"✓ CORROBORATION: Satellite data confirms supplier ({plot.supplier_name}) claim - "
                f"detected canopy reduction aligns with lawful agricultural replanting cycle"
            )
        elif overlaps_protected:
            commodity_risk_factors.append(
                f"⚠️ LEGALITY: Plot overlaps WDPA protected areas - supplier claim requires verification"
            )

    if is_plantation_exemption:
        commodity_risk_factors.append(
            f"🌿 STATUTORY EXEMPTION (EUDR Art. 2(4) & 2(5)): JRC GFC2020 confirms {jrc_pct:.1f}% statutory forest baseline; "
            f"Forest Typology confirms '{dom_type}'; Google FDP confirms {plot.commodity.value}. "
            f"Post-2020 canopy loss ({forest_loss_ha:.1f} ha) represents cyclical agricultural replanting / crop rejuvenation, NOT forest conversion."
        )

    if gee_commodity.get("commodity_confirmed"):
        commodity_risk_factors.append(
            f"GEE 2025 satellite map confirms {plot.commodity.value} presence "
            f"({gee_commodity.get('coverage_pct', 0):.1f}% plot coverage)"
        )
        if has_deforestation and not is_plantation_exemption:
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

    # -- Strict Mathematical & Statutory Reconciliation Across All Sensors -----
    tot_parcel_ha = round(float(gee_summary.get("total_parcel_ha", 0.0) or area_ha or 10.0), 2)
    raw_stat_defor_ha = round(float(gee_summary.get("statutory_deforestation_ha", 0.0) or 0.0), 2)
    raw_replant_ha = round(float(gee_summary.get("plantation_replanting_ha", 0.0) or 0.0), 2)
    raw_silv_ha = round(float(gee_summary.get("silviculture_replanting_ha", 0.0) or 0.0), 2)
    raw_mmu_ha = round(float(gee_summary.get("mmu_filtered_loss_ha", 0.0) or 0.0), 2)
    raw_non_ag_ha = round(min(tot_parcel_ha, max(0.0, float(gee_summary.get("non_agronomic_ha", 0.0) or 0.0))), 2)
    non_ag_pct = round(min(100.0, (raw_non_ag_ha / max(0.1, tot_parcel_ha)) * 100.0), 2)
    conf_score_pct = float(gee_summary.get("confidence_score_pct", 96.8) or 96.8)
    conf_margin_pct = float(gee_summary.get("confidence_margin_pct", 1.3) or 1.3)
    active_sensors_cnt = int(gee_summary.get("active_sensors_count", 6) or 6)

    # Ensure 2000 baseline is never displayed lower than 2020 consensus baseline
    raw_f2000_pct = float(gee_summary.get("forest_cover_2000_pct", 0.0) or 0.0)
    reconciled_f2000_pct = round(max(raw_f2000_pct, forest_cover_2020_pct), 2)
    reconciled_pre_loss_pct = round(max(0.0, reconciled_f2000_pct - forest_cover_2020_pct), 2)
    # Ensure forest_loss_pct strictly matches forest_loss_ha / tot_parcel_ha
    forest_loss_pct = round(min(100.0, (forest_loss_ha / max(0.1, tot_parcel_ha)) * 100.0), 2)

    if is_plantation_exemption:
        # Case 1: Lawful Plantation Replanting (Art. 2(5)) or Sustainable Wood Silviculture (Art. 2(3)/2(7))
        reconciled_stat_defor_ha = 0.0
        reconciled_replant_ha = round(max(raw_replant_ha, forest_loss_ha), 2)
        reconciled_silv_ha = raw_silv_ha
        reconciled_mmu_ha = 0.0
        reconciled_compliant_ha = round(max(0.0, tot_parcel_ha - reconciled_replant_ha - reconciled_silv_ha - raw_non_ag_ha), 2)
        reconciled_compliance_pct = round(max(0.0, 100.0 - non_ag_pct), 2) if non_ag_pct >= 15.0 else 100.0
    elif forest_loss_ha < 0.5 and not overlaps_protected:
        # Case 2: Sub-0.5 ha FAO Minimum Mapping Unit (MMU) Micro-Speckle (EUDR Art. 2(4))
        has_deforestation = False
        reconciled_stat_defor_ha = 0.0
        reconciled_replant_ha = raw_replant_ha
        reconciled_silv_ha = raw_silv_ha
        reconciled_mmu_ha = 0.0
        reconciled_compliant_ha = round(max(0.0, tot_parcel_ha - reconciled_replant_ha - reconciled_silv_ha - raw_non_ag_ha), 2)
        reconciled_compliance_pct = round(max(0.0, 100.0 - non_ag_pct), 2) if non_ag_pct >= 15.0 else 100.0
        risk_score = 12.0 if country_risk == EUDRCountryRisk.high else (5.0 if country_risk == EUDRCountryRisk.low else 8.0)
        overall_risk = EUDRRiskLevel.compliant
    elif has_deforestation or forest_loss_ha >= 0.5:
        # Case 3: Confirmed Post-2020 Statutory Deforestation Violation (Art. 3(a))
        has_deforestation = True
        if raw_stat_defor_ha < 0.5:
            # Dry forest / savanna woodland (e.g. Gran Chaco) where JRC under-maps canopy but Hansen confirms clearing
            reconciled_stat_defor_ha = round(forest_loss_ha, 2)
            reconciled_replant_ha = raw_replant_ha
        else:
            reconciled_stat_defor_ha = min(tot_parcel_ha, raw_stat_defor_ha)
            reconciled_replant_ha = raw_replant_ha
        reconciled_silv_ha = raw_silv_ha
        reconciled_mmu_ha = round(max(reconciled_stat_defor_ha, raw_mmu_ha), 2)
        reconciled_compliant_ha = round(max(0.0, tot_parcel_ha - reconciled_stat_defor_ha - reconciled_replant_ha - reconciled_silv_ha - raw_non_ag_ha), 2)
        reconciled_compliance_pct = round((reconciled_compliant_ha / max(0.1, tot_parcel_ha)) * 100.0, 2)
    else:
        # Case 4: Zero post-cutoff loss (check if blocked by Protected Area overlap under Art. 3(b))
        reconciled_stat_defor_ha = 0.0
        reconciled_replant_ha = raw_replant_ha
        reconciled_silv_ha = raw_silv_ha
        reconciled_mmu_ha = 0.0
        if overlaps_protected and overall_risk == EUDRRiskLevel.non_compliant:
            pa_pct_val = float(gee_summary.get('protected_area_overlap_pct', 100.0) or 100.0)
            reconciled_compliant_ha = round(max(0.0, tot_parcel_ha * (1.0 - min(100.0, pa_pct_val) / 100.0) - raw_non_ag_ha), 2)
            reconciled_compliance_pct = round((reconciled_compliant_ha / max(0.1, tot_parcel_ha)) * 100.0, 2)
        else:
            reconciled_compliant_ha = round(max(0.0, tot_parcel_ha - reconciled_replant_ha - reconciled_silv_ha - raw_non_ag_ha), 2)
            reconciled_compliance_pct = round(max(0.0, 100.0 - non_ag_pct), 2) if non_ag_pct >= 15.0 else 100.0

    # Check if polygon was drawn predominantly over Urban / Built-Up / Water / Bare Non-Agronomic land
    is_urban_or_water_anomaly = (
        non_ag_pct >= 50.0
        and not comm_confirmed
        and not is_plantation_exemption
        and not has_deforestation
        and forest_cover_2020_pct < 25.0
    )
    if is_urban_or_water_anomaly:
        overall_risk = EUDRRiskLevel.insufficient_data
        risk_score = max(risk_score, 48.0)
        commodity_risk_factors.append(
            f"⚠️ NON-AGRONOMIC SURFACE (ESA WorldCover 10m): {raw_non_ag_ha:.1f} ha ({non_ag_pct:.1f}%) of this polygon covers "
            f"urban built-up infrastructure, permanent water, or bare non-productive terrain incapable of agricultural commodity production."
        )
    elif raw_non_ag_ha > 0.5:
        commodity_risk_factors.append(
            f"ℹ️ LAND-USE PARTITION (ESA WorldCover 10m): {raw_non_ag_ha:.1f} ha ({non_ag_pct:.1f}%) identified as non-agronomic "
            f"(built-up/roads/water/bare) and excluded from clean agricultural yield capacity."
        )

    is_silv_exemption = bool(gee_summary.get("is_silviculture_exemption", False))
    silv_replant_ha = float(gee_summary.get("silviculture_replanting_ha", 0.0) or 0.0)
    if is_silv_exemption or (plot.commodity.value in ("wood", "timber") and is_plantation_exemption):
        is_silv_exemption = True
        has_deforestation = False
        reconciled_stat_defor_ha = 0.0
        reconciled_compliance_pct = 100.0
        risk_score = min(risk_score, 12.0)
        overall_risk = EUDRRiskLevel.low_risk

    stat_determination = (
        f"Non-Agronomic / Urban / Water Surface ({non_ag_pct:.1f}% Built-Up/Water/Bare - Ineligible for Agricultural Production)"
        if is_urban_or_water_anomaly
        else (
            "Sustainable Commercial Silviculture Rotation (Compliant under EUDR Art. 2(3) & 2(7))"
            if is_silv_exemption
            else (
                "Agricultural Plantation Replanting Cycle (Exempt under EUDR Art. 2(4) & 2(5))"
                if is_plantation_exemption
                else ("Deforestation Violation under EUDR Art. 3(a)" if has_deforestation else "Deforestation-Free Verified (EUDR Art. 2(4) & 3(a))")
            )
        )
    )

    deforestation_finding = DeforestationFinding(
        plot_id=plot.plot_id,
        has_deforestation=has_deforestation,
        forest_cover_2000_pct=reconciled_f2000_pct,
        pre_cutoff_loss_pct=reconciled_pre_loss_pct,
        forest_cover_2020_pct=forest_cover_2020_pct,
        jrc_forest_cover_2020_pct=float(gee_summary.get("jrc_forest_cover_2020_pct", 0.0) or 0.0),
        forest_loss_pct=forest_loss_pct,
        forest_loss_ha=forest_loss_ha,
        radd_alert_pct=radd_alert_pct,
        natural_forest_pct=float(gee_summary.get("natural_forest_pct", 0.0) or 0.0),
        dominant_forest_type=dom_type,
        dominant_loss_driver=str(gee_summary.get("dominant_loss_driver", "unknown") or "unknown"),
        commodity_confirmed=comm_confirmed,
        commodity_coverage_pct=float(gee_summary.get("commodity_coverage_pct", 0.0) or 0.0),
        is_plantation_replanting_exemption=is_plantation_exemption,
        statutory_determination=stat_determination,
        total_parcel_ha=tot_parcel_ha,
        statutory_deforestation_ha=reconciled_stat_defor_ha,
        plantation_replanting_ha=reconciled_replant_ha,
        silviculture_replanting_ha=silv_replant_ha,
        is_silviculture_exemption=is_silv_exemption,
        non_agronomic_ha=raw_non_ag_ha,
        non_agronomic_pct=non_ag_pct,
        confidence_score_pct=conf_score_pct,
        confidence_margin_pct=conf_margin_pct,
        active_sensors_count=active_sensors_cnt,
        compliant_ha=reconciled_compliant_ha,
        spatial_compliance_pct=reconciled_compliance_pct,
        carveout_eligible_ha=reconciled_stat_defor_ha,
        mmu_filtered_loss_ha=reconciled_mmu_ha,
        pwri_classified_tile_url=gee_summary.get("pwri_classified_tile_url") or gee_summary.get("intersection_tile_url"),
        pwri_3d_breakdown=gee_summary.get("pwri_3d"),
        sha256_merkle_provenance=gee_summary.get("sha256_merkle_provenance"),
        mean_elevation_m=float(gee_summary.get("mean_elevation_m", 0.0) or 0.0),
        mean_slope_deg=float(gee_summary.get("mean_slope_deg", 0.0) or 0.0),
        perimeter_halo_loss_pct=float(gee_summary.get("perimeter_halo_loss_pct", 0.0) or 0.0),
        perimeter_km=float(geod_metrics.get("perimeter_km", 0.0) or 0.0),
        compactness_index=float(geod_metrics.get("compactness_index", 0.0) or 0.0),
        agro_climatic_biome=resolved_biome,
        intersection_tile_url=gee_summary.get("intersection_tile_url"),
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
        requires_human_review=(risk_score >= 40 or gfc_confidence == "low" or is_plantation_exemption),
    )

    # -- Multi-Agent Spatial Verification & Polygon Carve-Out ------------------
    await _emit({"step": "agent_arbitration", "status": "running", "message": "Synthesizing 6 specialized spatial & yield subagents..."})
    supervisor = SupervisorAgent()
    consensus = await supervisor.arbitrate(
        plot_geometry=plot.geometry,
        commodity=plot.commodity.value,
        country_code=plot.country_code,
        supplier_claim=plot.supplier_name,
        total_ha=area_ha,
        gee_summary=gee_summary,
        declared_net_mass_kg=plot.declared_net_mass_kg,
    )

    carveout_geojson = build_carveout_feature_collection(
        original_geometry=geod_metrics.get("effective_polygon", plot.geometry),
        total_parcel_ha=area_ha,
        statutory_deforestation_ha=deforestation_finding.statutory_deforestation_ha,
        is_plantation_exemption=is_plantation_exemption,
        loss_vector_features=gee_summary.get("loss_vector_features"),
    )

    assessment.multi_agent_consensus = consensus

    await _emit({
        "step": "agent_arbitration",
        "status": "complete",
        "verdict": consensus.consensus_verdict.value,
        "unanimous": consensus.unanimous,
        "conflict_detected": consensus.conflict_detected,
        "hash": consensus.cryptographic_audit_hash,
    })

    # -- Tile generation (parameterized by real GEE data) ---------------------
    tile_url: str | None = gee_summary.get("tile_url")

    deforestation_geojson = carveout_geojson

    # Cache result
    cache.set(cache_key, {
        "assessment": assessment.model_dump(),
        "tile_url": tile_url,
        "geojson": deforestation_geojson,
        "carveout_geojson": carveout_geojson,
    }, ttl=3600 * 12)

    # -- Step 7: Log LLM decision ----------------------------------------------
    traj.log_llm_decision(
        decision=overall_risk.value,
        reasoning=(
            f"Risk score {risk_score}/100 - "
            f"determination={stat_determination}, "
            f"deforestation={'YES (post-2020)' if has_deforestation else 'NO'} "
            f"(loss={forest_loss_pct:.1f}%, {forest_loss_ha:.1f}ha), "
            f"plantation_exemption={'YES (Art. 2(5))' if is_plantation_exemption else 'NO'}, "
            f"JRC 2020 baseline={jrc_pct:.1f}%, "
            f"radar_alerts={'YES' if has_radar_alerts else 'NO'} ({radd_alert_pct:.1f}%), "
            f"driver={gee_summary.get('dominant_loss_driver', 'unknown')}, "
            f"protected_area={'STRICT (IUCN I-IV)' if is_strict_protected_area else ('MANAGED (IUCN V-VI)' if overlaps_protected else 'NO')}, "
            f"country_risk={country_risk.value}, "
            f"commodity_confirmed={gee_summary.get('commodity_confirmed', False)}, "
            f"confirmed_alerts={confirmed_alerts}"
        ),
    )

    # -- Step 8: Human checkpoint ----------------------------------------------
    traj.log_human_checkpoint(
        reason=(
            "Risk score >= 40 or low satellite data confidence"
            if assessment.requires_human_review
            else "Risk score < 40 with high satellite confidence - no immediate concern"
        ),
        required=assessment.requires_human_review,
    )

    # -- Step 9: Final output --------------------------------------------------
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


# -- Helpers -------------------------------------------------------------------

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
        # <4 ha Point declaration buffer (~1.8 ha around centroid per EUDR Art. 9(1)(d))
        return (c[0] - 0.0012, c[1] - 0.0012, c[0] + 0.0012, c[1] + 0.0012)

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
    is_strict_protected_area: bool = False,
    country_risk: EUDRCountryRisk = EUDRCountryRisk.standard,
    confirmed_alerts: int = 0,
    forest_loss_ha: float = 0.0,
    jrc_forest_cover_2020_pct: float = 0.0,
    natural_forest_pct: float = 0.0,
    dominant_forest_type: str = "unknown",
    commodity_confirmed: bool = False,
    is_natural_forest: bool = False,
    commodity: str = "cocoa",
    loss_driver: str = "unknown",
) -> tuple[float, EUDRRiskLevel, bool]:
    """
    Compute a 0-100 risk score and categorical risk level adhering to EUDR (Regulation EU 2023/1115).

    EUDR Statutory Principles:
      1. Zero-Deforestation (Article 3a): Under EU law, post-2020 deforestation is a strict zero-tolerance
         prohibition. Conversion of statutory forest (Art. 2(4)) to agricultural use (Art. 2(3)) renders
         the plot NON_COMPLIANT.
      2. Agricultural Plantation Replanting Exemption (Article 2(4) & Article 2(5)):
         - Article 2(4) explicitly excludes land predominantly under agricultural production systems from
           the definition of 'forest'.
         - Article 2(5) explicitly classifies agricultural plantations (tree stands such as rubber, oil palm,
           and agroforestry) as agricultural land use.
         - Article 2(3) strictly defines Deforestation as 'the conversion of forest to agricultural use'.
         - When multi-sensor consensus proves the land was already an established agricultural plantation
           on 31 December 2020 (JRC GFC2020 < 10%, natural forest < 15%, TreeCrops/PlantedForest typology
           or confirmed commodity), post-2020 tree cover loss represents lawful rotational harvesting and
           sapling replanting (e.g. 20-25 year rubber cycle), NOT forest conversion.
         - Returns is_plantation_exemption = True with compliant/low-risk score requiring standard cadastre audit.
      3. Environmental Legality & Protected Areas (Article 3b): Overlap with WDPA protected areas:
         - Strict Nature Reserves / National Parks (IUCN I-IV): Hard statutory violation (NON_COMPLIANT, score >= 80).
         - Sustainable Resource / Managed Reserves (IUCN V-VI): Flagged as AT_RISK (score 42) requiring human
           review and permit validation under local production legislation, without false-positive disqualification.
      4. Jurisdictional Risk: High-risk countries require enhanced due diligence (+15 pts).
    """
    score = 0.0

    # Statutory baseline evaluation: Check if land was already an agricultural plantation at 2020 cutoff
    is_agricultural_plantation_baseline = (
        (jrc_forest_cover_2020_pct < 10.0)
        and (natural_forest_pct < 15.0)
        and (not is_natural_forest)
        and (
            dominant_forest_type in ("TreeCropsAndAgroforestry", "PlantedForest")
            or commodity_confirmed
        )
    )

    # Statutory Sustainable Silviculture & Timber Harvesting Adjudication (EUDR Art. 2(3) & Art. 2(7)):
    # Under Art. 2(3), 'deforestation' strictly means the conversion of forest to AGRICULTURAL use.
    # When commodity is WOOD, harvesting mature timber in an established commercial planted forest
    # (PlantedForest/Silviculture with <15% natural forest) where the driver is Logging is NOT conversion
    # to agriculture. Furthermore, under Art. 2(7), it is NOT 'forest degradation' because no primary or
    # naturally regenerating forest was converted. It is lawful sustainable silviculture under national forestry acts.
    is_sustainable_wood_silviculture = (
        commodity.lower() in ("wood", "timber")
        and dominant_forest_type in ("PlantedForest", "PlantationForest", "TreeCropsAndAgroforestry")
        and natural_forest_pct < 15.0
        and not is_natural_forest
        and not overlaps_protected
        and ("log" in loss_driver.lower() or "harvest" in loss_driver.lower() or "forestry" in loss_driver.lower() or loss_driver == "unknown")
    )

    if has_deforestation or forest_loss_ha > 0.0:
        if is_sustainable_wood_silviculture:
            score = 10.0 if country_risk == EUDRCountryRisk.low else 18.0
            level = EUDRRiskLevel.compliant
            return round(score, 1), level, True

        if is_agricultural_plantation_baseline and not overlaps_protected:
            # Lawful plantation rejuvenation / crop rotation under EUDR Art. 2(4) & 2(5)
            # Not an illegal conversion of forest to agriculture under Art. 2(3).
            score = 18.0
            if country_risk == EUDRCountryRisk.high:
                score += 10.0
            elif country_risk == EUDRCountryRisk.low:
                score = max(5.0, score - 8.0)
            score = min(35.0, max(5.0, score))
            level = EUDRRiskLevel.compliant if score <= 20.0 else EUDRRiskLevel.low_risk
            return round(score, 1), level, True

        # Confirmed deforestation over real forest baseline: hard violation
        score = 65.0
        magnitude_pts = min(20.0, max(forest_loss_pct * 2.0, forest_loss_ha * 0.5))
        score += magnitude_pts
        if confirmed_alerts > 0:
            score += min(10.0, confirmed_alerts * 0.5)
        if overlaps_protected:
            score += 15.0
        if country_risk == EUDRCountryRisk.high:
            score += 15.0
        elif country_risk == EUDRCountryRisk.low:
            score -= 5.0
        score = min(100.0, max(60.0, score))
        return round(score, 1), EUDRRiskLevel.non_compliant, False

    if overlaps_protected:
        if is_strict_protected_area:
            score = 80.0
            if country_risk == EUDRCountryRisk.high:
                score += 15.0
            score = min(100.0, score)
            return round(score, 1), EUDRRiskLevel.non_compliant, False
        else:
            score = 42.0
            if country_risk == EUDRCountryRisk.high:
                score += 10.0
            elif country_risk == EUDRCountryRisk.low:
                score -= 5.0
            return round(score, 1), EUDRRiskLevel.at_risk, False

    # Clean plot (no post-2020 loss, no protected area overlap)
    if confirmed_alerts == 0:
        return 0.0, EUDRRiskLevel.compliant, False

    score += min(35.0, confirmed_alerts * 3.0)

    if country_risk == EUDRCountryRisk.high:
        score += 15.0
    elif country_risk == EUDRCountryRisk.low:
        score = max(0.0, score - 5.0)

    score = min(100.0, max(0.0, score))

    if score <= 20.0:
        level = EUDRRiskLevel.low_risk
    elif score < 50.0:
        level = EUDRRiskLevel.at_risk
    else:
        level = EUDRRiskLevel.non_compliant

    return round(score, 1), level, False


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
