"use client";

import { useState } from "react";
import { Layers, Eye, EyeOff, X, ChevronRight, Info, SlidersHorizontal, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

// Layer type → emoji icon
const LAYER_ICONS: Record<string, string> = {
  hansen_loss:       "🔴",
  hansen_treecover:  "🌲",
  esa_worldcover:    "🌍",
  natural_forest:    "🌿",
  forest_typology:   "🎨",
  wri_drivers:       "🔍",
  commodity_map:     "🌾",
  land_disturbance:  "🔴",
  vegetation_health_comparison: "🌿",
  default:           "🛰️",
};

// Class-based legends for categorical datasets
const CLASS_LEGENDS: Record<string, Array<{label: string; color: string}>> = {
  esa_worldcover: [
    { label: "Tree cover",           color: "#006400" },
    { label: "Shrubland",            color: "#FFBB22" },
    { label: "Grassland",            color: "#FFFF4C" },
    { label: "Cropland",             color: "#F096FF" },
    { label: "Built-up",             color: "#FA0000" },
    { label: "Bare / sparse",        color: "#B4B4B4" },
    { label: "Snow and ice",         color: "#F0F0F0" },
    { label: "Permanent water",      color: "#0064C8" },
    { label: "Wetland",              color: "#0096A0" },
    { label: "Mangroves",            color: "#00CF75" },
    { label: "Moss / lichen",        color: "#FAE6A0" },
  ],
  forest_typology: [
    { label: "Primary Forest",           color: "#1B7837" },
    { label: "Naturally Regenerating",   color: "#7FBF7B" },
    { label: "Planted Forest",           color: "#1D91C0" },
    { label: "Plantation Forest",        color: "#E65FA9" },
    { label: "Tree Crops & Agroforestry",color: "#E6AB02" },
  ],
  wri_drivers: [
    { label: "Permanent Agriculture",       color: "#E39D29" },
    { label: "Hard Commodities",            color: "#E58074" },
    { label: "Shifting Cultivation",        color: "#e9d700" },
    { label: "Logging",                     color: "#51a44e" },
    { label: "Wildfire",                    color: "#895128" },
    { label: "Settlements & Infrastructure",color: "#a354a0" },
    { label: "Other Natural Disturbances",  color: "#3a209a" },
  ],
};

// Gradient stops for continuous datasets
const GRADIENT_LEGENDS: Record<string, {stops: string[]; labels: string[]; note?: string}> = {
  hansen_loss: {
    stops: ["#ffff00", "#ffa500", "#ff6600", "#ff0000", "#8b0000"],
    labels: ["2021", "2022", "2023", "2024", "2025"],
    note: "Post-Dec 2020 = EUDR non-compliant zone",
  },
  hansen_treecover: {
    stops: ["#000000", "#004400", "#008800", "#00cc00", "#00ff00"],
    labels: ["0%", "25%", "50%", "75%", "100%"],
    note: "Tree cover density (2020 baseline)",
  },
  natural_forest: {
    stops: ["#ffffff", "#d4edda", "#74c476", "#238b45", "#00441b"],
    labels: ["Low", "", "", "", "High"],
    note: "Natural forest probability (10m · threshold 0.52)",
  },
};

export default function LayerSidebar({ onClose }: { onClose?: () => void }) {
  const { layers, updateLayer, removeLayer } = useStore();
  const visibleCount = layers.filter(l => l.visible).length;

  // Split GEE dynamic layers from base static layers
  const geeLayers = layers.filter(l =>
    l.id.startsWith("gee-") || Object.keys(LAYER_ICONS).includes(
      (l as { layer_type?: string }).layer_type ?? ""
    )
  );
  const baseLayers = layers.filter(l => !l.id.startsWith("gee-"));

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
              Satellite Layers
              <span className="text-[9px] font-mono text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-1.5 py-0.5 rounded-chip">
                {visibleCount} visible
              </span>
            </h2>
            <p className="text-[11px] text-[#747F88] mt-0.5">GEE real-pixel datasets · toggle to compare</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A8791] hover:text-[#343B42] hover:bg-[#E3E7EA] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-4">

        {/* GEE Live Layers — from backend assessment */}
        {geeLayers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <Satellite className="w-3 h-3 text-[#315F50]" />
              <p className="text-[10px] text-[#315F50] font-semibold uppercase tracking-wider">
                GEE Assessment Layers
              </p>
              <span className="text-[9px] font-mono text-[#747F88] ml-auto">
                Real pixels · live
              </span>
            </div>
            {[...geeLayers].reverse().map(layer =>
              <LayerRow key={layer.id} layer={layer} onUpdate={updateLayer} onRemove={removeLayer} />
            )}
          </div>
        )}

        {/* Base reference layers */}
        {baseLayers.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-[#AAB3BB] font-semibold uppercase tracking-wider px-0.5">
              Base Reference Layers
            </p>
            {[...baseLayers].reverse().map(layer =>
              <LayerRow key={layer.id} layer={layer} onUpdate={updateLayer} onRemove={removeLayer} />
            )}
          </div>
        )}

        {layers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <Layers className="w-8 h-8 text-[#C8CFD5] stroke-1" />
            <p className="text-[12px] font-medium text-[#747F88]">No layers loaded yet</p>
            <p className="text-[11px] text-[#AAB3BB] max-w-[220px] leading-relaxed">
              Run an EUDR assessment to load real GEE satellite layers — Hansen GFC, Forest Typology, WRI Drivers, Commodity Maps.
            </p>
          </div>
        )}
      </div>

      <footer className="flex-shrink-0 border-t border-[#C8CFD5] px-3 py-2.5 bg-[#E3E7EA]">
        <div className="flex items-start gap-2 text-[10px] text-[#AAB3BB]">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#315F50]" />
          <p>Tiles: Google Earth Engine · Hansen GFC v1.13 · Nature Trace · WRI/DeepMind · FDP 2025</p>
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
  layer: import("@/lib/store").ActiveLayer & { layer_type?: string };
  onUpdate: (id: string, patch: Partial<import("@/lib/store").ActiveLayer>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const layerType = (layer as { layer_type?: string }).layer_type ?? layer.analysisType ?? "default";
  const icon = LAYER_ICONS[layerType] ?? LAYER_ICONS.default;
  const classLegend = CLASS_LEGENDS[layerType];
  const gradLegend = GRADIENT_LEGENDS[layerType];

  // Parse legend.classes from backend if available
  const backendClasses = (layer.legend as { classes?: Array<{label: string; color: string}> } | undefined)?.classes;
  const displayClasses = backendClasses ?? classLegend;

  const isGEE = layer.id.startsWith("gee-");

  return (
    <div className={cn(
      "border rounded-card overflow-hidden transition-all duration-150",
      layer.visible
        ? "bg-white border-[#C8CFD5] hover:border-[#7A8791]"
        : "bg-[#F4F5F6] border-[#E3E7EA] opacity-60",
    )}>
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-sm leading-none flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[#1D2227] font-medium truncate">{layer.label}</p>
          {isGEE && (
            <p className="text-[10px] text-[#315F50] mt-0.5 font-mono">
              GEE live pixel data · {layer.visible ? "rendering" : "hidden"}
            </p>
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
          {/* Opacity slider */}
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

          {/* Class-based legend (Forest Typology, WRI Drivers) */}
          {displayClasses && (
            <div className="space-y-1">
              <p className="text-[9px] text-[#AAB3BB] uppercase tracking-wider font-medium">Legend</p>
              <div className="space-y-1">
                {displayClasses.map((cls) => (
                  <div key={cls.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: cls.color }} />
                    <span className="text-[10px] text-[#1D2227]">{cls.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gradient legend (Hansen, Natural Forest) */}
          {!displayClasses && gradLegend && (
            <div className="space-y-1.5">
              <p className="text-[9px] text-[#AAB3BB] uppercase tracking-wider font-medium">Legend</p>
              <div
                className="h-3 rounded w-full"
                style={{ background: `linear-gradient(to right, ${gradLegend.stops.join(", ")})` }}
              />
              <div className="flex justify-between text-[9px] font-mono text-[#AAB3BB]">
                {gradLegend.labels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
              {gradLegend.note && (
                <p className="text-[10px] text-[#A64B45] font-medium">{gradLegend.note}</p>
              )}
            </div>
          )}

          {/* Generic legend from backend */}
          {!displayClasses && !gradLegend && layer.legend && (
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
