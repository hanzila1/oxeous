"""
ToolRegistry — stores tool definitions and validates Granite outputs against them.
"""
from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from ..models.requests import AnalysisRequest, DateRange
from ..models.enums import AnalysisType
from ..utils.date_resolver import resolve as resolve_date

# ── Tool Definitions (JSON Schema shared with Granite) ────────────────────────

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "analyze_vegetation_moisture_change",
        "analysis_type": "vegetation_moisture_change",
        "description": "Compute NDMI change between two time periods for an area of interest. Use for questions about vegetation moisture, drought, water stress, or vegetation moisture decline.",
        "parameters": {
            "preferred_product": {"enum": ["HLS_VI_NDMI", "HLS_S30"], "default": "HLS_VI_NDMI"},
            "requires_comparison_period": True,
        },
    },
    {
        "name": "analyze_surface_water_extent",
        "analysis_type": "surface_water_extent",
        "description": "Map surface water extent using OPERA DSWx product. Use for questions about flooding, water expansion, lake levels, or inundation.",
        "parameters": {
            "preferred_product": {"enum": ["OPERA_DSWX_HLS"], "default": "OPERA_DSWX_HLS"},
            "requires_comparison_period": False,
        },
    },
    {
        "name": "analyze_land_disturbance",
        "analysis_type": "land_disturbance",
        "description": "Detect land disturbance hotspots using OPERA DIST product. Use for deforestation, fire damage, construction, mining, or general land cover change.",
        "parameters": {
            "preferred_product": {"enum": ["OPERA_DIST_ALERT"], "default": "OPERA_DIST_ALERT"},
            "requires_comparison_period": False,
        },
    },
    {
        "name": "fetch_true_color_imagery",
        "analysis_type": "true_color_imagery",
        "description": "Retrieve true-color satellite imagery from NASA GIBS for a location and date.",
        "parameters": {
            "preferred_product": {"enum": ["GIBS_VIIRS_NOAA20", "GIBS_MODIS_TERRA"], "default": "GIBS_VIIRS_NOAA20"},
            "requires_comparison_period": False,
        },
    },
    {
        "name": "analyze_prithvi_change_detection",
        "analysis_type": "prithvi_change_detection",
        "description": "Run IBM–NASA Prithvi-EO 2.0 AI model for advanced change detection segmentation. Use when the user explicitly asks for AI analysis, machine learning analysis, or Prithvi.",
        "parameters": {
            "preferred_product": {"enum": ["PRITHVI_EO_2_100M"], "default": "PRITHVI_EO_2_100M"},
            "requires_comparison_period": True,
        },
    },
]

# Map from tool name → analysis type
_TOOL_NAME_MAP: dict[str, str] = {t["name"]: t["analysis_type"] for t in TOOL_DEFINITIONS}
_ANALYSIS_TYPE_MAP: dict[str, dict[str, Any]] = {t["analysis_type"]: t for t in TOOL_DEFINITIONS}


class ToolRegistry:
    """Validates Granite tool-call outputs and returns a hydrated AnalysisRequest."""

    @staticmethod
    def get_definitions() -> list[dict[str, Any]]:
        return TOOL_DEFINITIONS

    @staticmethod
    def validate(tool_call: dict[str, Any]) -> AnalysisRequest:
        """
        Validate and normalise a raw Granite tool_call dict.
        Raises ValueError if the tool is unknown or parameters are invalid.
        """
        tool_name = tool_call.get("tool_name", "")
        params = tool_call.get("parameters", {})

        # Resolve tool_name → analysis_type (or direct analysis_type)
        if tool_name in _TOOL_NAME_MAP:
            analysis_type = _TOOL_NAME_MAP[tool_name]
        elif tool_name in _ANALYSIS_TYPE_MAP:
            analysis_type = tool_name
        else:
            raise ValueError(
                f"Unknown tool '{tool_name}'. Valid: {list(_TOOL_NAME_MAP.keys())}"
            )

        # ── Resolve current_period with fallback ─────────────────────────
        current_period = params.get("current_period")
        if not current_period or not isinstance(current_period, dict) or not current_period.get("start"):
            # Fallback: use past 30 days
            start, end = resolve_date("past 30 days")
            current_period = {"start": start, "end": end}

        # ── Resolve comparison_period if tool requires it ────────────────
        comparison_period = params.get("comparison_period")
        tool_def = _ANALYSIS_TYPE_MAP.get(analysis_type, {})
        requires_comparison = tool_def.get("parameters", {}).get("requires_comparison_period", False)
        if requires_comparison and (not comparison_period or not isinstance(comparison_period, dict) or not comparison_period.get("start")):
            # Fallback: use the 30 days before current_period
            comp_start, comp_end = resolve_date("past 30 days", reference=__import__("datetime").date.fromisoformat(current_period["start"]))
            comparison_period = {"start": comp_start, "end": comp_end}

        # Build AnalysisRequest from params
        try:
            request = AnalysisRequest(
                analysis_type=AnalysisType(analysis_type),
                location=params.get("location", ""),
                bbox=tuple(params.get("bbox", [0, 0, 0, 0])),  # type: ignore[arg-type]
                current_period=current_period,
                comparison_period=comparison_period,
                preferred_product=params.get(
                    "preferred_product",
                    _ANALYSIS_TYPE_MAP[analysis_type]["parameters"]["preferred_product"]["default"],
                ),
            )
        except (ValidationError, KeyError) as exc:
            raise ValueError(f"Invalid tool parameters: {exc}") from exc

        return request
