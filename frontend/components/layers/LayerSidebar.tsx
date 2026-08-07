"use client";

import { useState } from "react";
import { Layers, Eye, EyeOff, X, ChevronRight, Info, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

// Hansen GFC loss_year colour ramp — 24 annual values encoded as distinct hues.
// The tile PNG encodes year as palette index (1=2001 … 23=2023).
// Approximation for display: yellow (early) → orange → red (recent/EUDR-relevant).
const HANSEN_STOPS = [
  { year: 2001, color: "#ffffcc" },
  { year: 2005, color: "#fed976" },
  { year: 2010, color: "#fd8d3c" },
  { year: 2015, color: "#e31a1c" },
  { year: 2020, color: "#800026" },
  { year: 2023, color: "#4d0013" },
];

export default function LayerSidebar({ onClose }: { onClose?: () => void }) {
  const { layers, updateLayer, removeLayer } = useStore();
  const visibleCount = layers.filter(l => l.visible).length;

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(49,95,80,0.12)] border border-[rgba(49,95,80,0.25)] flex items-center justify-center">
            <Layers className="w-4 h-4 text-[#315F50]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-[#1D2227] flex items-center gap-2">
              Spatial Layers
              <span className="text-[9px] font-mono text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-1.5 py-0.5 rounded-chip">
                {visibleCount} visible
              </span>
            </h2>
            <p className="text-[11px] text-[#747F88] mt-0.5">Hansen GFC · GFW · EUDR reference data</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A8791] hover:text-[#343B42] hover:bg-[#E3E7EA] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Hansen legend callout — always visible, not tied to a layer card */}
      <div className="mx-3 mt-3 rounded-card border border-[rgba(197,138,58,0.30)] bg-[rgba(197,138,58,0.06)] p-3 space-y-2 flex-shrink-0">
        <p className="text-[10px] font-semibold text-[#C58A3A] uppercase tracking-wider flex items-center gap-1.5">
          🌲 Hansen GFC · Forest Loss Year
        </p>
        {/* Colour ramp */}
        <div
          className="h-3 w-full rounded"
          style={{
            background: `linear-gradient(to right, ${HANSEN_STOPS.map(s => s.color).join(", ")})`,
          }}
        />
        <div className="flex justify-between text-[9px] font-mono text-[#747F88]">
          {HANSEN_STOPS.map(s => (
            <span key={s.year}>{s.year}</span>
          ))}
        </div>
        {/* EUDR cutoff marker */}
        <div className="flex items-center gap-2 pt-1 border-t border-[rgba(197,138,58,0.20)]">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: "#800026" }} />
          <p className="text-[10px] text-[#1D2227] leading-snug">
            <span className="font-semibold text-[#A64B45]">Dark red / maroon pixels = post-2020 loss</span>
            {" "}— deforestation after the EUDR cutoff date (31 Dec 2020). These are the non-compliant areas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: "#ffffcc" }} />
          <p className="text-[10px] text-[#747F88]">
            <span className="font-medium text-[#1D2227]">Yellow = older loss (2001–2015)</span>
            {" "}— pre-cutoff, not EUDR-relevant but shows historical clearing footprint.
          </p>
        </div>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 mt-1">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <Layers className="w-8 h-8 text-[#C8CFD5] stroke-1" />
            <p className="text-[12px] font-medium text-[#747F88]">No layers loaded</p>
            <p className="text-[11px] text-[#AAB3BB] max-w-[220px] leading-relaxed">
              Run an EUDR assessment or Copilot query to load analysis layers.
            </p>
          </div>
        ) : (
          [...layers].reverse().map(layer => (
            <LayerRow key={layer.id} layer={layer} onUpdate={updateLayer} onRemove={removeLayer} />
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-[#C8CFD5] px-3 py-2.5 bg-[#E3E7EA]">
        <div className="flex items-start gap-2 text-[10px] text-[#AAB3BB]">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#315F50]" />
          <p>Basemap: ESRI World Imagery · Hansen GFC v1.11 · UMD/Google/USGS/NASA · 30m resolution</p>
        </div>
      </footer>
    </div>
  );
}

function LayerRow({
  layer,
  onUpdate,
  onRemove,
}: {
  layer: import("@/lib/store").ActiveLayer;
  onUpdate: (id: string, patch: Partial<import("@/lib/store").ActiveLayer>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const TYPE_ICON: Record<string, string> = {
    land_disturbance:           "🔴",
    vegetation_health_comparison:"🌿",
    vegetation_moisture_change: "💧",
    surface_water_extent:       "🌊",
    true_color_imagery:         "🛰️",
    prithvi_change_detection:   "🤖",
  };

  const isHansen = layer.id.startsWith("hansen-gfc");

  return (
    <div className={cn(
      "border rounded-card overflow-hidden transition-colors",
      layer.visible
        ? "bg-white border-[#C8CFD5] hover:border-[#7A8791]"
        : "bg-[#F4F5F6] border-[#E3E7EA] opacity-60",
    )}>
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-sm leading-none flex-shrink-0">{TYPE_ICON[layer.analysisType] ?? "🌍"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[#1D2227] font-medium truncate">{layer.label}</p>
          {isHansen && (
            <p className="text-[10px] text-[#747F88] mt-0.5">Hansen/UMD/Google · GCS · 30m</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onUpdate(layer.id, { visible: !layer.visible })}
            title={layer.visible ? "Hide layer" : "Show layer"}
            className={cn(
              "p-1.5 rounded transition-colors",
              layer.visible ? "text-[#315F50] hover:text-[#1D2227]" : "text-[#AAB3BB] hover:text-[#343B42]",
            )}
          >
            {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded text-[#AAB3BB] hover:text-[#343B42] transition-colors"
          >
            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-150", expanded && "rotate-90")} />
          </button>
          <button
            onClick={() => onRemove(layer.id)}
            className="p-1.5 rounded text-[#AAB3BB] hover:text-[#A64B45] transition-colors"
            title="Remove layer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-[#E3E7EA] space-y-3 bg-[#F4F5F6]">
          {/* Opacity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#747F88] flex items-center gap-1">
                <SlidersHorizontal className="w-2.5 h-2.5 text-[#315F50]" /> Opacity
              </span>
              <span className="font-mono font-medium text-[#1D2227]">{Math.round(layer.opacity * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05} value={layer.opacity}
              onChange={e => onUpdate(layer.id, { opacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-[#E3E7EA] cursor-pointer accent-[#315F50]"
            />
          </div>

          {/* Colour ramp legend */}
          {isHansen && (
            <div className="space-y-1.5">
              <p className="text-[9px] text-[#AAB3BB] uppercase tracking-wider font-medium">Loss year colour scale</p>
              <div
                className="h-2.5 rounded-sm w-full"
                style={{ background: `linear-gradient(to right, ${HANSEN_STOPS.map(s => s.color).join(", ")})` }}
              />
              <div className="flex justify-between text-[9px] font-mono text-[#AAB3BB]">
                <span>2001</span><span>2010</span><span>2020</span><span>2023</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: "#800026" }} />
                <p className="text-[10px] text-[#A64B45] font-medium">Post-2020 = EUDR non-compliant zone</p>
              </div>
            </div>
          )}

          {/* Generic legend */}
          {!isHansen && layer.legend && (
            <div className="space-y-1">
              <p className="text-[9px] text-[#AAB3BB] uppercase tracking-wider font-medium">{layer.legend.title}</p>
              <div
                className="h-2 rounded-full"
                style={{ background: "linear-gradient(to right, #ffffcc, #fd8d3c, #800026)" }}
              />
              <div className="flex justify-between text-[9px] font-mono text-[#AAB3BB]">
                <span>{layer.legend.min} {layer.legend.units}</span>
                <span>{layer.legend.max} {layer.legend.units}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
