"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentLogEntry } from "@/lib/store";
import OxeousOrbitIcon from "@/components/ui/OxeousOrbitIcon";

interface Props {
  logs: AgentLogEntry[];
}

export default function AgentTelemetryStepper({ logs }: Props) {
  const displayLogs: AgentLogEntry[] =
    logs.length > 0
      ? logs
      : [
          {
            id: "init",
            label: "Plot Geometry & RFC 7946 Topology",
            detail: "Initializing autonomous spatial agent pipeline...",
            status: "active",
          },
        ];

  const doneCount = displayLogs.filter((l) => l.status === "done").length;
  const activeIdx = displayLogs.findIndex((l) => l.status === "active");
  const currentStageNum =
    activeIdx >= 0
      ? activeIdx + 1
      : doneCount === displayLogs.length
      ? displayLogs.length
      : Math.min(doneCount + 1, displayLogs.length);

  const progressPct = Math.min(
    100,
    Math.round(
      ((doneCount + (activeIdx >= 0 ? 0.5 : 0)) / Math.max(1, displayLogs.length)) * 100
    )
  );

  return (
    <div className="w-full max-w-full rounded-2xl border border-[#C8CFD5] bg-white p-3.5 shadow-sm space-y-2.5 animate-fade-in overflow-hidden select-none">
      {/* Unified Header with Spinning Orbit Icon & Stage Counter */}
      <div className="space-y-2 border-b border-[#E3E7EA] pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#315F50]/10 border border-[#315F50]/25 flex items-center justify-center flex-shrink-0">
              <OxeousOrbitIcon size={17} isSpinning={true} className="text-[#315F50]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold tracking-tight text-[#1D2227] truncate">
                Autonomous Spatial Pipeline
              </div>
              <div className="text-[9px] text-[#747F88] font-mono truncate">
                Multi-Sensor & Statutory Verification
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#315F50]/10 border border-[#315F50]/25 text-[#315F50] font-mono text-[9px] font-bold flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#315F50] animate-ping" />
            <span>
              STAGE {currentStageNum}/{displayLogs.length}
            </span>
          </div>
        </div>

        {/* Continuous Pipeline Progress Bar */}
        <div className="h-1 w-full bg-[#E3E7EA] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#315F50] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Connected 6-Node Stepper with Vertical Dotted Lines */}
      <div className="space-y-0 relative w-full pt-0.5">
        {displayLogs.map((stage, idx) => {
          const isDone = stage.status === "done";
          const isActive = stage.status === "active";
          const isPending = !isDone && !isActive;
          const isLast = idx === displayLogs.length - 1;

          return (
            <div
              key={stage.id}
              className="relative flex items-stretch gap-2.5 w-full transition-all duration-300"
            >
              {/* Left Column: Node Dot & Vertical Dotted Connector Line */}
              <div className="relative flex flex-col items-center flex-shrink-0 w-4 pt-1">
                {/* Node Dot */}
                <div
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 z-10 flex-shrink-0",
                    isDone
                      ? "bg-[#315F50] text-white shadow-2xs"
                      : isActive
                      ? "bg-[#315F50] ring-4 ring-[#315F50]/20 text-white scale-105"
                      : "border border-[#C8CFD5] bg-[#F4F5F6]"
                  )}
                >
                  {isDone ? (
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  ) : isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8CFD5]" />
                  )}
                </div>

                {/* Vertical Dotted Connector Line to Next Dot */}
                {!isLast && (
                  <div
                    className={cn(
                      "relative w-0 flex-1 my-0.5 min-h-[14px] border-r-2 border-dotted overflow-visible transition-colors duration-300",
                      isDone
                        ? "border-[#315F50]/65"
                        : isActive
                        ? "border-[#315F50]/45"
                        : "border-[#C8CFD5]"
                    )}
                  >
                    {/* Animated Traveling Signal Pulse Dot */}
                    {(isDone || isActive) && (
                      <span className="absolute -left-[3px] w-1.5 h-1.5 rounded-full bg-[#315F50] shadow-2xs pointer-events-none animate-pulse-travel" />
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Stage Row */}
              <div
                className={cn(
                  "flex-1 min-w-0 rounded-lg px-2 py-1 mb-1 transition-all duration-300",
                  isActive
                    ? "bg-[#F2F7F5] border border-[#315F50]/25 shadow-2xs"
                    : "border border-transparent"
                )}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={cn(
                      "text-[10.5px] truncate transition-colors",
                      isActive
                        ? "font-bold text-[#1D2227]"
                        : isDone
                        ? "font-semibold text-[#343B42]"
                        : "font-medium text-[#9AA6B2]"
                    )}
                  >
                    {stage.label}
                  </span>

                  {isActive ? (
                    <span className="px-1.5 py-0.2 rounded text-[7.5px] font-mono font-bold bg-[#315F50] text-white animate-pulse flex-shrink-0">
                      ACTIVE
                    </span>
                  ) : isDone ? (
                    <span className="text-[8px] font-mono font-bold text-[#315F50] flex-shrink-0">
                      ✓ OK
                    </span>
                  ) : (
                    <span className="text-[7.5px] font-mono text-[#AAB3BB] flex-shrink-0">
                      WAIT
                    </span>
                  )}
                </div>

                {/* Detail Message: Shown for Active and Done stages; hidden for Pending to keep compact */}
                {!isPending && stage.detail && (
                  <p
                    className={cn(
                      "text-[9.5px] leading-snug break-words transition-all duration-200 mt-0.5 font-mono",
                      isActive
                        ? "text-[#315F50] font-medium animate-fade-in"
                        : "text-[#64748B]"
                    )}
                  >
                    {stage.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
