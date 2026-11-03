"use client";

import { useEffect } from "react";
import { X, Download, ShieldCheck, FileSpreadsheet, Sparkles, Maximize2 } from "lucide-react";
import type { EUDRAnalysisResponse } from "@oxeous/shared-types";
import SpatialAnalyticsDeck from "./SpatialAnalyticsDeck";

interface Props {
  result: EUDRAnalysisResponse;
  onClose: () => void;
}

export default function AnalyticsDeckModal({ result, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#315F50] text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Interactive Spatial Analytics & Chart Deck
                <span className="text-[10px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.25)] px-1.5 py-0.2 rounded">
                  May 2026 Ready
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                PWRI-3D Multi-Sensor Raster Consensus · {result.plot.commodity.toUpperCase()} · {result.plot.country_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors"
              title="Close Deck"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
          <SpatialAnalyticsDeck result={result} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-[11px] flex-shrink-0">
          <span className="text-slate-500 font-mono">
            Oxeous Earth Observation Analytics Engine · EU 2023/1115
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#C8CFD5] bg-white text-[#1D2227] font-semibold hover:bg-[#F4F5F6] transition-colors shadow-2xs cursor-pointer"
          >
            Close Deck
          </button>
        </div>
      </div>
    </div>
  );
}
