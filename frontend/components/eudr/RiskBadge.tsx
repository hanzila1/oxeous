"use client";

import { cn } from "@/lib/utils";
import type { EUDRRiskLevel } from "@oxeous/shared-types";

const CONFIG: Record<EUDRRiskLevel, { label: string; cls: string }> = {
  compliant:         { label: "Compliant",        cls: "risk-compliant" },
  low_risk:          { label: "Low Risk",          cls: "risk-low" },
  at_risk:           { label: "At Risk",           cls: "risk-at-risk" },
  non_compliant:     { label: "Non-Compliant",     cls: "risk-non-compliant" },
  insufficient_data: { label: "Insufficient Data", cls: "risk-no-data" },
};

const ICON: Record<EUDRRiskLevel, string> = {
  compliant: "✓", low_risk: "↓", at_risk: "!", non_compliant: "✗", insufficient_data: "?",
};

export default function RiskBadge({
  risk, score, size = "md",
}: {
  risk: EUDRRiskLevel;
  score?: number;
  size?: "sm" | "md";
}) {
  const cfg = CONFIG[risk];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-chip border font-semibold",
      size === "sm" ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1",
      cfg.cls,
    )}>
      <span className="font-bold">{ICON[risk]}</span>
      {cfg.label}
      {score !== undefined && <span className="opacity-60 font-normal text-[9px]">({score.toFixed(0)})</span>}
    </span>
  );
}
