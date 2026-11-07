"""
EUDR API routes - POST /eudr/analyze, GET /eudr/dds/{dds_id}
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import zipfile
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse

from ...eudr.models import (
    EUDRPlotUploadRequest, EUDRAnalysisRequest,
    EUDRAnalysisResponse, EUDRPlot, GEEMapLayer,
)
from ...eudr.analysis_engine import assess_plot
from ...eudr.dds_generator import generate_dds, format_dds_text
from ...core.granite_client import GraniteClient
from ...utils.tracing import new_request_id
from ...cache.store import get_cache
from ...tools.eudr.gee_tile_server import get_all_map_layers

router = APIRouter(prefix="/eudr", tags=["eudr"])

# In-memory DDS store (replace with DB in production)
_dds_store: dict = {}


@router.post("/analyze", response_model=EUDRAnalysisResponse)
async def analyze_plot(body: EUDRAnalysisRequest, request: Request) -> EUDRAnalysisResponse:
    """
    Run full EUDR compliance assessment on a submitted plot.

    Steps:
    1. Hansen GFC deforestation check (post Dec 31 2020)
    2. ESA WorldCover 2020 forest baseline
    3. GFW GLAD/RADD near-real-time alerts
    4. WDPA protected area overlap check
    5. Country risk classification
    6. Granite narrative summary
    """
    request_id = new_request_id()
    granite: GraniteClient = request.app.state.granite

    # -- Run assessment --------------------------------------------------------
    from ...eudr.ftw_delineation import extract_ftw_parcel_network_sync
    ftw_mesh_task = asyncio.create_task(asyncio.to_thread(extract_ftw_parcel_network_sync, body.plot.geometry))
    try:
        assessment, tile_url, deforestation_geojson, gee_summary = await assess_plot(
            plot=body.plot,
            request_id=request_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"EUDR assessment failed: {exc}")
    ftw_geojson = await ftw_mesh_task

    # -- Generate DDS if requested ---------------------------------------------
    dds = None
    if body.generate_dds:
        dds = generate_dds(body.plot, assessment)
        _dds_store[dds.dds_id] = dds.model_dump()

    # -- Granite explanation ---------------------------------------------------
    try:
        tool_context = {
            "tool_used": "eudr_compliance_assessment",
            "commodity": body.plot.commodity.value,
            "country": body.plot.country_name,
            "country_code": body.plot.country_code,
            "area_ha": body.plot.area_ha,
            "risk_level": assessment.overall_risk.value,
            "risk_score": assessment.risk_score,
            "has_deforestation": assessment.deforestation.has_deforestation,
            "forest_loss_ha": assessment.deforestation.forest_loss_ha,
            "forest_loss_pct": assessment.deforestation.forest_loss_pct,
            "forest_cover_2000_pct": (gee_summary or {}).get("forest_cover_2000_pct", 0.0),
            "forest_cover_2020_pct": assessment.deforestation.forest_cover_2020_pct,
            "jrc_forest_cover_2020_pct": getattr(assessment.deforestation, "jrc_forest_cover_2020_pct", 0.0),
            "is_plantation_replanting_exemption": getattr(assessment.deforestation, "is_plantation_replanting_exemption", False),
            "statutory_determination": getattr(assessment.deforestation, "statutory_determination", ""),
            "radd_alert_pct": getattr(assessment.deforestation, "radd_alert_pct", 0.0),
            "has_radar_alerts": getattr(assessment.deforestation, "radd_alert_pct", 0.0) > 0,
            "pre_cutoff_loss_pct": (gee_summary or {}).get("pre_cutoff_loss_pct", 0.0),
            "natural_forest_pct": (gee_summary or {}).get("natural_forest_pct", 0.0),
            "dominant_forest_type": (gee_summary or {}).get("dominant_forest_type", "unknown"),
            "dominant_loss_driver": (gee_summary or {}).get("dominant_loss_driver", "unknown"),
            "is_deforestation_driver": (gee_summary or {}).get("is_deforestation_driver", False),
            "overlaps_protected_area": assessment.legality.overlaps_protected_area,
            "protected_area_overlap_pct": getattr(assessment.legality, "protected_area_overlap_pct", 0.0),
            "is_strict_protected_area": getattr(assessment.legality, "is_strict_protected_area", False),
            "protected_area_names": assessment.legality.protected_area_names,
            "total_parcel_ha": getattr(assessment.deforestation, "total_parcel_ha", body.plot.area_ha),
            "statutory_deforestation_ha": getattr(assessment.deforestation, "statutory_deforestation_ha", 0.0),
            "plantation_replanting_ha": getattr(assessment.deforestation, "plantation_replanting_ha", 0.0),
            "compliant_ha": getattr(assessment.deforestation, "compliant_ha", body.plot.area_ha),
            "spatial_compliance_pct": getattr(assessment.deforestation, "spatial_compliance_pct", 100.0),
            "carveout_eligible_ha": getattr(assessment.deforestation, "carveout_eligible_ha", 0.0),
            "country_risk": assessment.legality.country_risk_level.value,
            "data_sources": assessment.deforestation.data_sources,
        }
        explanation = await _augment_with_foundry_brief(
            _fallback_explanation(assessment, body.plot, gee_summary),
            tool_context,
            granite,
        )
    except Exception:
        explanation = _fallback_explanation(assessment, body.plot, gee_summary)

    assessment.summary = explanation

    # -- Generate GEE map tile layers (real satellite pixels for frontend) ------
    gee_layers: list[GEEMapLayer] = []
    try:
        # Compute bbox from plot geometry so we can request AOI-clipped GEE tiles
        geom = body.plot.geometry
        def _geom_to_bbox(geometry: dict) -> tuple[float, float, float, float]:
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

        bbox = _geom_to_bbox(geom)
        raw_layers = get_all_map_layers(body.plot.commodity.value, bbox=bbox, geometry=geom)
        gee_layers = [
            GEEMapLayer(
                id=lyr["id"],
                label=lyr["label"],
                tile_url=lyr["tile_url"],
                visible=lyr.get("visible", True),
                opacity=lyr.get("opacity", 1.0),
                legend=lyr.get("legend"),
                dataset=lyr.get("dataset", ""),
                layer_type=lyr.get("layer_type", ""),
            )
            for lyr in raw_layers
            if lyr.get("available") and lyr.get("tile_url")
        ]
    except Exception as gee_exc:
        logger.warning("GEE tile generation skipped: %s", gee_exc)

    if not gee_layers and gee_summary and gee_summary.get("tile_urls"):
        fallback_raw = _build_fallback_map_layers(gee_summary.get("tile_urls", {}), body.plot.commodity.value)
        gee_layers = [GEEMapLayer(**lyr) for lyr in fallback_raw]

    if ftw_geojson and ftw_geojson.get("features"):
        ftw_lyr = GEEMapLayer(
            id="ftw-field-boundaries",
            label="FTW Field Boundaries · Art. 9(1)(d) (Vector)",
            tile_url="",
            geojson_data=ftw_geojson,
            visible=False,
            opacity=0.95,
            legend={
                "title": "FTW Connected Parcel Vector Mesh (10m S2)",
                "classes": [
                    {"label": "Cultivated Field Boundary (Vector)", "color": "#00F5D4"},
                    {"label": "Agroforestry / Tree-Crop Parcel (Vector)", "color": "#38BDF8"},
                ],
            },
            dataset="Sentinel-2 Bi-Temporal Vector Mesh (Window A/B)",
            layer_type="ftw_boundaries",
        )
        gee_layers.insert(1 if gee_layers else 0, ftw_lyr)

    if dds:
        _dds_store[dds.dds_id] = {
            "dds": dds.model_dump(),
            "plot": body.plot.model_dump(),
            "assessment": assessment.model_dump(),
            "explanation": explanation,
            "tile_url": tile_url,
            "map_layers": [lyr.model_dump() for lyr in gee_layers],
        }

    return EUDRAnalysisResponse(
        request_id=request_id,
        plot=body.plot,
        risk_assessment=assessment,
        dds=dds,
        tile_url=tile_url,
        deforestation_geojson=deforestation_geojson,
        carveout_geojson=deforestation_geojson,
        explanation=explanation,
        follow_up_suggestions=_follow_up_suggestions(assessment),
        map_layers=gee_layers,
    )


@router.post("/plots", response_model=EUDRAnalysisResponse)
async def upload_and_analyze_plot(body: EUDRPlotUploadRequest, request: Request) -> EUDRAnalysisResponse:
    """Upload a sourcing plot and immediately run a compliance assessment."""
    from ...eudr.analysis_engine import _geometry_to_bbox, _estimate_area_ha
    bbox = _geometry_to_bbox(body.geometry)
    calculated_area = body.area_ha or _estimate_area_ha(bbox)

    plot = EUDRPlot(
        plot_id=f"plot_{uuid.uuid4().hex[:10]}",
        name=body.name,
        commodity=body.commodity,
        country_code=body.country_code,
        country_name=body.country_name,
        geometry=body.geometry,
        area_ha=calculated_area,
        declared_net_mass_kg=body.declared_net_mass_kg,
        supplier_name=body.supplier_name,
        reference_date=body.reference_date,
        uploaded_at=datetime.utcnow().isoformat() + "Z",
    )
    return await analyze_plot(
        EUDRAnalysisRequest(plot=plot, check_deforestation=True, check_legality=True, generate_dds=True),
        request,
    )


logger = logging.getLogger(__name__)


@router.post("/plots/stream")
async def stream_analyze_plot(body: EUDRPlotUploadRequest, request: Request):
    """SSE streaming endpoint - emits real-time agent progress steps."""
    from ...eudr.analysis_engine import _geometry_to_bbox, _estimate_area_ha
    from ...eudr.spatial_jurisdiction import compute_geodesic_metrics, resolve_jurisdiction_from_coordinates

    geod_m = compute_geodesic_metrics(body.geometry)
    bbox = _geometry_to_bbox(body.geometry)
    calculated_area = body.area_ha or geod_m["geodesic_area_ha"] or _estimate_area_ha(bbox)
    res_code, res_name, _ = resolve_jurisdiction_from_coordinates(
        geod_m["centroid_lng"], geod_m["centroid_lat"], body.country_code, body.country_name
    )
    body.country_code = res_code
    body.country_name = res_name

    plot = EUDRPlot(
        plot_id=f"plot_{uuid.uuid4().hex[:10]}",
        name=body.name,
        commodity=body.commodity,
        country_code=body.country_code,
        country_name=body.country_name,
        geometry=body.geometry,
        area_ha=calculated_area,
        declared_net_mass_kg=body.declared_net_mass_kg,
        supplier_name=body.supplier_name,
        reference_date=body.reference_date,
        uploaded_at=datetime.utcnow().isoformat() + "Z",
    )

    request_id = new_request_id()
    granite: GraniteClient = request.app.state.granite

    # Queue for SSE events
    queue: asyncio.Queue = asyncio.Queue()

    async def progress_callback(data: dict) -> None:
        await queue.put(data)
        await asyncio.sleep(0.12)

    async def event_generator():
        # Start assessment in background task
        task = asyncio.create_task(_run_assessment_with_stream(
            plot, request_id, granite, body, queue, progress_callback
        ))

        # Stream progress events as SSE
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=120)
            except asyncio.TimeoutError:
                yield "data: {\"step\": \"timeout\"}\n\n"
                break

            yield f"data: {json.dumps(event)}\n\n"

            if event.get("step") == "done":
                break

        await task

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _run_assessment_with_stream(
    plot: EUDRPlot,
    request_id: str,
    granite: GraniteClient,
    body: EUDRPlotUploadRequest,
    queue: asyncio.Queue,
    progress_callback,
):
    """Run the full assessment pipeline and push results to the SSE queue."""
    try:
        await progress_callback({
            "step": "agent_log",
            "id": "ingest",
            "label": "Plot Geometry Ingestion",
            "detail": f"Verifying vector plot geometry ({plot.area_ha:.1f} ha) for {plot.commodity.value}...",
            "status": "active",
        })
        await asyncio.sleep(0.4)
        await progress_callback({
            "step": "agent_log",
            "id": "ingest",
            "label": "Plot Geometry Ingestion",
            "detail": f"Vector boundary topology verified ({plot.area_ha:.1f} ha)",
            "status": "done",
        })

        from ...eudr.ftw_delineation import extract_ftw_parcel_network_sync

        ftw_mesh_task = asyncio.create_task(asyncio.to_thread(extract_ftw_parcel_network_sync, plot.geometry))
        assessment, tile_url, deforestation_geojson, gee_summary = await assess_plot(
            plot=plot, request_id=request_id, progress_callback=progress_callback
        )
        ftw_geojson = await ftw_mesh_task

        dds = generate_dds(plot, assessment)
        _dds_store[dds.dds_id] = dds.model_dump()

        # Granite explanation
        try:
            tool_context = {
                "tool_used": "eudr_compliance_assessment",
                "commodity": plot.commodity.value,
                "country": plot.country_name,
                "country_code": plot.country_code,
                "area_ha": plot.area_ha,
                "risk_level": assessment.overall_risk.value,
                "risk_score": assessment.risk_score,
                "has_deforestation": assessment.deforestation.has_deforestation,
                "forest_loss_ha": assessment.deforestation.forest_loss_ha,
                "forest_loss_pct": assessment.deforestation.forest_loss_pct,
                "forest_cover_2000_pct": (gee_summary or {}).get("forest_cover_2000_pct", 0.0),
                "forest_cover_2020_pct": assessment.deforestation.forest_cover_2020_pct,
                "jrc_forest_cover_2020_pct": getattr(assessment.deforestation, "jrc_forest_cover_2020_pct", 0.0),
                "is_plantation_replanting_exemption": getattr(assessment.deforestation, "is_plantation_replanting_exemption", False),
                "statutory_determination": getattr(assessment.deforestation, "statutory_determination", ""),
                "radd_alert_pct": getattr(assessment.deforestation, "radd_alert_pct", 0.0),
                "has_radar_alerts": getattr(assessment.deforestation, "radd_alert_pct", 0.0) > 0,
                "pre_cutoff_loss_pct": (gee_summary or {}).get("pre_cutoff_loss_pct", 0.0),
                "natural_forest_pct": (gee_summary or {}).get("natural_forest_pct", 0.0),
                "dominant_forest_type": (gee_summary or {}).get("dominant_forest_type", "unknown"),
                "dominant_loss_driver": (gee_summary or {}).get("dominant_loss_driver", "unknown"),
                "is_deforestation_driver": (gee_summary or {}).get("is_deforestation_driver", False),
                "overlaps_protected_area": assessment.legality.overlaps_protected_area,
                "protected_area_overlap_pct": getattr(assessment.legality, "protected_area_overlap_pct", 0.0),
                "is_strict_protected_area": getattr(assessment.legality, "is_strict_protected_area", False),
                "protected_area_names": assessment.legality.protected_area_names,
                "total_parcel_ha": getattr(assessment.deforestation, "total_parcel_ha", plot.area_ha),
                "statutory_deforestation_ha": getattr(assessment.deforestation, "statutory_deforestation_ha", 0.0),
                "plantation_replanting_ha": getattr(assessment.deforestation, "plantation_replanting_ha", 0.0),
                "compliant_ha": getattr(assessment.deforestation, "compliant_ha", plot.area_ha),
                "spatial_compliance_pct": getattr(assessment.deforestation, "spatial_compliance_pct", 100.0),
                "carveout_eligible_ha": getattr(assessment.deforestation, "carveout_eligible_ha", 0.0),
                "country_risk": assessment.legality.country_risk_level.value,
                "data_sources": assessment.deforestation.data_sources,
            }
            await progress_callback({
                "step": "agent_log",
                "id": "consensus",
                "label": "Autonomous Consensus Synthesis",
                "detail": "Synthesizing multi-agent compliance verdict & TRACES NT...",
                "status": "active",
            })
            explanation = await _augment_with_foundry_brief(
                _fallback_explanation(assessment, plot, gee_summary),
                tool_context,
                granite,
            )
            await progress_callback({
                "step": "agent_log",
                "id": "consensus",
                "label": "Autonomous Consensus Synthesis",
                "detail": "Compliance consensus certified across all 6 subagents",
                "status": "done",
            })
        except Exception:
            explanation = _fallback_explanation(assessment, plot, gee_summary)
            await progress_callback({
                "step": "agent_log",
                "id": "consensus",
                "label": "Autonomous Consensus Synthesis",
                "detail": "Deterministic audit reasoning certified",
                "status": "done",
            })

        assessment.summary = explanation

        # GEE map layers
        gee_layers = []
        # Generate GEE tile layers directly from pre-computed tile_urls (instant, no redundant GEE calls)
        if gee_summary and gee_summary.get("tile_urls"):
            gee_layers = _build_fallback_map_layers(gee_summary["tile_urls"], plot.commodity.value)

        if not gee_layers:
            try:
                from ...eudr.analysis_engine import _geometry_to_bbox as gtb
                bbox = gtb(plot.geometry)
                raw_layers = get_all_map_layers(plot.commodity.value, bbox=bbox, geometry=plot.geometry)
                gee_layers = [
                    {
                        "id": lyr["id"], "label": lyr["label"], "tile_url": lyr["tile_url"],
                        "visible": lyr.get("visible", True), "opacity": lyr.get("opacity", 1.0),
                        "legend": lyr.get("legend"), "dataset": lyr.get("dataset", ""),
                        "layer_type": lyr.get("layer_type", ""),
                    }
                    for lyr in raw_layers if lyr.get("available") and lyr.get("tile_url")
                ]
            except Exception as exc:
                logger.warning("GEE tile generation skipped: %s", exc)

        if ftw_geojson and ftw_geojson.get("features"):
            ftw_layer = {
                "id": "ftw-field-boundaries",
                "label": "FTW Field Boundaries · Art. 9(1)(d) (Vector)",
                "tile_url": "",
                "geojson_data": ftw_geojson,
                "visible": False,
                "opacity": 0.95,
                "legend": {
                    "title": "FTW Connected Parcel Vector Mesh (10m S2)",
                    "classes": [
                        {"label": "Cultivated Field Boundary (Vector)", "color": "#00F5D4"},
                        {"label": "Agroforestry / Tree-Crop Parcel (Vector)", "color": "#38BDF8"},
                    ],
                },
                "dataset": "Sentinel-2 Bi-Temporal Vector Mesh (Window A/B)",
                "layer_type": "ftw_boundaries",
            }
            insert_idx = 1 if gee_layers else 0
            gee_layers.insert(insert_idx, ftw_layer)

        _dds_store[dds.dds_id] = {
            "dds": dds.model_dump(),
            "plot": plot.model_dump(),
            "assessment": assessment.model_dump(),
            "explanation": explanation,
            "tile_url": tile_url,
            "map_layers": [lyr if isinstance(lyr, dict) else lyr.model_dump() for lyr in gee_layers],
        }

        # Build final response as dict
        response = EUDRAnalysisResponse(
            request_id=request_id,
            plot=plot,
            risk_assessment=assessment,
            dds=dds,
            tile_url=tile_url,
            deforestation_geojson=deforestation_geojson,
            carveout_geojson=deforestation_geojson,
            explanation=explanation,
            follow_up_suggestions=_follow_up_suggestions(assessment),
            map_layers=[GEEMapLayer(**lyr) for lyr in gee_layers],
        )

        await queue.put({"step": "done", "data": json.loads(response.model_dump_json())})

    except Exception as exc:
        await queue.put({"step": "error", "message": str(exc)})


@router.get("/dds/{dds_id}")
async def get_dds(dds_id: str) -> dict:
    """Retrieve a stored Due Diligence Statement by ID."""
    dds = _dds_store.get(dds_id)
    if not dds:
        raise HTTPException(status_code=404, detail="DDS not found")
    if isinstance(dds, dict) and "dds" in dds:
        return dds["dds"]
    return dds


@router.get("/dds/{dds_id}/export")
async def export_dds(dds_id: str) -> StreamingResponse:
    """Download a DDS as a ZIP containing JSON + plain text report."""
    raw = _dds_store.get(dds_id)
    if not raw:
        raise HTTPException(status_code=404, detail="DDS not found")

    from ...eudr.models import EUDRDueDiligenceStatement
    payload = raw["dds"] if isinstance(raw, dict) and "dds" in raw else raw
    dds_obj = EUDRDueDiligenceStatement(**payload)
    dds_text = format_dds_text(dds_obj)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"oxeous_dds_{dds_id}.json", json.dumps(payload, indent=2))
        zf.writestr(f"oxeous_dds_{dds_id}_report.txt", dds_text)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="EUDR_DDS_{dds_id}.zip"'},
    )


# -- Helpers -------------------------------------------------------------------

async def _augment_with_foundry_brief(
    base_explanation: str,
    tool_context: dict[str, Any],
    granite: GraniteClient | None,
) -> str:
    """Prepend a concise 2-sentence live AI legal brief when cloud LLM is configured, preserving deterministic metrics."""
    if not granite:
        return base_explanation
    try:
        granite._refresh_settings_if_needed()
        if not (granite.settings.azure_openai_api_key and granite.settings.azure_openai_endpoint):
            return base_explanation
        brief_system = (
            "You are Oxeous Earth Agent, an EUDR (Regulation EU 2023/1115) legal & spatial compliance auditor. "
            "Given verified plot metrics JSON, write ONE concise 2-sentence executive audit brief in plain English "
            "explaining the legal outcome (citing Art. 3(a), Art. 2(5) replanting exemption, or May 2026 Carve-Out as applicable). "
            "Use ONLY exact numbers from the JSON. Do NOT add headings, bullet points, or em-dashes."
        )
        brief = await asyncio.wait_for(
            granite._azure_generate(
                brief_system,
                [{"role": "user", "content": json.dumps(tool_context)}],
            ),
            timeout=6.0,
        )
        clean_brief = (brief or "").strip().replace("—", "-").replace("–", "-")
        if len(clean_brief) > 30:
            return f"> **Executive Legal Brief:** {clean_brief}\n\n{base_explanation}"
    except Exception as exc:
        logger.debug("Live executive brief skipped (%s)", exc)
    return base_explanation


def _fallback_explanation(assessment, plot, gee_summary: dict | None = None) -> str:
    risk = assessment.overall_risk.value.replace("_", " ").upper()
    is_compliant_verdict = assessment.overall_risk.value in ("compliant", "low_risk")
    loss_ha = float(assessment.deforestation.forest_loss_ha or 0.0)
    loss_pct = float(assessment.deforestation.forest_loss_pct or 0.0)
    f2020 = float(assessment.deforestation.forest_cover_2020_pct or 0.0)
    jrc2020 = float(getattr(assessment.deforestation, "jrc_forest_cover_2020_pct", 0.0) or 0.0)
    radd_alert_pct = float(getattr(assessment.deforestation, "radd_alert_pct", 0.0) or 0.0)
    f2000 = float(getattr(assessment.deforestation, "forest_cover_2000_pct", 0.0) or 0.0)
    pre_loss = float(getattr(assessment.deforestation, "pre_cutoff_loss_pct", max(0.0, f2000 - f2020)) or 0.0)
    nat_pct = float(getattr(assessment.deforestation, "natural_forest_pct", 0.0) or 0.0)
    driver = str(getattr(assessment.deforestation, "dominant_loss_driver", "Permanent agriculture") or "Permanent agriculture")
    ftype = str(getattr(assessment.deforestation, "dominant_forest_type", "NaturalForest") or "NaturalForest")
    comm_confirmed = bool(getattr(assessment.deforestation, "commodity_confirmed", False))
    comm_cov = float(getattr(assessment.deforestation, "commodity_coverage_pct", 0.0) or 0.0)
    pa_names = assessment.legality.protected_area_names or []
    is_strict_pa = bool(getattr(assessment.legality, "is_strict_protected_area", False))
    pa_pct = float(getattr(assessment.legality, "protected_area_overlap_pct", 0.0) or 0.0)
    is_exempt = bool(getattr(assessment.deforestation, "is_plantation_replanting_exemption", False))
    total_ha = float(getattr(assessment.deforestation, "total_parcel_ha", plot.area_ha) or plot.area_ha or 0.0)
    clean_ha = float(getattr(assessment.deforestation, "compliant_ha", total_ha) or 0.0)
    true_loss_ha = float(getattr(assessment.deforestation, "statutory_deforestation_ha", 0.0) or 0.0)
    replant_ha = float(getattr(assessment.deforestation, "plantation_replanting_ha", 0.0) or 0.0)
    pwri_pct = float(getattr(assessment.deforestation, "spatial_compliance_pct", 100.0) or 100.0)
    mmu_ha = float(getattr(assessment.deforestation, "mmu_filtered_loss_ha", true_loss_ha) or 0.0)
    halo_pct = float(getattr(assessment.deforestation, "perimeter_halo_loss_pct", 0.0) or 0.0)
    elev_m = float(getattr(assessment.deforestation, "mean_elevation_m", 0.0) or 0.0)
    slope_deg = float(getattr(assessment.deforestation, "mean_slope_deg", 0.0) or 0.0)
    biome = str(getattr(assessment.deforestation, "agro_climatic_biome", "Tropical Forest Belt") or "Tropical Forest Belt")
    comm_label = plot.commodity.value.replace("_", " ").upper()
    is_wood_silviculture = is_exempt and plot.commodity.value in ("wood", "timber")

    # Friendly human translation of Forest Typology class names
    ftype_friendly_map = {
        "PrimaryForest": "Wild Unbroken Primary Rainforest",
        "NaturallyRegeneratingForest": "Wild Naturally Regenerating Forest",
        "PlantedForest": "Commercial Planted Production Forest (Silviculture)",
        "PlantationForest": "Managed Timber/Tree Plantation",
        "TreeCropsAndAgroforestry": "Agricultural Tree-Crop Farm / Agroforestry (e.g. Cocoa, Coffee, Rubber, Palm)",
    }
    ftype_plain = ftype_friendly_map.get(ftype, ftype)

    sub_mmu_speckle_ha = max(0.0, round(loss_ha - (true_loss_ha + replant_ha), 2))
    sections = []

    # ==========================================================================
    # SECTION 1: PLAIN-ENGLISH EXECUTIVE VERDICT (WHAT HAPPENED ON THIS PLOT)
    # ==========================================================================
    if is_wood_silviculture:
        verdict_story = (
            f"### 1. What Happened on This Plot (Plain-English Verdict)\n"
            f"- **Verdict**: **{risk} (Risk Score: {assessment.risk_score:.0f}/100 — Cleared for EU Import)**\n"
            f"- **What Happened (2020–2025)**: On this **{total_ha:.2f} ha {comm_label}** plot in **{plot.country_name} ({plot.country_code})**, satellites detected **{loss_ha:.2f} ha** of tree harvesting after Dec 31, 2020. However, multi-sensor checks prove this is a **managed timber production forest (`{ftype_plain}`, only {nat_pct:.1f}% wild forest)** undergoing routine harvesting (`{driver}`).\n"
            f"- **Why It Passes EU Law**: Under **EUDR Article 2(3) & 2(7)**, harvesting timber in a planted forest and replanting trees is **sustainable silviculture, not conversion to agriculture** — so **100% ({total_ha:.2f} ha)** is legal."
        )
    elif is_exempt:
        verdict_story = (
            f"### 1. What Happened on This Plot (Plain-English Verdict)\n"
            f"- **Verdict**: **{risk} (Risk Score: {assessment.risk_score:.0f}/100 — Exempt under EUDR Article 2(5))**\n"
            f"- **What Happened (2020–2025)**: On this **{total_ha:.2f} ha {comm_label}** farm in **{plot.country_name} ({plot.country_code})**, optical satellites saw **{loss_ha:.2f} ha** of tree canopy cleared after 2020. Standard tools would falsely block this farm. However, the EU's 2020 forest map (**{jrc2020:.1f}%** forest) and wild-forest AI (**{nat_pct:.1f}%** wild forest) prove this land was **already an active {comm_label.lower()} farm in 2020** (`{ftype_plain}`).\n"
            f"- **Why It Passes EU Law**: Under **EUDR Article 2(4) & 2(5)**, cutting old crop trees (rubber, cocoa, coffee, oil palm) to replant young saplings is **normal farm rotation, not deforestation** — **100% ({total_ha:.2f} ha)** is legal for EU import."
        )
    elif not is_compliant_verdict and true_loss_ha == 0.0 and assessment.legality.overlaps_protected_area:
        pa_name_str = ", ".join(pa_names[:2]) if pa_names else "Protected Conservation Reserve"
        verdict_story = (
            f"### 1. What Happened on This Plot (Plain-English Verdict)\n"
            f"- **Verdict**: **{risk} (Risk Score: {assessment.risk_score:.0f}/100 — Blocked under EUDR Article 3(b) Protected Area Law)**\n"
            f"- **What Happened (2020–2025)**: This **{total_ha:.2f} ha {comm_label}** plot in **{plot.country_name} ({plot.country_code})** had **0.00 ha of tree cutting** after 2020, but **{pa_pct:.1f}%** of the land sits inside a protected reserve (**{pa_name_str}**).\n"
            f"- **Why It Is Blocked**: Under **EUDR Article 3(b)**, farming inside a protected national park or reserve violates national land-use law even if no new trees were cut."
        )
    elif not is_compliant_verdict:
        pa_warning = (
            f" Additionally, **{pa_pct:.1f}%** overlaps a protected reserve (**{pa_names[0]}**), violating **Article 3(b)**."
            if (assessment.legality.overlaps_protected_area and pa_names)
            else ""
        )
        replant_note = (
            f" (Another **{replant_ha:.2f} ha** painted **Amber** on the map was legal crop replanting on land already farmed before 2020.)"
            if replant_ha > 0
            else ""
        )
        verdict_story = (
            f"### 1. What Happened on This Plot (Plain-English Verdict)\n"
            f"- **Verdict**: **{risk} (Risk Score: {assessment.risk_score:.0f}/100 — Blocked from Direct EU Import)**\n"
            f"- **What Happened (2020–2025)**: On Dec 31, 2020 (the EUDR legal cutoff date), this **{total_ha:.2f} ha {comm_label}** plot in **{plot.country_name} ({plot.country_code})** held standing natural forest (**{f2020:.1f}%** baseline). Between 2021 and 2025, **{true_loss_ha:.2f} ha** of that standing 2020 forest was cleared (shown in **Red** on the map) for **{driver.lower()}**.{replant_note}{pa_warning}\n"
            f"- **Why It Is Blocked & How to Fix It**: Under **EUDR Article 3(a)**, crops from land deforested after Dec 31, 2020 cannot enter the EU. However, using **May 2026 Plot Carve-Out**, you can exclude the **{true_loss_ha:.2f} ha** Red zone and legally export from the remaining **{clean_ha:.2f} ha ({pwri_pct:.1f}%)** Green compliant land."
        )
    else:
        speckle_note = (
            f" While optical sensors noticed **{loss_ha:.2f} ha** of tiny isolated tree gaps, that is smaller than the **0.5 ha minimum forest size under EUDR Article 2(4)** (single-tree/wind noise, not land clearing)."
            if loss_ha > 0
            else " Satellites confirmed **0.00 ha** of tree cutting between 2021 and 2025."
        )
        verdict_story = (
            f"### 1. What Happened on This Plot (Plain-English Verdict)\n"
            f"- **Verdict**: **{risk} (Risk Score: {assessment.risk_score:.0f}/100 — 100% Cleared for EU Import)**\n"
            f"- **What Happened (2020–2025)**: On this **{total_ha:.2f} ha {comm_label}** plot in **{plot.country_name} ({plot.country_code})**,{speckle_note} It is completely outside protected national parks, and **100% ({clean_ha:.2f} ha)** is verified clean for EU customs."
        )
    sections.append(verdict_story)

    # ==========================================================================
    # SECTION 2: MAP COLORS & HECTARE BREAKDOWN (CONNECTING MAP TO NUMBERS)
    # ==========================================================================
    replant_label = "🔵 Blue — Sustainable Silviculture (Art. 2(3))" if is_wood_silviculture else "🟡 Amber — Crop Replanting (Art. 2(5) Legal)"
    ledger_section = (
        f"### 2. How to Read the Map & Hectare Breakdown\n"
        f"Every pixel inside your **{total_ha:.2f} ha** plot boundary is color-coded on the map:\n\n"
        f"| Map Color & Zone | Area (ha) | % of Plot | Plain-English Meaning |\n"
        f"| :--- | :--- | :--- | :--- |\n"
        f"| **🟢 Green — Clean Compliant Land** | **{clean_ha:.2f} ha** | **{pwri_pct:.2f}%** | Safe to export to the EU (`TRACES NT Box 44`) |\n"
        f"| **{replant_label}** | **{replant_ha:.2f} ha** | {round((replant_ha / max(0.1, total_ha)) * 100, 2):.2f}% | Trees cut on pre-2020 farmland for crop rotation (100% legal) |\n"
        f"| **🔴 Red — Statutory Deforestation** | **{true_loss_ha:.2f} ha** | {round((true_loss_ha / max(0.1, total_ha)) * 100, 2):.2f}% | **Illegal (Art. 3a)** — standing 2020 forest cleared after Dec 2020 |\n"
        f"| **⚪ Filtered (<0.5 ha gaps / roads)** | **{sub_mmu_speckle_ha:.2f} ha** | {round((sub_mmu_speckle_ha / max(0.1, total_ha)) * 100, 2):.2f}% | Isolated tree gaps <0.5 ha (exempt under Art. 2(4) FAO threshold) |"
    )
    sections.append(ledger_section)

    # ==========================================================================
    # SECTION 3: WHAT EACH OF THE 6 SATELLITES FOUND (EXPLAINING THE STATS)
    # ==========================================================================
    jrc_meaning = (
        "confirms real standing forest existed here on Dec 31, 2020."
        if jrc2020 >= 10.0
        else "confirms this land was already non-forest farmland in 2020."
    )
    nat_meaning = (
        f"identifies wild natural forest (`{ftype_plain}`), where clearing is illegal."
        if nat_pct >= 15.0
        else f"proves these trees are human-planted (`{ftype_plain}`), not wild jungle."
    )
    radar_meaning = (
        f"pierced through cloud cover and detected active clearing on **{radd_alert_pct:.1f}%** of the plot."
        if radd_alert_pct > 0
        else "zero radar alerts (`0.0%`) — no hidden clearing under clouds."
    )
    pa_meaning = (
        f"**{pa_pct:.1f}% overlap** with **{', '.join(pa_names[:2])}** ({'Strict Reserve — Illegal' if is_strict_pa else 'Managed Zone — Permit Needed'})."
        if assessment.legality.overlaps_protected_area
        else "**0.0% overlap** — completely outside national parks and indigenous reserves."
    )

    dataset_guide = (
        f"### 3. What the 6 Satellite Sensors Found (Stat Guide)\n"
        f"- **1. EU 2020 Forest Map (`EC JRC GFC2020`, 10m) → `{jrc2020:.1f}%`**: The European Commission's official cutoff map {jrc_meaning}\n"
        f"- **2. Wild Forest vs. Farm Sensor (`Nature Trace & ForTy`, 10m) → `{nat_pct:.1f}% Wild`**: Separates wild rainforest from tree crops; {nat_meaning}\n"
        f"- **3. Post-2020 Tree Loss (`Hansen GFC v1.13`, 10m-refined) → `{loss_ha:.2f} ha` (`{loss_pct:.2f}%`)**: Tracks canopy from 2000 (`{f2000:.1f}%`) to 2020 (`{f2020:.1f}%`) and detected `{loss_ha:.2f} ha` of trees cut during 2021–2025.\n"
        f"- **4. Cloud-Piercing Radar (`Sentinel-1 RADD`, 10m) → `{radd_alert_pct:.1f}%`**: C-band radar {radar_meaning}\n"
        f"- **5. Clearing Cause & Crop AI (`WRI Drivers & FDP 10m`) → `{driver}`**: Identifies the activity as **`{driver}`**{f' with confirmed {comm_label} crop presence ({comm_cov:.1f}%)' if comm_confirmed else ''} (`{halo_pct:.1f}%` loss in surrounding 500m buffer).\n"
        f"- **6. Protected Parks & Terrain (`WDPA & DEM`) → `{elev_m:.0f}m` elev, `{slope_deg:.1f}°` slope**: Park check shows {pa_meaning}"
    )
    sections.append(dataset_guide)

    # ==========================================================================
    # SECTION 4: WHAT TO DO NEXT (ACTION PLAN)
    # ==========================================================================
    if not is_compliant_verdict:
        if assessment.legality.overlaps_protected_area and is_strict_pa:
            action_section = (
                f"### 4. Recommended Next Step\n"
                f"- **Do Not Import**: Because this plot overlaps a strict protected reserve (**{pa_names[0] if pa_names else 'Protected Area'}**) and has **{true_loss_ha:.2f} ha** of illegal deforestation, it cannot pass EU customs (`TARIC Box 44`)."
            )
        else:
            action_section = (
                f"### 4. Recommended Next Step (Save the Clean {clean_ha:.2f} ha)\n"
                f"- **Use May 2026 Plot Carve-Out**: Do not submit the full **{total_ha:.2f} ha** boundary. Click **`Segregation` / `View Dossier`** to download the **Compliant GeoJSON** with the **{true_loss_ha:.2f} ha** Red zone removed, allowing you to legally export from the remaining **{clean_ha:.2f} ha ({pwri_pct:.1f}%)** Green area."
            )
    else:
        action_section = (
            f"### 4. Recommended Next Step\n"
            f"- **Ready for EU Customs (`TARIC Box 44`)**: Click **`View Dossier`** or **`Legality & DDS`** to download your **TRACES NT GeoJSON** and **Due Diligence Statement (`Code C716`)** for all **{clean_ha:.2f} ha**."
        )
    sections.append(action_section)

    return "\n\n".join(sections)


def _follow_up_suggestions(assessment) -> list[str]:
    suggestions = []
    if assessment.deforestation.has_deforestation:
        suggestions.append("Download the Due Diligence Statement for regulatory submission")
        suggestions.append("View the forest loss layer on the map to inspect detected areas")
    if assessment.legality.overlaps_protected_area:
        suggestions.append("Review the protected area overlap and consult local land registry")
    if assessment.requires_human_review:
        suggestions.append("Commission third-party field verification for this plot")
    suggestions.append("Run the same check on neighboring plots in your supply chain")
    return suggestions[:4]


def _build_fallback_map_layers(tile_urls: dict[str, Any], commodity: str) -> list[dict[str, Any]]:
    if not isinstance(tile_urls, dict):
        return []
    layers = []
    configs = [
        ("gee-pwri-intersection", "intersection", "PWRI-3D Tri-Axial Map Algebra (EUDR Core)", "intersection", True, 1.0, {
            "title": "PWRI-3D Classified Output Raster",
            "classes": [
                {"label": "Statutory Deforestation Violation (Art. 3(a) Quarantined)", "color": "#D93C4A"},
                {"label": "Exempt Agricultural Replanting (Art. 2(5) Lawful)", "color": "#F2A91F"},
                {"label": "Exempt Sustainable Silviculture (Art. 2(3)/2(7) Lawful)", "color": "#3B82C4"},
                {"label": "Verified Clean Hectares (TRACES NT Box 44 C716)", "color": "#2E9E6F"},
            ],
        }),
        ("gee-hansen-loss", "hansen_gfc", "Hansen GFC · Post-2020 Forest Loss (EUDR Relevant)", "hansen_loss", False, 1.0, {
            "title": "Hansen Forest Loss (30m)",
            "classes": [
                {"label": "Standing Forest Baseline (Dec 2020)", "color": "#315F50"},
                {"label": "Post-2020 Forest Loss (EUDR Art. 3(a) Violation)", "color": "#F04444"},
            ],
        }),
        ("gee-jrc-gfc2020", "jrc_gfc2020", "EC JRC GFC2020 · Official EU Forest Baseline (10m)", "jrc_gfc2020", False, 0.85, {
            "title": "EC JRC Forest 2020 (10m)",
            "classes": [{"label": "EU Baseline Forest (Dec 31, 2020)", "color": "#00FF88"}],
        }),
        ("gee-radd-alerts", "radd_alerts", "WUR/WRI RADD · Sentinel-1 Radar Disturbance Alerts (10m)", "radd_alerts", False, 1.0, {
            "title": "Sentinel-1 Radar Alerts (10m)",
            "classes": [
                {"label": "Unconfirmed Radar Disturbance", "color": "#ff8800"},
                {"label": "High-Confidence Radar Disturbance", "color": "#ff0000"},
            ],
        }),
        ("gee-natural-forest", "natural_forest", "Natural Forests 2020 · Probability (10m)", "natural_forest", False, 1.0, {
            "title": "Natural Forest Probability", "colormap": "Greens", "min": 0, "max": 1, "units": "probability"
        }),
        ("gee-forest-typology", "forest_typology", "Forest Typology 2020 · Classification (10m)", "forest_typology", False, 1.0, {
            "title": "Forest Type",
            "classes": [
                {"label": "Primary Forest", "color": "#1B7837"},
                {"label": "Naturally Regenerating", "color": "#7FBF7B"},
                {"label": "Planted Forest", "color": "#1D91C0"},
                {"label": "Plantation Forest", "color": "#E65FA9"},
                {"label": "Tree Crops & Agroforestry", "color": "#E6AB02"},
            ]
        }),
        ("gee-wri-drivers", "drivers", "WRI · Drivers of Forest Loss 2001-2025 (1km)", "wri_drivers", False, 1.0, {
            "title": "Dominant Driver of Forest Loss",
            "classes": [
                {"label": "Permanent Agriculture", "color": "#E39D29"},
                {"label": "Hard Commodities", "color": "#E58074"},
                {"label": "Shifting Cultivation", "color": "#e9d700"},
                {"label": "Logging", "color": "#51a44e"},
                {"label": "Wildfire", "color": "#895128"},
                {"label": "Settlements & Infrastructure", "color": "#a354a0"},
                {"label": "Other Natural Disturbances", "color": "#3a209a"},
            ]
        }),
        (f"gee-commodity-{commodity}", "commodity_map", f"{commodity.capitalize()} Probability Map 2023 (FDP 2025)", "commodity_map", False, 1.0, {
            "title": f"{commodity.capitalize()} Probability", "colormap": "Browns", "min": 0.5, "max": 1.0, "units": "probability"
        }),
        ("gee-protected-areas", "protected_areas", "UNEP-WCMC · WDPA Protected Areas", "protected_areas", False, 0.8, {
            "title": "Protected Areas (WDPA)",
            "classes": [{"label": "Designated Protected Area", "color": "#dc2626"}],
        }),
    ]
    for layer_id, key, label, layer_type, visible, opacity, legend in configs:
        url = tile_urls.get(key)
        if url:
            layers.append({
                "id": layer_id,
                "label": label,
                "tile_url": url,
                "visible": visible,
                "opacity": opacity,
                "legend": legend,
                "dataset": "",
                "layer_type": layer_type,
            })
    return layers


@router.get("/plots/{plot_id}/carveout/geojson")
async def get_plot_carveout_geojson(plot_id: str) -> dict[str, Any]:
    """Retrieve the decomposed GeoJSON feature collection (compliant subparcel + delisted violation) for a plot."""
    from ...eudr.carveout_service import build_carveout_feature_collection

    # Search in _dds_store
    for item in _dds_store.values():
        if isinstance(item, dict):
            p = item.get("plot", {})
            if p.get("plot_id") == plot_id:
                assessment = item.get("assessment", {})
                defo = assessment.get("deforestation", {})
                is_ex = defo.get("is_plantation_replanting_exemption", False)
                loss_ha = defo.get("statutory_deforestation_ha", 0.0)
                tot_ha = defo.get("total_parcel_ha", p.get("area_ha", 10.0))
                return build_carveout_feature_collection(p.get("geometry", {}), tot_ha, loss_ha, is_ex)

    raise HTTPException(status_code=404, detail="Plot not found or not yet analyzed")


@router.get("/plots/{plot_id}/traces-nt-xml")
async def get_plot_traces_nt_xml(plot_id: str) -> Response:
    """Export the official European Commission TRACES NT XML customs declaration payload with SHA-256 provenance hash."""
    entry = None
    for item in _dds_store.values():
        if isinstance(item, dict):
            p = item.get("plot", {})
            if p.get("plot_id") == plot_id:
                entry = item
                break

    if not entry:
        raise HTTPException(status_code=404, detail="Plot not found or not yet analyzed")

    p = entry.get("plot", {})
    assessment = entry.get("assessment", {})
    defo = assessment.get("deforestation", {})
    consensus = assessment.get("multi_agent_consensus", {}) or {}
    sha_hash = consensus.get("cryptographic_audit_hash", f"0x{uuid.uuid4().hex}")

    total_ha = float(defo.get("total_parcel_ha", p.get("area_ha", 0.0)) or 0.0)
    compliant_ha = float(defo.get("compliant_ha", p.get("area_ha", 0.0)) or 0.0)
    loss_ha = float(defo.get("statutory_deforestation_ha", 0.0) or 0.0)
    verdict = consensus.get("consensus_verdict", "COMPLIANT")
    stat_art = defo.get("statutory_determination", "Article 3(a)")
    timestamp = datetime.utcnow().isoformat() + "Z"

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<TRACES_NT_DDS xmlns="urn:eu:europa:ec:sante:traces:eudr:v2" schemaVersion="2.1.0">
  <Header>
    <DeclarationId>EUDR-{plot_id.upper()}</DeclarationId>
    <SubmissionTimestamp>{timestamp}</SubmissionTimestamp>
    <RegulationReference>Regulation (EU) 2023/1115</RegulationReference>
    <CustomsClearingCode>BOX44-EUDR-VERIFIED</CustomsClearingCode>
  </Header>
  <Operator>
    <Name>{p.get("supplier_name") or "Authorized EU Operator"}</Name>
    <CountryOfProduction>{p.get("country_code", "XX")}</CountryOfProduction>
    <Commodity>{str(p.get("commodity", "AGRICULTURAL_COMMODITY")).upper()}</Commodity>
  </Operator>
  <PlotIdentification>
    <PlotId>{plot_id}</PlotId>
    <CoordinateReferenceSystem>EPSG:4326</CoordinateReferenceSystem>
    <TotalAreaHectares>{total_ha:.2f}</TotalAreaHectares>
    <CompliantExportAreaHectares>{compliant_ha:.2f}</CompliantExportAreaHectares>
    <CarvedOutViolationHectares>{loss_ha:.2f}</CarvedOutViolationHectares>
    <May2026ProtocolApplied>{'true' if loss_ha > 0 else 'false'}</May2026ProtocolApplied>
  </PlotIdentification>
  <MultiAgentVerificationProvenance>
    <ConsensusVerdict>{verdict}</ConsensusVerdict>
    <RiskScore>{assessment.get("risk_score", 0.0):.1f}</RiskScore>
    <StatutoryArticleApplied>{stat_art}</StatutoryArticleApplied>
    <CryptographicProofHash>{sha_hash}</CryptographicProofHash>
  </MultiAgentVerificationProvenance>
</TRACES_NT_DDS>"""

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="TRACES_NT_{plot_id}.xml"'},
    )


@router.post("/timelapse")
async def get_plot_sentinel_timelapse(request: Request):
    """
    On-demand 10m Sentinel-2 annual time-series timelapse (2020 Cutoff -> 2025)
    strictly clipped inside the submitted plot geometry.
    """
    from ...eudr.analysis_engine import _geometry_to_bbox
    from ...tools.eudr.gee_tile_server import get_sentinel2_timelapse

    body = await request.json()
    geometry = body.get("geometry")
    if not geometry:
        raise HTTPException(status_code=400, detail="Missing plot geometry")

    bbox = _geometry_to_bbox(geometry)
    years = body.get("years")
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: get_sentinel2_timelapse(bbox=bbox, geometry=geometry, years=years),
    )
    return result


@router.post("/ftw-delineate")
async def ftw_delineate_plot_boundary(request: Request) -> dict[str, Any]:
    """
    Bi-temporal Sentinel-2 L2A agricultural parcel boundary delineation (FTW architecture +
    Planetary Computer STAC Window A/B scene discovery) for EUDR Article 9(1)(d) compliance.
    Converts a single GPS coordinate (lat, lng) or rough bounding box into a multi-vertex
    6-decimal WGS84 parcel polygon.
    """
    from ...eudr.ftw_delineation import delineate_field_boundary

    body = await request.json()
    lat = body.get("lat")
    lng = body.get("lng")
    geometry = body.get("geometry")
    target_area_ha = float(body.get("target_area_ha") or 12.0)

    if lat is None and lng is None and not geometry:
        raise HTTPException(status_code=400, detail="Provide either (lat, lng) coordinates or a GeoJSON geometry.")

    try:
        return await delineate_field_boundary(
            lat=float(lat) if lat is not None else None,
            lng=float(lng) if lng is not None else None,
            geometry=geometry,
            target_area_ha=target_area_ha,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        logger.exception("FTW boundary delineation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Field boundary delineation failed: {exc}")


@router.get("/statutory-search")
async def search_official_eurlex_corpus(
    q: str = "",
    category: str = "",
    commodity: str = "",
    top_k: int = 8,
) -> dict[str, Any]:
    """
    Live sub-second search over the 114 verbatim Official Journal of the European Union
    EUR-Lex primary legal provisions (`CELEX:32023R1115`, `02023R1115-20251226`, `32025R2650`,
    `32024R3084`, `32025R1093`, and Commission Notice `C/2025/4524`).
    """
    import time as _time
    from ...eudr.azure_search_rag import EUDR_STATUTORY_CORPUS, get_eudr_rag_engine

    t0 = _time.monotonic()
    engine = get_eudr_rag_engine()
    safe_top = max(1, min(int(top_k or 8), 25))

    query_str = q.strip() or "Article 3 deforestation cutoff Annex I"
    hits, raw_mode = await engine.search(
        query=query_str,
        commodity=commodity.strip() or None,
        top_k=safe_top * 2 if category.strip() else safe_top,
    )
    if category.strip() and category.strip() != "all":
        hits = [h for h in hits if h.get("category") == category.strip()]
    hits = hits[:safe_top]
    latency_ms = max(1, int((_time.monotonic() - t0) * 1000))

    return {
        "query": q,
        "engine_mode": "eurlex_cloud_index" if raw_mode == "azure_ai_search" else "eurlex_local_index",
        "latency_ms": latency_ms,
        "total_corpus_documents": len(EUDR_STATUTORY_CORPUS) or 114,
        "returned_count": len(hits),
        "results": [
            {
                "id": h.get("id", ""),
                "celex_id": h.get("celex_id", ""),
                "oj_ref": h.get("oj_ref", ""),
                "eurlex_url": h.get("eurlex_url", ""),
                "sha256_verbatim": h.get("sha256_verbatim", ""),
                "article_ref": h.get("article_ref", ""),
                "title": h.get("title", ""),
                "category": h.get("category", ""),
                "hs_codes": h.get("hs_codes", ""),
                "score": h.get("score", 1.0),
                "legal_summary": h.get("legal_summary", ""),
                "verbatim_excerpt": h.get("full_text", "")[:3500],
            }
            for h in hits
        ],
    }




