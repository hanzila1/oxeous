"""GET /jobs/{job_id} — Prithvi background job status polling."""
from fastapi import APIRouter, HTTPException
from ...models.responses import JobStatusResponse
from ...models.enums import JobStatus
from ...prithvi.service import get_job_status

router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str) -> JobStatusResponse:
    job = get_job_status(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    from ...models.responses import AnalysisResponse
    result = AnalysisResponse(**job["result"]) if job.get("result") else None

    return JobStatusResponse(
        job_id=job_id,
        status=JobStatus(job["status"]),
        progress_pct=job.get("progress_pct"),
        message=job.get("message"),
        result=result,
    )
