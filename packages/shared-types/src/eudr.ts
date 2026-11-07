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
  forest_cover_2000_pct?: number; // % tree cover in year 2000 baseline
  pre_cutoff_loss_pct?: number;  // % lost 2000-2020
  forest_cover_2020_pct: number; // % of plot covered by forest at cutoff date
  jrc_forest_cover_2020_pct?: number; // % official EC JRC GFC2020 10m baseline
  forest_loss_pct: number;       // % lost after cutoff (2021-2025)
  forest_loss_ha: number;
  radd_alert_pct?: number;       // % Sentinel-1 radar disturbance alert
  natural_forest_pct?: number;   // Nature Trace 10m Sentinel-2 baseline
  dominant_forest_type?: string; // e.g. PrimaryForest, TreeCropsAndAgroforestry
  dominant_loss_driver?: string; // e.g. Permanent agriculture
  commodity_confirmed?: boolean; // commodity map presence verified
  commodity_coverage_pct?: number;
  loss_years: number[];          // e.g. [2021, 2022]
  confidence: "high" | "medium" | "low";
  data_sources: string[];
  acquisition_dates: string[];
  ndvi_before: number | null;
  ndvi_after: number | null;
  is_plantation_replanting_exemption?: boolean;
  statutory_determination?: string;
  total_parcel_ha?: number;
  statutory_deforestation_ha?: number;
  plantation_replanting_ha?: number;
  silviculture_replanting_ha?: number;
  is_silviculture_exemption?: boolean;
  non_agronomic_ha?: number;
  non_agronomic_pct?: number;
  confidence_score_pct?: number;
  confidence_margin_pct?: number;
  active_sensors_count?: number;
  compliant_ha?: number;
  spatial_compliance_pct?: number;
  carveout_eligible_ha?: number;
  mmu_filtered_loss_ha?: number;
  mean_elevation_m?: number;
  mean_slope_deg?: number;
  perimeter_halo_loss_pct?: number;
  perimeter_km?: number;
  compactness_index?: number;
  agro_climatic_biome?: string;
  intersection_tile_url?: string | null;
}

// ─── Legality finding ─────────────────────────────────────────────────────────

export interface LegalityFinding {
  plot_id: string;
  overlaps_protected_area: boolean;
  protected_area_overlap_pct?: number;
  is_strict_protected_area?: boolean;
  protected_area_names: string[];
  protected_area_categories: string[];
  country_risk_level: EUDRCountryRisk;
  issues: string[];              // human-readable legality concerns
}

export interface SubagentFinding {
  agent_id: string;
  agent_name: string;
  verdict: "COMPLIANT" | "NON_COMPLIANT" | "AT_RISK" | "EXEMPT_ART2_5" | "INCONCLUSIVE";
  confidence_score: number;
  headline: string;
  statutory_citation: string;
  evidence_metrics: Record<string, unknown>;
  sensor_provenance: string[];
  mitigation_or_rebuttal?: string | null;
  processing_time_ms: number;
}

export interface SupervisorConsensus {
  consensus_verdict: "COMPLIANT" | "NON_COMPLIANT" | "AT_RISK" | "EXEMPT_ART2_5" | "INCONCLUSIVE";
  composite_risk_score: number;
  unanimous: boolean;
  conflict_detected: boolean;
  conflict_resolution_narrative: string;
  supplier_perjury_detected: boolean;
  subagent_findings: SubagentFinding[];
  cryptographic_audit_hash: string;
  model_foundation: string;
  carveout_recommended: boolean;
}

// ─── Risk Assessment (per plot) ───────────────────────────────────────────────

export interface EUDRRiskAssessment {
  plot_id: string;
  overall_risk: EUDRRiskLevel;
  risk_score: number;            // 0-100, 0 = fully compliant
  deforestation: DeforestationFinding;
  legality: LegalityFinding;
  commodity_risk_factors: string[];
  assessment_date: string;
  assessor: "oxeous-automated";
  requires_human_review: boolean;
  summary: string;               // Granite-generated plain-language summary
  multi_agent_consensus?: SupervisorConsensus;
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

export interface GEEMapLayer {
  id: string;
  label: string;
  tile_url: string;
  geojson_data?: Record<string, unknown> | null;
  visible: boolean;
  opacity: number;
  legend?: unknown;
  dataset?: string;
  layer_type?: string;
}

export interface EUDRAnalysisResponse {
  request_id: string;
  plot: EUDRPlot;
  risk_assessment: EUDRRiskAssessment;
  dds?: EUDRDueDiligenceStatement;
  tile_url?: string;              // forest-loss raster tile
  deforestation_geojson?: unknown; // GeoJSON of detected loss patches
  carveout_geojson?: unknown;     // Decomposed compliant + violation GeoJSON
  explanation: string;
  follow_up_suggestions: string[];
  map_layers?: GEEMapLayer[];     // Real GEE map tile layers
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
