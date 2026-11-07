"use client";

import { useState, useEffect } from "react";
import { Server, ShieldCheck, ChevronDown, ChevronUp, Cpu, Database, Satellite, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloudNode {
  name: string;
  status: string;
  region: string;
  metric: string;
  role: string;
}

export default function CloudTelemetryBadge() {
  const [open, setOpen] = useState(false);
  const [nodes, setNodes] = useState<CloudNode[]>([
    {
      name: "Microsoft Foundry LLM",
      status: "online",
      region: "Sweden Central (EUR)",
      metric: "gpt-5.4-mini",
      role: "EUDR Statutory Intent & Synthesis",
    },
    {
      name: "EUR-Lex Search Index",
      status: "online",
      region: "France Central (EU)",
      metric: "114 Verbatim Documents",
      role: "Primary Law & Annex I Tariff Schedule",
    },
    {
      name: "Planetary Computer STAC",
      status: "online",
      region: "West Europe (EU)",
      metric: "10m Sentinel-2 L2A",
      role: "Bi-Temporal Optical & DEM Provenance",
    },
  ]);

  return (
    <div className="absolute top-3 right-3 z-20">
      {/* Collapsed Pill Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#C8CFD5] shadow-xs hover:border-[#315F50]/60 px-3 py-1.5 rounded-full select-none hover:bg-white transition-all cursor-pointer group"
        title="View live European distributed cloud telemetry nodes"
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
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#747F88] group-hover:text-[#1D2227] transition-colors" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#747F88] group-hover:text-[#1D2227] transition-colors" />
        )}
      </button>

      {/* Expanded Interactive Cloud Architecture Popover */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-[#C8CFD5] rounded-2xl shadow-panel-lg p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EA]">
            <div className="flex items-center gap-1.5">
              <Server className="w-4 h-4 text-[#315F50]" />
              <span className="text-[11px] font-bold text-[#1D2227]">
                Live Distributed Sovereign Architecture
              </span>
            </div>
            <span className="text-[8.5px] font-mono text-[#5B6773] bg-[#F4F5F6] px-1.5 py-0.5 rounded border border-[#D8DFE4]">
              EUR Data Zone
            </span>
          </div>

          <div className="space-y-1.5">
            {/* 1. Foundry LLM */}
            <div className="p-2 rounded-xl bg-[#F8FAFB] border border-[#E3E7EA] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#315F50]" />
                  <span className="text-[11px] font-bold text-[#1D2227]">Microsoft Foundry LLM</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[10px] text-[#5B6773] leading-relaxed">
                <span className="font-semibold text-[#1D2227]">gpt-5.4-mini</span> · Region:{" "}
                <span className="font-mono text-[#315F50]">Sweden Central</span> (Sovereign EUR Zone)
              </p>
            </div>

            {/* 2. Azure AI Search / EUR-Lex */}
            <div className="p-2 rounded-xl bg-[#F8FAFB] border border-[#E3E7EA] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#315F50]" />
                  <span className="text-[11px] font-bold text-[#1D2227]">EUR-Lex Primary Index</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Dedicated
                </span>
              </div>
              <p className="text-[10px] text-[#5B6773] leading-relaxed">
                <span className="font-semibold text-[#1D2227]">114 Verbatim Documents</span> · Region:{" "}
                <span className="font-mono text-[#315F50]">France Central</span> (Basic Tier)
              </p>
            </div>

            {/* 3. Planetary Computer STAC */}
            <div className="p-2 rounded-xl bg-[#F8FAFB] border border-[#E3E7EA] space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-[#315F50]" />
                  <span className="text-[11px] font-bold text-[#1D2227]">Planetary Computer STAC</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready
                </span>
              </div>
              <p className="text-[10px] text-[#5B6773] leading-relaxed">
                <span className="font-semibold text-[#1D2227]">10m Sentinel-2 L2A</span> · Region:{" "}
                <span className="font-mono text-[#315F50]">West Europe</span> (STAC API v1.0)
              </p>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[9px] font-mono text-[#747F88] border-t border-[#E3E7EA]">
            <span>EU GDPR & SOVEREIGN DATA ZONE</span>
            <span className="text-[#315F50] font-semibold">100% EU CLOUD</span>
          </div>
        </div>
      )}
    </div>
  );
}

