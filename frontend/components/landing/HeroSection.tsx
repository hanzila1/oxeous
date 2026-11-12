"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Satellite,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Radio,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface HeroSectionProps {
  onOpenPilotModal: () => void;
}

export default function HeroSection({ onOpenPilotModal }: HeroSectionProps) {
  const [activeTab, setActiveTab] = useState<"sar" | "optical">("sar");

  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden bg-[#060A10]">
      {/* Background Orbital & Grid Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle radial gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#00F2FE]/10 via-[#10B981]/5 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00F2FE]/5 rounded-full blur-3xl" />

        {/* Micro-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle, #00F2FE 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Diagonal coordinate sweep lines */}
        <div className="absolute top-24 left-10 text-[10px] font-mono text-[#1E2B3D] select-none hidden lg:block">
          ORBIT: 693.4 KM · INCLINATION 98.18° · SUN-SYNCHRONOUS · SENTINEL-1A
        </div>
        <div className="absolute bottom-10 right-10 text-[10px] font-mono text-[#1E2B3D] select-none hidden lg:block">
          POLARIZATION: VV + VH · RESOLUTION: 10m × 10m · ESA COPERNICUS
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Badges Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1724] border border-[#1B283D] text-[11px] font-mono text-[#C8CFD5] shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#00F2FE]" />
            <span>Backed by <strong>Microsoft for Startups</strong> ($150,000 Azure AI)</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1724] border border-[#1B283D] text-[11px] font-mono text-[#C8CFD5] shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span><strong>Google DeepMind</strong> Research Grantee (GeoGemma)</span>
          </div>
          <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1724] border border-[#1B283D] text-[11px] font-mono text-[#C8CFD5] shadow-lg">
            <span><strong>Z_GIS Salzburg</strong> · Copernicus Digital Earth</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
            Autonomous Spatial Verification for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] via-[#10B981] to-[#00F2FE]">
              Global EUDR Compliance
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-[#AAB3BB] max-w-3xl mx-auto leading-relaxed">
            Eliminating false deforestation alarms on <strong>€100B+</strong> of annual agricultural imports. 
            In under 30 seconds, Oxeous fuses cloud-penetrating <strong>Sentinel-1 SAR radar</strong>, 
            optical AI, and biological yield limits to generate customs-ready <strong>TRACES NT Due Diligence Statements</strong>.
          </p>

          {/* Primary CTA Buttons */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/cockpit/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-mono font-bold uppercase tracking-wider text-[#060A10] bg-gradient-to-r from-[#00F2FE] to-[#10B981] hover:brightness-110 rounded-xl shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
            >
              <Cpu className="w-4 h-4" />
              <span>Launch Live Cockpit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#dual-sensor"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-mono uppercase tracking-wider text-[#C8CFD5] hover:text-white rounded-xl border border-[#1B283D] hover:border-[#00F2FE]/50 bg-[#0F1724] transition-all"
            >
              <Radio className="w-4 h-4 text-[#00F2FE]" />
              <span>Interactive Radar Simulator</span>
            </a>

            <button
              onClick={onOpenPilotModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-mono uppercase tracking-wider text-[#AAB3BB] hover:text-[#C8CFD5] rounded-xl border border-dashed border-[#1B283D] hover:border-[#2A3D5B] transition-all"
            >
              <span>Book Enterprise Pilot</span>
            </button>
          </div>
        </div>

        {/* Live Interactive Hero Radar Console Card */}
        <div className="mt-14 max-w-5xl mx-auto">
          <div className="relative rounded-2xl bg-[#0A101A] border border-[#1B283D] p-4 sm:p-6 shadow-glow-card overflow-hidden">
            {/* Top Command Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#1B283D]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                </div>
                <div className="h-4 w-[1px] bg-[#1B283D]" />
                <div className="flex items-center gap-2 text-xs font-mono text-[#AAB3BB]">
                  <Satellite className="w-3.5 h-3.5 text-[#00F2FE]" />
                  <span>TARGET: HUILA COCOA PARCEL #4092</span>
                  <span className="text-[#10B981] font-semibold">(LAT 2.129° N, LON 75.642° W)</span>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center p-1 rounded-lg bg-[#060A10] border border-[#1B283D]">
                <button
                  onClick={() => setActiveTab("sar")}
                  className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                    activeTab === "sar"
                      ? "bg-[#10B981] text-[#060A10] font-bold shadow"
                      : "text-[#747F88] hover:text-[#C8CFD5]"
                  }`}
                >
                  Sentinel-1 Radar (Oxeous)
                </button>
                <button
                  onClick={() => setActiveTab("optical")}
                  className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                    activeTab === "optical"
                      ? "bg-[#EF4444] text-white font-bold shadow"
                      : "text-[#747F88] hover:text-[#C8CFD5]"
                  }`}
                >
                  Optical Satellite (Competitors)
                </button>
              </div>
            </div>

            {/* Radar Visual Canvas Area */}
            <div className="relative h-64 sm:h-80 w-full rounded-xl bg-[#060A10] border border-[#1B283D] overflow-hidden flex items-center justify-center">
              {/* Radar Grid Circles */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[180px] h-[180px] rounded-full border border-[#1B283D]/60" />
                <div className="w-[320px] h-[320px] rounded-full border border-[#1B283D]/50" />
                <div className="w-[460px] h-[460px] rounded-full border border-[#1B283D]/30" />
                <div className="absolute w-full h-[1px] bg-[#1B283D]/40" />
                <div className="absolute h-full w-[1px] bg-[#1B283D]/40" />
              </div>

              {activeTab === "sar" ? (
                /* Sentinel-1 SAR Active View */
                <div className="relative w-full h-full flex items-center justify-center p-6">
                  {/* Rotating Radar Sweep Beam */}
                  <div className="absolute w-[460px] h-[460px] rounded-full overflow-hidden pointer-events-none">
                    <div
                      className="w-full h-full animate-radar-sweep"
                      style={{
                        background:
                          "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(0, 242, 254, 0.02) 290deg, rgba(0, 242, 254, 0.25) 360deg)",
                      }}
                    />
                  </div>

                  {/* Polygon Map Representation */}
                  <div className="relative z-10 w-72 h-48 border-2 border-dashed border-[#10B981] bg-[#10B981]/10 rounded-lg flex flex-col justify-between p-3.5 backdrop-blur-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981] text-[10px] font-mono text-[#10B981] font-bold">
                        SAR BACKSCATTER VERIFIED
                      </span>
                      <span className="text-[10px] font-mono text-[#C8CFD5]">
                        σ°_VH = -14.2 dB
                      </span>
                    </div>

                    <div className="space-y-1 text-center font-mono">
                      <div className="text-xs text-[#00F2FE] font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>CANOPY INTEGRITY: 99.8%</span>
                      </div>
                      <div className="text-[11px] text-[#AAB3BB]">
                        Article 2(5) Replanting Exemption Confirmed
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#747F88] pt-2 border-t border-[#10B981]/20">
                      <span>Cloud Cover: 74% (Penetrated)</span>
                      <span className="text-[#10B981]">TRACES NT READY</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Optical Cloud Obscuration View */
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#1E293B]/60 to-[#0F1724]">
                  {/* Cloud Simulation Overlay */}
                  <div className="absolute inset-0 bg-[#AAB3BB]/20 backdrop-blur-md flex items-center justify-center">
                    <div className="text-center p-6 max-w-md bg-[#0A101A]/90 border border-[#EF4444]/40 rounded-xl shadow-2xl">
                      <AlertTriangle className="w-8 h-8 text-[#EF4444] mx-auto mb-2 animate-bounce" />
                      <div className="text-sm font-mono font-bold text-[#EF4444]">
                        OPTICAL SATELLITE BLINDED BY TROPICAL CLOUDS
                      </div>
                      <p className="mt-1.5 text-xs text-[#C8CFD5] font-mono">
                        74% cloud cover obscures optical sensors. Competitor tools trigger a <strong>False Deforestation Alarm</strong> or delay clearance by 4 weeks.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EF4444]/15 border border-[#EF4444]/30 text-[10px] font-mono text-[#EF4444]">
                        Status: Shipment Paralyzed at Rotterdam Port
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Telemetry Ticker */}
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-[#747F88] bg-[#060A10]/80 px-3 py-1.5 rounded-lg border border-[#1B283D] backdrop-blur-sm">
                <div>SWEDEN CENTRAL CLUSTER: 4 NODES ONLINE</div>
                <div className="text-[#00F2FE]">INFERENCE LATENCY: 28.4ms</div>
                <div className="hidden sm:block text-[#10B981]">REGULATION (EU) 2023/1115 COMPLIANT</div>
              </div>
            </div>

            {/* Quick Metrics Underneath */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-[#060A10] border border-[#1B283D]">
                <div className="text-[10px] text-[#747F88] uppercase">Analysis Speed</div>
                <div className="text-base font-bold text-white mt-0.5">&lt; 30 Seconds</div>
                <div className="text-[9px] text-[#10B981]">vs 3 weeks manual</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#060A10] border border-[#1B283D]">
                <div className="text-[10px] text-[#747F88] uppercase">Resolution</div>
                <div className="text-base font-bold text-[#00F2FE] mt-0.5">10-Meter SAR</div>
                <div className="text-[9px] text-[#747F88]">C-Band Microwave</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#060A10] border border-[#1B283D]">
                <div className="text-[10px] text-[#747F88] uppercase">False Alarm Rate</div>
                <div className="text-base font-bold text-[#10B981] mt-0.5">&lt; 0.6%</div>
                <div className="text-[9px] text-[#10B981]">99.4% precision</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#060A10] border border-[#1B283D]">
                <div className="text-[10px] text-[#747F88] uppercase">Filing Format</div>
                <div className="text-base font-bold text-white mt-0.5">TRACES NT</div>
                <div className="text-[9px] text-[#00F2FE]">1-Click XML/JSON</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
