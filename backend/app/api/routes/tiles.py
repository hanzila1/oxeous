"""GET /tiles/{request_id}/overlay.png & /tiles/{request_id}/{z}/{x}/{y}.png — serve cached PNG tiles."""
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from ...config import get_settings

router = APIRouter(tags=["tiles"])


@router.get("/tiles/{request_id}/overlay.png")
@router.get("/tiles/{request_id}/{z}/{x}/{y}.png")
async def get_overlay(
    request_id: str,
    z: int | None = None,
    x: int | None = None,
    y: int | None = None,
) -> FileResponse:
    settings = get_settings()
    path = os.path.join(settings.tile_cache_dir, f"{request_id}.png")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Tile not found")
    return FileResponse(
        path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
