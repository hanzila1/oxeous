from enum import Enum


class AnalysisType(str, Enum):
    vegetation_moisture_change = "vegetation_moisture_change"
    surface_water_extent = "surface_water_extent"
    land_disturbance = "land_disturbance"
    true_color_imagery = "true_color_imagery"
    prithvi_change_detection = "prithvi_change_detection"
    vegetation_health_comparison = "vegetation_health_comparison"


class CoverageQuality(str, Enum):
    good = "good"
    partial = "partial"
    poor = "poor"
    unavailable = "unavailable"


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    complete = "complete"
    failed = "failed"
