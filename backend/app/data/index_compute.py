"""
Index computation — NDMI, NDVI, NDWI, NBR formulas.
All functions accept float32 2D NumPy arrays and return float32 arrays.
Division-by-zero protected by np.errstate.
"""
from __future__ import annotations

import numpy as np


def ndmi(nir: np.ndarray, swir1: np.ndarray) -> np.ndarray:  # type: ignore[type-arg]
    """Normalized Difference Moisture Index = (NIR - SWIR1) / (NIR + SWIR1)"""
    with np.errstate(invalid="ignore", divide="ignore"):
        result = (nir - swir1) / (nir + swir1)
    result = np.where(np.isfinite(result), result, np.nan)
    return np.clip(result, -1.0, 1.0).astype(np.float32)


def ndvi(red: np.ndarray, nir: np.ndarray) -> np.ndarray:  # type: ignore[type-arg]
    """Normalized Difference Vegetation Index = (NIR - Red) / (NIR + Red)"""
    with np.errstate(invalid="ignore", divide="ignore"):
        result = (nir - red) / (nir + red)
    result = np.where(np.isfinite(result), result, np.nan)
    return np.clip(result, -1.0, 1.0).astype(np.float32)


def ndwi(green: np.ndarray, nir: np.ndarray) -> np.ndarray:  # type: ignore[type-arg]
    """Normalized Difference Water Index = (Green - NIR) / (Green + NIR)"""
    with np.errstate(invalid="ignore", divide="ignore"):
        result = (green - nir) / (green + nir)
    result = np.where(np.isfinite(result), result, np.nan)
    return np.clip(result, -1.0, 1.0).astype(np.float32)


def nbr(nir: np.ndarray, swir2: np.ndarray) -> np.ndarray:  # type: ignore[type-arg]
    """Normalized Burn Ratio = (NIR - SWIR2) / (NIR + SWIR2)"""
    with np.errstate(invalid="ignore", divide="ignore"):
        result = (nir - swir2) / (nir + swir2)
    result = np.where(np.isfinite(result), result, np.nan)
    return np.clip(result, -1.0, 1.0).astype(np.float32)


def index_change(
    before: np.ndarray,
    after: np.ndarray,
) -> np.ndarray:  # type: ignore[type-arg]
    """Compute difference (after - before), masking pixels where either is NaN."""
    delta = after - before
    delta[~np.isfinite(delta)] = np.nan
    return delta.astype(np.float32)


def compute_statistics(
    delta: np.ndarray,  # type: ignore[type-arg]
    pixel_area_km2: float = 0.0009,  # 30m × 30m ≈ 0.0009 km²
    decline_threshold: float = -0.05,
    improve_threshold: float = 0.05,
) -> dict[str, float]:
    """Compute summary statistics from a change raster."""
    valid = delta[np.isfinite(delta)]
    if valid.size == 0:
        return {"mean_change": 0.0, "pct_declined": 0.0, "pct_improved": 0.0, "hotspot_count": 0}

    declined = valid[valid < decline_threshold]
    improved = valid[valid > improve_threshold]
    n_total = valid.size

    return {
        "mean_change": float(np.nanmean(valid)),
        "std_change": float(np.nanstd(valid)),
        "min_change": float(np.nanmin(valid)),
        "max_change": float(np.nanmax(valid)),
        "pct_declined": float(len(declined) / n_total * 100),
        "pct_improved": float(len(improved) / n_total * 100),
        "area_declined_km2": float(len(declined) * pixel_area_km2),
        "area_improved_km2": float(len(improved) * pixel_area_km2),
        "hotspot_count": int(len(declined[declined < decline_threshold * 3])),
    }
