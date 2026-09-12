"""
EUDR API routes — POST /eudr/analyze, GET /eudr/dds/{dds_id}
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import zipfile
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
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

    # ── Run assessment ────────────────────────────────────────────────────────
    try:
        assessment, tile_url, deforestation_geojson, gee_summary = await assess_plot(
            plot=body.plot,
            request_id=request_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"EUDR assessment failed: {exc}")

    # ── Generate DDS if requested ─────────────────────────────────────────────
    dds = None
    if body.generate_dds:
        dds = generate_dds(body.plot, assessment)
        _dds_store[dds.dds_id] = dds.model_dump()

    # ── Granite explanation ───────────────────────────────────────────────────
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
            "pre_cutoff_loss_pct": (gee_summary or {}).get("pre_cutoff_loss_pct", 0.0),
            "natural_forest_pct": (gee_summary or {}).get("natural_forest_pct", 0.0),
            "dominant_forest_type": (gee_summary or {}).get("dominant_forest_type", "unknown"),
            "dominant_loss_driver": (gee_summary or {}).get("dominant_loss_driver", "unknown"),
            "is_deforestation_driver": (gee_summary or {}).get("is_deforestation_driver", False),
            "overlaps_protected_area": assessment.legality.overlaps_protected_area,
            "protected_area_names": assessment.legality.protected_area_names,
            "country_risk": assessment.legality.country_risk_level.value,
            "data_sources": assessment.deforestation.data_sources,
        }
        explanation = await granite.generate_explanation(tool_context)
    except Exception:
        explanation = _fallback_explanation(assessment, body.plot, gee_summary)

    assessment.summary = explanation

    # ── Generate GEE map tile layers (real satellite pixels for frontend) ──────
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
    """SSE streaming endpoint — emits real-time agent progress steps."""
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
        assessment, tile_url, deforestation_geojson, gee_summary = await assess_plot(
            plot=plot, request_id=request_id, progress_callback=progress_callback
        )

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
                "pre_cutoff_loss_pct": (gee_summary or {}).get("pre_cutoff_loss_pct", 0.0),
                "natural_forest_pct": (gee_summary or {}).get("natural_forest_pct", 0.0),
                "dominant_forest_type": (gee_summary or {}).get("dominant_forest_type", "unknown"),
                "dominant_loss_driver": (gee_summary or {}).get("dominant_loss_driver", "unknown"),
                "is_deforestation_driver": (gee_summary or {}).get("is_deforestation_driver", False),
                "overlaps_protected_area": assessment.legality.overlaps_protected_area,
                "protected_area_names": assessment.legality.protected_area_names,
                "country_risk": assessment.legality.country_risk_level.value,
                "data_sources": assessment.deforestation.data_sources,
            }
            await progress_callback({
                "step": "agent_log",
                "id": "gemini",
                "label": "Gemini AI Synthesis",
                "detail": "Synthesizing spatial timeline and audit compliance reasoning with Gemini Flash...",
                "status": "active",
            })
            explanation = await granite.generate_explanation(tool_context)
            await progress_callback({
                "step": "agent_log",
                "id": "gemini",
                "label": "Gemini AI Synthesis",
                "detail": "Compliance reasoning narrative generated",
                "status": "done",
            })
        except Exception:
            explanation = _fallback_explanation(assessment, plot, gee_summary)
            await progress_callback({
                "step": "agent_log",
                "id": "gemini",
                "label": "Gemini AI Synthesis",
                "detail": "Deterministic audit reasoning generated",
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fallback_explanation(assessment, plot, gee_summary: dict | None = None) -> str:
    risk = assessment.overall_risk.value.replace("_", " ").upper()
    loss_ha = assessment.deforestation.forest_loss_ha
    loss_pct = assessment.deforestation.forest_loss_pct
    f2020 = assessment.deforestation.forest_cover_2020_pct
    f2000 = (gee_summary or {}).get("forest_cover_2000_pct", 0.0)
    nat_pct = (gee_summary or {}).get("natural_forest_pct", 0.0)
    driver = (gee_summary or {}).get("dominant_loss_driver", "unknown")
    ftype = (gee_summary or {}).get("dominant_forest_type", "unknown")
    pa_names = assessment.legality.protected_area_names

    parts = [
        f"EUDR compliance assessment for {plot.commodity.value} in {plot.country_name}: Overall verdict is {risk} (Risk Score: {assessment.risk_score:.0f}/100)."
    ]
    if f2000 > 0:
        parts.append(
            f"Historical satellite monitoring (Hansen GFC v1.13) shows tree cover in 2000 was {f2000:.1f}%, which pre-2020 clearing reduced to {f2020:.1f}% by the December 31, 2020 EUDR cutoff date."
        )
    else:
        parts.append(
            f"At the mandatory December 31, 2020 EUDR cutoff date, remaining forest cover was {f2020:.1f}%."
        )

    if assessment.deforestation.has_deforestation:
        ratio_note = ""
        if f2020 > 0 and loss_pct > 0:
            lost_share = min(100.0, (loss_pct / f2020) * 100)
            ratio_note = f" (representing ~{lost_share:.0f}% of the forest standing in 2020)"
        parts.append(
            f"Post-cutoff satellite observation (2021–2025) detected {loss_ha:.2f} ha of forest loss ({loss_pct:.1f}% of the total plot){ratio_note}. The dominant loss driver is classified as '{driver}' within {ftype}."
        )
    else:
        parts.append("No post-December 2020 forest loss was detected within the plot boundaries.")

    if nat_pct > 0:
        parts.append(f"Nature Trace 2020 (10m Sentinel-2) identifies {nat_pct:.1f}% of the plot as natural forest baseline.")

    if assessment.legality.overlaps_protected_area:
        names_str = ", ".join(pa_names[:3]) or "designated conservation area"
        parts.append(f"CRITICAL LEGALITY VIOLATION: The plot intersects with designated protected area(s): {names_str}, violating EUDR Article 9 legality requirements.")

    return " ".join(parts)


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
        ("gee-hansen-loss", "hansen_gfc", "Hansen GFC · Post-2020 Forest Loss (EUDR Relevant)", "hansen_loss", True, 1.0, {
            "title": "Post-Dec 2020 Forest Loss", "colormap": "YlOrRd", "min": 2021, "max": 2025, "units": "Year"
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
        ("gee-wri-drivers", "drivers", "WRI/DeepMind · Drivers of Forest Loss 2001-2025 (1km)", "wri_drivers", False, 1.0, {
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
        ("gee-protected-areas", "protected_areas", "WDPA Protected Areas (GEE)", "protected_areas", False, 1.0, {
            "title": "Protected Areas", "colormap": "Reds", "min": 0, "max": 1, "units": ""
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

