"""
COG Reader — windowed reads from Cloud-Optimized GeoTIFFs using rasterio/vsicurl.
Supports NASA EarthData bearer token authentication.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


def read_window(
    href: str,
    bbox: tuple[float, float, float, float],
    earthdata_token: Optional[str] = None,
) -> tuple[np.ndarray, dict]:  # type: ignore[type-arg]
    """
    Read a windowed region from a COG asset URL.
    Returns (array, profile) where array has shape (bands, height, width).
    """
    try:
        import rasterio
        from rasterio.windows import from_bounds
        from rasterio.transform import array_bounds
    except ImportError as e:
        raise RuntimeError("rasterio is required for COG reads") from e

    env_opts: dict[str, str] = {
        "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
        "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.tiff",
    }
    if earthdata_token:
        env_opts["GDAL_HTTP_HEADERS"] = f"Authorization: Bearer {earthdata_token}"

    # Prefix with vsicurl for remote COGs
    vsicurl_href = href if href.startswith("/vsi") else f"/vsicurl/{href}"

    with rasterio.Env(**env_opts):
        with rasterio.open(vsicurl_href) as ds:
            window = from_bounds(bbox[0], bbox[1], bbox[2], bbox[3], ds.transform)
            data = ds.read(window=window, boundless=True, fill_value=0)
            profile = ds.profile.copy()
            profile.update(
                width=data.shape[-1],
                height=data.shape[-2],
                transform=ds.window_transform(window),
            )
    return data, profile


def stack_bands(
    hrefs: dict[str, str],
    bbox: tuple[float, float, float, float],
    earthdata_token: Optional[str] = None,
) -> tuple[dict[str, np.ndarray], dict]:  # type: ignore[type-arg]
    """
    Read multiple band hrefs (e.g. {"B8A": href1, "B11": href2}) into aligned arrays.
    Returns ({band_key: array_2d}, common_profile).
    """
    bands: dict[str, np.ndarray] = {}  # type: ignore[type-arg]
    profile: dict = {}
    for band_key, href in hrefs.items():
        arr, prof = read_window(href, bbox, earthdata_token)
        bands[band_key] = arr[0].astype(np.float32)
        if not profile:
            profile = prof
    return bands, profile
