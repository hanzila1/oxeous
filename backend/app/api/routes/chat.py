"""POST /chat — full conversation round-trip: Granite → tool → explain."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ...models.requests import ChatRequest, AnalysisRequest
from ...models.responses import AnalysisResponse
from ...core.granite_client import GraniteClient, GraniteParseError
from ...core.tool_registry import ToolRegistry
from ...core import orchestrator
from ...utils import tracing, date_resolver, geocoder
from ...config import get_settings

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)


def _prompt_is_non_geospatial(prompt: str) -> bool:
    text = prompt.strip().lower()
    if not text:
        return True

    greeting_phrases = (
        "hi", "hello", "hey", "good morning", "good evening", "good afternoon",
        "thanks", "thank you", "who are you", "what is this", "what can you do",
    )
    if text in greeting_phrases or text.startswith(greeting_phrases):
        return True

    geospatial_terms = (
        "forest", "deforestation", "water", "aoi", "plot", "geojson", "satellite",
        "land", "vegetation", "crop", "soil", "moisture", "risk", "compliance",
        "eudr", "due diligence", "cover", "analysis", "map", "boundary", "area",
        "change", "disturbance", "protected", "legality", "surface", "change detection",
        "imagery", "image", "true color", "rgb", "sentinel", "landsat",
    )
    return not any(term in text for term in geospatial_terms)


@router.post("/chat", response_model=AnalysisResponse)
async def chat(body: ChatRequest, request: Request) -> AnalysisResponse:
    request_id = tracing.new_request_id()
    settings = get_settings()
    granite: GraniteClient = request.app.state.granite

    logger.info("Chat request %s: %s", request_id, body.prompt[:80])
    if _prompt_is_non_geospatial(body.prompt):
        raise HTTPException(
            status_code=400,
            detail="Please ask about a specific AOI, plot, or geospatial question. Upload GeoJSON or use the current map area to run due diligence.",
        )

    # ── 1. Granite intent extraction ─────────────────────────────────────────
    tool_definitions = ToolRegistry.get_definitions()
    history = [m.model_dump() for m in body.conversation_history]

    try:
        raw_tool_call = await granite.extract_intent(
            prompt=body.prompt,
            conversation_history=history,
            tool_definitions=tool_definitions,
            viewport_hint=body.map_viewport.model_dump(),
        )
    except GraniteParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # ── 2. Validate tool call ─────────────────────────────────────────────────
    try:
        analysis_request: AnalysisRequest = ToolRegistry.validate(raw_tool_call)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Tool validation failed: {exc}")

    # ── 3. Resolve location → bbox if not provided ────────────────────────────
    if analysis_request.bbox == (0.0, 0.0, 0.0, 0.0) and analysis_request.location:
        try:
            analysis_request.bbox = await geocoder.resolve_bbox(analysis_request.location)  # type: ignore[assignment]
        except ValueError:
            logger.warning("Geocoder could not resolve '%s'", analysis_request.location)

    # ── 4. Dispatch to analysis tool ──────────────────────────────────────────
    try:
        analysis_result = await orchestrator.dispatch(
            request=analysis_request,
            request_id=request_id,
            explanation="",  # placeholder — filled in by Granite below
        )
    except Exception as exc:
        logger.error("Analysis dispatch failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    # ── 5. Generate Granite explanation ───────────────────────────────────────
    tool_context = {
        "tool_used": analysis_request.analysis_type.value,
        "statistics": analysis_result.statistics,
        "provenance": analysis_result.provenance.model_dump(),
        "coverage_quality": analysis_result.coverage_quality.value,
    }
    try:
        explanation = await granite.generate_explanation(tool_context)
    except Exception as exc:
        logger.warning("Granite explanation failed: %s", exc)
        explanation = _fallback_explanation(analysis_result)

    analysis_result.explanation = explanation
    analysis_result.granite_intent = analysis_request.model_dump()
    return analysis_result


def _fallback_explanation(result: AnalysisResponse) -> str:
    """Simple template explanation when Granite is unavailable."""
    src = result.provenance.source
    dates = ", ".join(result.provenance.acquisition_dates)
    return (
        f"Analysis complete using {src}. "
        f"Acquisition dates: {dates}. "
        f"Coverage quality: {result.coverage_quality.value}."
    )
