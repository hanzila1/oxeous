import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { ShieldCheck, X, AlertCircle, Leaf, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, type ActiveLayer, type AgentLogEntry } from "@/lib/store";
import type { EUDRAnalysisResponse, EUDRCommodity } from "@oxeous/shared-types";
import PlotUploader from "./PlotUploader";
import ComplianceResultCard from "./ComplianceResultCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const EXAMPLES: Array<{ name: string; commodity: EUDRCommodity; country_code: string; country_name: string; desc: string; geometry: object }> = [
  { name: "Mato Grosso Soya Frontier", commodity: "soya", country_code: "BR", country_name: "Brazil", desc: "Amazon deforestation frontier — active Hansen GFC post-2020 clearing detected",
    geometry: { type: "Polygon", coordinates: [[[-55.50,-12.80],[-55.40,-12.80],[-55.40,-12.70],[-55.50,-12.70],[-55.50,-12.80]]] } },
  { name: "Ashanti Cocoa Smallholder", commodity: "cocoa", country_code: "GH", country_name: "Ghana", desc: "Tano Offin forest fringe — historical loss & commercial agriculture conversion",
    geometry: { type: "Polygon", coordinates: [[[-2.05,6.85],[-1.95,6.85],[-1.95,6.95],[-2.05,6.95],[-2.05,6.85]]] } },
  { name: "Kalimantan Peatland Palm Oil", commodity: "palm_oil", country_code:"ID", country_name:"Indonesia", desc: "Sebangau peat swamp — WDPA protected area overlap violation",
    geometry: { type: "Polygon", coordinates: [[[113.80,-2.40],[113.90,-2.40],[113.90,-2.30],[113.80,-2.30],[113.80,-2.40]]] } },
  { name: "Bavaria FSC Sustainable Timber", commodity: "wood", country_code: "DE", country_name: "Germany", desc: "Ebrach State Forest — certified deforestation-free baseline (Pass benchmark)",
    geometry: { type: "Polygon", coordinates: [[[10.45,49.80],[10.55,49.80],[10.55,49.90],[10.45,49.90],[10.45,49.80]]] } },
];

const EMOJI: Record<string, string> = { cocoa:"🍫", coffee:"☕", palm_oil:"🌴", soya:"🌱", cattle:"🐄", wood:"🪵", rubber:"⚙️" };

export default function EUDRDashboard({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EUDRAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addLayer, setActiveGeoJSON, addDDSHistory, addMessage, updateMessage, setRightPanel } = useStore();

  const run = useCallback(async (geometry: object, commodity: EUDRCommodity, countryCode: string, countryName: string, areaHa?: number) => {
    setLoading(true); setError(null); setResult(null);
    setActiveGeoJSON(geometry);

    // Fly to geometry
    const geom = geometry as { type: string; coordinates: number[][][] };
    if (geom.type === "Polygon" && geom.coordinates?.[0]) {
      const lngs = geom.coordinates[0].map(c => c[0]); const lats = geom.coordinates[0].map(c => c[1]);
      const bbox: [number,number,number,number] = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
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
      { id: "ingest", label: "Plot Ingestion", detail: `Loaded plot geometry (${areaHa ? `${areaHa.toFixed(1)} ha` : "AOI"}) for ${commodity}`, status: "done" },
      { id: "hansen", label: "Hansen GFC 2025", detail: "Querying Hansen v1.13 post-cutoff loss & baseline...", status: "active" },
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

            // Stream live agent log directly into the Agent Panel
            if (event.step === "agent_log") {
              const stepId = String(event.id || "step");
              const idx = currentLogs.findIndex(l => l.id === stepId);
              const entry = {
                id: stepId,
                label: String(event.label || "Dataset Check"),
                detail: String(event.detail || ""),
                status: (event.status as "done" | "active" | "pending") || "active",
              };
              if (idx >= 0) {
                currentLogs = currentLogs.map((l, i) => i === idx ? entry : l);
              } else {
                currentLogs = [...currentLogs, entry];
              }
              updateMessage(botMsgId, { agentLogs: [...currentLogs] });
            }

            if (event.step === "done" && event.data) {
              const data = event.data as EUDRAnalysisResponse;
              setResult(data);
              addDDSHistory(data);

              // Mark all logs complete and display final LLM reasoning in Agent Panel
              currentLogs = currentLogs.map(l => ({ ...l, status: "done" as const }));
              updateMessage(botMsgId, {
                content: data.explanation,
                isLoading: false,
                eudrResult: data,
                agentLogs: currentLogs,
              });

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
    }
  }, [addLayer, setActiveGeoJSON, addDDSHistory, addMessage, updateMessage, setRightPanel]);

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0 bg-[#F4F5F6]">
        <div className="flex items-center gap-3">
          <Image
            src="/oxeous-logo.png"
            alt="Oxeous"
            width={140}
            height={40}
            priority
            className="h-8 w-auto object-contain cursor-pointer"
          />
          <div className="h-5 w-[1px] bg-[#C8CFD5]" />
          <span className="text-[10px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.10)] border border-[rgba(49,95,80,0.25)] px-2 py-0.5 rounded-chip">
            EU 2023/1115
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A8791] hover:text-[#343B42] hover:bg-[#E3E7EA] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Regulation info strip */}
      <div className="px-4 py-2 border-b border-[#E3E7EA] bg-[#E3E7EA] flex items-center justify-between text-[11px] flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[#343B42] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#315F50]" />
          <span>EUDR Compliance & Due Diligence</span>
        </div>
        <span className="font-bold text-[#1D2227] font-mono text-[10px] bg-white border border-[#C8CFD5] px-1.5 py-0.5 rounded">
          Cutoff: 31 DEC 2020
        </span>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">

        {/* Agent active state */}
        {loading && (
          <div className="p-4 space-y-3">
            <div className="rounded-xl border border-[#315F50]/30 bg-white p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-[#315F50] text-[12px] font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-[#315F50]" />
                Oxeous Spatial Agent Running
              </div>
              <p className="text-[11px] text-[#747F88] leading-relaxed">
                Querying 6 Earth Engine datasets. Real-time satellite telemetry and tool logs are streaming live in the <strong>Agent Panel</strong> (right).
              </p>
              <button
                onClick={() => setRightPanel("chat")}
                className="text-[11px] text-[#315F50] font-semibold hover:underline flex items-center gap-1 mt-1"
              >
                View Live Agent Trace ➔
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="m-4 flex items-start gap-2.5 bg-[rgba(166,75,69,0.06)] border border-[rgba(166,75,69,0.25)] rounded-card p-3">
            <AlertCircle className="w-4 h-4 text-[#A64B45] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-[#A64B45]">Assessment failed</p>
              <p className="text-[11px] text-[#A64B45]/80 mt-0.5 leading-relaxed">{error}</p>
              <button onClick={() => { setError(null); }} className="text-[11px] text-[#315F50] font-medium mt-1.5 hover:underline">Try another plot</button>
            </div>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="p-4 space-y-3">
            <ComplianceResultCard result={result} />
            <button
              onClick={() => { setResult(null); setError(null); setActiveGeoJSON(null); }}
              className="w-full text-[11px] text-[#747F88] hover:text-[#1D2227] border border-[#C8CFD5] hover:border-[#7A8791] rounded-lg py-2 transition-all font-medium"
            >
              Assess another plot
            </button>
          </div>
        )}

        {/* Upload + examples — idle state */}
        {!loading && !result && !error && (
          <div className="p-4 space-y-4">
            <PlotUploader onPlotReady={run} disabled={loading} />

            <div className="space-y-2">
              <p className="text-[10px] text-[#AAB3BB] uppercase tracking-wider font-medium flex items-center gap-1">
                <Leaf className="w-3 h-3 text-[#315F50]" /> Example sourcing plots
              </p>
              {EXAMPLES.map(ex => (
                <button key={ex.name} onClick={() => run(ex.geometry, ex.commodity, ex.country_code, ex.country_name)}
                  className="w-full text-left bg-white border border-[#C8CFD5] hover:border-[#7A8791] hover:bg-[#F4F5F6] rounded-card p-2.5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-base mt-0.5 flex-shrink-0">{EMOJI[ex.commodity]}</span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-[#1D2227] truncate group-hover:text-[#315F50] transition-colors">{ex.name}</p>
                        <p className="text-[10px] text-[#747F88] mt-0.5 leading-snug">{ex.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#AAB3BB] group-hover:text-[#315F50] group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-[#C8CFD5] px-4 py-2 bg-[#E3E7EA]">
        <p className="text-[10px] text-[#AAB3BB] text-center">Hansen GFC · Nature Trace · ForTy · WRI Drivers · FDP · WDPA</p>
      </footer>
    </div>
  );
}
