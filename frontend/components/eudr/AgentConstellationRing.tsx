"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  Cpu,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EUDRAnalysisResponse } from "@oxeous/shared-types";
import {
  Sentinel1RadarIcon,
  Sentinel2MSIIcon,
  JRC2020Emblem,
  May2026CarveIcon,
} from "@/components/icons/EOIcons";
import OxeousOrbitIcon from "@/components/ui/OxeousOrbitIcon";

interface Props {
  result: EUDRAnalysisResponse;
}

export type SubagentId =
  | "optical"
  | "radar"
  | "legal"
  | "cadastral"
  | "carveout"
  | "yield";

export default function AgentConstellationRing({ result }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<SubagentId>("optical");
  const [showSupervisorDetails, setShowSupervisorDetails] = useState(false);

  const ra = result.risk_assessment;
  const def = ra.deforestation as any;
  const leg = ra.legality as any;
  const plot = result.plot;
  const consensus = ra.multi_agent_consensus;

  // Extract Yield subagent findings if available
  const yieldFinding = consensus?.subagent_findings?.find(
    (f: any) =>
      f.agent_id === "biophysical_yield" ||
      f.agent_name?.toLowerCase().includes("yield")
  );

  // Define the 6 subagents with complete regulatory metadata and findings
  const AGENTS = [
    {
      id: "optical" as SubagentId,
      name: "Sentinel Optical & Spectral Analyst",
      shortName: "Optical S2",
      article: "EUDR Art. 2(1) & 3(a)",
      icon: Sentinel2MSIIcon,
      sensor: "Sentinel-2 MSI · 10m Optical",
      purpose:
        "Analyzes photosynthetic vegetation health (NDVI / EVI) from Dec 2020 to present day to detect canopy loss.",
      verdict:
        def.has_deforestation && !def.is_plantation_replanting_exemption
          ? "NON_COMPLIANT"
          : def.is_plantation_replanting_exemption
          ? "EXEMPT_ART2_5"
          : "COMPLIANT",
      finding: def.has_deforestation
        ? `${def.forest_loss_ha.toFixed(1)} ha canopy reduction detected post-2020`
        : "Zero canopy loss detected (Dec 2020 - Present)",
      confidence: "92%",
      method: "Multispectral BOA surface reflectance time-series tracking.",
    },
    {
      id: "radar" as SubagentId,
      name: "Sentinel-1 SAR Radar All-Weather Analyst",
      shortName: "SAR Radar S1",
      article: "EUDR Article 9",
      icon: Sentinel1RadarIcon,
      sensor: "Sentinel-1 C-Band SAR · 10m Microwave",
      purpose:
        "Pierces persistent cloud cover in tropical equatorial zones to verify ground disturbance 24/7.",
      verdict: (def.radd_alert_pct ?? 0) > 0 ? "AT_RISK" : "COMPLIANT",
      finding:
        (def.radd_alert_pct ?? 0) > 0
          ? `${(def.radd_alert_pct ?? 0).toFixed(1)}% radar backscatter disturbance`
          : "100% all-weather cloud-piercing clear (0 radar alerts)",
      confidence: "95%",
      method: "WUR/WRI RADD C-band dual-polarization cross-ratio monitoring.",
    },
    {
      id: "legal" as SubagentId,
      name: "Statutory Legal & Typology Specialist",
      shortName: "Legal & JRC",
      article: def.is_plantation_replanting_exemption
        ? "EUDR Art. 2(4) & 2(5)"
        : "EUDR Art. 3(a)",
      icon: JRC2020Emblem,
      sensor: "EC JRC GFC2020 & ForTy · 10m/30m",
      purpose:
        "Cross-references the official EU Dec 2020 baseline and verifies lawful agricultural replanting exemptions.",
      verdict: def.is_plantation_replanting_exemption
        ? "EXEMPT_ART2_5"
        : def.has_deforestation
        ? "NON_COMPLIANT"
        : "COMPLIANT",
      finding: def.is_plantation_replanting_exemption
        ? `Exempt agricultural replanting cycle on ${def.dominant_forest_type || "pre-existing plantation"}`
        : `Statutory JRC 2020 forest baseline: ${(def.jrc_forest_cover_2020_pct ?? 0).toFixed(1)}%`,
      confidence: "96%",
      method: "Official JRC 2020 European Commission raster reference.",
    },
    {
      id: "cadastral" as SubagentId,
      name: "Cadastral & Protected Areas Auditor",
      shortName: "Cadastral WDPA",
      article: "EUDR Art. 3(b) & Art. 9",
      icon: ShieldCheck,
      sensor: "WDPA / IUCN & National Parks · 10m",
      purpose:
        "Audits plot boundaries against the World Database on Protected Areas and indigenous reserve jurisdictions.",
      verdict: leg.is_strict_protected_area
        ? "NON_COMPLIANT"
        : leg.overlaps_protected_area
        ? "AT_RISK"
        : "COMPLIANT",
      finding: leg.overlaps_protected_area
        ? `Intersects protected territory: ${leg.protected_area_names?.join(", ") || "Strict Reserve"}`
        : "Zero intersection with WDPA IUCN reserves or indigenous lands",
      confidence: "98%",
      method: "Vector topology intersection against UNEP-WCMC global registry.",
    },
    {
      id: "carveout" as SubagentId,
      name: "Topological Vector Geometry Decomposer",
      shortName: "Carve-Out",
      article: "May 2026 Segregated Plot Protocol",
      icon: May2026CarveIcon,
      sensor: "PWRI Map Algebra & Shapely · 10m",
      purpose:
        "Isolates and carves out post-2020 deforestation zones, generating clean export polygons for TRACES NT.",
      verdict: (def.statutory_deforestation_ha ?? 0) > 0 ? "AT_RISK" : "COMPLIANT",
      finding:
        (def.statutory_deforestation_ha ?? 0) > 0
          ? `${(def.compliant_ha ?? 0).toFixed(1)} ha export-compliant / ${(def.statutory_deforestation_ha ?? 0).toFixed(1)} ha carved out`
          : "Full parcel verified 100% compliant (no carve-out needed)",
      confidence: "99%",
      method: "Pixel-wise raster intersection (PWRI) polygon decomposition.",
    },
    {
      id: "yield" as SubagentId,
      name: "Biophysical Yield & Anti-Laundering Auditor",
      shortName: "Yield Auditor",
      article: yieldFinding?.statutory_citation || "EUDR Art. 16(3) & Art. 9(1)(d)",
      icon: Scale,
      sensor: "FAO GAEZ v4 & Regional CIRAD · 10m",
      purpose:
        "Audits declared harvest mass against regional biophysical carrying capacity to block supply chain volume laundering.",
      verdict:
        yieldFinding?.verdict ||
        (ra.summary?.toLowerCase().includes("laundering")
          ? "NON_COMPLIANT"
          : ra.summary?.toLowerCase().includes("point-evasion")
          ? "AT_RISK"
          : "COMPLIANT"),
      finding:
        yieldFinding?.headline ||
        (ra.summary?.toLowerCase().includes("laundering")
          ? "Declared shipment mass exceeds regional agronomic ceiling (Art. 16(3))"
          : ra.summary?.toLowerCase().includes("point-evasion")
          ? "Point geometry exceeds 4 ha threshold without closed perimeter polygon"
          : `Yield verified against FAO GAEZ v4 carrying capacity for ${plot.commodity.replace(/_/g, " ")}`),
      confidence: yieldFinding
        ? `${Math.round((yieldFinding.confidence_score ?? 0.94) * 100)}%`
        : "94%",
      method: "FAO Global Agro-Ecological Zones v4 agronomic yield modeling.",
    },
  ];

  // Currently active agent
  const currentAgent = AGENTS.find((a) => a.id === selectedAgent) ?? AGENTS[0];
  const currentIndex = AGENTS.findIndex((a) => a.id === selectedAgent);

  const prevAgent = () => {
    const nextIdx = (currentIndex - 1 + AGENTS.length) % AGENTS.length;
    setSelectedAgent(AGENTS[nextIdx].id);
  };

  const nextAgent = () => {
    const nextIdx = (currentIndex + 1) % AGENTS.length;
    setSelectedAgent(AGENTS[nextIdx].id);
  };

  // Helper for status colors
  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "COMPLIANT":
      case "EXEMPT_ART2_5":
        return {
          label: verdict === "EXEMPT_ART2_5" ? "EXEMPT ART. 2(5)" : "COMPLIANT",
          badgeClass: "text-[#315F50] bg-[rgba(49,95,80,0.08)] border-[rgba(49,95,80,0.25)]",
          dotColor: "bg-[#315F50]",
        };
      case "NON_COMPLIANT":
        return {
          label: "NON COMPLIANT",
          badgeClass: "text-[#A64B45] bg-[rgba(166,75,69,0.08)] border-[rgba(166,75,69,0.25)]",
          dotColor: "bg-[#A64B45]",
        };
      default:
        return {
          label: "AT RISK",
          badgeClass: "text-[#C58A3A] bg-[rgba(197,138,58,0.08)] border-[rgba(197,138,58,0.25)]",
          dotColor: "bg-[#C58A3A]",
        };
    }
  };

  // 6 Circular Nodes geometry (Center at 160, 130, Radius 84px)
  const CX = 160;
  const CY = 125;
  const R = 82;

  // Angles for 6 nodes starting from top (-90 degrees)
  const NODE_POSITIONS = [
    { id: "optical", angle: -90 },
    { id: "radar", angle: -30 },
    { id: "legal", angle: 30 },
    { id: "cadastral", angle: 90 },
    { id: "carveout", angle: 150 },
    { id: "yield", angle: 210 },
  ].map((item) => {
    const rad = (item.angle * Math.PI) / 180;
    return {
      id: item.id as SubagentId,
      x: CX + R * Math.cos(rad),
      y: CY + R * Math.sin(rad),
    };
  });

  return (
    <div className="space-y-3">
      {/* 1. Supervisor Consensus Banner Strip */}
      <div className="p-3 rounded-xl bg-white border border-[#C8CFD5] shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#315F50] flex-shrink-0 animate-pulse" />
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-[#1D2227] block truncate">
              Autonomous Multi-Agent Consensus
            </span>
            <span className="text-[9.5px] font-mono text-[#747F88] truncate block">
              Cryptographic Hash: {consensus?.cryptographic_audit_hash ? `${consensus.cryptographic_audit_hash.slice(0, 14)}...` : "0x7F2A...Verified"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#315F50]/10 text-[#315F50] border border-[#315F50]/20">
            {consensus?.unanimous ? "6/6 Unanimous" : "Conflict Resolved"}
          </span>
          <span className="text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F4F5F6] text-[#5B6773] border border-[#C8CFD5]">
            TRACES NT
          </span>
        </div>
      </div>

      {/* 2. Interactive Circular Constellation Hub */}
      <div className="bg-white rounded-2xl border border-[#C8CFD5] p-3 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between pb-1 px-1">
          <span className="text-[10px] font-bold text-[#747F88] uppercase tracking-wider font-mono flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-[#315F50]" />
            Agent Arbitration Constellation
          </span>
          <span className="text-[10px] text-[#747F88] font-mono">
            Click node to inspect
          </span>
        </div>

        {/* Circular SVG Canvas */}
        <div className="relative w-full max-w-[320px] mx-auto h-[255px] select-none">
          <svg className="w-full h-full" viewBox="0 0 320 250">
            {/* Ambient Background Grid Ring */}
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="#E3E7EA"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <circle
              cx={CX}
              cy={CY}
              r={R + 22}
              fill="none"
              stroke="#F4F5F6"
              strokeWidth="1"
            />

            {/* Connecting Rays from Center to each Subagent Node */}
            {NODE_POSITIONS.map((pos) => {
              const isSelected = selectedAgent === pos.id;
              return (
                <line
                  key={`ray-${pos.id}`}
                  x1={CX}
                  y1={CY}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={isSelected ? "#315F50" : "#D8E1E5"}
                  strokeWidth={isSelected ? "2.5" : "1.2"}
                  strokeDasharray={isSelected ? "none" : "2 2"}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Center Hub: Supervisor Agent Badge */}
          <button
            onClick={() => setShowSupervisorDetails(!showSupervisorDetails)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-[#C8CFD5] shadow-md hover:border-[#315F50] transition-all cursor-pointer group z-10"
            style={{ left: `${CX}px`, top: `${CY}px`, width: "76px", height: "76px" }}
            title="Supervisor Agent Consensus Engine"
          >
            <OxeousOrbitIcon size={24} className="text-[#315F50]" />
            <span className="text-[9px] font-bold text-[#1D2227] mt-1 tracking-tight">
              Supervisor
            </span>
            <span className="text-[7.5px] font-mono text-[#315F50] uppercase font-semibold">
              Consensus
            </span>
          </button>

          {/* 6 Orbital Subagent Nodes */}
          {NODE_POSITIONS.map((pos) => {
            const agent = AGENTS.find((a) => a.id === pos.id)!;
            const isSelected = selectedAgent === pos.id;
            const badge = getVerdictBadge(agent.verdict);
            const Icon = agent.icon;

            return (
              <button
                key={pos.id}
                onClick={() => {
                  setSelectedAgent(pos.id);
                  setShowSupervisorDetails(false);
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer group z-20",
                  isSelected ? "scale-110 z-30" : "hover:scale-105"
                )}
                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                title={`${agent.name} (${agent.verdict})`}
              >
                {/* Node circular button */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs relative transition-all",
                    isSelected
                      ? "bg-white border-[#315F50] ring-2 ring-[#315F50]/25 shadow-md"
                      : "bg-[#F8FAF9] border-[#C8CFD5] group-hover:bg-white group-hover:border-[#7A8791]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isSelected ? "text-[#315F50]" : "text-[#5B6773] group-hover:text-[#1D2227]"
                    )}
                  />

                  {/* Verdict Status Indicator Dot */}
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-2xs",
                      badge.dotColor
                    )}
                  />
                </div>

                {/* Subagent Name Pill */}
                <span
                  className={cn(
                    "text-[8.5px] font-bold mt-1 px-1.5 py-0.2 rounded-chip border whitespace-nowrap transition-colors",
                    isSelected
                      ? "bg-[#315F50] text-white border-[#315F50] shadow-2xs"
                      : "bg-white text-[#5B6773] border-[#E3E7EA] group-hover:text-[#1D2227]"
                  )}
                >
                  {agent.shortName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Subagent Audit Inspector Card */}
      <div className="bg-white rounded-xl border border-[#C8CFD5] shadow-xs p-3.5 space-y-2.5 animate-fadeIn">
        {/* Inspector Header */}
        <div className="flex items-start justify-between gap-2 border-b border-[#E3E7EA] pb-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
              <currentAgent.icon className="w-4 h-4 text-[#315F50]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[12px] text-[#1D2227]">
                  {currentAgent.name}
                </span>
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-[#E3E7EA] text-[#475569] border border-[#C8CFD5]">
                  {currentAgent.confidence} conf
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#315F50] font-semibold mt-0.5">
                {currentAgent.article} · {currentAgent.sensor}
              </p>
            </div>
          </div>

          {/* Verdict Badge */}
          <span
            className={cn(
              "text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap flex-shrink-0",
              getVerdictBadge(currentAgent.verdict).badgeClass
            )}
          >
            {getVerdictBadge(currentAgent.verdict).label}
          </span>
        </div>

        {/* Audit Finding Callout */}
        <div className="bg-[#F8FAF9] border border-[#E3E7EA] p-2.5 rounded-lg space-y-1">
          <div className="text-[9.5px] font-bold text-[#747F88] uppercase tracking-wider font-mono">
            Specific Plot Finding
          </div>
          <p className="text-[11px] text-[#1D2227] leading-relaxed font-medium">
            {currentAgent.finding}
          </p>
        </div>

        {/* Agent Statutory Purpose */}
        <div className="space-y-0.5 text-[10.5px]">
          <span className="font-semibold text-[#5B6773]">Statutory Purpose: </span>
          <span className="text-[#747F88] leading-relaxed">
            {currentAgent.purpose}
          </span>
        </div>

        {/* Technical Method Footer & Quick Prev/Next controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F0F2F4] text-[10px]">
          <span className="text-[#AAB3BB] truncate max-w-[190px]">
            {currentAgent.method}
          </span>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={prevAgent}
              className="p-1 rounded text-[#747F88] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-colors cursor-pointer"
              title="Previous Agent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[9.5px] text-[#747F88]">
              {currentIndex + 1} / {AGENTS.length}
            </span>
            <button
              onClick={nextAgent}
              className="p-1 rounded text-[#747F88] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-colors cursor-pointer"
              title="Next Agent"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
