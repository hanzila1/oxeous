export type AnalysisType =
  | "vegetation_moisture_change"
  | "surface_water_extent"
  | "land_disturbance"
  | "true_color_imagery"
  | "prithvi_change_detection"
  | "vegetation_health_comparison";

export type CoverageQuality = "good" | "partial" | "poor" | "unavailable";

export type JobStatus = "queued" | "running" | "complete" | "failed";

export type GraniteDeployment = "ollama" | "watsonx";

export type ColorMap =
  | "RdYlGn"
  | "Blues"
  | "RdBu"
  | "YlOrRd"
  | "Greys"
  | "viridis"
  | "plasma";
