"""
Tile Renderer — converts float32 GeoTIFFs to web-ready PNG tiles.
Uses rio-tiler where available, falls back to PIL/matplotlib colormapping.
"""
from __future__ import annotations

import io
import logging
import os
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)


COLORMAPS = {
    "RdYlGn": [(0.839, 0.188, 0.153), (0.988, 0.553, 0.349), (0.996, 0.878, 0.565),
               (0.569, 0.812, 0.376), (0.102, 0.596, 0.314)],
    "Blues":  [(0.969, 0.984, 1.0), (0.776, 0.859, 0.937),
               (0.420, 0.682, 0.839), (0.129, 0.443, 0.710), (0.031, 0.188, 0.420)],
    "RdBu":   [(0.843, 0.188, 0.153), (0.957, 0.647, 0.510),
               (0.969, 0.969, 0.969), (0.573, 0.773, 0.871), (0.129, 0.400, 0.675)],
    "YlOrRd": [(1.0, 1.0, 0.698), (0.996, 0.800, 0.361),
               (0.992, 0.553, 0.235), (0.941, 0.231, 0.125), (0.741, 0.016, 0.149)],
}


def array_to_png(
    data: np.ndarray,  # type: ignore[type-arg]
    colormap: str = "RdYlGn",
    vmin: float = -0.5,
    vmax: float = 0.5,
    nodata: float = float("nan"),
) -> bytes:
    """
    Convert a 2D float32 array to a PNG bytes blob with colormap applied.
    """
    try:
        return _rio_tiler_png(data, colormap, vmin, vmax)
    except Exception:
        pass
    return _numpy_png(data, colormap, vmin, vmax)


def _numpy_png(
    data: np.ndarray,  # type: ignore[type-arg]
    colormap: str,
    vmin: float,
    vmax: float,
) -> bytes:
    """Fallback PNG using pure NumPy + PIL."""
    try:
        from PIL import Image
    except ImportError as e:
        raise RuntimeError("Pillow is required for tile rendering fallback") from e

    stops = COLORMAPS.get(colormap, COLORMAPS["RdYlGn"])
    n_stops = len(stops)

    # Normalize to [0, 1]
    normed = np.clip((data - vmin) / (vmax - vmin), 0.0, 1.0)
    valid_mask = np.isfinite(data)

    # Interpolate colors
    idx = normed * (n_stops - 1)
    low = np.floor(idx).astype(int).clip(0, n_stops - 2)
    frac = (idx - low)[..., np.newaxis]

    stops_arr = np.array(stops)
    rgb = (1 - frac) * stops_arr[low] + frac * stops_arr[np.clip(low + 1, 0, n_stops - 1)]
    rgb = (rgb * 255).astype(np.uint8)

    # Alpha: 0 for nodata, 200 for valid
    alpha = np.where(valid_mask, 200, 0).astype(np.uint8)
    rgba = np.dstack([rgb, alpha])

    img = Image.fromarray(rgba, mode="RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _rio_tiler_png(
    data: np.ndarray,  # type: ignore[type-arg]
    colormap: str,
    vmin: float,
    vmax: float,
) -> bytes:
    """Use rio-tiler's colormap if available."""
    from rio_tiler.colormap import cmap  # type: ignore

    cm = cmap.get(colormap.lower())
    # Normalise to uint8
    normed = np.clip((data - vmin) / (vmax - vmin) * 255, 0, 255).astype(np.uint8)
    mask = np.where(np.isfinite(data), 255, 0).astype(np.uint8)
    from rio_tiler.models import ImageData  # type: ignore

    image = ImageData(normed[np.newaxis], mask[np.newaxis])
    return image.render(img_format="PNG", colormap=cm)


def save_geotiff(
    data: np.ndarray,  # type: ignore[type-arg]
    profile: dict[str, Any],
    output_path: str,
) -> str:
    """Write a float32 2D array to a GeoTIFF file. Returns the path."""
    import rasterio

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    profile = profile.copy()
    profile.update(dtype="float32", count=1, nodata=float("nan"))

    with rasterio.open(output_path, "w", **profile) as dst:
        dst.write(data[np.newaxis].astype(np.float32))

    return output_path
