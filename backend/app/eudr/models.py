"""EUDR Pydantic models — EU Deforestation Regulation (EU) 2023/1115"""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional, Union
from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class EUDRCommodity(str, Enum):
    cattle    = "cattle"
    cocoa     = "cocoa"
    coffee    = "coffee"
    palm_oil  = "palm_oil"
    soya      = "soya"
    wood      = "wood"
    rubber    = "rubber"


class EUDRRiskLevel(str, Enum):
    compliant          = "compliant"
    low_risk           = "low_risk"
    at_risk            = "at_risk"
    non_compliant      = "non_compliant"
    insufficient_data  = "insufficient_data"


class EUDRCountryRisk(str, Enum):
    standard = "standard"
    low      = "low"
    high     = "high"


# ─── Geometry ─────────────────────────────────────────────────────────────────

class PolygonGeometry(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[list[float]]]

class MultiPolygonGeometry(BaseModel):
    type: Literal["MultiPolygon"]
    coordinates: list[list[list[list[float]]]]

class PointGeometry(BaseModel):
    type: Literal["Point"]
    coordinates: list[float]


# ─── Plot ─────────────────────────────────────────────────────────────────────

class EUDRPlot(BaseModel):
    plot_id: str
    name: Optional[str] = None
    commodity: EUDRCommodity
    country_code: str                    # ISO 3166-1 alpha-2
    country_name: str
    geometry: dict[str, Any]             # GeoJSON geometry object
    area_ha: Optional[float] = None
    supplier_name: Optional[str] = None
    reference_date: Optional[str] = None
    uploaded_at: str


class EUDRPlotUploadRequest(BaseModel):
    """Request body for POST /eudr/plots"""
    commodity: EUDRCommodity
    country_code: str
    country_name: str
    geometry: dict[str, Any]             # GeoJSON Polygon / MultiPolygon
    name: Optional[str] = None
    supplier_name: Optional[str] = None
    reference_date: Optional[str] = None
    area_ha: Optional[float] = None


# ─── Findings ────────────────────────────────────────────────────────────────

class DeforestationFinding(BaseModel):
    plot_id: str
    has_deforestation: bool
    forest_cover_2000_pct: float = 0.0
    pre_cutoff_loss_pct: float = 0.0
    forest_cover_2020_pct: float = 0.0
    forest_loss_pct: float = 0.0
    forest_loss_ha: float = 0.0
    natural_forest_pct: float = 0.0
    dominant_forest_type: str = ""
    dominant_loss_driver: str = ""
    commodity_confirmed: bool = False
    commodity_coverage_pct: float = 0.0
    loss_years: list[int] = Field(default_factory=list)
    confidence: str = "medium"           # high | medium | low
    data_sources: list[str] = Field(default_factory=list)
    acquisition_dates: list[str] = Field(default_factory=list)
    ndvi_before: Optional[float] = None
    ndvi_after: Optional[float] = None


class LegalityFinding(BaseModel):
    plot_id: str
    overlaps_protected_area: bool = False
    protected_area_names: list[str] = Field(default_factory=list)
    protected_area_categories: list[str] = Field(default_factory=list)
    country_risk_level: EUDRCountryRisk = EUDRCountryRisk.standard
    issues: list[str] = Field(default_factory=list)


# ─── Risk Assessment ─────────────────────────────────────────────────────────

class EUDRRiskAssessment(BaseModel):
    plot_id: str
    overall_risk: EUDRRiskLevel
    risk_score: float = Field(ge=0, le=100)
    deforestation: DeforestationFinding
    legality: LegalityFinding
    commodity_risk_factors: list[str] = Field(default_factory=list)
    assessment_date: str
    assessor: str = "oxeous-automated"
    requires_human_review: bool = False
    summary: str = ""


# ─── Due Diligence Statement ──────────────────────────────────────────────────

class EUDRDueDiligenceStatement(BaseModel):
    dds_id: str
    created_at: str
    operator_name: Optional[str] = None
    commodity: EUDRCommodity
    country_of_production: str
    reference_period: dict[str, str]
    plots: list[EUDRRiskAssessment]
    overall_status: EUDRRiskLevel
    mitigation_measures: list[str] = Field(default_factory=list)
    data_provenance: list[str] = Field(default_factory=list)
    generated_by: str = "Oxeous EUDR Platform"
    regulation_reference: str = "EU 2023/1115"


# ─── Analysis request/response ────────────────────────────────────────────────

class EUDRAnalysisRequest(BaseModel):
    plot: EUDRPlot
    check_deforestation: bool = True
    check_legality: bool = True
    generate_dds: bool = False


class GEEMapLayer(BaseModel):
    """A real GEE-derived XYZ tile layer for frontend rendering."""
    id: str
    label: str
    tile_url: str                        # MapLibre-compatible XYZ tile URL from GEE
    visible: bool = False
    opacity: float = 0.75
    legend: Optional[dict[str, Any]] = None
    dataset: str = ""                    # GEE asset path (provenance)
    layer_type: str = ""                 # e.g. hansen_loss, forest_typology


class EUDRAnalysisResponse(BaseModel):
    request_id: str
    plot: EUDRPlot
    risk_assessment: EUDRRiskAssessment
    dds: Optional[EUDRDueDiligenceStatement] = None
    tile_url: Optional[str] = None
    deforestation_geojson: Optional[dict[str, Any]] = None
    explanation: str
    follow_up_suggestions: list[str] = Field(default_factory=list)
    # Real GEE satellite map layers — rendered as raster overlays in MapLibre
    map_layers: list[GEEMapLayer] = Field(default_factory=list)

