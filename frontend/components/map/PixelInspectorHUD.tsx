"use client";

import { useState, useEffect } from "react";
import { X, Eye } from "lucide-react";
import {
  PixelInspectorIcon,
  JRC2020Emblem,
  CanopyLossIcon,
  ExemptLeafIcon,
  ViolationIcon,
  VerifiedIcon,
} from "@/components/icons/EOIcons";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { EUDRAnalysisResponse } from "@oxeous/shared-types";

function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function PixelInspectorHUD() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { activeGeoJSON, ddsHistory, pixelInspectorOpen, setPixelInspectorOpen } = useStore();
  const activeRes: EUDRAnalysisResponse | undefined = ddsHistory[0];

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const mapCanvas = document.querySelector(".maplibregl-canvas");
      if (!mapCanvas) return;
      const rect = mapCanvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const win = window as any;
        if (win.oxeousCurrentCoords) {
          setCoords(win.oxeousCurrentCoords);
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  if (!pixelInspectorOpen) {
    return null;
  }

  // Determine if coordinate is inside plot
  let isInside = false;
  if (coords && activeGeoJSON) {
    try {
      const geom = activeGeoJSON as any;
      if (geom.type === "Polygon" && geom.coordinates?.[0]) {
        isInside = isPointInPolygon([coords.lng, coords.lat], geom.coordinates[0]);
      } else if (geom.type === "MultiPolygon" && geom.coordinates) {
        isInside = geom.coordinates.some(
          (poly: any) => poly[0] && isPointInPolygon([coords.lng, coords.lat], poly[0])
        );
      }
    } catch {
      isInside = false;
    }
  }

  const def = activeRes?.risk_assessment?.deforestation as any;
  const isExempt = def?.is_plantation_replantation_exemption;
  const isSilviculture = def?.is_silviculture_exemption || (activeRes?.plot?.commodity === "wood" && (isExempt || def?.silviculture_replanting_ha > 0));
  const hasLoss = def?.has_deforestation;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-1.5 w-80 animate-fadeIn select-none">
      <div className="glass-strong text-[#1D2227] rounded-2xl p-3.5 shadow-panel-lg font-mono text-[10.5px] space-y-2 border border-white/80">
        {/* HUD Header */}
        <div className="flex items-center justify-between border-b border-[#E3E7EA] pb-1.5">
          <div className="flex items-center gap-1.5 text-[#315F50] font-bold">
            <PixelInspectorIcon className="w-3.5 h-3.5 text-[#315F50]" />
            <span>SPATIAL PIXEL INSPECTOR</span>
          </div>
          <button
            onClick={() => setPixelInspectorOpen(false)}
            className="p-1 rounded text-[#7A8791] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GPS Coordinates */}
        <div className="flex items-center justify-between text-[#343B42]">
          <span className="text-[#747F88]">COORDINATES:</span>
          <span className="font-bold text-[#1D2227]">
            {coords ? `${coords.lat.toFixed(5)}°N, ${coords.lng.toFixed(5)}°W` : "Hover over map for coordinates"}
          </span>
        </div>

        {/* Active Polygon Status - PWRI-3D Tri-Axial Inspector */}
        {activeRes && isInside ? (
          <div className="space-y-2 pt-1 border-t border-[#E3E7EA]">
            <div className="flex items-center justify-between">
              <span className="text-[#747F88]">PLOT BOUNDARY:</span>
              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-[rgba(49,95,80,0.1)] text-[#315F50] border border-[rgba(49,95,80,0.25)]">
                WITHIN SOURCING PLOT
              </span>
            </div>

            {/* DIMENSION 1: SPATIAL / MULTI-SENSOR */}
            <div className="pt-1.5 border-t border-[#E3E7EA] space-y-1">
              <div className="text-[9px] font-bold text-[#6D28D9] tracking-wider flex items-center justify-between">
                <span>DIM 1: SPATIAL / SENSORS (10M)</span>
                <span className="text-[8.5px] font-normal text-slate-500">JRC · S2 · SAR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#747F88]">EC JRC GFC2020:</span>
                <span className="font-semibold text-[#1D2227]">
                  {def?.jrc_forest_cover_2020_pct && def.jrc_forest_cover_2020_pct > 0
                    ? `${def.jrc_forest_cover_2020_pct.toFixed(1)}% Forest`
                    : "Non-Forest / Agricultural"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#747F88]">S2 NATURE TRACE:</span>
                <span className="font-semibold text-[#1D2227]">
                  {def?.natural_forest_pct ? `${def.natural_forest_pct.toFixed(1)}% Natural` : "0.0% Standing Forest"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#747F88]">S1 RADD SAR RADAR:</span>
                <span className={cn("font-semibold", def?.radd_alert_pct > 0 ? "text-[#D93C4A]" : "text-[#2E9E6F]")}>
                  {def?.radd_alert_pct > 0 ? `${def.radd_alert_pct.toFixed(1)}% Radar Disturbance` : "Cloud-Piercing Clear ✓"}
                </span>
              </div>
            </div>

            {/* DIMENSION 2: TEMPORAL TRAJECTORY */}
            <div className="pt-1.5 border-t border-[#E3E7EA] space-y-1">
              <div className="text-[9px] font-bold text-[#0D9488] tracking-wider flex items-center justify-between">
                <span>DIM 2: TEMPORAL TRAJECTORY</span>
                <span className="text-[8.5px] font-normal text-slate-500">T₀ ➔ T_cut ➔ T_curr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#747F88]">T₀ (2000 BASELINE):</span>
                <span className="font-semibold text-[#1D2227]">{def?.forest_cover_2000_pct ? def.forest_cover_2000_pct.toFixed(1) : "0.0"}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#747F88]">T_CUTOFF (DEC 2020):</span>
                <span className="font-semibold text-[#1D2227]">{def?.forest_cover_2020_pct ? def.forest_cover_2020_pct.toFixed(1) : "0.0"}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#747F88]">T_CURRENT (2021–25):</span>
                <span className={cn("font-semibold", hasLoss ? "text-[#D93C4A]" : "text-[#2E9E6F]")}>
                  {hasLoss ? `${def?.forest_loss_pct?.toFixed(2) || "0"}% Disturbance` : "Zero Loss (Compliant ✓)"}
                </span>
              </div>
            </div>

            {/* DIMENSION 3: STATUTORY LEGAL ONTOLOGY */}
            <div className="pt-1.5 border-t border-[#E3E7EA] space-y-1">
              <div className="text-[9px] font-bold text-[#B45309] tracking-wider flex items-center justify-between">
                <span>DIM 3: STATUTORY ONTOLOGY</span>
                <span className="text-[8.5px] font-normal text-slate-500">PWRI-3D 4-Class</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#747F88]">LEGAL CLASS:</span>
                <span
                  className={cn(
                    "font-bold text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1",
                    isSilviculture
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : isExempt
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : hasLoss
                      ? "bg-red-50 text-red-700 border-red-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-300"
                  )}
                >
                  {isSilviculture ? "Art. 2(3) SILVICULTURE" :
                   isExempt ? "Art. 2(5) REPLANTING" :
                   hasLoss ? "Art. 3(a) VIOLATION" :
                   "TRACES NT CLEARED"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#747F88]">FAO MMU SIEVE:</span>
                <span className="font-semibold text-[#1D2227]">
                  {def?.mmu_filtered_loss_ha ? `≥0.5 ha (${def.mmu_filtered_loss_ha.toFixed(2)} ha)` : "Pass (<0.5 ha Speckle Filtered)"}
                </span>
              </div>
              {def?.carveout_eligible_ha > 0 && (
                <div className="flex items-center justify-between text-[9px] text-[#047857] bg-emerald-50/80 px-1 py-0.5 rounded border border-emerald-200">
                  <span className="font-bold">CARVE-OUT:</span>
                  <span className="font-mono">P_export = P_declared \ V_3(a)</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-[#747F88] pt-1 border-t border-[#E3E7EA]">
            {activeRes ? "Hover over the yellow parcel for pixel-level statutory classification." : "Run an EUDR assessment to inspect satellite pixels."}
          </div>
        )}
      </div>
    </div>
  );
}
