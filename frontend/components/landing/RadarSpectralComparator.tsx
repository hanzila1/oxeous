"use client";

import React, { useState } from "react";
import {
  Cloud,
  CloudRain,
  Sun,
  Eye,
  Radio,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  ArrowRight,
  Sliders,
} from "lucide-react";

export default function RadarSpectralComparator() {
  const [cloudCover, setCloudCover] = useState<number>(75);
  const [activeSensor, setActiveSensor] = useState<"both" | "sar" | "optical">("both");

  // Determine optical degradation based on cloud cover
  const isOpticalBlinded = cloudCover > 30;
  const opticalConfidence = Math.max(0, 100 - cloudCover * 1.25);
  const sarConfidence = 99.4; // SAR unaffected by clouds

  return (
    <section id="dual-sensor" className="py-24 bg-[#0A101A] border-t border-b border-[#1B283D] relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-[#00F2FE]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1724] border border-[#1B283D] text-xs font-mono text-[#00F2FE] mb-4">
            <Radio className="w-3.5 h-3.5 text-[#00F2FE]" />
            <span>SPECTRAL PHYSICS COMPARATOR</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Why Optical Satellites Fail the Tropics{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-[#10B981]">
              (And Why Radar Wins)
            </span>
          </h2>

          <p className="mt-4 text-base text-[#AAB3BB] leading-relaxed">
            70% of the world’s coffee, cocoa, and palm oil is grown along the equator under persistent cloud cover and tropical rainfall. 
            Legacy tools relying solely on optical imagery (Landsat, Sentinel-2) are blinded 200+ days a year.
          </p>
        </div>

        {/* Interactive Controls Bar */}
        <div className="mt-12 max-w-4xl mx-auto p-4 sm:p-5 rounded-2xl bg-[#060A10] border border-[#1B283D] shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Cloud Cover Slider */}
            <div className="w-full sm:w-1/2">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="flex items-center gap-1.5 text-[#C8CFD5]">
                  <CloudRain className="w-4 h-4 text-[#00F2FE]" />
                  <span>SIMULATED TROPICAL CLOUD COVER:</span>
                </span>
                <span className={`font-bold ${cloudCover > 50 ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                  {cloudCover}% COVER
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={cloudCover}
                onChange={(e) => setCloudCover(Number(e.target.value))}
                className="w-full h-2 bg-[#1B283D] rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#747F88] mt-1">
                <span>0% (Clear Sky)</span>
                <span>50% (Equatorial Rainy Season)</span>
                <span>100% (Dense Monsoon)</span>
              </div>
            </div>

            {/* View Filter Toggles */}
            <div className="flex items-center gap-2 font-mono text-xs w-full sm:w-auto justify-end">
              <button
                onClick={() => setActiveSensor("both")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  activeSensor === "both"
                    ? "bg-[#0F1724] border-[#00F2FE] text-[#00F2FE]"
                    : "border-[#1B283D] text-[#747F88] hover:text-[#C8CFD5]"
                }`}
              >
                Split View
              </button>
              <button
                onClick={() => setActiveSensor("optical")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  activeSensor === "optical"
                    ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]"
                    : "border-[#1B283D] text-[#747F88] hover:text-[#C8CFD5]"
                }`}
              >
                Optical Only
              </button>
              <button
                onClick={() => setActiveSensor("sar")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  activeSensor === "sar"
                    ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]"
                    : "border-[#1B283D] text-[#747F88] hover:text-[#C8CFD5]"
                }`}
              >
                Sentinel-1 SAR Only
              </button>
            </div>
          </div>
        </div>

        {/* Dual Interactive Comparator Cards */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Card 1: Optical Sentinel-2 */}
          {(activeSensor === "both" || activeSensor === "optical") && (
            <div className={`relative rounded-2xl p-6 border transition-all duration-300 ${
              isOpticalBlinded
                ? "bg-[#0F1724]/60 border-[#EF4444]/40 shadow-lg"
                : "bg-[#0F1724] border-[#1B283D]"
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-[#1B283D]">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#EF4444]" />
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white">
                      SENTINEL-2 OPTICAL (RGB / NDVI)
                    </h3>
                    <span className="text-[11px] font-mono text-[#747F88]">
                      Wavelength: 400nm - 840nm (Visible Light)
                    </span>
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                  isOpticalBlinded
                    ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
                    : "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30"
                }`}>
                  {isOpticalBlinded ? "DEGRADED" : "CLEAR"}
                </div>
              </div>

              {/* Simulated Sensor Box */}
              <div className="relative mt-5 h-56 rounded-xl bg-[#060A10] border border-[#1B283D] overflow-hidden flex items-center justify-center">
                {/* Visual Simulation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-36 rounded border border-dashed border-[#747F88] bg-[#162234] flex flex-col items-center justify-center p-3 text-center">
                    <span className="text-[10px] font-mono text-[#AAB3BB]">Underlying Farm Ground</span>
                    <span className="text-xs font-mono font-bold text-white mt-1">Ivory Coast Cocoa Plot</span>
                  </div>
                </div>

                {/* Cloud Obscuration Layer */}
                <div
                  className="absolute inset-0 bg-white/70 backdrop-blur-md transition-all duration-300 flex items-center justify-center p-4 text-center"
                  style={{
                    opacity: cloudCover / 100,
                    backdropFilter: `blur(${(cloudCover / 100) * 16}px)`,
                  }}
                >
                  {isOpticalBlinded && (
                    <div className="bg-[#0A101A]/95 p-3 rounded-lg border border-[#EF4444] max-w-xs shadow-2xl">
                      <AlertOctagon className="w-6 h-6 text-[#EF4444] mx-auto mb-1" />
                      <div className="text-xs font-mono font-bold text-[#EF4444]">
                        SATELLITE BLINDED BY CLOUD REFLECTANCE
                      </div>
                      <div className="text-[10px] font-mono text-[#C8CFD5] mt-1">
                        Pixel values saturated by atmospheric moisture.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Outcome */}
              <div className="mt-5 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-[#C8CFD5]">
                  <span>Effective Sensor Confidence:</span>
                  <span className={opticalConfidence < 50 ? "text-[#EF4444] font-bold" : "text-[#10B981]"}>
                    {opticalConfidence.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-[#C8CFD5]">
                  <span>Customs Audit Decision:</span>
                  <span className={isOpticalBlinded ? "text-[#EF4444] font-bold" : "text-[#10B981]"}>
                    {isOpticalBlinded ? "PARALYZED (False Alarm Raised)" : "Temporarily Cleared"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#060A10] border border-[#1B283D] text-[11px] text-[#AAB3BB] leading-relaxed">
                  {isOpticalBlinded ? (
                    <span className="text-[#EF4444]">
                      ⚠️ <strong>Failure Mode:</strong> Importers must wait up to 4 weeks for a cloud-free satellite pass. 
                      Pruning cycles appear as tree-canopy loss, triggering erroneous shipment rejections at EU customs.
                    </span>
                  ) : (
                    <span>Clear view today, but tropical weather guarantees cloud blindness on the next critical audit date.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Sentinel-1 C-Band SAR Radar (Oxeous) */}
          {(activeSensor === "both" || activeSensor === "sar") && (
            <div className="relative rounded-2xl p-6 bg-[#0F1724] border border-[#10B981]/50 shadow-glow-emerald">
              <div className="flex items-center justify-between pb-4 border-b border-[#1B283D]">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-[#00F2FE]" />
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white">
                      SENTINEL-1 C-BAND SAR (OXEOUS)
                    </h3>
                    <span className="text-[11px] font-mono text-[#10B981]">
                      Wavelength: 5.6 cm (5.405 GHz Active Microwave)
                    </span>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ALL-WEATHER ACTIVE</span>
                </div>
              </div>

              {/* Simulated Radar Sensor Box */}
              <div className="relative mt-5 h-56 rounded-xl bg-[#060A10] border border-[#10B981]/40 overflow-hidden flex items-center justify-center">
                {/* Active Radar Grid */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-40 h-40 rounded-full border border-[#00F2FE]" />
                  <div className="w-24 h-24 rounded-full border border-[#00F2FE]" />
                </div>

                {/* Radar Sweep Animation */}
                <div className="absolute w-64 h-64 rounded-full overflow-hidden pointer-events-none">
                  <div
                    className="w-full h-full animate-radar-sweep"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(0, 242, 254, 0.05) 290deg, rgba(0, 242, 254, 0.3) 360deg)",
                    }}
                  />
                </div>

                {/* Clear Radar Polygon Visual */}
                <div className="relative z-10 w-52 h-36 rounded-lg bg-[#10B981]/15 border-2 border-[#10B981] p-3 flex flex-col justify-between backdrop-blur-xs">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-[#00F2FE] font-bold">PWRI-3D RADAR LOCK</span>
                    <span className="text-[#10B981]">VV/VH RATIO OK</span>
                  </div>
                  <div className="text-center font-mono">
                    <div className="text-xs font-bold text-white">Canopy Height: 8.4m</div>
                    <div className="text-[10px] text-[#10B981]">Article 2(5) Agroforestry Verified</div>
                  </div>
                  <div className="text-[9px] font-mono text-[#AAB3BB] flex justify-between">
                    <span>Penetrates 100% Clouds</span>
                    <span className="text-[#00F2FE]">10m Resolution</span>
                  </div>
                </div>
              </div>

              {/* Status & Outcome */}
              <div className="mt-5 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-[#C8CFD5]">
                  <span>Effective Sensor Confidence:</span>
                  <span className="text-[#10B981] font-bold">{sarConfidence}% (Cloud-Immune)</span>
                </div>
                <div className="flex justify-between text-[#C8CFD5]">
                  <span>Customs Audit Decision:</span>
                  <span className="text-[#10B981] font-bold">100% AUDIT-GRADE CLEARANCE</span>
                </div>
                <div className="p-3 rounded-lg bg-[#060A10] border border-[#10B981]/30 text-[11px] text-[#AAB3BB] leading-relaxed">
                  <span className="text-[#10B981]">
                    🛡️ <strong>The Oxeous Advantage:</strong> Radar microwaves travel directly through heavy tropical clouds, 
                    measuring dielectric roughness and woody biomass. Verification completes in 30 seconds, rain or shine.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
