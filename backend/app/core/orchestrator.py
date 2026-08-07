"""
Orchestrator — routes a validated AnalysisRequest to the correct tool and returns an AnalysisResponse.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from ..models.requests import AnalysisRequest
from ..models.responses import AnalysisResponse, DataProvenance, LegendSpec
from ..models.enums import AnalysisType, CoverageQuality
from ..tools import vegetation_moisture, surface_water, disturbance, true_color, prithvi_change

logger = logging.getLogger(__name__)

_TOOL_MAP = {
    AnalysisType.vegetation_moisture_change: vegetation_moisture.run,
    AnalysisType.vegetation_health_comparison: vegetation_moisture.run,
    AnalysisType.surface_water_extent: surface_water.run,
    AnalysisType.land_disturbance: disturbance.run,
    AnalysisType.true_color_imagery: true_color.run,
    AnalysisType.prithvi_change_detection: prithvi_change.run,
}


async def dispatch(
    request: AnalysisRequest,
    request_id: str,
    explanation: str,
) -> AnalysisResponse:
    """Dispatch a validated AnalysisRequest to the appropriate tool."""
    tool_fn = _TOOL_MAP.get(request.analysis_type)
    if not tool_fn:
        raise ValueError(f"No tool registered for analysis type: {request.analysis_type}")

    logger.info(
        "Dispatching %s for %s bbox=%s",
        request.analysis_type,
        request.location,
        request.bbox,
    )

    result: AnalysisResponse = await tool_fn(request=request, request_id=request_id)
    result.explanation = explanation
    return result
