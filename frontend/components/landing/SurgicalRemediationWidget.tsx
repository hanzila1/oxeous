"use client";

import React, { useState } from "react";
import {
  Scissors,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function SurgicalRemediationWidget() {
  const [remediated, setRemediated] = useState<boolean>(false);

  // Key metrics
  const totalArea = 12.8;
  const violationArea = 0.5;
  const cleanArea = (totalArea - violationArea).toFixed(1);
  const cocoaYieldPerHa = 0.8; // MT per hectare
  const marketPricePerMT = 11000; // EUR per MT for cocoa
  const totalValue = totalArea * cocoaYieldPerHa * marketPricePerMT;
  const salvagedValue = Number(cleanArea) * cocoaYieldPerHa * marketPricePerMT;

  return (
    <section id="surgical-repair" className="py-24 bg-[#060A10] relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1724] border border-[#1B283D] text-xs font-mono text-[#10B981] mb-4">
            <Scissors className="w-3.5 h-3.5 text-[#10B981]" />
            <span>ARTICLE 9 AUTOMATED PARCEL SALVAGE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Surgical Polygon Remediation:{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#00F2FE]">
              Salvage Clean Harvests
            </span>
          </h2>

          <p className="mt-4 text-base text-[#AAB3BB] leading-relaxed">
            In standard tools, if a smallholder’s GPS fence slips 5 meters into a forest buffer, 
            the <strong>entire multi-ton shipment is rejected</strong>. Oxeous surgically carves out the violation, 
            preserves the legal crop, and prevents smallholders from being cut off from global supply chains.
          </p>
        </div>

        {/* Interactive Sandbox Card */}
        <div className="mt-12 max-w-5xl mx-auto rounded-2xl bg-[#0A101A] border border-[#1B283D] p-5 sm:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* Left: Interactive Polygon SVG Canvas */}
            <div className="w-full lg:w-1/2 flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-[380px] bg-[#060A10] rounded-xl border border-[#1B283D] overflow-hidden flex items-center justify-center p-4">
                {/* Cadastral Grid Lines */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `linear-gradient(#00F2FE 1px, transparent 1px), linear-gradient(90deg, #00F2FE 1px, transparent 1px)`,
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* SVG Farm Polygon with Violation Sliver */}
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  {/* Gazetted National Park Forest Boundary */}
                  <rect
                    x="0"
                    y="0"
                    width="120"
                    height="300"
                    fill="rgba(239, 68, 68, 0.08)"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="12" y="24" fill="#EF4444" fontSize="9" fontFamily="monospace">
                    PROTECTED FOREST RESERVE (CUTOFF DEC 2020)
                  </text>

                  {/* Main Clean Agricultural Area (12.3 ha) */}
                  <polygon
                    points="120,60 260,80 270,220 120,240"
                    fill={remediated ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.15)"}
                    stroke={remediated ? "#10B981" : "#EF4444"}
                    strokeWidth="2.5"
                    className="transition-colors duration-500"
                  />

                  {/* The 0.5 ha Boundary Violation Sliver */}
                  <polygon
                    points="70,75 120,60 120,240 75,230"
                    fill={remediated ? "rgba(239, 68, 68, 0.04)" : "rgba(239, 68, 68, 0.55)"}
                    stroke="#EF4444"
                    strokeWidth={remediated ? "1" : "2.5"}
                    strokeDasharray={remediated ? "3 3" : "0"}
                    className="transition-all duration-500"
                  />

                  {/* Dynamic Labels */}
                  <text
                    x="180"
                    y="155"
                    fill={remediated ? "#10B981" : "#C8CFD5"}
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {remediated ? "CLEAN ACREAGE: 12.3 HA" : "DISPUTED PARCEL: 12.8 HA"}
                  </text>

                  <text
                    x="95"
                    y="155"
                    fill="#EF4444"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    opacity={remediated ? 0.6 : 1}
                  >
                    {remediated ? "[CARVED OUT]" : "0.5 HA CLIP"}
                  </text>
                </svg>

                {/* Status Overlay Badge */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono bg-[#0A101A]/90 p-2 rounded border border-[#1B283D] backdrop-blur-sm">
                  <span className="text-[#AAB3BB]">GPS COORD: -4.318, 29.721</span>
                  <span className={remediated ? "text-[#10B981] font-bold" : "text-[#EF4444] font-bold"}>
                    {remediated ? "REMEDIATED (LEGAL)" : "BINARY REJECTION"}
                  </span>
                </div>
              </div>

              {/* Action Toggle Switch */}
              <div className="mt-5 flex items-center gap-3 w-full">
                <button
                  onClick={() => setRemediated(false)}
                  className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all ${
                    !remediated
                      ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444] font-bold"
                      : "bg-[#060A10] border-[#1B283D] text-[#747F88]"
                  }`}
                >
                  Standard Binary System
                </button>
                <button
                  onClick={() => setRemediated(true)}
                  className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-all ${
                    remediated
                      ? "bg-[#10B981] text-[#060A10] font-bold shadow-glow-emerald"
                      : "bg-[#060A10] border-[#1B283D] text-[#C8CFD5] hover:border-[#10B981]"
                  }`}
                >
                  Oxeous Surgical Remediation
                </button>
              </div>
            </div>

            {/* Right: Financial & Legal Impact Breakdown */}
            <div className="w-full lg:w-1/2 space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#060A10] border border-[#1B283D]">
                <div className="text-[#747F88] uppercase text-[10px] mb-1">Commercial Consequence</div>
                {remediated ? (
                  <div className="space-y-1.5">
                    <div className="text-lg font-bold text-[#10B981] flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                      <span>€{salvagedValue.toLocaleString()} Harvest Saved</span>
                    </div>
                    <p className="text-[#C8CFD5] leading-relaxed text-[11px]">
                      Oxeous automatically trimmed the 0.5 ha forest buffer violation, certified <strong>12.3 hectares of clean cocoa</strong>, 
                      and recalculated the biological yield ceiling to <strong>9.84 MT</strong>. The shipment clears customs with zero delay.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-lg font-bold text-[#EF4444] flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                      <span>€{totalValue.toLocaleString()} Cargo Seized / Rejected</span>
                    </div>
                    <p className="text-[#C8CFD5] leading-relaxed text-[11px]">
                      Because of a 5-meter polygon drafting error on 0.5 ha, the entire 12.8 ha shipment is condemned. 
                      The European importer is exposed to statutory fines, and the cooperative smallholder is dropped.
                    </p>
                  </div>
                )}
              </div>

              {/* Legal & Compliance Metadata */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#060A10] border border-[#1B283D]">
                  <div className="text-[10px] text-[#747F88]">CERTIFIED HARVEST VOLUME</div>
                  <div className="text-sm font-bold text-white mt-1">
                    {remediated ? "9.84 Metric Tons" : "0.00 MT (Denied)"}
                  </div>
                  <div className="text-[9px] text-[#10B981]">Anti-Laundering Cap</div>
                </div>

                <div className="p-3 rounded-xl bg-[#060A10] border border-[#1B283D]">
                  <div className="text-[10px] text-[#747F88]">TRACES NT FILING</div>
                  <div className="text-sm font-bold text-[#00F2FE] mt-1">
                    {remediated ? "XML GENERATED" : "BLOCKED"}
                  </div>
                  <div className="text-[9px] text-[#747F88]">Customs Due Diligence</div>
                </div>
              </div>

              {/* Live XML Code Snippet Preview */}
              <div className="p-3 rounded-xl bg-[#060A10] border border-[#1B283D] font-mono text-[10px]">
                <div className="flex items-center justify-between text-[#747F88] pb-1.5 mb-1.5 border-b border-[#1B283D]">
                  <span className="flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-[#00F2FE]" />
                    <span>TRACES_NT_DDS_PAYLOAD.XML</span>
                  </span>
                  <span className="text-[#10B981]">{remediated ? "ARTICLE 9 VALIDATED" : "INCOMPLETE"}</span>
                </div>
                <pre className="text-[#AAB3BB] overflow-x-auto">
{remediated ? `<!-- Oxeous Statutory Clearance -->
<DueDiligenceStatement>
  <PlotId>GH-COCOA-2026-4092</PlotId>
  <Article2_5_Exemption>true</Article2_5_Exemption>
  <CertifiedAcreageHa>12.30</CertifiedAcreageHa>
  <YieldCapMT>9.84</YieldCapMT>
  <Status>COMPLIANT_FOR_EU_IMPORT</Status>
</DueDiligenceStatement>` : `<!-- Traditional Binary Failure -->
<DueDiligenceStatement>
  <Status>REJECTED_DEFORESTATION_SUSPECT</Status>
  <Reason>Buffer overlap on polygon perimeter</Reason>
</DueDiligenceStatement>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

