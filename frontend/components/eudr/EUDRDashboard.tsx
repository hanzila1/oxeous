"use client";

import { useState, useCallback, useEffect } from "react";
import { ShieldCheck, X, Loader2, AlertCircle, Leaf, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { EUDRAnalysisResponse, EUDRCommodity } from "@oxeous/shared-types";
import PlotUploader from "./PlotUploader";
import ComplianceResultCard from "./ComplianceResultCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const EXAMPLES: Array<{ name: string; commodity: EUDRCommodity; country_code: string; country_name: string; desc: string; geometry: object }> = [
  { name: "Amazon Soya Concession", commodity: "soya",    country_code: "BR", country_name: "Brazil",    desc: "Mato Grosso deforestation frontier — Hansen GFC post-2020 loss detected",
    geometry: { type: "Polygon", coordinates: [[[-55.80,-12.85],[-55.70,-12.85],[-55.70,-12.75],[-55.80,-12.75],[-55.80,-12.85]]] } },
  { name: "Cerrado Cocoa Plantation", commodity: "cocoa", country_code: "BR", country_name: "Brazil",    desc: "Bahia state — native Cerrado vegetation transition zone",
    geometry: { type: "Polygon", coordinates: [[[-39.95,-14.80],[-39.85,-14.80],[-39.85,-14.70],[-39.95,-14.70],[-39.95,-14.80]]] } },
  { name: "Ashanti Cocoa Farm",       commodity: "cocoa", country_code: "GH", country_name: "Ghana",     desc: "Ashanti region smallholder — supply chain traceability risk",
    geometry: { type: "Polygon", coordinates: [[[-1.70,6.65],[-1.60,6.65],[-1.60,6.75],[-1.70,6.75],[-1.70,6.65]]] } },
  { name: "Kalimantan Palm Oil",      commodity: "palm_oil",country_code:"ID",country_name:"Indonesia", desc: "Oil palm estate — peat forest disturbance alerts",
    geometry: { type: "Polygon", coordinates: [[[113.80,0.40],[113.90,0.40],[113.90,0.50],[113.80,0.50],[113.80,0.40]]] } },
];

const EMOJI: Record<string, string> = { cocoa:"🍫", coffee:"☕", palm_oil:"🌴", soya:"🌱", cattle:"🐄", wood:"🪵", rubber:"⚙️" };

export default function EUDRDashboard({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EUDRAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addLayer, setActiveGeoJSON, addDDSHistory } = useStore();

  const run = useCallback(async (geometry: object, commodity: EUDRCommodity, countryCode: string, countryName: string, areaHa?: number) => {
    setLoading(true); setError(null); setResult(null);
    setActiveGeoJSON(geometry);
    try {
      const res = await fetch(`${API_BASE}/eudr/plots`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity, country_code: countryCode, country_name: countryName, geometry, area_ha: areaHa, generate_dds: true }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(e.detail ?? "Assessment failed"); }
      const data: EUDRAnalysisResponse = await res.json();
      setResult(data);
      addDDSHistory(data);
      if (data.tile_url) addLayer({ id: data.request_id, label: `EUDR · ${commodity} · ${countryName}`, type: "raster", tileUrl: data.tile_url, visible: true, opacity: 0.85, legend: { title: "Forest Loss", colormap: "RdYlGn", min: 0, max: 1, units: "" }, analysisType: "land_disturbance" });
      const geom = geometry as { type: string; coordinates: number[][][] };
      if (geom.type === "Polygon" && geom.coordinates?.[0]) {
        const lngs = geom.coordinates[0].map(c => c[0]); const lats = geom.coordinates[0].map(c => c[1]);
        const bbox: [number,number,number,number] = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
        (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  }, [addLayer, setActiveGeoJSON, addDDSHistory]);

  // Auto-run first example on mount for instant demo
  useEffect(() => {
    if (!result && !loading) run(EXAMPLES[0].geometry, EXAMPLES[0].commodity, EXAMPLES[0].country_code, EXAMPLES[0].country_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0 bg-[#F4F5F6]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(49,95,80,0.12)] border border-[rgba(49,95,80,0.25)] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#315F50]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-[#1D2227] leading-tight flex items-center gap-2">
              EUDR Compliance Hub
              <span className="text-[9px] font-mono text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-1.5 py-0.5 rounded-chip">EU 2023/1115</span>
            </h2>
            <p className="text-[11px] text-[#747F88] mt-0.5">Deforestation-free verification &amp; DDS</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A8791] hover:text-[#343B42] hover:bg-[#E3E7EA] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Regulation info strip */}
      <div className="px-4 py-2.5 border-b border-[#E3E7EA] bg-[#E3E7EA] flex items-center justify-between text-[11px] flex-shrink-0">
        <span className="text-[#747F88]">Mandatory cutoff date</span>
        <span className="font-bold text-[#1D2227] font-mono">31 DEC 2020</span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 px-4 space-y-3">
            <Loader2 className="w-8 h-8 text-[#315F50] animate-spin" />
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#1D2227]">Running EUDR Assessment</p>
              <p className="text-[11px] text-[#747F88] mt-1 max-w-[260px] mx-auto leading-relaxed">
                Hansen GFC v1.11 · ESA WorldCover 2020 · GFW GLAD/RADD · Protected Planet WDPA
              </p>
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
              <button onClick={() => setError(null)} className="text-[11px] text-[#315F50] font-medium mt-1.5 hover:underline">← Try another plot</button>
            </div>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="p-4 space-y-3">
            <ComplianceResultCard result={result} />
            {result.explanation && (
              <div className="rounded-card border border-[#C8CFD5] bg-white p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-[#315F50] font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Granite AI Narrative
                </div>
                <p className="text-[11px] text-[#747F88] leading-relaxed">{result.explanation}</p>
              </div>
            )}
            <button
              onClick={() => { setResult(null); setError(null); setActiveGeoJSON(null); }}
              className="w-full text-[11px] text-[#747F88] hover:text-[#1D2227] border border-[#C8CFD5] hover:border-[#7A8791] rounded-lg py-2 transition-all"
            >
              ← Assess another plot
            </button>
          </div>
        )}

        {/* Upload + examples */}
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
        <p className="text-[10px] text-[#AAB3BB] text-center">ESA WorldCover 10m · Hansen GFC 30m · GFW GLAD/RADD · WDPA</p>
      </footer>
    </div>
  );
}
