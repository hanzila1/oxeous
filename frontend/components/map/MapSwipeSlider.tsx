"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeftRight,
  X,
  ChevronDown,
  Check,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useStore, resolveCompareLayerIds, type ActiveLayer } from "@/lib/store";
import { cn } from "@/lib/utils";

function getLayerDisplayInfo(
  id: string,
  layers: ActiveLayer[]
): { title: string; shortTitle: string; subtitle: string; color: string; badge: string } {
  if (id === "basemap") {
    return {
      title: "Satellite Basemap",
      shortTitle: "Basemap",
      subtitle: "ESRI / Maxar High-Res Ground Truth",
      color: "#0284c7",
      badge: "BASEMAP",
    };
  }
  if (id === "all-other") {
    return {
      title: "All Other Active Layers",
      shortTitle: "All Others",
      subtitle: "Remaining active layers stack",
      color: "#64748b",
      badge: "STACK",
    };
  }

  const found = layers.find((l) => l.id === id);
  const lid = id.toLowerCase();
  const label = found?.label || id;

  if (lid.includes("jrc") || lid.includes("gfc2020")) {
    return {
      title: "EC JRC GFC2020",
      shortTitle: "JRC 2020",
      subtitle: "EU Statutory Forest Baseline (Dec 31, 2020)",
      color: "#16a34a",
      badge: "BASELINE",
    };
  }
  if (lid.includes("pwri") || lid.includes("intersection")) {
    return {
      title: "PWRI Statutory Invalidation",
      shortTitle: "PWRI Inval.",
      subtitle: "Pixel-Wise Raster Map Algebra (Carve-Out)",
      color: "#dc2626",
      badge: "PWRI 10m",
    };
  }
  if (lid.includes("hansen") || lid.includes("loss")) {
    return {
      title: "Hansen Forest Loss",
      shortTitle: "Hansen Loss",
      subtitle: "Post-2020 Canopy Disturbance Clearing",
      color: "#e11d48",
      badge: "30m LOSS",
    };
  }
  if (lid.includes("radd") || lid.includes("radar")) {
    return {
      title: "Sentinel-1 RADD Radar",
      shortTitle: "RADD Radar",
      subtitle: "All-Weather Radar Disturbance Alerts",
      color: "#ea580c",
      badge: "RADAR 10m",
    };
  }
  if (lid.includes("commodity")) {
    const comm = lid.replace("gee-commodity-", "").replace("commodity_", "").replace(/_/g, " ");
    const formatted = comm ? comm.charAt(0).toUpperCase() + comm.slice(1) : "Commodity";
    return {
      title: label || `${formatted} Probability Heatmap`,
      shortTitle: formatted,
      subtitle: "Google AI Canopy Density Heatmap",
      color: "#d97706",
      badge: "AI 10m",
    };
  }
  if (lid.includes("natural_forest") || lid.includes("natural-forest")) {
    return {
      title: "Natural Forests 2020",
      shortTitle: "Natural Forest",
      subtitle: "High-Confidence Primary Forest Baseline",
      color: "#059669",
      badge: "10m FOREST",
    };
  }
  if (lid.includes("forest_typology") || lid.includes("forest-typology")) {
    return {
      title: "Forest Typology 2020",
      shortTitle: "Typology",
      subtitle: "Primary vs Plantation Forest Classification",
      color: "#4f46e5",
      badge: "30m TYPOLOGY",
    };
  }
  if (lid.includes("esa") || lid.includes("worldcover")) {
    return {
      title: "ESA WorldCover 2020",
      shortTitle: "WorldCover",
      subtitle: "11-Class Global Land Cover Baseline",
      color: "#0d9488",
      badge: "10m ESA",
    };
  }
  if (lid.includes("protected")) {
    return {
      title: "Protected Areas",
      shortTitle: "Protected",
      subtitle: "UNEP-WCMC Protected Planet Database",
      color: "#2563eb",
      badge: "WDPA",
    };
  }

  const cleanLabel = label.replace(/_/g, " ");
  return {
    title: cleanLabel,
    shortTitle: cleanLabel.slice(0, 12),
    subtitle: found?.analysisType || "Earth Observation Layer",
    color: "#475569",
    badge: "LAYER",
  };
}

export default function MapSwipeSlider() {
  const {
    compareMode,
    setCompareMode,
    comparePosition,
    setComparePosition,
    compareLeftLayerId,
    compareRightLayerId,
    setCompareLeftLayerId,
    setCompareRightLayerId,
    swapCompareLayers,
    layers,
    eudrPanelOpen,
    setEudrPanelOpen,
    rightPanel,
    setRightPanel,
  } = useStore();

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [savedPanels, setSavedPanels] = useState<{ eudr: boolean; right: "chat" | "layers" | null } | null>(null);
  const [isBarCollapsed, setIsBarCollapsed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftDropdownRef = useRef<HTMLDivElement>(null);
  const rightDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (leftDropdownRef.current && !leftDropdownRef.current.contains(e.target as Node)) {
        setLeftOpen(false);
      }
      if (rightDropdownRef.current && !rightDropdownRef.current.contains(e.target as Node)) {
        setRightOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!compareMode) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (e.key === "Escape") {
        setCompareMode(false);
      } else if (e.key === "ArrowLeft") {
        const step = e.shiftKey ? 10 : 2;
        setComparePosition(Math.max(0, comparePosition - step));
      } else if (e.key === "ArrowRight") {
        const step = e.shiftKey ? 10 : 2;
        setComparePosition(Math.min(100, comparePosition + step));
      } else if (e.key === "s" || e.key === "S") {
        swapCompareLayers();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [compareMode, comparePosition, setComparePosition, setCompareMode, swapCompareLayers]);

  // Determine active effective layer selections
  const { effectiveLeftId, effectiveRightId } = resolveCompareLayerIds(
    layers,
    compareLeftLayerId,
    compareRightLayerId
  );

  const leftInfo = getLayerDisplayInfo(effectiveLeftId, layers);
  const rightInfo = getLayerDisplayInfo(effectiveRightId, layers);

  // Draggable divider handler
  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const handleMove = (moveEvent: PointerEvent) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
        const pct = Math.round((x / rect.width) * 100);
        setComparePosition(pct);
      };
      const handleUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [setComparePosition]
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = Math.round((x / rect.width) * 100);
      setComparePosition(pct);
    },
    [setComparePosition]
  );

  if (!compareMode) return null;

  // Options for Left Layer dropdown
  const leftOptions = [
    ...layers.map((l) => ({ id: l.id, ...getLayerDisplayInfo(l.id, layers) })),
    { id: "basemap", ...getLayerDisplayInfo("basemap", layers) },
  ];

  // Options for Right Layer dropdown
  const rightOptions = [
    { id: "basemap", ...getLayerDisplayInfo("basemap", layers) },
    { id: "all-other", ...getLayerDisplayInfo("all-other", layers) },
    ...layers.map((l) => ({ id: l.id, ...getLayerDisplayInfo(l.id, layers) })),
  ];

  const hasAnyPanelOpen = eudrPanelOpen || rightPanel !== null;

  const toggleMaximizeMap = () => {
    if (savedPanels) {
      setEudrPanelOpen(savedPanels.eudr);
      setRightPanel(savedPanels.right);
      setSavedPanels(null);
    } else {
      setSavedPanels({ eudr: eudrPanelOpen, right: rightPanel });
      setEudrPanelOpen(false);
      setRightPanel(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 pointer-events-none overflow-hidden select-none"
    >
      {/* 1. Responsive & Compact Floating Comparison Deck (Centered at top-3) */}
      {isBarCollapsed ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-[#C8CFD5] shadow-panel rounded-full px-2.5 py-1 text-[11px] animate-in fade-in duration-150">
          <span className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: leftInfo.color }} />
          <span className="text-[10px] font-semibold text-[#1D2227] font-mono">{comparePosition}% Split</span>
          <span className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: rightInfo.color }} />
          <button
            onClick={() => setIsBarCollapsed(false)}
            className="p-1 rounded-full hover:bg-[#E3E7EA] text-[#747F88] hover:text-[#1D2227] transition-all ml-0.5 cursor-pointer"
            title="Expand comparison bar"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (savedPanels) {
                setEudrPanelOpen(savedPanels.eudr);
                setRightPanel(savedPanels.right);
              }
              setCompareMode(false);
            }}
            className="p-1 rounded-full hover:bg-rose-50 text-[#747F88] hover:text-rose-700 transition-all cursor-pointer"
            title="Exit compare mode"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#C8CFD5] shadow-panel rounded-2xl p-1 text-[11px] max-w-[calc(100%-16px)] animate-in fade-in slide-in-from-top-1 duration-150">

        {/* Left Layer Selector Dropdown */}
        <div className="relative" ref={leftDropdownRef}>
          <button
            onClick={() => {
              setLeftOpen(!leftOpen);
              setRightOpen(false);
            }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-left transition-all cursor-pointer border",
              leftOpen
                ? "bg-white border-[#315F50] shadow-xs"
                : "border-transparent hover:bg-[#E3E7EA] text-[#1D2227]"
            )}
            title={`Left View: ${leftInfo.title}`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 shadow-xs"
              style={{ backgroundColor: leftInfo.color }}
            />
            <span className="text-[8.5px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              L
            </span>
            <span className="font-semibold text-[11px] max-w-[80px] sm:max-w-[110px] truncate text-[#1D2227]">
              {leftInfo.shortTitle}
            </span>
            <ChevronDown className={cn("w-3 h-3 text-[#7A8791] transition-transform flex-shrink-0", leftOpen && "rotate-180")} />
          </button>

          {leftOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 sm:w-72 bg-white border border-[#C8CFD5] rounded-xl shadow-panel-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-80 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-mono text-[#747F88] border-b border-[#E3E7EA] mb-1 flex justify-between">
                <span>SELECT LEFT LAYER</span>
                <span>{leftOptions.length} OPTIONS</span>
              </div>
              <div className="space-y-0.5">
                {leftOptions.map((opt) => {
                  const isSelected = opt.id === effectiveLeftId;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setCompareLeftLayerId(opt.id);
                        setLeftOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group",
                        isSelected ? "bg-[#315F50]/10 text-[#315F50]" : "hover:bg-[#E3E7EA] text-[#1D2227]"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold truncate group-hover:text-[#315F50]">
                            {opt.title}
                          </p>
                          <p className="text-[9.5px] text-[#747F88] truncate">{opt.subtitle}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#315F50] flex-shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Swap Button (⇄) */}
        <button
          onClick={swapCompareLayers}
          className="p-1.5 rounded-lg hover:bg-[#E3E7EA] text-[#343B42] hover:text-[#1D2227] transition-all cursor-pointer group active:scale-95 border border-transparent hover:border-[#C8CFD5] flex-shrink-0"
          title="Swap Left and Right layers (Shortcut: S or Space)"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-[#315F50] group-hover:rotate-180 transition-transform duration-200" />
        </button>

        {/* Right Layer Selector Dropdown */}
        <div className="relative" ref={rightDropdownRef}>
          <button
            onClick={() => {
              setRightOpen(!rightOpen);
              setLeftOpen(false);
            }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-left transition-all cursor-pointer border",
              rightOpen
                ? "bg-white border-[#A64B45] shadow-xs"
                : "border-transparent hover:bg-[#E3E7EA] text-[#1D2227]"
            )}
            title={`Right View: ${rightInfo.title}`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 shadow-xs"
              style={{ backgroundColor: rightInfo.color }}
            />
            <span className="text-[8.5px] font-mono font-bold px-1 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200">
              R
            </span>
            <span className="font-semibold text-[11px] max-w-[80px] sm:max-w-[110px] truncate text-[#1D2227]">
              {rightInfo.shortTitle}
            </span>
            <ChevronDown className={cn("w-3 h-3 text-[#7A8791] transition-transform flex-shrink-0", rightOpen && "rotate-180")} />
          </button>

          {rightOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-white border border-[#C8CFD5] rounded-xl shadow-panel-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-80 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-mono text-[#747F88] border-b border-[#E3E7EA] mb-1 flex justify-between">
                <span>SELECT RIGHT LAYER</span>
                <span>{rightOptions.length} OPTIONS</span>
              </div>
              <div className="space-y-0.5">
                {rightOptions.map((opt) => {
                  const isSelected = opt.id === effectiveRightId;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setCompareRightLayerId(opt.id);
                        setRightOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group",
                        isSelected ? "bg-[#A64B45]/10 text-[#A64B45]" : "hover:bg-[#E3E7EA] text-[#1D2227]"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold truncate group-hover:text-[#A64B45]">
                            {opt.title}
                          </p>
                          <p className="text-[9.5px] text-[#747F88] truncate">{opt.subtitle}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#A64B45] flex-shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Maximize / Collapse Side Panels Button (Only appears if panels are open or maximized) */}
        {(hasAnyPanelOpen || savedPanels !== null) && (
          <button
            onClick={toggleMaximizeMap}
            className="p-1.5 rounded-lg hover:bg-[#E3E7EA] text-[#343B42] hover:text-[#1D2227] transition-all cursor-pointer border border-transparent hover:border-[#C8CFD5] flex-shrink-0"
            title={savedPanels ? "Restore Side Panels" : "Maximize Map (Collapse Side Panels)"}
          >
            {savedPanels ? <Minimize2 className="w-3.5 h-3.5 text-[#315F50]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#343B42]" />}
          </button>
        )}

        {/* Collapse comparison bar to pill */}
        <button
          onClick={() => setIsBarCollapsed(true)}
          className="p-1.5 rounded-lg hover:bg-[#E3E7EA] text-[#747F88] hover:text-[#1D2227] transition-all cursor-pointer flex-shrink-0"
          title="Collapse comparison tools to mini pill"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>

        {/* Split Position Quick Presets (Only when panels are not crowding) */}
        {!hasAnyPanelOpen && (
        <div className="hidden lg:flex items-center gap-0.5 bg-[#E3E7EA] p-0.5 rounded-lg text-[9.5px] font-mono flex-shrink-0">
          <button
            onClick={() => setComparePosition(25)}
            className={cn(
              "px-1.5 py-0.5 rounded transition-all cursor-pointer",
              comparePosition === 25 ? "bg-white text-[#1D2227] font-bold shadow-xs" : "text-[#747F88] hover:text-[#1D2227]"
            )}
            title="Snap to 25% split"
          >
            25%
          </button>
          <button
            onClick={() => setComparePosition(50)}
            className={cn(
              "px-1.5 py-0.5 rounded transition-all cursor-pointer",
              comparePosition === 50 ? "bg-white text-[#1D2227] font-bold shadow-xs" : "text-[#747F88] hover:text-[#1D2227]"
            )}
            title="Snap to 50% split (Center)"
          >
            50%
          </button>
          <button
            onClick={() => setComparePosition(75)}
            className={cn(
              "px-1.5 py-0.5 rounded transition-all cursor-pointer",
              comparePosition === 75 ? "bg-white text-[#1D2227] font-bold shadow-xs" : "text-[#747F88] hover:text-[#1D2227]"
            )}
            title="Snap to 75% split"
          >
            75%
          </button>
        </div>
        )}

        {/* Exit Compare Button */}
        <button
          onClick={() => {
            if (savedPanels) {
              setEudrPanelOpen(savedPanels.eudr);
              setRightPanel(savedPanels.right);
            }
            setCompareMode(false);
          }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#1D2227] hover:bg-[#343B42] text-white shadow-xs text-[10.5px] font-semibold cursor-pointer transition-all flex-shrink-0 active:scale-95"
          title="Exit Compare Mode (Esc)"
        >
          <X className="w-3.5 h-3.5 text-white/80" />
          <span>{comparePosition}%</span>
        </button>
      </div>
      )}

      {/* 2. Clickable Vertical Split Line Track */}
      <div
        onClick={handleTrackClick}
        className="absolute top-0 bottom-0 z-30 pointer-events-auto cursor-ew-resize flex justify-center"
        style={{ left: `calc(${comparePosition}% - 14px)`, width: "28px" }}
      >
        <div className="w-[2px] h-full bg-white shadow-[0_0_12px_rgba(0,0,0,0.7)] border-x border-[#315F50]/40 transition-opacity" />
      </div>

      {/* 3. Interactive Draggable Circular Glass Handle with Context Flanks */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-1 cursor-ew-resize select-none",
          isDragging && "scale-105"
        )}
        style={{ left: `${comparePosition}%` }}
        onPointerDown={startDrag}
        title="Drag left or right to swipe compare (Arrow keys or S to swap)"
      >
        {/* Left Layer Context Pill Flank */}
        <div className={cn(
          "hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-[#C8CFD5] shadow-sm text-[9px] font-medium text-[#1D2227] -translate-x-1 transition-all duration-150 pointer-events-none whitespace-nowrap",
          isDragging ? "opacity-100 scale-100" : "opacity-80 group-hover:opacity-100"
        )}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: leftInfo.color }} />
          <span>{leftInfo.shortTitle}</span>
        </div>

        {/* Circular Drag Handle */}
        <div
          className={cn(
            "w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 border-2 border-white shadow-panel-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95",
            isDragging && "ring-2 ring-[#315F50] ring-offset-1"
          )}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#315F50]" />
        </div>

        {/* Right Layer Context Pill Flank */}
        <div className={cn(
          "hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-[#C8CFD5] shadow-sm text-[9px] font-medium text-[#1D2227] translate-x-1 transition-all duration-150 pointer-events-none whitespace-nowrap",
          isDragging ? "opacity-100 scale-100" : "opacity-80 group-hover:opacity-100"
        )}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rightInfo.color }} />
          <span>{rightInfo.shortTitle}</span>
        </div>

        {/* Live Dragging Split Tooltip */}
        {isDragging && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1D2227] text-white text-[9.5px] font-mono px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap">
            {comparePosition}%
          </div>
        )}
      </div>
    </div>
  );
}
