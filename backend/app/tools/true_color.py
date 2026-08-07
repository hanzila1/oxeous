"""
True Color Imagery Tool — returns a GIBS tile layer URL (no computation).
"""
from __future__ import annotations

from datetime import date

from ..models.requests import AnalysisRequest
from ..models.responses import AnalysisResponse, DataProvenance, LegendSpec
from ..models.enums import CoverageQuality

GIBS_LAYER = "VIIRS_NOAA20_CorrectedReflectance_TrueColor"
GIBS_TILE_URL_TEMPLATE = (
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
    "{layer}/default/{date}/GoogleMapsCompatible/{{z}}/{{y}}/{{x}}.jpg"
)


async def run(request: AnalysisRequest, request_id: str) -> AnalysisResponse:
    # Use the end of the current period as the GIBS date
    gibs_date = request.current_period.end

    tile_url = GIBS_TILE_URL_TEMPLATE.format(layer=GIBS_LAYER, date=gibs_date)

    return AnalysisResponse(
        request_id=request_id,
        analysis_type=request.analysis_type,
        tile_url=tile_url,
        statistics={"source": "NASA GIBS", "date": gibs_date},
        provenance=DataProvenance(
            source=f"NASA GIBS — {GIBS_LAYER}",
            acquisition_dates=[gibs_date],
            spatial_resolution_m=375,
            cloud_cover_pct=0.0,
            processing_level="L2G",
        ),
        explanation="",
        follow_up_suggestions=[
            "Analyse vegetation moisture change for this area",
            "Check for surface water extent",
            "Look for recent land disturbance",
        ],
        coverage_quality=CoverageQuality.good,
        legend=LegendSpec(
            title="True Color Imagery",
            colormap="Greys",
            min=0,
            max=255,
            units="RGB",
        ),
    )
