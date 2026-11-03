import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { ShieldCheck, X, AlertCircle, ChevronRight, Loader2, Coffee, Trees, Palmtree, CircleDot, FileText, Leaf } from "lucide-react";
import {
  EULogoSeal,
  JRC2020Emblem,
  PanelExpandIcon,
  PanelCollapseIcon,
  AuditPlotIcon,
  DossierIcon,
} from "@/components/icons/EOIcons";
import { cn } from "@/lib/utils";
import { useStore, type ActiveLayer, type AgentLogEntry } from "@/lib/store";
import type { EUDRAnalysisResponse, EUDRCommodity } from "@oxeous/shared-types";
import PlotUploader from "./PlotUploader";
import ComplianceResultCard from "./ComplianceResultCard";
import { BENCHMARK_CASES, type BenchmarkCase } from "@/components/ui/TopFloatingBar";
import { extractBboxFromGeometry } from "@/lib/maplibre";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const COMMODITY_ICON: Record<string, typeof Coffee> = {
  coffee: Coffee,
  cocoa: Trees,
  rubber: CircleDot,
  palm_oil: Palmtree,
  soya: Leaf,
};

export default function EUDRDashboard({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EUDRAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    addLayer,
    setActiveGeoJSON,
    addDDSHistory,
    addMessage,
    updateMessage,
    setRightPanel,
    setActiveDossier,
    eudrPanelExpanded,
    setEudrPanelExpanded,
    setIsScanning,
  } = useStore();

  const run = useCallback(async (geometry: object, commodity: EUDRCommodity, countryCode: string, countryName: string, areaHa?: number) => {
    setLoading(true); setError(null); setResult(null);
    setIsScanning(true);
    setActiveGeoJSON(geometry);

    // Fly to geometry (Polygon, MultiPolygon, or Point)
    const bbox = extractBboxFromGeometry(geometry);
    if (bbox) {
      (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
    }

    // Dynamic location label (never assume Ghana)
    const locationName = countryName ? `${countryName} (${countryCode})` : countryCode ? `Jurisdiction: ${countryCode}` : "Selected Geometry Coordinates";
    const promptText = `Assess EUDR compliance for ${commodity.toUpperCase()} sourcing plot (${areaHa ? `${areaHa.toFixed(1)} ha` : "drawn boundary"}) in ${locationName}`;
    const userMsgId = `user-${Date.now()}`;
    const botMsgId = `eudr-bot-${Date.now()}`;

    // Open right Agent panel simultaneously
    setRightPanel("chat");

    addMessage({ id: userMsgId, role: "user", content: promptText });

    let currentLogs: AgentLogEntry[] = [
      {
        id: "ingest",
        label: "Plot Geometry & RFC 7946 Topology",
        detail: `Verifying vector boundary (${areaHa ? `${areaHa.toFixed(1)} ha` : "AOI"}) for ${commodity.replace(/_/g, " ")}...`,
        status: "active",
      },
      {
        id: "hansen",
        label: "Hansen GFC 2025 & Optical S2",
        detail: "Queued: 2021-2025 post-cutoff canopy loss scan",
        status: "pending",
      },
      {
        id: "jrc",
        label: "EC JRC GFC2020 & Forest Typology",
        detail: "Queued: Official 10m Dec 2020 baseline & ForTy",
        status: "pending",
      },
      {
        id: "radd",
        label: "Sentinel-1 SAR & Google FDP 2026a",
        detail: "Queued: All-weather radar & commodity presence",
        status: "pending",
      },
      {
        id: "protected",
        label: "WDPA Reserves & Art. 2(40) Legality",
        detail: "Queued: IUCN I-VI & 8-domain sovereign cadastre",
        status: "pending",
      },
      {
        id: "consensus",
        label: "6-Subagent Consensus & TRACES NT DDS",
        detail: "Queued: Multi-agent arbitration & statutory dossier",
        status: "pending",
      },
    ];

    addMessage({
      id: botMsgId,
      role: "assistant",
      content: "",
      isLoading: true,
      agentLogs: currentLogs,
    });

    try {
      // Use SSE streaming endpoint for real-time agent logs
      const res = await fetch(`${API_BASE}/eudr/plots/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity, country_code: countryCode, country_name: countryName, geometry, area_ha: areaHa, generate_dds: true }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(e.detail ?? "Assessment failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No stream available");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            // Stream live agent log directly into the 6-stage connected Agent Pipeline
            if (event.step === "agent_log") {
              const rawId = String(event.id || "step");
              const mappedId =
                rawId === "natural_forest" || rawId === "typology"
                  ? "jrc"
                  : rawId === "drivers" || rawId === "commodity"
                  ? "radd"
                  : rawId;

              const idx = currentLogs.findIndex((l) => l.id === mappedId);
              const incomingStatus = (event.status as "done" | "active" | "pending") || "active";

              if (idx >= 0) {
                currentLogs = currentLogs.map((l, i) => {
                  if (i < idx && l.status !== "done") {
                    return { ...l, status: "done" as const };
                  }
                  if (i === idx) {
                    const isIntermediateSubStep =
                      (mappedId === "jrc" && rawId !== "typology") ||
                      (mappedId === "radd" && rawId !== "commodity");
                    return {
                      ...l,
                      detail: String(event.detail || l.detail),
                      status: isIntermediateSubStep && incomingStatus === "done" ? ("active" as const) : incomingStatus,
                    };
                  }
                  return l;
                });
              }
              updateMessage(botMsgId, { agentLogs: [...currentLogs] });
            }

            if (event.step === "done" && event.data) {
              const data = event.data as EUDRAnalysisResponse;
              setResult(data);
              addDDSHistory(data);

              // Mark all logs complete and smoothly transition
              currentLogs = currentLogs.map(l => ({ ...l, status: "done" as const }));
              updateMessage(botMsgId, { agentLogs: [...currentLogs] });

              setTimeout(() => {
                updateMessage(botMsgId, {
                  content: data.explanation,
                  isLoading: false,
                  eudrResult: data,
                });
              }, 450);

              // Add GEE layers to map
              if (data.map_layers && data.map_layers.length > 0) {
                data.map_layers.forEach((lyr) => {
                  addLayer({
                    id: lyr.id,
                    label: lyr.label,
                    type: "raster",
                    tileUrl: lyr.tile_url,
                    visible: lyr.visible,
                    opacity: lyr.opacity,
                    legend: lyr.legend as ActiveLayer["legend"] | undefined,
                    analysisType: (lyr as { layer_type?: string }).layer_type || "land_disturbance",
                    layer_type: (lyr as { layer_type?: string }).layer_type,
                  });
                });
              } else if (data.tile_url) {
                addLayer({ id: data.request_id, label: `EUDR ${commodity} ${countryName}`, type: "raster", tileUrl: data.tile_url, visible: true, opacity: 1.0, legend: { title: "Forest Loss", colormap: "RdYlGn", min: 0, max: 1, units: "" }, analysisType: "land_disturbance" });
              }
            }

            if (event.step === "error") {
              throw new Error((event.message as string) || "Assessment failed");
            }
          } catch (parseErr) {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";
      setError(errMsg);
      updateMessage(botMsgId, {
        content: "",
        isLoading: false,
        error: errMsg,
        agentLogs: currentLogs,
      });
    } finally {
      setLoading(false);
      setIsScanning(false);
    }
  }, [addLayer, setActiveGeoJSON, addDDSHistory, addMessage, updateMessage, setRightPanel, setIsScanning]);

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0 glass-header shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/oxeous-logo-tight.png"
            alt="Oxeous"
            style={{ height: "22px", width: "auto" }}
            className="h-[22px] max-h-[22px] w-auto object-contain filter brightness-95"
          />
          <div className="h-4 w-[1px] bg-[#C8CFD5]" />
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.25)] px-2 py-0.5 rounded-chip">
            <EULogoSeal className="w-3 h-3 text-[#315F50]" />
            <span>EU 2023/1115</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setEudrPanelExpanded((v: boolean) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-medium text-[#343B42] hover:text-[#1D2227] hover:bg-white/90 transition-all border border-[#C8CFD5] shadow-2xs cursor-pointer glass"
            title={eudrPanelExpanded ? "Collapse to standard 460px width" : "Expand to wide 640px workbench"}
          >
            {eudrPanelExpanded ? <PanelCollapseIcon className="w-3.5 h-3.5 text-[#315F50]" /> : <PanelExpandIcon className="w-3.5 h-3.5 text-[#315F50]" />}
            <span className="hidden sm:inline font-mono text-[10px]">{eudrPanelExpanded ? "460px" : "Wide Deck"}</span>
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#747F88] hover:text-[#1D2227] hover:bg-white/80 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Regulation info strip */}
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] flex-shrink-0">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Statutory Due Diligence Suite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <JRC2020Emblem className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-bold text-slate-900 font-mono text-[10px] bg-white border border-slate-300 px-1.5 py-0.5 rounded shadow-2xs">
            Cutoff: 31 DEC 2020
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">

        {/* Agent active state */}
        {loading && (
          <div className="p-4 space-y-3">
            <div className="rounded-xl border border-emerald-700/30 bg-white p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-800 text-[12px] font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                Oxeous Autonomous EO Pipeline Active
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Querying multi-sensor constellations (Sentinel-2, Hansen v1.13, Google FDP 10m). Live tool execution logs are streaming in the <strong>Agent Panel</strong>.
              </p>
              <button
                onClick={() => setRightPanel("chat")}
                className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-1 mt-1"
              >
                View Agent Execution Stream ➔
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="m-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-red-900">Assessment failed</p>
              <p className="text-[11px] text-red-700/80 mt-0.5 leading-relaxed">{error}</p>
              <button onClick={() => { setError(null); }} className="text-[11px] text-emerald-800 font-medium mt-1.5 hover:underline">Try another plot</button>
            </div>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="p-4 space-y-3">
            <ComplianceResultCard result={result} />
            <button
              onClick={() => { setResult(null); setError(null); setActiveGeoJSON(null); }}
              className="w-full text-[11px] text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 bg-white rounded-lg py-2 transition-all font-medium shadow-2xs"
            >
              Assess another plot
            </button>
          </div>
        )}

        {/* Upload + Research Benchmarks - idle state */}
        {!loading && !result && !error && (
          <div className="p-4 space-y-4">
            <PlotUploader onPlotReady={run} disabled={loading} />

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold">
                  Research Benchmark Cases
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {BENCHMARK_CASES.length} Evaluated Plots
                </span>
              </div>

              {BENCHMARK_CASES.map(c => {
                const Icon = COMMODITY_ICON[c.commodityKey] ?? Trees;
                const isCompliant = c.verdict.startsWith("COMPLIANT");
                return (
                  <div
                    key={c.id}
                    className="w-full text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 transition-all shadow-2xs hover:shadow-sm space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border",
                          isCompliant ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[12px] font-semibold text-slate-900 truncate">{c.label}</p>
                            <span className={cn(
                              "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase",
                              isCompliant
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            )}>
                              {c.score}/100
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">
                            {c.country} · {c.commodity.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#E3E7EA]">
                      <button
                        onClick={() => run(c.geometry, c.commodity, c.countryCode, c.country)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg bg-[#315F50] text-white hover:bg-[#274d40] transition-colors shadow-2xs cursor-pointer"
                      >
                        <AuditPlotIcon className="w-3.5 h-3.5" />
                        <span>Audit Plot</span>
                      </button>
                      <button
                        onClick={() => setActiveDossier(c.commodityKey)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-3 rounded-lg border border-[#C8CFD5] bg-white text-[#1D2227] hover:bg-[#F4F5F6] transition-colors shadow-2xs cursor-pointer"
                      >
                        <DossierIcon className="w-3.5 h-3.5 text-[#315F50]" />
                        <span>Dossier</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-slate-200 px-4 py-2.5 bg-white text-center">
        <p className="text-[10px] text-slate-400 font-mono">
          Copernicus Sentinel-2 · Hansen v1.13 · Google FDP · UNEP-WCMC
        </p>
      </footer>
    </div>
  );
}
