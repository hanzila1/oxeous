"use client";

import { useState } from "react";
import { ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, Download, Database, Calendar } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { EUDRAnalysisResponse } from "@oxeous/shared-types";
import RiskBadge from "./RiskBadge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const COMMODITY_EMOJI: Record<string, string> = {
  cocoa: "🍫", coffee: "☕", palm_oil: "🌴",
  soya: "🌱", cattle: "🐄", wood: "🪵", rubber: "⚙️",
};

const RISK_COLOR: Record<string, string> = {
  compliant: "#315F50", low_risk: "#315F50",
  at_risk: "#C58A3A", non_compliant: "#A64B45",
  insufficient_data: "#AAB3BB",
};

function getRiskBarColor(score: number): string {
  if (score < 25) return "#315F50";
  if (score < 55) return "#C58A3A";
  return "#A64B45";
}

export default function ComplianceResultCard({ result }: { result: EUDRAnalysisResponse }) {
  const [expanded, setExpanded] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { risk_assessment: ra, plot } = result;
  const def = ra.deforestation;
  const leg = ra.legality;

  async function downloadDDS() {
    if (!result.dds?.dds_id) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/eudr/dds/${result.dds.dds_id}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `EUDR_DDS_${result.dds.dds_id}.zip`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  return (
    <div className="rounded-card border border-[#C8CFD5] overflow-hidden shadow-panel bg-white text-[#1D2227] text-[12px]">

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#C8CFD5] bg-[#F4F5F6]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none flex-shrink-0">{COMMODITY_EMOJI[plot.commodity] ?? "🌿"}</span>
          <div className="min-w-0">
            <p className="font-semibold text-[#1D2227] truncate capitalize">{plot.commodity.replace(/_/g, " ")} — {plot.country_name}</p>
            <p className="text-[10px] text-[#747F88] mt-0.5 font-mono">
              {plot.area_ha != null ? `${plot.area_ha.toFixed(1)} ha` : "Area from bounds"} · EU 2023/1115
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RiskBadge risk={ra.overall_risk} score={ra.risk_score} />
          <button onClick={() => setExpanded(v => !v)} className="text-[#7A8791] hover:text-[#343B42] p-1 rounded transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-[#E3E7EA]">

          {/* Risk score bar */}
          <div className="px-3.5 py-3 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-[#747F88] uppercase tracking-wider font-medium">
              <span>Deforestation Risk Score</span>
              <span className="font-mono font-bold text-[11px]" style={{ color: RISK_COLOR[ra.overall_risk] }}>
                {(ra.risk_score ?? 0).toFixed(0)} / 100
              </span>
            </div>
            <div className="h-1.5 bg-[#E3E7EA] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ra.risk_score ?? 0}%`, background: getRiskBarColor(ra.risk_score ?? 0) }} />
            </div>
          </div>

          {/* Deforestation finding */}
          <div className="px-3.5 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#747F88] uppercase tracking-wider font-medium">Forest Loss Check (Post Dec 2020)</span>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono",
                def.has_deforestation ? "text-[#A64B45] bg-[rgba(166,75,69,0.08)] border-[rgba(166,75,69,0.25)]" : "text-[#315F50] bg-[rgba(49,95,80,0.08)] border-[rgba(49,95,80,0.25)]",
              )}>
                {def.has_deforestation ? "⚠ LOSS DETECTED" : "✓ COMPLIANT"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Forest cover (2020)" value={`${(def.forest_cover_2020_pct ?? 0).toFixed(1)}%`} />
              <Stat label="Post-2020 loss" value={`${(def.forest_loss_ha ?? 0).toFixed(2)} ha`} warn={def.forest_loss_ha > 0} />
              <Stat label="Loss years" value={def.loss_years?.length ? def.loss_years.join(", ") : "None"} warn={(def.loss_years?.length ?? 0) > 0} />
              <Stat label="Confidence" value={(def.confidence ?? "high").toUpperCase()} />
            </div>
            {def.ndvi_before !== null && def.ndvi_after !== null && (
              <div className="flex items-center justify-between text-[10px] bg-[#F4F5F6] border border-[#E3E7EA] rounded px-2.5 py-1.5 font-mono">
                <span className="text-[#747F88]">NDVI vegetation index</span>
                <span>
                  <strong>{def.ndvi_before?.toFixed(3) ?? "—"}</strong>
                  <span className="text-[#AAB3BB] mx-1">→</span>
                  <strong style={{ color: (def.ndvi_after ?? 0) < (def.ndvi_before ?? 0) ? "#A64B45" : "#315F50" }}>
                    {def.ndvi_after?.toFixed(3) ?? "—"}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Legality */}
          <div className="px-3.5 py-3 space-y-2">
            <span className="text-[10px] text-[#747F88] uppercase tracking-wider font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Legality & Protected Areas
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Protected area overlap" value={leg.overlaps_protected_area ? "OVERLAP ⚠" : "CLEAR ✓"} warn={leg.overlaps_protected_area} />
              <Stat label="Country risk tier" value={leg.country_risk_level.toUpperCase()} warn={leg.country_risk_level === "high"} />
            </div>
            {leg.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#C58A3A] bg-[rgba(197,138,58,0.06)] border border-[rgba(197,138,58,0.2)] rounded px-2.5 py-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {issue}
              </div>
            ))}
          </div>

          {/* Data sources */}
          <div className="px-3.5 py-3 space-y-1 bg-[#F4F5F6]">
            <span className="text-[10px] text-[#747F88] uppercase tracking-wider font-medium flex items-center gap-1">
              <Database className="w-3 h-3" /> Spatial Data Sources
            </span>
            {def.data_sources.map((src, i) => <p key={i} className="text-[11px] text-[#747F88] font-mono">• {src}</p>)}
            {def.acquisition_dates.length > 0 && (
              <p className="text-[10px] text-[#AAB3BB] flex items-center gap-1 font-mono mt-1">
                <Calendar className="w-2.5 h-2.5" />
                Baseline: {def.acquisition_dates[0]} → Current: {def.acquisition_dates.at(-1)}
              </p>
            )}
          </div>

          {/* DDS export */}
          {result.dds && (
            <div className="px-3.5 py-3">
              <button
                onClick={downloadDDS}
                disabled={exporting}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold border transition-all",
                  exporting
                    ? "bg-[#E3E7EA] text-[#AAB3BB] border-[#C8CFD5] cursor-wait"
                    : "bg-[#315F50] text-white border-[#315F50] hover:bg-[#274d40]",
                )}
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? "Generating DDS…" : "Download Due Diligence Statement (DDS)"}
              </button>
              <p className="text-[10px] text-[#AAB3BB] text-center mt-1.5 font-mono">EU 2023/1115 · TRACES NT format · {result.dds.dds_id}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-[#F4F5F6] border border-[#E3E7EA] rounded-lg px-2.5 py-2">
      <p className="text-[9px] text-[#AAB3BB] uppercase tracking-wider font-medium leading-tight">{label}</p>
      <p className={cn("text-[11px] font-bold mt-1 font-mono", warn ? "text-[#A64B45]" : "text-[#1D2227]")}>{value}</p>
    </div>
  );
}
