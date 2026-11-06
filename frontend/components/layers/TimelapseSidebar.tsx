"use client";

import { X } from "lucide-react";
import {
  SentinelTimelapseIcon,
  BenchmarkFlagIcon,
  DrawParcelIcon,
  JRC2020Emblem,
  May2026CarveIcon,
  Sentinel2MSIIcon,
} from "@/components/icons/EOIcons";
import { useStore } from "@/lib/store";
import SentinelTimelapsePlayer from "@/components/eudr/SentinelTimelapsePlayer";
import { BENCHMARK_CASES, type BenchmarkCase } from "@/components/ui/TopFloatingBar";
import { cn } from "@/lib/utils";

export default function TimelapseSidebar({ onClose }: { onClose?: () => void }) {
  const { activeGeoJSON, setActiveGeoJSON, ddsHistory, setDrawingAOI } = useStore();
  const latestResult = ddsHistory[0] ?? null;
  const hasPlot = Boolean(latestResult?.plot?.geometry || activeGeoJSON);

  const handleSelectBenchmark = (c: BenchmarkCase) => {
    setActiveGeoJSON(c.geometry);
    const fn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
    fn?.(c.bbox);
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0 bg-white shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(49,95,80,0.12)] border border-[rgba(49,95,80,0.25)] flex items-center justify-center">
            <SentinelTimelapseIcon className="w-5 h-5 text-[#315F50]" />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-[#1D2227] flex items-center gap-2">
              <span>10m Sentinel-2 Timelapse</span>
              <span className="text-[9.5px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-2 py-0.5 rounded-chip">
                2020–2025
              </span>
            </h2>
            <p className="text-[10.5px] text-[#747F88]">
              Multi-temporal plot verification & year-by-year red loss pinpoint
            </p>
          </div>
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
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
        {/* Main Timelapse Player */}
        <SentinelTimelapsePlayer result={latestResult} />

        {/* Statutory Visual Verification Guide */}
        <div className="bg-white rounded-xl border border-[#C8CFD5] p-3.5 shadow-2xs space-y-2.5">
          <div className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-[#747F88]">
            How to Read the 10m Plot Timelapse
          </div>
          <div className="space-y-2 text-[11px] text-[#5B6773]">
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#F8FAF9] border border-[#E3E7EA]">
              <JRC2020Emblem className="w-4 h-4 text-[#C58A3A] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#1D2227]">2020 Statutory Cutoff Frame:</strong> Any land already cleared into tan/brown agriculture in the 2020 frame is pre-cutoff farmland (100% legal under EUDR Art. 2(1) & 3(a)).
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#F8FAF9] border border-[#E3E7EA]">
              <May2026CarveIcon className="w-4 h-4 text-[#A64B45] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#1D2227]">2021–2025 Red Loss Pinpoint:</strong> Dark-green standing forest in 2020 that turns into cleared brown soil in 2021–2025 is post-cutoff deforestation and lights up in <strong className="text-[#A64B45]">Red</strong> in the exact year it was cut.
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#F8FAF9] border border-[#E3E7EA]">
              <Sentinel2MSIIcon className="w-4 h-4 text-[#315F50] flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#1D2227]">NIR Canopy (B8) Mode:</strong> Switch to NIR False-Color to make healthy tree canopy glow bright crimson while newly cleared bare soil turns cyan.
              </div>
            </div>
          </div>
        </div>

        {/* Quick Benchmark Plot Switcher (Always handy if user wants to test another plot's timelapse) */}
        <div className="bg-white rounded-xl border border-[#C8CFD5] p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-[#747F88]">
              {hasPlot ? "Switch Plot for Timelapse" : "Select a Plot to Start Timelapse"}
            </span>
            <button
              type="button"
              onClick={() => setDrawingAOI(true)}
              className="flex items-center gap-1 text-[10px] font-semibold text-[#315F50] hover:underline cursor-pointer"
            >
              <DrawParcelIcon className="w-3.5 h-3.5" />
              <span>Draw Custom AOI</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {BENCHMARK_CASES.map((c) => {
              const isCompliant = c.verdict.startsWith("COMPLIANT");
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectBenchmark(c)}
                  className="w-full flex items-center justify-between gap-2 p-2 rounded-lg border border-[#E3E7EA] bg-[#F8FAF9] hover:bg-white hover:border-[#C8CFD5] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border",
                        isCompliant
                          ? "bg-[rgba(49,95,80,0.1)] border-[rgba(49,95,80,0.25)] text-[#315F50]"
                          : "bg-[rgba(166,75,69,0.1)] border-[rgba(166,75,69,0.25)] text-[#A64B45]"
                      )}
                    >
                      <BenchmarkFlagIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-[#1D2227] group-hover:text-[#315F50] truncate">
                        {c.label}
                      </div>
                      <div className="text-[9.5px] font-mono text-[#747F88] truncate">
                        {c.country} · {c.verdict}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-[#315F50] flex-shrink-0">
                    Load →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
