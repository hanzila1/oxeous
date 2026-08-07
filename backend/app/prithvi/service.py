"""
Prithvi Background Job Service — manages async inference jobs.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any

from ..models.requests import AnalysisRequest
from ..models.responses import AnalysisResponse, DataProvenance, LegendSpec
from ..models.enums import JobStatus, CoverageQuality
from ..config import get_settings

logger = logging.getLogger(__name__)

# In-memory job registry (replace with Redis in production)
_jobs: dict[str, dict[str, Any]] = {}


async def submit_job(request: AnalysisRequest, parent_request_id: str) -> str:
    job_id = f"prithvi_{uuid.uuid4().hex[:12]}"
    _jobs[job_id] = {
        "status": JobStatus.queued,
        "progress_pct": 0,
        "message": "Job queued",
        "result": None,
        "request": request.model_dump(),
        "parent_request_id": parent_request_id,
    }
    # Launch background task
    asyncio.create_task(_run_inference(job_id, request))
    return job_id


def get_job_status(job_id: str) -> dict[str, Any] | None:
    return _jobs.get(job_id)


async def _run_inference(job_id: str, request: AnalysisRequest) -> None:
    """
    Run Prithvi inference in a thread pool (CPU-bound).
    Tries TerraTorch first, falls back to HuggingFace transformers direct load.
    """
    settings = get_settings()
    _update(job_id, JobStatus.running, 5, "Fetching satellite data…")

    try:
        from . import preprocessor, postprocessor  # type: ignore[attr-defined]

        # Step 1: fetch bands
        _update(job_id, JobStatus.running, 15, "Downloading HLS bands…")
        image_stack, geotiff_meta = await preprocessor.prepare_input(request)

        # Step 2: run inference
        _update(job_id, JobStatus.running, 40, "Running Prithvi-EO 2.0 inference…")
        loop = asyncio.get_event_loop()
        mask = await loop.run_in_executor(
            None, preprocessor.run_model, image_stack
        )

        # Step 3: post-process
        _update(job_id, JobStatus.running, 80, "Generating output tiles…")
        tile_url, hotspots, statistics = postprocessor.process_output(
            mask, geotiff_meta, request, job_id
        )

        result = AnalysisResponse(
            request_id=job_id,
            analysis_type=request.analysis_type,
            tile_url=tile_url,
            geojson_hotspots=hotspots,
            statistics=statistics,
            provenance=DataProvenance(
                source="IBM–NASA Prithvi-EO-2.0-100M via TerraTorch",
                acquisition_dates=[request.current_period.end],
                spatial_resolution_m=30,
                cloud_cover_pct=0.0,
                processing_level="AI Segmentation (change detection)",
            ),
            explanation="AI-derived change detection mask produced by Prithvi-EO 2.0. Output shows learned change probability at 30 m resolution.",
            follow_up_suggestions=["Compare with NDMI change for the same dates"],
            coverage_quality=CoverageQuality.good,
            legend=LegendSpec(
                title="Prithvi Change Probability",
                colormap="viridis",
                min=0.0,
                max=1.0,
                units="probability",
            ),
        )
        _jobs[job_id]["result"] = result.model_dump()
        _update(job_id, JobStatus.complete, 100, "Analysis complete")

    except Exception as exc:
        logger.exception("Prithvi inference job %s failed", job_id)
        _update(job_id, JobStatus.failed, None, f"Inference failed: {exc}")


def _update(
    job_id: str,
    status: JobStatus,
    progress: float | None,
    message: str,
) -> None:
    if job_id in _jobs:
        _jobs[job_id].update({"status": status, "progress_pct": progress, "message": message})
