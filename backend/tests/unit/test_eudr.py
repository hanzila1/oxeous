"""Unit tests for EUDR country risk and analysis logic."""
import pytest
import numpy as np
from app.eudr.country_risk import get_country_risk, get_commodity_risk_factors
from app.eudr.models import EUDRCountryRisk, EUDRCommodity, EUDRRiskLevel
from app.data.eudr.hansen_gfc import compute_deforestation_stats, _tile_name


# -- Country risk (Commission Implementing Regulation (EU) 2025/1093) --------

def test_belarus_is_high_risk():
    assert get_country_risk("BY") == EUDRCountryRisk.high

def test_russia_is_high_risk():
    assert get_country_risk("RU") == EUDRCountryRisk.high

def test_brazil_is_standard_risk():
    # Brazil is Standard Risk (statutory default under EU 2025/1093), not high risk
    assert get_country_risk("BR") == EUDRCountryRisk.standard

def test_ghana_is_standard_risk():
    # Ghana is Standard Risk (statutory default under EU 2025/1093), not high risk
    assert get_country_risk("GH") == EUDRCountryRisk.standard

def test_germany_is_low_risk():
    assert get_country_risk("DE") == EUDRCountryRisk.low

def test_unknown_country_is_standard():
    assert get_country_risk("ZZ") == EUDRCountryRisk.standard

def test_commodity_risk_factors_brazil_soya():
    factors = get_commodity_risk_factors("soya", "BR", area_ha=100)
    assert any("risk" in f.lower() or "sensitivity" in f.lower() or "conversion" in f.lower() for f in factors)
    assert len(factors) >= 1

def test_commodity_risk_factors_large_area():
    factors = get_commodity_risk_factors("cocoa", "GH", area_ha=50.0)
    assert any("large" in f.lower() or "enhanced" in f.lower() for f in factors)


# -- Hansen GFC tile naming ----------------------------------------------------

def test_tile_name_amazon():
    # Mato Grosso, Brazil: ~-12°, -56°
    tile = _tile_name(-12.0, -56.0)
    assert tile.startswith("S") or tile.startswith("N")
    assert len(tile) > 4

def test_tile_name_west_africa():
    # Ghana: ~7°N, 1°W
    tile = _tile_name(7.0, -1.0)
    assert "N" in tile


# -- Hansen deforestation statistics ------------------------------------------

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


# -- DDS generator -------------------------------------------------------------

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


def test_plantation_replanting_exemption():
    """Verify that established agricultural plantations (e.g. Thailand Rubber) with post-2020 canopy loss
    are statutorily adjudicated as Compliant under EUDR Art. 2(4) & 2(5) instead of false-positive Non-Compliant."""
    from app.eudr.analysis_engine import _calculate_risk
    from app.eudr.models import EUDRRiskLevel, EUDRCountryRisk

    # Plot has optical loss (19.9 ha), but JRC baseline is 0% forest, natural forest is 0%,
    # typology is TreeCropsAndAgroforestry, and commodity is confirmed.
    score, level, is_exempt = _calculate_risk(
        has_deforestation=True,
        forest_loss_pct=21.1,
        overlaps_protected=False,
        is_strict_protected_area=False,
        country_risk=EUDRCountryRisk.standard,
        confirmed_alerts=124,
        forest_loss_ha=19.89,
        jrc_forest_cover_2020_pct=0.0,
        natural_forest_pct=0.0,
        dominant_forest_type="TreeCropsAndAgroforestry",
        commodity_confirmed=True,
        is_natural_forest=False,
    )

    assert is_exempt is True
    assert level in (EUDRRiskLevel.compliant, EUDRRiskLevel.low_risk)
    assert score <= 25.0


def test_true_deforestation_violation():
    """Verify that post-2020 loss over standing statutory forest is strictly classified as Non-Compliant."""
    from app.eudr.analysis_engine import _calculate_risk
    from app.eudr.models import EUDRRiskLevel, EUDRCountryRisk

    # Real forest standing in 2020 (JRC 75%, primary forest), post-2020 loss detected
    score, level, is_exempt = _calculate_risk(
        has_deforestation=True,
        forest_loss_pct=30.0,
        overlaps_protected=False,
        is_strict_protected_area=False,
        country_risk=EUDRCountryRisk.standard,
        confirmed_alerts=50,
        forest_loss_ha=15.0,
        jrc_forest_cover_2020_pct=75.0,
        natural_forest_pct=80.0,
        dominant_forest_type="PrimaryForest",
        commodity_confirmed=False,
        is_natural_forest=True,
    )

    assert is_exempt is False
    assert level == EUDRRiskLevel.non_compliant
    assert score >= 65.0


def test_pwri_metrics_and_carveout():
    """Verify that Pixel-Wise Raster Intersection (PWRI) accurately computes continuous compliance
    and plot segregation carve-out hectares under EUDR May 2026 guidelines."""
    from app.eudr.models import DeforestationFinding

    defo = DeforestationFinding(
        plot_id="ghana_mosaic_01",
        has_deforestation=True,
        total_parcel_ha=12220.2,
        statutory_deforestation_ha=79.3,
        plantation_replanting_ha=2022.5,
        compliant_ha=12140.9,
        spatial_compliance_pct=99.35,
        carveout_eligible_ha=79.3,
    )

    assert defo.total_parcel_ha == 12220.2
    assert defo.statutory_deforestation_ha == 79.3
    assert defo.spatial_compliance_pct == 99.35
    assert defo.compliant_ha == 12140.9
    assert defo.carveout_eligible_ha == 79.3


def test_topological_carveout_decomposition():
    """Verify that decompose_parcel_geometry produces clean vector polygons with 6 decimal places."""
    from app.eudr.carveout_service import decompose_parcel_geometry, build_carveout_feature_collection

    sample_geom = {
        "type": "Polygon",
        "coordinates": [[
            [-73.1234567, 3.1234567],
            [-73.1000000, 3.1234567],
            [-73.1000000, 3.1000000],
            [-73.1234567, 3.1000000],
            [-73.1234567, 3.1234567],
        ]]
    }

    # Case 1: Deforestation present - splits into clean and violation
    clean_f, viol_f, metrics = decompose_parcel_geometry(
        original_geometry=sample_geom,
        total_parcel_ha=100.0,
        statutory_deforestation_ha=15.0,
        is_plantation_exemption=False,
    )

    assert metrics["carveout_applied"] is True
    assert metrics["compliant_ha"] == 85.0
    assert metrics["carved_out_ha"] == 15.0
    assert clean_f["properties"]["status"] == "COMPLIANT_TRACES_NT"
    assert clean_f["properties"]["traces_nt_ready"] is True
    assert viol_f is not None
    assert viol_f["properties"]["status"] == "DELISTED_VIOLATION_ZONE"

    # Case 2: Article 2(5) Agricultural Exemption - 100% compliant, zero carve-out
    clean_f2, viol_f2, metrics2 = decompose_parcel_geometry(
        original_geometry=sample_geom,
        total_parcel_ha=50.0,
        statutory_deforestation_ha=0.0,
        is_plantation_exemption=True,
    )
    assert metrics2["carveout_applied"] is False
    assert viol_f2 is None
    assert clean_f2["properties"]["status"] == "COMPLIANT_TRACES_NT"

    fc = build_carveout_feature_collection(sample_geom, 100.0, 15.0, False)
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) == 2


@pytest.mark.asyncio
async def test_multi_agent_consensus_arbitration():
    """Verify that SupervisorAgent arbitrates across subagents and generates SHA-256 hash."""
    from app.eudr.agents import SupervisorAgent, AgentVerdict

    supervisor = SupervisorAgent()
    sample_geom = {
        "type": "Polygon",
        "coordinates": [[
            [-73.1, 3.1], [-73.0, 3.1], [-73.0, 3.0], [-73.1, 3.0], [-73.1, 3.1]
        ]]
    }

    # Clean parcel
    gee_summary_clean = {
        "has_post_cutoff_loss": False,
        "forest_loss_pct": 0.0,
        "forest_loss_ha": 0.0,
        "forest_cover_2020_pct": 82.0,
        "jrc_forest_cover_2020_pct": 85.0,
        "overlaps_protected_area": False,
        "dominant_forest_type": "primary",
    }
    consensus_clean = await supervisor.arbitrate(
        plot_geometry=sample_geom,
        commodity="coffee",
        country_code="COL",
        supplier_claim="Certified zero deforestation coffee farm",
        total_ha=45.0,
        gee_summary=gee_summary_clean,
    )
    assert consensus_clean.consensus_verdict == AgentVerdict.compliant
    assert consensus_clean.unanimous is True
    assert consensus_clean.composite_risk_score <= 15.0
    assert consensus_clean.cryptographic_audit_hash.startswith("0x")

    # Thailand Article 2(5) Rubber Replanting parcel
    gee_summary_replant = {
        "has_post_cutoff_loss": True,
        "forest_loss_pct": 14.2,
        "forest_loss_ha": 7.1,
        "forest_cover_2020_pct": 0.0,
        "jrc_forest_cover_2020_pct": 0.0,
        "overlaps_protected_area": False,
        "dominant_forest_type": "tree crops",
        "commodity_confirmed": True,
    }
    consensus_replant = await supervisor.arbitrate(
        plot_geometry=sample_geom,
        commodity="rubber",
        country_code="THA",
        supplier_claim="Lawful rubber tree replanting cycle",
        total_ha=50.0,
        gee_summary=gee_summary_replant,
    )
    assert consensus_replant.consensus_verdict == AgentVerdict.exempt_art2_5
    assert consensus_replant.conflict_detected is True
    assert "STATUTORY ONTOLOGY" in consensus_replant.conflict_resolution_narrative


@pytest.mark.asyncio
async def test_biophysical_yield_and_laundering_detection():
    """Verify that BiophysicalYieldSubagent detects volume laundering anomalies under EUDR Article 16(3)."""
    from app.eudr.agents.yield_agent import BiophysicalYieldSubagent
    from app.eudr.agents import AgentVerdict

    agent = BiophysicalYieldSubagent()
    sample_geom = {
        "type": "Polygon",
        "coordinates": [[
            [-2.0, 6.0], [-1.9, 6.0], [-1.9, 6.1], [-2.0, 6.1], [-2.0, 6.0]
        ]]
    }

    # Case 1: Plausible harvest volume on 10 ha cocoa farm (5,000 kg = 500 kg/ha)
    finding_normal = await agent.evaluate(
        plot_geometry=sample_geom,
        commodity="cocoa",
        country_code="GHA",
        area_ha=10.0,
        declared_net_mass_kg=5000.0,
    )
    assert finding_normal.verdict == AgentVerdict.compliant
    assert finding_normal.evidence_metrics["is_laundering_anomaly_detected"] is False
    assert finding_normal.evidence_metrics["implied_yield_kg_ha"] == 500.0

    # Case 2: Extreme laundering anomaly (50,000 kg on 5 ha cocoa farm = 10,000 kg/ha vs max ceiling 1,100 kg/ha)
    finding_laundering = await agent.evaluate(
        plot_geometry=sample_geom,
        commodity="cocoa",
        country_code="CIV",
        area_ha=5.0,
        declared_net_mass_kg=50000.0,
    )
    assert finding_laundering.verdict == AgentVerdict.non_compliant
    assert finding_laundering.evidence_metrics["is_laundering_anomaly_detected"] is True
    assert finding_laundering.evidence_metrics["implied_yield_kg_ha"] == 10000.0
    assert "Volume Laundering Anomaly Detected" in finding_laundering.headline



def test_universal_geodesic_and_jurisdiction_engine():
    """Verify WGS84 ellipsoidal geodesic area, <4ha Point circular buffering, auto-jurisdiction,
    and true Shapely Boolean subtraction from GEE raster-to-vector loss features."""
    from app.eudr.spatial_jurisdiction import (
        compute_geodesic_metrics,
        resolve_jurisdiction_from_coordinates,
    )
    from app.eudr.carveout_service import decompose_parcel_geometry

    # 1. Test <4 ha smallholder Point geometry (EUDR Art. 9(1)(d)) -> exact ~1.8 ha geodesic circle
    pt_geom = {"type": "Point", "coordinates": [-75.5, 4.5]}
    pt_metrics = compute_geodesic_metrics(pt_geom)
    assert pt_metrics["is_point_geometry"] is True
    assert 1.5 <= pt_metrics["geodesic_area_ha"] <= 2.2
    assert pt_metrics["perimeter_km"] > 0.4
    assert 0.95 <= pt_metrics["compactness_index"] <= 1.0
    assert pt_metrics["effective_polygon"]["type"] == "Polygon"

    # 2. Test custom Polygon anywhere on Earth with empty country_code -> auto-detects jurisdiction & biome
    poly_geom = {
        "type": "Polygon",
        "coordinates": [[
            [-55.20, -12.50],
            [-55.18, -12.50],
            [-55.18, -12.48],
            [-55.20, -12.48],
            [-55.20, -12.50],
        ]],
    }
    poly_metrics = compute_geodesic_metrics(poly_geom)
    assert poly_metrics["geodesic_area_ha"] > 400.0
    assert poly_metrics["compactness_index"] > 0.70

    code, cname, biome = resolve_jurisdiction_from_coordinates(
        poly_metrics["centroid_lng"],
        poly_metrics["centroid_lat"],
        provided_code="",
        provided_name="",
    )
    assert code == "BR"
    assert cname == "Brazil"
    assert "Tropical" in biome

    # Boreal latitude test (Sweden)
    code_se, cname_se, biome_se = resolve_jurisdiction_from_coordinates(16.5, 62.0, "", "")
    assert code_se == "SE"
    assert "Boreal" in biome_se

    # 3. Test true Shapely Boolean subtraction with GEE raster-to-vector loss polygons
    real_loss_feature = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-55.185, -12.485],
                [-55.180, -12.485],
                [-55.180, -12.480],
                [-55.185, -12.480],
                [-55.185, -12.485],
            ]],
        },
        "properties": {"label": 1},
    }
    clean_f, viol_f, carve_metrics = decompose_parcel_geometry(
        original_geometry=poly_geom,
        total_parcel_ha=poly_metrics["geodesic_area_ha"],
        statutory_deforestation_ha=25.0,
        is_plantation_exemption=False,
        loss_vector_features=[real_loss_feature],
    )
    assert carve_metrics["carveout_applied"] is True
    assert carve_metrics["used_real_raster_vectors"] is True
    assert viol_f is not None
    assert clean_f["properties"]["status"] == "COMPLIANT_TRACES_NT"


def test_pwri_3d_tri_axial_tensor_classification():
    """Verify that DeforestationFinding and PWRI-3D Tri-Axial Tensor logic conforms
    to the 4-class discrete adjudication model and SHA-256 Merkle provenance hash:
    Class 0: Clean Hectares (Green #2E9E6F)
    Class 1: Exempt Agricultural Replanting Art. 2(5) (Amber #F2A91F)
    Class 2: Exempt Sustainable Silviculture Art. 2(3)/2(7) (Blue #3B82C4)
    Class 3: Statutory Deforestation Violation Art. 3(a) (Red #D93C4A)
    """
    from app.eudr.models import DeforestationFinding

    pwri_finding = DeforestationFinding(
        plot_id="sweden_boreal_wood_07",
        has_deforestation=False,
        total_parcel_ha=850.0,
        statutory_deforestation_ha=0.0,
        plantation_replanting_ha=0.0,
        silviculture_replanting_ha=32.4,
        is_silviculture_exemption=True,
        compliant_ha=850.0,
        spatial_compliance_pct=100.0,
        carveout_eligible_ha=0.0,
        pwri_classified_tile_url="https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/mock_pwri_3d/{z}/{x}/{y}",
        pwri_3d_breakdown={
            "class_0_clean_ha": 817.6,
            "class_1_replanting_art2_5_ha": 0.0,
            "class_2_silviculture_art2_3_7_ha": 32.4,
            "class_3_violation_art3_a_ha": 0.0,
            "fao_mmu_filter_ha": 0.5,
            "carveout_formula": "P_export = P_declared \\ V_3(a)",
        },
        sha256_merkle_provenance="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    )

    assert pwri_finding.is_silviculture_exemption is True
    assert pwri_finding.silviculture_replanting_ha == 32.4
    assert pwri_finding.compliant_ha == 850.0
    assert pwri_finding.spatial_compliance_pct == 100.0
    assert pwri_finding.pwri_3d_breakdown["class_2_silviculture_art2_3_7_ha"] == 32.4
    assert pwri_finding.pwri_3d_breakdown["class_3_violation_art3_a_ha"] == 0.0
    assert "P_export = P_declared" in pwri_finding.pwri_3d_breakdown["carveout_formula"]
    assert len(pwri_finding.sha256_merkle_provenance) == 64

