"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Database,
  TrendingDown,
  TrendingUp,
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
} from "lucide-react";
import { cn, formatPercent, formatArea, formatDate, getCoverageColor, getCoverageLabel } from "@/lib/utils";
import { api } from "@/lib/api";
import type { AnalysisResponse } from "@oxeous/shared-types";

interface Props {
  result: AnalysisResponse;
}

export default function AnalysisResultCard({ result }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isPrithvi = result.analysis_type === "prithvi_change_detection";
  const coverageColor = getCoverageColor(result.coverage_quality);
  const coverageLabel = getCoverageLabel(result.coverage_quality);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await api.exportResult(result.request_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oxeous-${result.request_id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="bg-bg border border-border rounded-card overflow-hidden animate-slide-in text-sm">
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-bg-2">
        <div className="flex items-center gap-2 min-w-0">
          <AnalysisTypeIcon type={result.analysis_type} />
          <div className="min-w-0">
            <p className="font-medium text-text text-xs leading-tight truncate capitalize">
              {result.analysis_type.replace(/_/g, " ")}
            </p>
            {isPrithvi && (
              <p className="text-[10px] font-medium text-verified">IBM–NASA Prithvi-EO 2.0</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Coverage quality badge */}
          <span
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-chip border"
            style={{ color: coverageColor, borderColor: `${coverageColor}40`, background: `${coverageColor}12` }}
          >
            <CoverageIcon quality={result.coverage_quality} color={coverageColor} />
            {coverageLabel}
          </span>
          {/* Collapse toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted hover:text-text transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-border">
          {/* Statistics */}
          {Object.keys(result.statistics).length > 0 && (
            <StatisticsSection stats={result.statistics} analysisType={result.analysis_type} />
          )}

          {/* Legend */}
          {result.legend && <LegendSection legend={result.legend} />}

          {/* Provenance */}
          <ProvenanceSection provenance={result.provenance} />

          {/* Export button */}
          <div className="px-3 py-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition-all duration-150",
                exporting
                  ? "border-border text-muted cursor-wait"
                  : "border-border text-text-2 hover:text-text hover:border-steel/50",
              )}
            >
              <Download className="w-3 h-3" />
              {exporting ? "Exporting…" : "Export PNG + JSON"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Statistics Section ─────────────────────────────────────────────────────

function StatisticsSection({ stats, analysisType }: { stats: Record<string, number | string>; analysisType: string }) {
  const entries = Object.entries(stats);

  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] text-muted uppercase tracking-wider font-medium flex items-center gap-1">
        <Activity className="w-3 h-3" /> Statistics
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {entries.map(([key, value]) => (
          <StatItem key={key} label={key} value={value} analysisType={analysisType} />
        ))}
      </div>
    </div>
  );
}

function StatItem({ label, value, analysisType }: { label: string; value: number | string; analysisType: string }) {
  const formatted = formatStatValue(label, value, analysisType);
  const trend = getTrend(label, value);

  return (
    <div className="bg-bg-2 rounded-lg px-2.5 py-2 space-y-0.5">
      <p className="text-[10px] text-muted leading-tight">{formatStatLabel(label)}</p>
      <div className="flex items-center gap-1">
        {trend === "down" && <TrendingDown className="w-3 h-3 text-danger flex-shrink-0" />}
        {trend === "up"   && <TrendingUp   className="w-3 h-3 text-verified flex-shrink-0" />}
        <span className={cn(
          "text-sm font-semibold",
          trend === "down" ? "text-danger" : trend === "up" ? "text-verified" : "text-text",
        )}>
          {formatted}
        </span>
      </div>
    </div>
  );
}

function formatStatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Pct/g, "%")
    .replace(/Km2/g, "km²");
}

function formatStatValue(key: string, value: number | string, _type: string): string {
  if (typeof value === "string") return value;
  if (key.includes("pct") || key.includes("percent")) return formatPercent(value);
  if (key.includes("km2") || key.includes("area")) return formatArea(value);
  if (key.includes("count")) return value.toLocaleString();
  if (typeof value === "number") return value.toFixed(3);
  return String(value);
}

function getTrend(key: string, value: number | string): "up" | "down" | null {
  if (typeof value !== "number") return null;
  if (key.includes("decline") || key.includes("loss") || (key.includes("change") && value < 0)) return "down";
  if (key.includes("gain") || key.includes("increase") || (key.includes("change") && value > 0)) return "up";
  return null;
}

// ── Legend Section ─────────────────────────────────────────────────────────

function LegendSection({ legend }: { legend: AnalysisResponse["legend"] }) {
  const colormaps: Record<string, string[]> = {
    RdYlGn: ["#d73027", "#fc8d59", "#fee090", "#91cf60", "#1a9850"],
    Blues:  ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"],
    RdBu:   ["#d73027", "#f4a582", "#f7f7f7", "#92c5de", "#2166ac"],
    YlOrRd: ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"],
    Greys:  ["#ffffff", "#d9d9d9", "#969696", "#525252", "#000000"],
    viridis:["#440154", "#3b528b", "#21908c", "#5dc963", "#fde725"],
    plasma: ["#0d0887", "#6a00a8", "#b12a90", "#e16462", "#fca636"],
  };
  const colors = colormaps[legend.colormap] ?? colormaps.RdYlGn;

  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] text-muted uppercase tracking-wider font-medium">{legend.title}</p>
      <div className="space-y-1">
        {/* Gradient bar */}
        <div
          className="h-2 rounded-full w-full"
          style={{
            background: `linear-gradient(to right, ${colors.join(", ")})`,
          }}
        />
        {/* Labels */}
        <div className="flex justify-between">
          <span className="text-[10px] text-muted">{legend.min} {legend.units}</span>
          <span className="text-[10px] text-muted">{((legend.min + legend.max) / 2).toFixed(2)}</span>
          <span className="text-[10px] text-muted">{legend.max} {legend.units}</span>
        </div>
      </div>
    </div>
  );
}

// ── Provenance Section ─────────────────────────────────────────────────────

function ProvenanceSection({ provenance }: { provenance: AnalysisResponse["provenance"] }) {
  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] text-muted uppercase tracking-wider font-medium flex items-center gap-1">
        <Database className="w-3 h-3" /> Provenance
      </p>
      <div className="space-y-1">
        <ProvenanceRow label="Source" value={provenance.source} />
        <ProvenanceRow label="Resolution" value={`${provenance.spatial_resolution_m} m`} />
        <ProvenanceRow label="Level" value={provenance.processing_level} />
        <ProvenanceRow label="Cloud cover" value={formatPercent(provenance.cloud_cover_pct)} />
        {provenance.acquisition_dates?.length > 0 && (
          <div className="flex gap-1.5">
            <span className="text-[10px] text-muted flex items-center gap-1 flex-shrink-0">
              <Calendar className="w-2.5 h-2.5" /> Dates
            </span>
            <div className="flex flex-wrap gap-1">
              {provenance.acquisition_dates.map((d) => (
                <span key={d} className="text-[10px] text-text bg-bg-2 px-1.5 py-0.5 rounded border border-border">
                  {formatDate(d)}
                </span>
              ))}
            </div>
          </div>
        )}
        {provenance.doi && (
          <a
            href={`https://doi.org/${provenance.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-verified hover:underline flex items-center gap-1"
          >
            DOI: {provenance.doi}
          </a>
        )}
      </div>
    </div>
  );
}

function ProvenanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted">{label}</span>
      <span className="text-text font-medium">{value}</span>
    </div>
  );
}

// ── Icon helpers ──────────────────────────────────────────────────────────

function AnalysisTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    vegetation_moisture_change: "💧",
    surface_water_extent: "🌊",
    land_disturbance: "🔥",
    true_color_imagery: "🛰️",
    prithvi_change_detection: "🤖",
    vegetation_health_comparison: "🌿",
  };
  return (
    <span className="text-base leading-none flex-shrink-0" aria-hidden>
      {icons[type] ?? "🌍"}
    </span>
  );
}

function CoverageIcon({ quality, color }: { quality: string; color: string }) {
  const props = { className: "w-2.5 h-2.5 flex-shrink-0", style: { color } };
  if (quality === "good")        return <CheckCircle2 {...props} />;
  if (quality === "partial")     return <AlertTriangle {...props} />;
  if (quality === "poor")        return <XCircle {...props} />;
  return <Clock {...props} />;
}
