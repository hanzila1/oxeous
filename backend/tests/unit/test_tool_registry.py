"""Tests for the ToolRegistry."""
import pytest
from app.core.tool_registry import ToolRegistry
from app.models.enums import AnalysisType


def test_valid_tool_call():
    raw = {
        "tool_name": "analyze_vegetation_moisture_change",
        "parameters": {
            "location": "Lahore, Pakistan",
            "bbox": [73.8, 31.1, 74.9, 31.9],
            "current_period": {"start": "2025-06-01", "end": "2025-06-25"},
            "comparison_period": {"start": "2025-05-01", "end": "2025-05-25"},
            "preferred_product": "HLS_VI_NDMI",
        },
    }
    req = ToolRegistry.validate(raw)
    assert req.analysis_type == AnalysisType.vegetation_moisture_change
    assert req.location == "Lahore, Pakistan"


def test_unknown_tool_rejected():
    raw = {
        "tool_name": "hack_the_planet",
        "parameters": {},
    }
    with pytest.raises(ValueError, match="Unknown tool"):
        ToolRegistry.validate(raw)


def test_missing_required_fields():
    raw = {
        "tool_name": "analyze_vegetation_moisture_change",
        "parameters": {
            "location": "Lahore",
            # Missing: bbox, current_period, preferred_product
        },
    }
    with pytest.raises((ValueError, Exception)):
        ToolRegistry.validate(raw)


def test_surface_water_tool():
    raw = {
        "tool_name": "analyze_surface_water_extent",
        "parameters": {
            "location": "Dhaka, Bangladesh",
            "bbox": [90.0, 23.5, 91.0, 24.5],
            "current_period": {"start": "2025-05-01", "end": "2025-05-31"},
            "preferred_product": "OPERA_DSWX_HLS",
        },
    }
    req = ToolRegistry.validate(raw)
    assert req.analysis_type == AnalysisType.surface_water_extent


def test_all_tools_registered():
    """All AnalysisType enum values except vegetation_health_comparison have a registered tool."""
    definitions = ToolRegistry.get_definitions()
    tool_names = {d["name"] for d in definitions}
    assert len(tool_names) == 5
