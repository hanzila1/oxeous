"""
EUDR API routes — POST /eudr/analyze, GET /eudr/dds/{dds_id}
"""
from __future__ import annotations

import io
import json
import zipfile
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from ...eudr.models import (
    EUDRPlotUploadRequest, EUDRAnalysisRequest,
    EUDRAnalysisResponse, EUDRPlot,
)
from ...eudr.analysis_engine import assess_plot
from ...eudr.dds_generator import generate_dds, format_dds_text
from ...core.granite_client import GraniteClient
from ...utils.tracing import new_request_id
from ...cache.store import get_cache

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
        assessment, tile_url, deforestation_geojson = await assess_plot(
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
            "risk_level": assessment.overall_risk.value,
            "risk_score": assessment.risk_score,
            "has_deforestation": assessment.deforestation.has_deforestation,
            "forest_loss_ha": assessment.deforestation.forest_loss_ha,
            "forest_cover_2020_pct": assessment.deforestation.forest_cover_2020_pct,
            "overlaps_protected_area": assessment.legality.overlaps_protected_area,
            "country_risk": assessment.legality.country_risk_level.value,
            "data_sources": assessment.deforestation.data_sources,
        }
        explanation = await granite.generate_explanation(tool_context)
    except Exception:
        explanation = _fallback_explanation(assessment, body.plot)

    assessment.summary = explanation

    return EUDRAnalysisResponse(
        request_id=request_id,
        plot=body.plot,
        risk_assessment=assessment,
        dds=dds,
        tile_url=tile_url,
        deforestation_geojson=deforestation_geojson,
        explanation=explanation,
        follow_up_suggestions=_follow_up_suggestions(assessment),
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


@router.get("/dds/{dds_id}")
async def get_dds(dds_id: str) -> dict:
    """Retrieve a stored Due Diligence Statement by ID."""
    dds = _dds_store.get(dds_id)
    if not dds:
        raise HTTPException(status_code=404, detail="DDS not found")
    return dds


@router.get("/dds/{dds_id}/export")
async def export_dds(dds_id: str) -> StreamingResponse:
    """Download a DDS as a ZIP containing JSON + plain text report."""
    raw = _dds_store.get(dds_id)
    if not raw:
        raise HTTPException(status_code=404, detail="DDS not found")

    from ...eudr.models import EUDRDueDiligenceStatement
    dds_obj = EUDRDueDiligenceStatement(**raw)
    dds_text = format_dds_text(dds_obj)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"oxeous_dds_{dds_id}.json", json.dumps(raw, indent=2))
        zf.writestr(f"oxeous_dds_{dds_id}_report.txt", dds_text)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="EUDR_DDS_{dds_id}.zip"'},
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fallback_explanation(assessment, plot) -> str:
    risk = assessment.overall_risk.value.replace("_", " ")
    loss = assessment.deforestation.forest_loss_ha
    return (
        f"EUDR compliance assessment for {plot.commodity.value} in {plot.country_name}: "
        f"Risk level is {risk} (score {assessment.risk_score:.0f}/100). "
        f"Post-December 2020 forest loss detected: {loss:.2f} ha. "
        f"Data sources: {', '.join(assessment.deforestation.data_sources[:2])}."
    )


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
