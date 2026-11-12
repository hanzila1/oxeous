"use client";

import React, { useState } from "react";
import {
  Cpu,
  Satellite,
  Scale,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  Database,
  Layers,
  Code,
  Zap,
} from "lucide-react";

interface PipelineStep {
  id: string;
  number: string;
  title: string;
  shortDesc: string;
  badge: string;
  agent: string;
  latency: string;
  details: {
    techStack: string;
    statutoryBasis: string;
    output: string;
    keyMetric: string;
  };
}

const steps: PipelineStep[] = [
  {
    id: "step-1",
    number: "01",
    title: "Ingestion & Smallholder Delineation",
    shortDesc: "Converts single farmer GPS points into high-precision polygon boundaries using Microsoft FTW AI.",
    badge: "MICROSOFT FTW AI",
    agent: "Boundary Delineation Agent",
    latency: "< 420 ms",
    details: {
      techStack: "Microsoft Fields of the World (FTW) AI · Azure Container Apps",
      statutoryBasis: "EUDR Article 9 (Mandatory polygon coordinates for plots > 4 ha)",
      output: "GeoJSON Farm Parcel with topology validation and zero self-intersections",
      keyMetric: "98.7% edge accuracy vs manual field surveys",
    },
  },
  {
    id: "step-2",
    number: "02",
    title: "Copernicus Multi-Sensor Radar Fusion",
    shortDesc: "Fuses cloud-penetrating Sentinel-1 SAR radar with Sentinel-2 optical and JRC 2020 forest baselines.",
    badge: "PWRI-3D CONSENSUS",
    agent: "Multi-Sensor EO Radar Agent",
    latency: "< 850 ms",
    details: {
      techStack: "Copernicus Sentinel-1 C-Band SAR · Planetary Computer COG Streaming",
      statutoryBasis: "EUDR Article 2(5) (Agricultural use & continuous production exemptions)",
      output: "Backscatter ratio (VV/VH), canopy height, and 2020 cutoff delta analysis",
      keyMetric: "100% all-weather visibility through equatorial cloud cover",
    },
  },
  {
    id: "step-3",
    number: "03",
    title: "Biological Yield & Anti-Laundering",
    shortDesc: "Calculates agronomic yield ceilings per hectare to prevent illegally harvested commodities from laundering into clean batches.",
    badge: "AGRONOMIC CEILING",
    agent: "Yield Laundering Agent",
    latency: "< 210 ms",
    details: {
      techStack: "Regional agronomic bioclimatic models · Soil moisture indices",
      statutoryBasis: "EUDR Article 10 (Due diligence systems & risk mitigation checks)",
      output: "Strict Metric Ton harvest volume cap per farmer per harvest season",
      keyMetric: "Eliminates phantom volume laundering across 7 commodities",
    },
  },
  {
    id: "step-4",
    number: "04",
    title: "Statutory Clearance & TRACES NT",
    shortDesc: "Compiles complete audit trails into European Commission TRACES NT customs XML filings.",
    badge: "CUSTOMS AUDIT PROOF",
    agent: "Statutory Advisory Agent",
    latency: "< 340 ms",
    details: {
      techStack: "EU TRACES NT API Schema · Azure Confidential Ledger",
      statutoryBasis: "EUDR Articles 3, 12 (Customs clearance, port releases & DDS submission)",
      output: "Audit-grade PDF Dossier + Cryptographically signed XML Due Diligence Statement",
      keyMetric: "Sub-30 second end-to-end statutory verification",
    },
  },
];

export default function ArchitecturePipeline() {
  const [selectedStep, setSelectedStep] = useState<PipelineStep>(steps[1]);

  return (
    <section id="pipeline" className="py-24 bg-[#0A101A] border-t border-[#1B283D] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1724] border border-[#1B283D] text-xs font-mono text-[#00F2FE] mb-4">
            <Cpu className="w-3.5 h-3.5 text-[#00F2FE]" />
            <span>AUTONOMOUS SPATIAL ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            How Oxeous Works:{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-[#10B981]">
              The 4-Agent Pipeline
            </span>
          </h2>

          <p className="mt-4 text-base text-[#AAB3BB] leading-relaxed">
            Replacing slow, fragmented consulting audits with a continuous multi-agent pipeline 
            that verifies farm parcels against satellite rasters and EU statutory law in seconds.
          </p>
        </div>

        {/* Step Selector Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step) => {
            const isSelected = selectedStep.id === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setSelectedStep(step)}
                className={`text-left p-5 rounded-2xl border transition-all duration-300 relative ${
                  isSelected
                    ? "bg-[#0F1724] border-[#00F2FE] shadow-glow-cyan transform -translate-y-1"
                    : "bg-[#060A10] border-[#1B283D] hover:border-[#2A3D5B] hover:bg-[#0A101A]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#747F88]">
                    {step.number}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                    isSelected ? "bg-[#00F2FE]/20 text-[#00F2FE]" : "bg-[#1B283D]/60 text-[#747F88]"
                  }`}>
                    {step.badge}
                  </span>
                </div>

                <h3 className={`text-sm font-bold font-mono ${isSelected ? "text-white" : "text-[#C8CFD5]"}`}>
                  {step.title}
                </h3>

                <p className="mt-2 text-xs text-[#747F88] line-clamp-2 leading-relaxed">
                  {step.shortDesc}
                </p>

                {isSelected && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0F1724] border-b border-r border-[#00F2FE] rotate-45 hidden md:block" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Step Deep-Dive Card */}
        <div className="mt-10 max-w-5xl mx-auto rounded-2xl bg-[#0F1724] border border-[#1B283D] p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6 pb-6 border-b border-[#1B283D]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#00F2FE] mb-1">
                <span>AGENT STACK // {selectedStep.agent}</span>
                <span>·</span>
                <span className="text-[#10B981]">LATENCY: {selectedStep.latency}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-mono text-white">
                {selectedStep.number}. {selectedStep.title}
              </h3>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-[#060A10] border border-[#1B283D] text-xs font-mono text-[#AAB3BB]">
              Execution Engine: <span className="text-white font-bold">Azure Sweden Central</span>
            </div>
          </div>

          {/* Detailed Metadata Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#060A10] border border-[#1B283D]">
              <div className="text-[10px] text-[#747F88] uppercase">Underlying Technology</div>
              <div className="text-white font-semibold mt-1">{selectedStep.details.techStack}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#060A10] border border-[#1B283D]">
              <div className="text-[10px] text-[#747F88] uppercase">Statutory Regulatory Basis</div>
              <div className="text-[#00F2FE] font-semibold mt-1">{selectedStep.details.statutoryBasis}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#060A10] border border-[#1B283D]">
              <div className="text-[10px] text-[#747F88] uppercase">Generated Output Artifact</div>
              <div className="text-[#10B981] font-semibold mt-1">{selectedStep.details.output}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#060A10] border border-[#1B283D]">
              <div className="text-[10px] text-[#747F88] uppercase">Verified Operational Metric</div>
              <div className="text-white font-semibold mt-1">{selectedStep.details.keyMetric}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
