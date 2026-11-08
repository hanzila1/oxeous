"use client";

import { cn } from "@/lib/utils";

interface CloudTelemetryBadgeProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function CloudTelemetryBadge({ style, className }: CloudTelemetryBadgeProps = {}) {
  return (
    <div
      style={style}
      className={cn("absolute top-3 right-3 z-20 pointer-events-auto", className)}
    >
      <div
        className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#C8CFD5] shadow-xs px-3 py-1.5 rounded-full select-none transition-all hover:border-[#315F50]/50 hover:bg-white"
        title="Live Sovereign EU Architecture: Microsoft Foundry LLM (Sweden Central) · EUR-Lex Primary Search (France Central) · Planetary Computer STAC (West Europe)"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#315F50] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#315F50]" />
        </span>
        <span className="text-[10.5px] font-semibold text-[#1D2227] tracking-tight">
          Cloud Telemetry
        </span>
        <span className="text-[9px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.22)] px-1.5 py-0.2 rounded-full">
          3 EU Nodes
        </span>
      </div>
    </div>
  );
}
