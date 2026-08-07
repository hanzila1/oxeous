import type { AnalysisType, CoverageQuality, ColorMap } from "./enums";

// ─── Viewport ────────────────────────────────────────────────────────────────

export interface MapViewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

// ─── Time ─────────────────────────────────────────────────────────────────────

export interface DateRange {
  start: string; // ISO date "YYYY-MM-DD"
  end: string;
}

// ─── Legend ──────────────────────────────────────────────────────────────────

export interface LegendSpec {
  title: string;
  colormap: ColorMap;
  min: number;
  max: number;
  units: string;
  steps?: number;
}

// ─── Provenance ──────────────────────────────────────────────────────────────

export interface DataProvenance {
  source: string;
  acquisition_dates: string[];
  spatial_resolution_m: number;
  cloud_cover_pct: number;
  processing_level: string;
  doi?: string;
}

// ─── Analysis Request ─────────────────────────────────────────────────────────

export interface AnalysisRequest {
  analysis_type: AnalysisType;
  location: string;
  bbox: [number, number, number, number];
  current_period: DateRange;
  comparison_period?: DateRange;
  preferred_product: string;
}

// ─── Chat Request / Response ─────────────────────────────────────────────────

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  prompt: string;
  conversation_history: ConversationMessage[];
  map_viewport: MapViewport;
}

// ─── Analysis Response ────────────────────────────────────────────────────────

export interface AnalysisResponse {
  request_id: string;
  analysis_type: AnalysisType;
  granite_intent?: AnalysisRequest;
  tile_url?: string;
  overlay_url?: string;
  geojson_hotspots?: GeoJSONFeatureCollection;
  statistics: Record<string, number | string>;
  provenance: DataProvenance;
  explanation: string;
  follow_up_suggestions: string[];
  coverage_quality: CoverageQuality;
  legend: LegendSpec;
}

// ─── Job ──────────────────────────────────────────────────────────────────────

export interface JobStatusResponse {
  job_id: string;
  status: "queued" | "running" | "complete" | "failed";
  progress_pct?: number;
  message?: string;
  result?: AnalysisResponse;
}

// ─── GeoJSON (minimal) ────────────────────────────────────────────────────────

export interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded";
  granite: boolean;
  stac: boolean;
  cache: boolean;
  version: string;
}
