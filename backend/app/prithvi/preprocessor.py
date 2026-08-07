"""
Prithvi Preprocessor — fetches HLS bands and prepares a (T, C, H, W) tensor.
"""
from __future__ import annotations

import logging
from typing import Any

import numpy as np

from ..models.requests import AnalysisRequest
from ..data import stac_client, cog_reader
from ..config import get_settings

logger = logging.getLogger(__name__)

HLS_BANDS = ["B02", "B03", "B04", "B8A", "B11", "B12"]
TARGET_SIZE = 224


async def prepare_input(
    request: AnalysisRequest,
) -> tuple[np.ndarray, dict[str, Any]]:  # type: ignore[type-arg]
    """
    Fetch HLS S30 bands for two time steps and stack into (2, 6, H, W) array.
    Returns (image_stack, geotiff_meta).
    """
    settings = get_settings()
    token = settings.nasa_earthdata_token
    bbox = request.bbox

    # Fetch items for current period
    current_items = await stac_client.search_items(
        collection="HLS_S30",
        bbox=bbox,
        date_start=request.current_period.start,
        date_end=request.current_period.end,
        earthdata_token=token,
    )

    comparison_items = []
    if request.comparison_period:
        comparison_items = await stac_client.search_items(
            collection="HLS_S30",
            bbox=bbox,
            date_start=request.comparison_period.start,
            date_end=request.comparison_period.end,
            earthdata_token=token,
        )

    if not current_items:
        raise RuntimeError("No HLS S30 items found for current period")

    current_best = stac_client.get_best_item(current_items)
    comp_best = stac_client.get_best_item(comparison_items) if comparison_items else current_best

    # Read bands for both timesteps
    t1 = await _read_all_bands(comp_best, bbox, token)     # (6, H, W)
    t2 = await _read_all_bands(current_best, bbox, token)  # (6, H, W)

    # Resize to (6, 224, 224) via simple crop/pad
    t1 = _resize(t1)
    t2 = _resize(t2)

    # Stack → (2, 6, 224, 224)
    stack = np.stack([t1, t2], axis=0).astype(np.float32)
    meta = {"profile": {}, "bbox": bbox}

    return stack, meta


async def _read_all_bands(
    item: dict,
    bbox: tuple[float, float, float, float],
    token: str | None,
) -> np.ndarray:  # type: ignore[type-arg]
    """Read all 6 HLS bands from a STAC item. Returns (6, H, W) float32."""
    hrefs = {}
    for band in HLS_BANDS:
        href = stac_client.get_asset_href(item, band)
        if href:
            hrefs[band] = href

    if not hrefs:
        # Return synthetic zeros (fallback for testing)
        return np.zeros((6, TARGET_SIZE, TARGET_SIZE), dtype=np.float32)

    raw, _ = cog_reader.stack_bands(hrefs, bbox, token)
    arrays = [raw.get(b, np.zeros((TARGET_SIZE, TARGET_SIZE), dtype=np.float32)) for b in HLS_BANDS]
    return np.stack(arrays, axis=0)


def _resize(arr: np.ndarray, size: int = TARGET_SIZE) -> np.ndarray:  # type: ignore[type-arg]
    """Naive resize to (C, size, size) by center crop."""
    c, h, w = arr.shape
    if h >= size and w >= size:
        h0 = (h - size) // 2
        w0 = (w - size) // 2
        return arr[:, h0:h0 + size, w0:w0 + size]
    # Pad with zeros if smaller
    out = np.zeros((c, size, size), dtype=arr.dtype)
    out[:, :min(h, size), :min(w, size)] = arr[:, :min(h, size), :min(w, size)]
    return out


def run_model(image_stack: np.ndarray) -> np.ndarray:  # type: ignore[type-arg]
    """
    Run Prithvi-EO 2.0 inference (CPU). Called from a thread executor.
    Returns (H, W) float32 probability mask.
    """
    try:
        return _terratorch_inference(image_stack)
    except ImportError:
        logger.warning("TerraTorch not available — trying direct HuggingFace load")
        return _hf_inference(image_stack)


def _terratorch_inference(image_stack: np.ndarray) -> np.ndarray:  # type: ignore[type-arg]
    import torch
    from terratorch.models import PrithviModelFactory  # type: ignore

    model = PrithviModelFactory.build("Prithvi-EO-2.0-100M", task="change_detection")
    model.eval()
    tensor = torch.from_numpy(image_stack).unsqueeze(0)  # (1, T, C, H, W)
    with torch.no_grad():
        output = model(tensor)
    return output.squeeze().cpu().numpy()


def _hf_inference(image_stack: np.ndarray) -> np.ndarray:  # type: ignore[type-arg]
    """Fallback using HuggingFace transformers directly."""
    import torch
    from transformers import AutoModel  # type: ignore

    model = AutoModel.from_pretrained(
        "ibm-nasa-geospatial/Prithvi-EO-2.0-100M",
        trust_remote_code=True,
    )
    model.eval()
    tensor = torch.from_numpy(image_stack).unsqueeze(0)
    with torch.no_grad():
        output = model(tensor)
    # Return change magnitude approximation
    t1_embed = output.last_hidden_state[:, 0]
    t2_embed = output.last_hidden_state[:, 1]
    diff = (t1_embed - t2_embed).abs().mean(dim=-1)
    return diff.cpu().numpy().reshape(224, 224)
