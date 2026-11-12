"use client";

import React, { useState } from "react";
import { Cpu, Satellite, Scale, FileCheck, Layers, ArrowRight } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

const nodes = [
  {
    num: "01",
    title: "Smallholder Boundary Delineation",
    model: "Microsoft FTW AI",
    latency: "< 420 ms",
    desc: "Transforms single farmer GPS point coordinates into high-precision GeoJSON boundary polygons with topology checks and zero self-intersections.",
    regulatory: "Article 9 (Mandatory polygon coordinates for plots > 4 ha)",
    partner: "Microsoft Planetary Computer",
  },
  {
    num: "02",
    title: "Copernicus Multi-Sensor SAR Fusion",
    model: "PWRI-3D Consensus",
    latency: "< 850 ms",
    desc: "Queries Sentinel-1 C-band radar and Sentinel-2 optical imagery to compute dielectric roughness and canopy height against the JRC Dec 2020 baseline.",
    regulatory: "Article 2(5) (Agricultural use & continuous production exemptions)",
    partner: "ESA Copernicus Programme",
  },
  {
    num: "03",
    title: "Biological Yield & Anti-Laundering",
    model: "Bioclimatic Yield Guard",
    latency: "< 210 ms",
    desc: "Calculates agronomic yield ceilings per hectare based on regional soil and climate data, preventing off-plot deforestation volume laundering.",
    regulatory: "Article 10 (Due diligence systems & risk mitigation checks)",
    partner: "FAO Regional Yield Baselines",
  },
  {
    num: "04",
    title: "Statutory Clearance & TRACES NT",
    model: "TRACES NT XML Engine",
    latency: "< 340 ms",
    desc: "Compiles all satellite rasters, cadastral bounds, and statutory reasoning into customs-ready XML/JSON Due Diligence Statements ready for EU import.",
    regulatory: "Articles 3 & 12 (Customs clearance, port releases & DDS submission)",
    partner: "European Commission TRACES NT",
  },
];

export default function ArchitectureSection() {
  const [selectedNode, setSelectedNode] = useState(0);

  return (
    <section id="pipeline" className="py-20 md:py-28 bg-[#FFFFFF] border-t border-b border-[#C8CFD5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3E7EA] border border-[#C8CFD5] text-xs font-mono text-[#315F50] mb-3">
            <Cpu className="w-3.5 h-3.5 text-[#315F50]" />
            <span>CLOUD-NATIVE PIPELINE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-[#1D2227] tracking-tight">
            The Autonomous Spatial Verification Pipeline
          </h2>

          <p className="mt-4 text-base text-[#747F88] leading-relaxed">
            Replacing fragmented manual consulting with an end-to-end cloud pipeline 
            that verifies farm parcels against Copernicus satellite rasters and statutory law in under 30 seconds.
          </p>
        </div>

        {/* 4 Pipeline Node Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {nodes.map((node, idx) => {
            const isSelected = selectedNode === idx;
            return (
              <div
                key={node.num}
                onClick={() => setSelectedNode(idx)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#F4F5F6] border-[#315F50] shadow-panel ring-1 ring-[#315F50]"
                    : "bg-white border-[#C8CFD5] hover:border-[#747F88]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#C8CFD5]">
                    <span className="font-mono text-xs font-bold text-[#747F88]">
                      STAGE {node.num}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[rgba(49,95,80,0.08)] text-[#315F50]">
                      {node.latency}
                    </span>
                  </div>

                  <h3 className="mt-4 text-sm font-bold font-mono text-[#1D2227] leading-snug">
                    {node.title}
                  </h3>

                  <p className="mt-2 text-xs text-[#747F88] leading-relaxed">
                    {node.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#C8CFD5] space-y-1 font-mono text-[10px]">
                  <div className="text-[#315F50] font-semibold">{node.model}</div>
                  <div className="text-[#747F88]">{node.regulatory}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline Telemetry Banner */}
        <div className="mt-10 max-w-4xl mx-auto p-4 rounded-xl bg-[#F4F5F6] border border-[#C8CFD5] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-[#343B42]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#315F50] animate-pulse" />
            <span>Telemetry: <strong>Azure Sweden Central</strong> · 4 Dedicated Cloud Nodes</span>
          </div>
          <div className="flex items-center gap-2 text-[#315F50]">
            <EULogoSeal className="w-4 h-4 text-[#315F50]" />
            <span>Regulation (EU) 2023/1115 Articles 2, 3, 9, 10 & 12 Enforced</span>
          </div>
        </div>
      </div>
    </section>
  );
}
