"use client";

import { useState, useMemo } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ArrowUpToLine,
  SlidersHorizontal,
  Satellite,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, resolveCompareLayerIds, type ActiveLayer } from "@/lib/store";
import {
  JRC2020Emblem,
  Sentinel1RadarIcon,
  GoogleFDPIcon,
  May2026CarveIcon,
  CanopyLossIcon,
  NaturalForestIcon,
  TypologyIcon,
} from "@/components/icons/EOIcons";

// Class-based legends for categorical datasets
const CLASS_LEGENDS: Record<string, Array<{ label: string; color: string }>> = {
  intersection: [
    { label: "Clean Compliant Land (Art. 3a)", color: "#2E9E6F" },
    { label: "Plantation Replanting (Art. 2(5) Exempt)", color: "#F2A91F" },
    { label: "Sustainable Silviculture (Art. 2(3) Exempt)", color: "#3B82C4" },
    { label: "Statutory Deforestation (Art. 3a Violation)", color: "#D93C4A" },
    { label: "Non-Agronomic / Urban / Water / No-Data", color: "#64748B" },
  ],
  hansen_loss: [
    { label: "Standing Forest Baseline (Dec 2020)", color: "#315F50" },
    { label: "Post-2020 Forest Loss (EUDR Art. 3(a) Violation)", color: "#F04444" },
  ],
  hansen_gfc: [
    { label: "Standing Forest Baseline (Dec 2020)", color: "#315F50" },
    { label: "Post-2020 Forest Loss (EUDR Art. 3(a) Violation)", color: "#F04444" },
  ],
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
    { label: "Primary Forest",            color: "#1B7837" },
    { label: "Naturally Regenerating",    color: "#7FBF7B" },
    { label: "Planted Forest",            color: "#1D91C0" },
    { label: "Plantation Forest",         color: "#E65FA9" },
    { label: "Tree Crops & Agroforestry", color: "#E6AB02" },
  ],
  wri_drivers: [
    { label: "Permanent Agriculture",        color: "#E39D29" },
    { label: "Hard Commodities",             color: "#E58074" },
    { label: "Shifting Cultivation",         color: "#e9d700" },
    { label: "Logging",                      color: "#51a44e" },
    { label: "Wildfire",                     color: "#895128" },
    { label: "Settlements & Infrastructure", color: "#a354a0" },
    { label: "Other Natural Disturbances",   color: "#3a209a" },
  ],
};

// Gradient stops for continuous datasets
const GRADIENT_LEGENDS: Record<string, { stops: string[]; labels: string[]; note?: string }> = {
  commodity_map: {
    stops: ["#ffffff", "#fef08a", "#f59e0b", "#b45309", "#78350f"],
    labels: ["0.0", "0.25", "0.50", "0.75", "1.0"],
    note: "Pixel-level commodity presence probability (Google FDP 10m)",
  },
  cocoa_probability: {
    stops: ["#ffffff", "#fef3c7", "#d97706", "#854d0e", "#5c3a21"],
    labels: ["0%", "50%", "75%", "100%"],
    note: "Cocoa agroforestry canopy probability (Google FDP 10m · threshold ≥0.50)",
  },
  coffee_probability: {
    stops: ["#ffffff", "#fed7aa", "#ea580c", "#7c2d12", "#3b1e08"],
    labels: ["0%", "50%", "80%", "100%"],
    note: "Coffee agroforestry canopy probability (Google FDP 10m · threshold ≥0.95)",
  },
  palm_oil_probability: {
    stops: ["#ffffff", "#bbf7d0", "#22c55e", "#15803d", "#14532d"],
    labels: ["0%", "47%", "75%", "100%"],
    note: "Oil palm canopy probability (Google FDP 10m · threshold ≥0.47)",
  },
  rubber_probability: {
    stops: ["#ffffff", "#e2e8f0", "#94a3b8", "#64748b", "#334155"],
    labels: ["0%", "35%", "70%", "100%"],
    note: "Natural rubber plantation probability (Google FDP 10m · threshold ≥0.35)",
  },
  hansen_treecover: {
    stops: ["#000000", "#004400", "#008800", "#00cc00", "#00ff00"],
    labels: ["0%", "25%", "50%", "75%", "100%"],
    note: "Tree cover density (2020 baseline cutoff)",
  },
  natural_forest: {
    stops: ["#ffffff", "#d4edda", "#74c476", "#238b45", "#00441b"],
    labels: ["0.0", "0.25", "0.50", "0.75", "1.0"],
    note: "Natural forest probability (10m · Nature Trace threshold 0.52)",
  },
};

interface LayerMeta {
  title: string;
  subtitle: string;
  category: "statutory" | "alerts" | "canopy" | "other";
  categoryLabel: string;
  resolution: string;
  source: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

function getLayerMeta(layer: ActiveLayer): LayerMeta {
  const id = layer.id.toLowerCase();
  const rawLabel = layer.label.replace(/_/g, " ");

  if (id.includes("pwri") || id.includes("intersection")) {
    return {
      title: "PWRI Statutory Invalidation",
      subtitle: "Pixel-Wise Raster Intersection (Carve-Out)",
      category: "statutory",
      categoryLabel: "Statutory Cutoff",
      resolution: "10m",
      source: "Oxeous Map Algebra",
      icon: May2026CarveIcon,
      iconBg: "bg-[rgba(49,95,80,0.12)] border-[rgba(49,95,80,0.25)]",
      iconColor: "text-[#315F50]",
    };
  }

  if (id.includes("jrc") || id.includes("gfc2020")) {
    return {
      title: "EC JRC GFC2020",
      subtitle: "Official European Commission EUDR Baseline",
      category: "statutory",
      categoryLabel: "Statutory Cutoff",
      resolution: "10m",
      source: "Joint Research Centre",
      icon: JRC2020Emblem,
      iconBg: "bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
    };
  }

  if (id.includes("natural_forest") || id.includes("natural-forest")) {
    return {
      title: "Natural Forests 2020",
      subtitle: "High-Confidence Primary Forest Baseline",
      category: "statutory",
      categoryLabel: "Statutory Cutoff",
      resolution: "10m",
      source: "WRI Nature 2020",
      icon: NaturalForestIcon,
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-700",
    };
  }

  if (id.includes("forest_typology") || id.includes("forest-typology")) {
    return {
      title: "Forest Typology 2020",
      subtitle: "Primary vs Plantation Forest Classification",
      category: "statutory",
      categoryLabel: "Statutory Cutoff",
      resolution: "30m",
      source: "ForTy 2020",
      icon: TypologyIcon,
      iconBg: "bg-indigo-50 border-indigo-200",
      iconColor: "text-indigo-600",
    };
  }

  if (id.includes("esa") || id.includes("worldcover")) {
    return {
      title: "ESA WorldCover 2020",
      subtitle: "11-Class Global Land Cover Baseline",
      category: "statutory",
      categoryLabel: "Statutory Cutoff",
      resolution: "10m",
      source: "ESA Sentinel-1/2",
      icon: NaturalForestIcon,
      iconBg: "bg-teal-50 border-teal-200",
      iconColor: "text-teal-700",
    };
  }

  if (id.includes("treecover")) {
    return {
      title: "Hansen Tree Cover 2020",
      subtitle: "Continuous Canopy Density Baseline",
      category: "statutory",
      categoryLabel: "Statutory Cutoff",
      resolution: "30m",
      source: "UMD Hansen v1.13",
      icon: CanopyLossIcon,
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
    };
  }

  if (id.includes("hansen") || id.includes("loss")) {
    return {
      title: "Hansen Forest Loss",
      subtitle: "Post-2020 Statutory Deforestation Clearing",
      category: "alerts",
      categoryLabel: "Disturbance & Alerts",
      resolution: "30m",
      source: "UMD GFC 2021-2024",
      icon: CanopyLossIcon,
      iconBg: "bg-rose-50 border-rose-200",
      iconColor: "text-rose-600",
    };
  }

  if (id.includes("radd") || id.includes("radar")) {
    return {
      title: "WUR/WRI RADD Radar",
      subtitle: "Sentinel-1 SAR Cloud-Penetrating Alerts",
      category: "alerts",
      categoryLabel: "Disturbance & Alerts",
      resolution: "10m",
      source: "Wageningen University",
      icon: Sentinel1RadarIcon,
      iconBg: "bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
    };
  }

  if (id.includes("commodity") || id.includes("palm") || id.includes("rubber") || id.includes("cocoa") || id.includes("coffee") || id.includes("soya")) {
    let commName = "Commodity";
    if (id.includes("palm") || rawLabel.toLowerCase().includes("palm")) commName = "Palm Oil";
    else if (id.includes("rubber") || rawLabel.toLowerCase().includes("rubber")) commName = "Natural Rubber";
    else if (id.includes("cocoa") || rawLabel.toLowerCase().includes("cocoa")) commName = "Cocoa";
    else if (id.includes("coffee") || rawLabel.toLowerCase().includes("coffee")) commName = "Coffee";
    else if (id.includes("soya") || rawLabel.toLowerCase().includes("soya")) commName = "Soya";

    return {
      title: `${commName} Probability (FDP)`,
      subtitle: "Google AI Canopy Density Heatmap",
      category: "canopy",
      categoryLabel: "Commodity & Drivers",
      resolution: "10m",
      source: "Google Forest Dynamics",
      icon: GoogleFDPIcon,
      iconBg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
    };
  }

  if (id.includes("drivers") || id.includes("wri")) {
    return {
      title: "Drivers of Forest Loss",
      subtitle: "DeepMind / WRI 7-Class Disturbance Typology",
      category: "canopy",
      categoryLabel: "Commodity & Drivers",
      resolution: "30m",
      source: "WRI / DeepMind",
      icon: TypologyIcon,
      iconBg: "bg-purple-50 border-purple-200",
      iconColor: "text-purple-600",
    };
  }

  return {
    title: rawLabel,
    subtitle: layer.analysisType ? layer.analysisType.replace(/_/g, " ") : "Earth Observation Raster Layer",
    category: "other",
    categoryLabel: "Additional Layers",
    resolution: "10m",
    source: "Earth Engine",
    icon: Satellite,
    iconBg: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600",
  };
}

export default function LayerSidebar({ onClose }: { onClose?: () => void }) {
  const {
    layers,
    updateLayer,
    removeLayer,
    moveLayer,
    compareMode,
    setCompareMode,
    comparePosition,
    compareLeftLayerId,
    compareRightLayerId,
    setCompareLeftLayerId,
    setCompareRightLayerId,
  } = useStore();

  const { effectiveLeftId, effectiveRightId } = resolveCompareLayerIds(
    layers,
    compareLeftLayerId,
    compareRightLayerId
  );
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<"all" | "visible" | "statutory" | "alerts" | "canopy">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const visibleCount = layers.filter((l) => l.visible).length;

  // Filtered layers
  const filteredLayers = useMemo(() => {
    return layers.filter((layer) => {
      const meta = getLayerMeta(layer);
      // Category match
      if (filterCategory === "visible" && !layer.visible) return false;
      if (filterCategory === "statutory" && meta.category !== "statutory") return false;
      if (filterCategory === "alerts" && meta.category !== "alerts") return false;
      if (filterCategory === "canopy" && meta.category !== "canopy") return false;

      // Text search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          meta.title.toLowerCase().includes(q) ||
          meta.subtitle.toLowerCase().includes(q) ||
          meta.source.toLowerCase().includes(q) ||
          layer.label.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [layers, filterCategory, searchQuery]);

  // Quick Action: Enable Statutory Core Preset (JRC + Hansen Loss + PWRI)
  const applyStatutoryPreset = () => {
    layers.forEach((l) => {
      const id = l.id.toLowerCase();
      const isCore = id.includes("jrc") || id.includes("loss") || id.includes("pwri") || id.includes("intersection");
      updateLayer(l.id, { visible: isCore, opacity: isCore ? (id.includes("jrc") ? 0.8 : 1.0) : l.opacity });
    });
  };

  // Quick Action: Hide All
  const hideAllLayers = () => {
    layers.forEach((l) => updateLayer(l.id, { visible: false }));
  };

  // Quick Action: Show All
  const showAllLayers = () => {
    layers.forEach((l) => updateLayer(l.id, { visible: true }));
  };

  const handleMoveLayer = (fromId: string, toId: string) => {
    const fromIdx = layers.findIndex((l) => l.id === fromId);
    const toIdx = layers.findIndex((l) => l.id === toId);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      moveLayer(fromIdx, toIdx);
    }
  };

  const handleMoveStep = (id: string, direction: "up" | "down") => {
    const fromIdx = layers.findIndex((l) => l.id === id);
    if (fromIdx === -1) return;
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx >= 0 && toIdx < layers.length) {
      moveLayer(fromIdx, toIdx);
    }
  };

  const handleBringToTop = (id: string) => {
    const fromIdx = layers.findIndex((l) => l.id === id);
    if (fromIdx > 0) {
      moveLayer(fromIdx, 0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0 bg-white shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(49,95,80,0.12)] border border-[rgba(49,95,80,0.25)] flex items-center justify-center">
            <Layers className="w-4 h-4 text-[#315F50]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-[#1D2227] flex items-center gap-2">
              Earth Observation Layers
              <span className="text-[9.5px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-2 py-0.5 rounded-chip">
                {visibleCount} Active
              </span>
            </h2>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#747F88] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-colors cursor-pointer"
            title="Close Layers Panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Control Bar: Search + Filter Pills + Quick Presets */}
      <div className="p-3 border-b border-[#E3E7EA] bg-white space-y-2.5 flex-shrink-0">
        {/* Search bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#7A8791] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search layers by name, sensor, or cutoff..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg text-[11px] bg-[#F4F5F6] border border-[#C8CFD5] placeholder:text-[#AAB3BB] text-[#1D2227] focus:outline-none focus:border-[#315F50] focus:ring-1 focus:ring-[#315F50]/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A8791] hover:text-[#1D2227]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter categories */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: "all", label: "All Layers" },
            { id: "visible", label: `Active (${visibleCount})` },
            { id: "statutory", label: "Baselines" },
            { id: "alerts", label: "Alerts" },
            { id: "canopy", label: "Commodity" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id as typeof filterCategory)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer border",
                filterCategory === cat.id
                  ? "bg-[#315F50] text-white border-[#315F50] shadow-2xs font-semibold"
                  : "bg-[#F4F5F6] text-[#5B6773] border-[#E3E7EA] hover:bg-[#E3E7EA] hover:text-[#1D2227]"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Quick actions strip */}
        <div className="flex items-center justify-between pt-1 border-t border-[#F0F2F4] text-[10px]">
          <button
            onClick={applyStatutoryPreset}
            className="flex items-center gap-1 font-semibold text-[#315F50] hover:text-[#274d40] transition-colors cursor-pointer"
            title="Enable JRC 2020 Baseline, Hansen Loss, and PWRI Carve-out"
          >
            <Sparkles className="w-3 h-3 text-[#315F50]" />
            <span>Statutory Preset (3)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={showAllLayers}
              className="text-[#747F88] hover:text-[#1D2227] font-medium transition-colors cursor-pointer"
            >
              Show All
            </button>
            <span className="text-[#C8CFD5]">·</span>
            <button
              onClick={hideAllLayers}
              className="text-[#747F88] hover:text-[#A64B45] font-medium transition-colors cursor-pointer"
            >
              Hide All
            </button>
          </div>
        </div>
      </div>

      {/* Stacking Order Guide & Reorder Notice */}
      {layers.length > 1 && (
        <div className="px-4 py-1.5 bg-[#E8ECEF] border-b border-[#D8DFE4] flex items-center justify-between text-[10px] text-[#5B6773]">
          <span className="flex items-center gap-1 font-medium">
            <GripVertical className="w-3 h-3 text-[#747F88]" />
            <span>Drag handle or arrows to restack layers</span>
          </span>
          <span className="font-mono font-semibold text-[#315F50] bg-white px-1.5 py-0.5 rounded border border-[#C8CFD5]">
            Top card = Top of map
          </span>
        </div>
      )}


      {/* Compare Mode Active Banner */}
      {compareMode && (
        <div className="mx-3 my-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 via-white to-rose-50 border border-[#C8CFD5] shadow-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#315F50] animate-pulse" />
            <span className="font-semibold text-[#1D2227]">Swipe Compare Mode</span>
            <span className="text-[10px] font-mono font-semibold text-[#5B6773] bg-white px-1.5 py-0.5 rounded border border-[#C8CFD5]">
              {comparePosition}%
            </span>
          </div>
          <button
            onClick={() => setCompareMode(false)}
            className="text-[10.5px] font-semibold text-[#A64B45] hover:text-[#7f1d1d] px-2 py-0.5 rounded bg-white border border-[#C8CFD5] hover:border-[#A64B45]/40 transition-colors cursor-pointer"
          >
            Exit Compare
          </button>
        </div>
      )}
      {/* Layer List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2.5">
        {filteredLayers.length > 0 ? (
          filteredLayers.map((layer) => {
            const rawIndex = layers.findIndex((l) => l.id === layer.id);
            const isFirstVisible = layers.filter((l) => l.visible)[0]?.id === layer.id;
            return (
              <EnhancedLayerRow
                key={layer.id}
                layer={layer}
                index={rawIndex}
                totalLayers={layers.length}
                isTopLayer={rawIndex === 0 || isFirstVisible}
                compareMode={compareMode}
                isCompareLeft={layer.id === effectiveLeftId}
                isCompareRight={layer.id === effectiveRightId}
                onSetCompareLeft={() => setCompareLeftLayerId(layer.id)}
                onSetCompareRight={() => setCompareRightLayerId(layer.id)}
                isDragged={draggedLayerId === layer.id}
                isDragOver={dragOverLayerId === layer.id}
                onUpdate={updateLayer}
                onRemove={removeLayer}
                onMoveUp={() => handleMoveStep(layer.id, "up")}
                onMoveDown={() => handleMoveStep(layer.id, "down")}
                onBringToTop={() => handleBringToTop(layer.id)}
                onDragStart={(e) => {
                  setDraggedLayerId(layer.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", layer.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverLayerId !== layer.id) {
                    setDragOverLayerId(layer.id);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedLayerId && draggedLayerId !== layer.id) {
                    handleMoveLayer(draggedLayerId, layer.id);
                  }
                  setDraggedLayerId(null);
                  setDragOverLayerId(null);
                }}
                onDragEnd={() => {
                  setDraggedLayerId(null);
                  setDragOverLayerId(null);
                }}
              />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <Layers className="w-8 h-8 text-[#C8CFD5] stroke-1" />
            <p className="text-[12px] font-semibold text-[#747F88]">No matching layers</p>
            <p className="text-[11px] text-[#AAB3BB] max-w-[200px] leading-relaxed">
              {searchQuery ? "Try searching for a different dataset or clear filters." : "Run an EUDR assessment to load satellite layers."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[11px] font-semibold text-[#315F50] hover:underline pt-1"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EnhancedLayerRow({
  layer,
  index,
  totalLayers,
  isTopLayer,
  isDragged,
  isDragOver,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onBringToTop,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  compareMode,
  isCompareLeft,
  isCompareRight,
  onSetCompareLeft,
  onSetCompareRight,
}: {
  layer: ActiveLayer & { layer_type?: string };
  index: number;
  totalLayers: number;
  isTopLayer: boolean;
  isDragged: boolean;
  isDragOver: boolean;
  onUpdate: (id: string, patch: Partial<ActiveLayer>) => void;
  onRemove: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onBringToTop: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  compareMode?: boolean;
  isCompareLeft?: boolean;
  isCompareRight?: boolean;
  onSetCompareLeft?: () => void;
  onSetCompareRight?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = getLayerMeta(layer);
  const Icon = meta.icon;

  const layerType = (layer as { layer_type?: string }).layer_type ?? layer.analysisType ?? "default";
  const isHansenLoss =
    (layer.id.includes("hansen") && (layer.id.includes("loss") || layer.id.includes("disturbance"))) ||
    layerType === "hansen_loss" ||
    layerType === "hansen_gfc" ||
    meta.title.includes("Hansen Forest Loss");

  const classLegend = isHansenLoss ? CLASS_LEGENDS.hansen_loss : CLASS_LEGENDS[layerType];
  let gradLegend = isHansenLoss ? undefined : GRADIENT_LEGENDS[layerType];

  if (!classLegend && !gradLegend) {
    const idLower = layer.id.toLowerCase();
    const titleLower = meta.title.toLowerCase();
    const typeLower = layerType.toLowerCase();

    if (idLower.includes("cocoa") || titleLower.includes("cocoa") || typeLower.includes("cocoa")) {
      gradLegend = GRADIENT_LEGENDS.cocoa_probability;
    } else if (idLower.includes("coffee") || titleLower.includes("coffee") || typeLower.includes("coffee")) {
      gradLegend = GRADIENT_LEGENDS.coffee_probability;
    } else if (idLower.includes("palm") || titleLower.includes("palm") || typeLower.includes("palm")) {
      gradLegend = GRADIENT_LEGENDS.palm_oil_probability;
    } else if (idLower.includes("rubber") || titleLower.includes("rubber") || typeLower.includes("rubber")) {
      gradLegend = GRADIENT_LEGENDS.rubber_probability;
    } else if (idLower.includes("natural_forest") || idLower.includes("natural-forest") || titleLower.includes("natural forest")) {
      gradLegend = GRADIENT_LEGENDS.natural_forest;
    } else if (idLower.includes("treecover") || titleLower.includes("tree cover")) {
      gradLegend = GRADIENT_LEGENDS.hansen_treecover;
    } else if (
      titleLower.includes("probability") ||
      idLower.includes("commodity") ||
      typeLower.includes("commodity") ||
      (layer.legend && (layer.legend as any).units === "probability")
    ) {
      const minVal = (layer.legend as any)?.min ?? 0;
      const maxVal = (layer.legend as any)?.max ?? 1;
      gradLegend = {
        stops: ["#ffffff", "#fef08a", "#f59e0b", "#b45309", "#78350f"],
        labels: [`${minVal}`, `${((minVal + maxVal) / 2).toFixed(2)}`, `${maxVal}`],
        note: `Pixel-level canopy presence probability (${minVal} - ${maxVal})`,
      };
    }
  }

  const backendClasses = (layer.legend as { classes?: Array<{ label: string; color: string }> } | undefined)?.classes;
  const displayClasses = backendClasses ?? classLegend;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border transition-all duration-150 overflow-hidden relative",
        isDragged && "opacity-40 scale-[0.98] border-dashed border-[#315F50]",
        isDragOver && "ring-2 ring-[#315F50] border-[#315F50] shadow-md",
        layer.visible
          ? "bg-white border-[#C8CFD5] border-l-4 border-l-[#315F50] shadow-xs"
          : "bg-[#F8FAF9] border-[#E3E7EA] opacity-80 hover:opacity-100 hover:bg-white"
      )}
    >
      {/* Row Header */}
      <div className="p-3 flex items-start justify-between gap-2">
        {/* Drag Handle */}
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="Drag up or down to reorder layer stack on map"
          className="cursor-grab active:cursor-grabbing p-1 text-[#94A3B8] hover:text-[#334155] hover:bg-[#E2E8F0] rounded transition-colors -ml-1 mt-1 flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Left Icon */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs",
            meta.iconBg
          )}
        >
          <Icon className={cn("w-4 h-4", meta.iconColor)} />
        </div>

        {/* Middle Content - Two Lines Without Truncation */}
        <div
          onClick={() => onUpdate(layer.id, { visible: !layer.visible })}
          className="flex-1 min-w-0 cursor-pointer select-none space-y-0.5"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-bold text-[#1D2227] leading-tight">
              {meta.title}
            </span>
            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#E3E7EA] text-[#5B6773] border border-[#C8CFD5]">
              {meta.resolution}
            </span>
            {layer.visible && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[rgba(49,95,80,0.1)] text-[#315F50] border border-[rgba(49,95,80,0.25)] uppercase tracking-wider">
                Active
              </span>
            )}
            
            {compareMode && isCompareLeft && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Left View
              </span>
            )}
            {compareMode && isCompareRight && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                Right View
              </span>
            )}
            {isTopLayer && layer.visible && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Top of Map
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#747F88] leading-snug">
            {meta.subtitle}
          </p>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
          {/* Move Up Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            title="Move layer up (brings on top of map)"
            className="p-1 rounded text-[#747F88] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Move Down Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === totalLayers - 1}
            title="Move layer down (sends underneath on map)"
            className="p-1 rounded text-[#747F88] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Eye Visibility Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(layer.id, { visible: !layer.visible });
            }}
            title={layer.visible ? "Hide layer from map" : "Display layer on map"}
            className={cn(
              "p-1.5 rounded-lg border transition-all cursor-pointer ml-0.5",
              layer.visible
                ? "bg-[rgba(49,95,80,0.12)] border-[rgba(49,95,80,0.25)] text-[#315F50] hover:bg-[rgba(49,95,80,0.18)]"
                : "bg-white border-[#C8CFD5] text-[#AAB3BB] hover:text-[#1D2227] hover:border-[#7A8791]"
            )}
          >
            {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Expand Chevron for Opacity & Legend */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            title="Layer Settings & Legend"
            className={cn(
              "p-1.5 rounded-lg text-[#7A8791] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-all cursor-pointer",
              expanded && "bg-[#E3E7EA] text-[#1D2227]"
            )}
          >
            <ChevronRight
              className={cn("w-4 h-4 transition-transform duration-150", expanded && "rotate-90")}
            />
          </button>
        </div>
      </div>

      {/* Expanded Controls & Legend */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-[#E3E7EA] space-y-3.5 bg-[#F8FAF9]">
          
          {/* Swipe Compare Placement Bar */}
          {compareMode && onSetCompareLeft && onSetCompareRight && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#C8CFD5] text-[10.5px]">
              <span className="text-[#5B6773] font-semibold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-[#315F50]" />
                Swipe Compare Placement
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetCompareLeft();
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer border",
                    isCompareLeft
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  Set as Left
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetCompareRight();
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer border",
                    isCompareRight
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                  )}
                >
                  Set as Right
                </button>
              </div>
            </div>
          )}
          {/* Opacity Control */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-[#5B6773] font-semibold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-[#315F50]" />
                Layer Transparency
              </span>
              <span className="font-mono font-bold text-[#1D2227]">
                {Math.round(layer.opacity * 100)}%
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layer.opacity}
              onChange={(e) => onUpdate(layer.id, { opacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-[#E3E7EA] cursor-pointer accent-[#315F50]"
            />

            {/* Quick preset chips */}
            <div className="flex items-center justify-between text-[9px] font-mono text-[#747F88] pt-0.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => onUpdate(layer.id, { opacity: pct / 100 })}
                  className={cn(
                    "px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                    Math.round(layer.opacity * 100) === pct
                      ? "bg-white font-bold text-[#315F50] border-[#315F50]/40 shadow-2xs"
                      : "bg-[#F4F5F6] border-[#E3E7EA] hover:text-[#1D2227]"
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Categorical Legend */}
          {displayClasses && displayClasses.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#E3E7EA]">
              <p className="text-[9.5px] text-[#747F88] uppercase tracking-wider font-bold">
                Categorical Legend
              </p>
              <div className="grid grid-cols-1 gap-1">
                {displayClasses.map((cls) => (
                  <div key={cls.label} className="flex items-center gap-2 text-[10.5px]">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10"
                      style={{ background: cls.color }}
                    />
                    <span className="text-[#1D2227] font-medium">{cls.label}</span>
                  </div>
                ))}
              </div>
              {isHansenLoss && (
                <p className="text-[10px] text-[#A64B45] font-semibold bg-rose-50 border border-rose-200 p-1.5 rounded-md mt-1.5">
                  Post-Dec 2020 clearing = EUDR non-compliant zone (Art. 3(a))
                </p>
              )}
            </div>
          )}

          {/* Continuous Gradient Legend */}
          {!displayClasses && gradLegend && (
            <div className="space-y-1.5 pt-2 border-t border-[#E3E7EA]">
              <p className="text-[9.5px] text-[#747F88] uppercase tracking-wider font-bold">
                Continuous Legend
              </p>
              <div
                className="h-2.5 rounded-full w-full border border-black/10 shadow-2xs"
                style={{
                  background: `linear-gradient(to right, ${gradLegend.stops.join(", ")})`,
                }}
              />
              <div className="flex justify-between text-[9.5px] font-mono font-medium text-[#747F88]">
                {gradLegend.labels.map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </div>
              {gradLegend.note && (
                <p className="text-[10px] text-[#475569] font-medium bg-[#F1F5F9] border border-[#CBD5E1] p-1.5 rounded-md">
                  {gradLegend.note}
                </p>
              )}
            </div>
          )}

          {/* Metadata Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E3E7EA] text-[10px] text-[#747F88]">
            <div className="flex items-center gap-2">
              <span>Source: {meta.source}</span>
              <span className="text-[#C8CFD5]">·</span>
              <button
                onClick={onBringToTop}
                disabled={index === 0}
                className="flex items-center gap-1 font-semibold text-[#315F50] hover:text-[#274d40] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Move this layer to the very top of the stack on the map"
              >
                <ArrowUpToLine className="w-3 h-3" />
                <span>Bring to Top</span>
              </button>
            </div>
            <button
              onClick={() => onRemove(layer.id)}
              className="text-[#A64B45] hover:text-red-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Remove layer from active map session"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
