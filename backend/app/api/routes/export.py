"""POST /export — export result as PNG + stats JSON zip."""
import io
import json
import zipfile
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...cache.store import get_cache
from ...config import get_settings

router = APIRouter(tags=["export"])


class ExportRequest(BaseModel):
    request_id: str


@router.post("/export")
async def export_result(body: ExportRequest) -> StreamingResponse:
    settings = get_settings()
    request_id = body.request_id

    # Load cached analysis result
    # (simplified: look for the PNG tile and build a stats JSON)
    tile_path = os.path.join(settings.tile_cache_dir, f"{request_id}.png")
    if not os.path.exists(tile_path):
        raise HTTPException(status_code=404, detail="Result not found for export")

    # Build zip archive in memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        # PNG
        with open(tile_path, "rb") as f:
            zf.writestr(f"oxeous_{request_id}.png", f.read())

        # Stats JSON (placeholder — full stats stored in cache in production)
        stats_json = json.dumps(
            {"request_id": request_id, "note": "Full statistics available via /chat response."},
            indent=2,
        )
        zf.writestr(f"oxeous_{request_id}_stats.json", stats_json)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="oxeous_{request_id}.zip"'},
    )
