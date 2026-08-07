// ─── EUDR Compliance Types ────────────────────────────────────────────────────
// EU Deforestation Regulation (EU) 2023/1115
// Forest-free cutoff date: December 31 2020

export type EUDRCommodity =
  | "cattle"
  | "cocoa"
  | "coffee"
  | "palm_oil"
  | "soya"
  | "wood"
  | "rubber";

export type EUDRRiskLevel = "compliant" | "low_risk" | "at_risk" | "non_compliant" | "insufficient_data";

export type EUDRCountryRisk = "standard" | "low" | "high";

export type PlotGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: "Point"; coordinates: number[] };

// ─── Plot (supplier sourcing area) ───────────────────────────────────────────

export interface EUDRPlot {
  plot_id: string;
  name?: string;
  commodity: EUDRCommodity;
  country_code: string;          // ISO 3166-1 alpha-2
  country_name: string;
  geometry: PlotGeometry;
  area_ha?: number;
  supplier_name?: string;
  reference_date?: string;       // date of production claim
  uploaded_at: string;           // ISO datetime
}

// ─── Per-plot deforestation finding ──────────────────────────────────────────

export interface DeforestationFinding {
  plot_id: string;
  has_deforestation: boolean;    // true = deforestation detected AFTER Dec 31 2020
  forest_cover_2020_pct: number; // % of plot covered by forest at cutoff date
  forest_loss_pct: number;       // % lost after cutoff
  forest_loss_ha: number;
  loss_years: number[];          // e.g. [2021, 2022]
  confidence: "high" | "medium" | "low";
  data_sources: string[];
  acquisition_dates: string[];
  ndvi_before: number | null;
  ndvi_after: number | null;
}

// ─── Legality finding ─────────────────────────────────────────────────────────

export interface LegalityFinding {
  plot_id: string;
  overlaps_protected_area: boolean;
  protected_area_names: string[];
  protected_area_categories: string[];
  country_risk_level: EUDRCountryRisk;
  issues: string[];              // human-readable legality concerns
}

// ─── Risk Assessment (per plot) ───────────────────────────────────────────────

export interface EUDRRiskAssessment {
  plot_id: string;
  overall_risk: EUDRRiskLevel;
  risk_score: number;            // 0–100, 0 = fully compliant
  deforestation: DeforestationFinding;
  legality: LegalityFinding;
  commodity_risk_factors: string[];
  assessment_date: string;
  assessor: "oxeous-automated";
  requires_human_review: boolean;
  summary: string;               // Granite-generated plain-language summary
}

// ─── Due Diligence Statement (DDS) ───────────────────────────────────────────

export interface EUDRDueDiligenceStatement {
  dds_id: string;
  created_at: string;
  operator_name?: string;
  commodity: EUDRCommodity;
  country_of_production: string;
  reference_period: { start: string; end: string };
  plots: EUDRRiskAssessment[];
  overall_status: EUDRRiskLevel;
  mitigation_measures: string[];
  data_provenance: string[];
  generated_by: "Oxeous EUDR Platform";
  regulation_reference: "EU 2023/1115";
}

// ─── EUDR Chat / Analysis request ────────────────────────────────────────────

export interface EUDRAnalysisRequest {
  plot: EUDRPlot;
  check_deforestation: boolean;
  check_legality: boolean;
  generate_dds: boolean;
}

export interface EUDRAnalysisResponse {
  request_id: string;
  plot: EUDRPlot;
  risk_assessment: EUDRRiskAssessment;
  dds?: EUDRDueDiligenceStatement;
  tile_url?: string;              // forest-loss raster tile
  deforestation_geojson?: unknown; // GeoJSON of detected loss patches
  explanation: string;
  follow_up_suggestions: string[];
}

// ─── Forest Baseline Data ─────────────────────────────────────────────────────

export interface ForestBaselineResult {
  plot_id: string;
  source: "ESA_WorldCover_2020" | "Hansen_GFC_2020" | "Copernicus_CLMS";
  forest_cover_pct: number;
  tree_canopy_height_m?: number;
  land_cover_class: string;
  resolution_m: number;
  acquisition_date: string;
}
