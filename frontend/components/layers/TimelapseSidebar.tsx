"use client";

import { X } from "lucide-react";
import { SentinelTimelapseIcon } from "@/components/icons/EOIcons";
import { useStore } from "@/lib/store";
import SentinelTimelapsePlayer from "@/components/eudr/SentinelTimelapsePlayer";
import { cn } from "@/lib/utils";

export default function TimelapseSidebar({ onClose }: { onClose?: () => void }) {
  const { ddsHistory, basemapMode, setBasemapMode } = useStore();
  const latestResult = ddsHistory[0] ?? null;

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0 bg-white shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(49,95,80,0.12)] border border-[rgba(49,95,80,0.25)] flex items-center justify-center">
            <SentinelTimelapseIcon className="w-5 h-5 text-[#315F50]" />
          </div>
          <h2 className="text-[13px] font-bold text-[#1D2227] flex items-center gap-2">
            <span>Plot Timelapse</span>
            <span className="text-[9.5px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-2 py-0.5 rounded-chip">
              2020–2025
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Satellite / White Basemap Toggle */}
          <div className="flex items-center bg-[#F4F5F6] p-0.5 rounded-lg border border-[#C8CFD5] text-[10px]">
            <button
              type="button"
              onClick={() => setBasemapMode("satellite")}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer",
                basemapMode === "satellite"
                  ? "bg-white text-[#1D2227] shadow-2xs font-bold"
                  : "text-[#747F88] hover:text-[#1D2227]"
              )}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setBasemapMode("light")}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer",
                basemapMode === "light"
                  ? "bg-white text-[#315F50] shadow-2xs font-bold"
                  : "text-[#747F88] hover:text-[#1D2227]"
              )}
            >
              White Map
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#747F88] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-colors cursor-pointer"
              title="Close Timelapse Panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        <SentinelTimelapsePlayer result={latestResult} />
      </div>
    </div>
  );
}
