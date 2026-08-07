from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field
from .enums import AnalysisType, CoverageQuality, JobStatus


class DataProvenance(BaseModel):
    source: str
    acquisition_dates: list[str] = Field(default_factory=list)
    spatial_resolution_m: int = 30
    cloud_cover_pct: float = 0.0
    processing_level: str = ""
    doi: Optional[str] = None


class LegendSpec(BaseModel):
    title: str
    colormap: str = "RdYlGn"
    min: float = -0.5
    max: float = 0.5
    units: str = ""
    steps: int = 5


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict[str, Any]] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    request_id: str
    analysis_type: AnalysisType
    granite_intent: Optional[dict[str, Any]] = None
    tile_url: Optional[str] = None
    overlay_url: Optional[str] = None
    geojson_hotspots: Optional[GeoJSONFeatureCollection] = None
    statistics: dict[str, Any] = Field(default_factory=dict)
    provenance: DataProvenance
    explanation: str
    follow_up_suggestions: list[str] = Field(default_factory=list)
    coverage_quality: CoverageQuality = CoverageQuality.unavailable
    legend: LegendSpec


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress_pct: Optional[float] = None
    message: Optional[str] = None
    result: Optional[AnalysisResponse] = None


class HealthResponse(BaseModel):
    status: str
    granite: bool = False
    stac: bool = False
    cache: bool = False
    version: str = "0.1.0"
