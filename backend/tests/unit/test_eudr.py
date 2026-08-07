"""Unit tests for EUDR country risk and analysis logic."""
import pytest
import numpy as np
from app.eudr.country_risk import get_country_risk, get_commodity_risk_factors
from app.eudr.models import EUDRCountryRisk, EUDRCommodity, EUDRRiskLevel
from app.data.eudr.hansen_gfc import compute_deforestation_stats, _tile_name


# ── Country risk ──────────────────────────────────────────────────────────────

def test_brazil_is_high_risk():
    assert get_country_risk("BR") == EUDRCountryRisk.high

def test_ghana_is_high_risk():
    assert get_country_risk("GH") == EUDRCountryRisk.high

def test_germany_is_low_risk():
    assert get_country_risk("DE") == EUDRCountryRisk.low

def test_unknown_country_is_standard():
    assert get_country_risk("ZZ") == EUDRCountryRisk.standard

def test_commodity_risk_factors_brazil_soya():
    factors = get_commodity_risk_factors("soya", "BR", area_ha=100)
    assert any("high" in f.lower() or "risk" in f.lower() for f in factors)
    assert len(factors) >= 1

def test_commodity_risk_factors_large_area():
    factors = get_commodity_risk_factors("cocoa", "GH", area_ha=50.0)
    assert any("large" in f.lower() or "enhanced" in f.lower() for f in factors)


# ── Hansen GFC tile naming ────────────────────────────────────────────────────

def test_tile_name_amazon():
    # Mato Grosso, Brazil: ~-12°, -56°
    tile = _tile_name(-12.0, -56.0)
    assert tile.startswith("S") or tile.startswith("N")
    assert len(tile) > 4

def test_tile_name_west_africa():
    # Ghana: ~7°N, 1°W
    tile = _tile_name(7.0, -1.0)
    assert "N" in tile


# ── Hansen deforestation statistics ──────────────────────────────────────────

def _make_gfc_arrays(h=100, w=100):
    """Create synthetic treecover2000 + lossyear arrays."""
    rng = np.random.default_rng(42)
    treecover = np.full((h, w), 60, dtype=np.uint8)   # 60% tree cover everywhere
    lossyear  = np.zeros((h, w), dtype=np.uint8)
    # 10% of pixels lost in 2022 (lossyear=22 → 2022 → post-cutoff)
    loss_idx = rng.choice(h * w, h * w // 10, replace=False)
    lossyear.flat[loss_idx] = 22
    return treecover, lossyear

def test_deforestation_stats_post_cutoff():
    tc, ly = _make_gfc_arrays()
    stats = compute_deforestation_stats(tc, ly, area_ha=100.0)
    assert stats["has_post_cutoff_loss"] is True
    assert stats["post_cutoff_loss_pct"] == pytest.approx(10.0, abs=0.5)
    assert 2022 in stats["loss_years"]

def test_deforestation_stats_no_loss():
    tc = np.full((50, 50), 80, dtype=np.uint8)
    ly = np.zeros((50, 50), dtype=np.uint8)
    stats = compute_deforestation_stats(tc, ly, area_ha=50.0)
    assert stats["has_post_cutoff_loss"] is False
    assert stats["post_cutoff_loss_pct"] == 0.0
    assert stats["loss_years"] == []

def test_deforestation_only_pre_cutoff_not_flagged():
    """Loss in 2019 (lossyear=19) should NOT trigger EUDR violation."""
    tc = np.full((50, 50), 70, dtype=np.uint8)
    ly = np.full((50, 50), 19, dtype=np.uint8)  # all 2019 = pre-cutoff
    stats = compute_deforestation_stats(tc, ly, area_ha=50.0)
    assert stats["has_post_cutoff_loss"] is False


# ── DDS generator ─────────────────────────────────────────────────────────────

def test_dds_generation():
    from app.eudr.dds_generator import generate_dds, format_dds_text
    from app.eudr.models import (
        EUDRPlot, EUDRRiskAssessment, EUDRRiskLevel,
        DeforestationFinding, LegalityFinding, EUDRCountryRisk,
    )
    import datetime

    plot = EUDRPlot(
        plot_id="test-001",
        commodity=EUDRCommodity.cocoa,
        country_code="GH",
        country_name="Ghana",
        geometry={"type": "Polygon", "coordinates": [[[-1.7, 6.65], [-1.6, 6.65], [-1.6, 6.75], [-1.7, 6.75], [-1.7, 6.65]]]},
        uploaded_at="2025-01-01T00:00:00Z",
    )
    defo = DeforestationFinding(
        plot_id="test-001",
        has_deforestation=True,
        forest_cover_2020_pct=65.0,
        forest_loss_pct=8.0,
        forest_loss_ha=1.2,
        loss_years=[2022],
        confidence="high",
        data_sources=["Hansen GFC v1.11"],
        acquisition_dates=["2020-12-31", "2025-01-01"],
    )
    legality = LegalityFinding(
        plot_id="test-001",
        country_risk_level=EUDRCountryRisk.high,
    )
    assessment = EUDRRiskAssessment(
        plot_id="test-001",
        overall_risk=EUDRRiskLevel.at_risk,
        risk_score=55.0,
        deforestation=defo,
        legality=legality,
        assessment_date="2025-01-01",
    )
    dds = generate_dds(plot, assessment, operator_name="Test Operator")

    assert dds.regulation_reference == "EU 2023/1115"
    assert dds.commodity == EUDRCommodity.cocoa
    assert dds.overall_status == EUDRRiskLevel.at_risk
    assert len(dds.mitigation_measures) >= 1

    text = format_dds_text(dds)
    assert "EU 2023/1115" in text
    assert "Ghana" in text
    assert "deforestation" in text.lower()
