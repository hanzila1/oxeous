"use client";

import React, { useState } from "react";
import { Radio, CloudRain, Sun, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

export default function RadarAdvantageSection() {
  const [activeCommodity, setActiveCommodity] = useState<"colombia" | "ghana">("colombia");

  return (
    <section id="radar-advantage" className="py-20 md:py-28 bg-[#FFFFFF] border-t border-b border-[#C8CFD5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3E7EA] border border-[#C8CFD5] text-xs font-mono text-[#315F50] mb-3">
            <Radio className="w-3.5 h-3.5 text-[#315F50]" />
            <span>REMOTE SENSING PHYSICS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-[#1D2227] tracking-tight">
            Why Radar Solves the Tropical Cloud Crisis
          </h2>

          <p className="mt-4 text-base text-[#747F88] leading-relaxed">
            Persistent cloud cover across the equatorial tropics renders conventional optical satellites blind for over 200 days a year. 
            Oxeous uses active C-band Synthetic Aperture Radar (SAR) to deliver uninterrupted statutory verification.
          </p>
        </div>

        {/* Physics Comparison Cards (Clay / CARTO style) */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Card 1: Optical Satellite Limitations */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#F4F5F6] border border-[#C8CFD5] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#C8CFD5]">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-[#A64B45]" />
                  <h3 className="text-sm font-mono font-bold text-[#1D2227]">
                    Optical Sensors (Sentinel-2 / Landsat)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[rgba(166,75,69,0.08)] text-[#A64B45] border border-[rgba(166,75,69,0.25)]">
                  WEATHER DEPENDENT
                </span>
              </div>

              <div className="mt-5 space-y-3 font-mono text-xs text-[#343B42]">
                <div className="flex items-start gap-2">
                  <span className="text-[#A64B45] font-bold">✕</span>
                  <span><strong>Atmospheric Blindness:</strong> 70%+ equatorial cloud cover scatters visible light wavelengths (400–800nm).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#A64B45] font-bold">✕</span>
                  <span><strong>Pruning False Alarms:</strong> Canopy management and routine coffee/cocoa pruning appear as permanent forest loss.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#A64B45] font-bold">✕</span>
                  <span><strong>Port Delays:</strong> Importers wait up to 4 weeks for cloud-free passes, incurring demurrage costs at Rotterdam and Hamburg.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#C8CFD5] text-[11px] font-mono text-[#747F88]">
              Standard market approach: 30m Global Forest Watch alerts
            </div>
          </div>

          {/* Card 2: Oxeous C-Band SAR Advantage */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border-2 border-[#315F50] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#C8CFD5]">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-[#315F50]" />
                  <h3 className="text-sm font-mono font-bold text-[#1D2227]">
                    Sentinel-1 C-Band SAR (Oxeous Engine)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[rgba(49,95,80,0.08)] text-[#315F50] border border-[rgba(49,95,80,0.25)]">
                  ALL-WEATHER 24/7
                </span>
              </div>

              <div className="mt-5 space-y-3 font-mono text-xs text-[#343B42]">
                <div className="flex items-start gap-2">
                  <span className="text-[#315F50] font-bold">✓</span>
                  <span><strong>100% Cloud Penetration:</strong> 5.6 cm active microwave pulses pass directly through clouds, rain, and haze.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#315F50] font-bold">✓</span>
                  <span><strong>Dielectric Roughness:</strong> Distinguishes woody agricultural canopy from clear-cut deforestation via VV/VH polarization.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#315F50] font-bold">✓</span>
                  <span><strong>Sub-30s Verification:</strong> Direct Copernicus API processing generates customs-ready DDS without waiting for sunny weather.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#C8CFD5] text-[11px] font-mono text-[#315F50] font-bold flex items-center justify-between">
              <span>Oxeous PWRI-3D Consensus Method</span>
              <EULogoSeal className="w-4 h-4 text-[#315F50]" />
            </div>
          </div>
        </div>

        {/* Real Dossier Figures Preview Bar */}
        <div className="mt-14 max-w-5xl mx-auto rounded-2xl bg-[#F4F5F6] border border-[#C8CFD5] p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 mb-4 border-b border-[#C8CFD5]">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#747F88] tracking-wider">
                Earth Observation Evidence Verification
              </span>
              <h3 className="text-base font-bold font-mono text-[#1D2227] mt-0.5">
                {activeCommodity === "colombia"
                  ? "Colombia (Huila Coffee Basin) — Article 2(5) Verified Compliant"
                  : "Ghana (Ashanti Cocoa Basin) — Cutoff Violation & Forest Loss Detected"}
              </h3>
            </div>

            {/* Commodity Selector */}
            <div className="flex items-center gap-1.5 bg-[#E3E7EA] p-1 rounded-lg border border-[#C8CFD5] font-mono text-xs">
              <button
                onClick={() => setActiveCommodity("colombia")}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeCommodity === "colombia"
                    ? "bg-white text-[#1D2227] font-bold shadow-xs"
                    : "text-[#747F88] hover:text-[#1D2227]"
                }`}
              >
                01 · Huila Coffee (Clean)
              </button>
              <button
                onClick={() => setActiveCommodity("ghana")}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeCommodity === "ghana"
                    ? "bg-white text-[#1D2227] font-bold shadow-xs"
                    : "text-[#747F88] hover:text-[#1D2227]"
                }`}
              >
                02 · Ashanti Cocoa (Alert)
              </button>
            </div>
          </div>

          {/* Actual Evidence Figure Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="rounded-xl overflow-hidden border border-[#C8CFD5] bg-white shadow-xs">
              <img
                src={
                  activeCommodity === "colombia"
                    ? "/dossiers/01_Colombia_Coffee/individual_figures/Figure_1_Forest_Canopy_and_Deforestation_Verification_Map_with_Legend.png"
                    : "/dossiers/02_Ghana_Cocoa/individual_figures/Figure_1_Forest_Canopy_Loss_and_Protected_Reserves_Map_with_Legend.png"
                }
                alt="Cartographic Deforestation Verification Map"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="rounded-xl overflow-hidden border border-[#C8CFD5] bg-white shadow-xs">
              <img
                src={
                  activeCommodity === "colombia"
                    ? "/dossiers/01_Colombia_Coffee/individual_figures/Figure_4_Sentinel2_NDVI_Phenology_Trajectory_Line_Chart.png"
                    : "/dossiers/02_Ghana_Cocoa/individual_figures/Figure_4_Sentinel2_NDVI_Phenology_Collapse_Line_Chart.png"
                }
                alt="NDVI Phenology Trajectory Analysis"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
