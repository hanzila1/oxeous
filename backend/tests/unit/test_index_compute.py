"""Tests for index computation formulas."""
import numpy as np
import pytest
from app.data.index_compute import ndmi, ndvi, ndwi, nbr, index_change, compute_statistics


def test_ndmi_formula():
    nir = np.array([[0.4, 0.6]], dtype=np.float32)
    swir1 = np.array([[0.2, 0.4]], dtype=np.float32)
    result = ndmi(nir, swir1)
    # NDMI = (NIR - SWIR1) / (NIR + SWIR1)
    expected = np.array([[(0.4 - 0.2) / (0.4 + 0.2), (0.6 - 0.4) / (0.6 + 0.4)]], dtype=np.float32)
    np.testing.assert_allclose(result, expected, atol=1e-5)


def test_ndmi_range():
    """NDMI must be in [-1, 1]."""
    rng = np.random.default_rng(42)
    nir = rng.uniform(0, 1, (64, 64)).astype(np.float32)
    swir1 = rng.uniform(0, 1, (64, 64)).astype(np.float32)
    result = ndmi(nir, swir1)
    assert result.min() >= -1.0
    assert result.max() <= 1.0


def test_ndvi_formula():
    red = np.array([[0.1]], dtype=np.float32)
    nir = np.array([[0.5]], dtype=np.float32)
    result = ndvi(red, nir)
    expected = (0.5 - 0.1) / (0.5 + 0.1)
    np.testing.assert_allclose(result[0, 0], expected, atol=1e-5)


def test_index_change_nan_propagation():
    before = np.array([[0.3, np.nan]], dtype=np.float32)
    after = np.array([[0.5, 0.4]], dtype=np.float32)
    delta = index_change(before, after)
    assert delta[0, 0] == pytest.approx(0.2, abs=1e-5)
    assert np.isnan(delta[0, 1])


def test_compute_statistics_decline():
    delta = np.full((100, 100), -0.2, dtype=np.float32)
    stats = compute_statistics(delta)
    assert stats["pct_declined"] == pytest.approx(100.0, abs=0.1)
    assert stats["pct_improved"] == pytest.approx(0.0, abs=0.1)
    assert stats["mean_change"] == pytest.approx(-0.2, abs=1e-4)


def test_compute_statistics_empty():
    delta = np.full((10, 10), np.nan, dtype=np.float32)
    stats = compute_statistics(delta)
    assert stats["mean_change"] == 0.0
