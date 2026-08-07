"""
Prithvi Change Detection Tool — submits a background job and returns a job ID.
Actual inference runs in backend/app/prithvi/service.py.
"""
from __future__ import annotations

import uuid
import logging

from ..models.requests import AnalysisRequest
from ..models.responses import AnalysisResponse, DataProvenance, LegendSpec
from ..models.enums import CoverageQuality

logger = logging.getLogger(__name__)


async def run(request: AnalysisRequest, request_id: str) -> AnalysisResponse:
    """Queue a Prithvi inference job and return immediately with a job reference."""
    from ..prithvi.service import submit_job

    job_id = await submit_job(
        request=request,
        parent_request_id=request_id,
    )
    logger.info("Queued Prithvi job %s for request %s", job_id, request_id)

    return AnalysisResponse(
        request_id=request_id,
        analysis_type=request.analysis_type,
        # No tile_url yet — job is async
        statistics={"job_id": job_id, "status": "queued"},
        provenance=DataProvenance(
            source="IBM–NASA Prithvi-EO-2.0-100M via TerraTorch",
            acquisition_dates=[],
            spatial_resolution_m=30,
            cloud_cover_pct=0.0,
            processing_level="AI Segmentation",
        ),
        explanation=(
            "A Prithvi AI analysis job has been queued. "
            "The model will process the area and return a change-detection segmentation mask. "
            "Results appear on the map when processing is complete (typically 30–90 seconds)."
        ),
        follow_up_suggestions=[
            "While waiting, check NDMI change for the same area",
            "View the disturbance alert layer",
        ],
        coverage_quality=CoverageQuality.partial,
        legend=LegendSpec(
            title="Prithvi Change Detection",
            colormap="viridis",
            min=0.0,
            max=1.0,
            units="probability",
        ),
    )
