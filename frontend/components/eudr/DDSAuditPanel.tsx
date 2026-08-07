"use client";

import { useState } from "react";
import {
  FileText,
  AlertTriangle,
  Download,
  Search,
  CheckCircle2,
  Trees,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import RiskBadge from "./RiskBadge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DDSAuditPanel() {
  const { ddsHistory } = useStore();
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = ddsHistory.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.plot.name ?? "").toLowerCase().includes(q) ||
      item.plot.commodity.toLowerCase().includes(q) ||
      item.plot.country_name.toLowerCase().includes(q) ||
      (item.dds?.dds_id ?? "").toLowerCase().includes(q)
    );
  });

  const compliantCount = ddsHistory.filter(
    (item) => item.risk_assessment.overall_risk === "compliant" || item.risk_assessment.overall_risk === "low_risk"
  ).length;

  const atRiskCount = ddsHistory.filter(
    (item) => item.risk_assessment.overall_risk === "at_risk" || item.risk_assessment.overall_risk === "non_compliant"
  ).length;

  async function handleDownload(ddsId: string) {
    setDownloadingId(ddsId);
    try {
      const res = await fetch(`${API_BASE}/eudr/dds/${ddsId}/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EUDR_DDS_${ddsId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DDS export failed:", err);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg border-r border-border text-text font-sans text-sm select-none">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-verified/10 border border-verified/30 flex items-center justify-center text-verified">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-text text-sm">EUDR Audit Trail</h2>
              <p className="text-[11px] text-muted">Due Diligence Statements (EU 2023/1115)</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-chip bg-bg-2 border border-border text-text-2">
            {ddsHistory.length} Recorded
          </span>
        </div>

        {/* Audit Stats */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-bg-2 rounded-lg p-2 border border-border">
            <p className="text-[10px] text-muted uppercase tracking-wider">Compliant</p>
            <p className="text-base font-bold text-verified flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-4 h-4" /> {compliantCount}
            </p>
          </div>
          <div className="bg-bg-2 rounded-lg p-2 border border-border">
            <p className="text-[10px] text-muted uppercase tracking-wider">Flagged</p>
            <p className="text-base font-bold text-warning flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-4 h-4" /> {atRiskCount}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative pt-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by plot, commodity, country or DDS ID..."
            className="w-full bg-bg border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-muted outline-none focus:border-steel/60 transition-all"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Trees className="w-8 h-8 text-muted mx-auto opacity-50" />
            <p className="text-xs text-muted">No Due Diligence Statements recorded yet.</p>
            <p className="text-[11px] text-muted leading-relaxed">
              Run an EUDR Assessment from the EUDR Hub to generate official statements for compliance export.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const ra = item.risk_assessment;
            const ddsId = item.dds?.dds_id;
            return (
              <div
                key={item.request_id}
                className="bg-bg-2 border border-border hover:border-steel/40 rounded-xl p-3 space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text text-xs truncate">{item.plot.name ?? "—"}</span>
                      <span className="text-[10px] text-muted uppercase font-mono px-1.5 py-0.5 rounded bg-bg border border-border flex-shrink-0">
                        {item.plot.country_code}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-2 capitalize">
                      {item.plot.commodity.replace(/_/g, " ")} · {item.plot.area_ha?.toFixed(1) ?? "—"} ha
                    </p>
                  </div>
                  <RiskBadge risk={ra.overall_risk} score={ra.risk_score} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="bg-bg px-2 py-1 rounded border border-border">
                    <span className="text-muted text-[10px] block">Baseline (Dec 2020)</span>
                    <span className="font-medium text-text">{ra.deforestation.forest_cover_2020_pct.toFixed(1)}% Forest</span>
                  </div>
                  <div className="bg-bg px-2 py-1 rounded border border-border">
                    <span className="text-muted text-[10px] block">Forest Loss Post-2020</span>
                    <span className={cn("font-medium", ra.deforestation.forest_loss_ha > 0 ? "text-danger" : "text-verified")}>
                      {ra.deforestation.forest_loss_ha.toFixed(2)} ha
                    </span>
                  </div>
                </div>

                {ddsId && (
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <span className="text-[10px] text-muted font-mono truncate max-w-[180px]">
                      ID: {ddsId}
                    </span>
                    <button
                      onClick={() => handleDownload(ddsId)}
                      disabled={downloadingId === ddsId}
                      className="flex items-center gap-1 text-[11px] font-medium text-verified hover:text-text bg-verified/10 border border-verified/30 rounded-lg px-2.5 py-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      {downloadingId === ddsId ? "Downloading..." : "Export ZIP"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
