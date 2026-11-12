"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Satellite, Layers, CheckCircle2 } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

interface HeroSectionProps {
  onOpenPilotModal: () => void;
}

export default function HeroSection({ onOpenPilotModal }: HeroSectionProps) {
  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-[#F4F5F6]">
      {/* Background Topographic / Spatial Grid Lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(circle, #C8CFD5 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-[rgba(49,95,80,0.05)] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Institutional Trust Ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#C8CFD5] shadow-xs text-xs font-mono text-[#343B42]">
            <span className="w-2 h-2 rounded-full bg-[#315F50]" />
            <span>Backed by <strong>Microsoft for Startups</strong> ($150k Azure AI)</span>
            <span className="text-[#C8CFD5]">·</span>
            <span><strong>Google DeepMind</strong> Grantee</span>
            <span className="hidden sm:inline text-[#C8CFD5]">·</span>
            <span className="hidden sm:inline"><strong>Z_GIS Salzburg</strong> EM CDE</span>
          </div>
        </div>

        {/* Editorial Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1D2227] leading-[1.12]">
            The Cloud-Native Spatial OS for{" "}
            <span className="text-[#315F50]">
              EUDR Compliance
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg lg:text-xl text-[#747F88] max-w-3xl mx-auto leading-relaxed">
            Eliminating false deforestation alarms on <strong>€100B+</strong> of annual agricultural imports. 
            In under 30 seconds, Oxeous fuses cloud-penetrating <strong>Sentinel-1 SAR radar</strong>, 
            automated smallholder boundary delineation, and biological yield limits to generate customs-ready <strong>TRACES NT filings</strong>.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 font-mono text-xs">
            <Link
              href="/cockpit/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#315F50] hover:bg-[#25493D] text-white font-semibold rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <span>Launch Spatial Cockpit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#dossier-showcase"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-[#E3E7EA] text-[#1D2227] font-medium rounded-xl border border-[#C8CFD5] shadow-xs transition-all"
            >
              <span>Explore Live Audit Dossiers</span>
            </a>

            <button
              onClick={onOpenPilotModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[#747F88] hover:text-[#1D2227] transition-colors"
            >
              <span>Book Enterprise Pilot</span>
            </button>
          </div>
        </div>

        {/* High-Fidelity Product Interface Frame (CARTO-style) */}
        <div className="mt-12 max-w-5xl mx-auto">
          <div className="relative rounded-2xl bg-white border border-[#C8CFD5] p-2.5 sm:p-3 shadow-panel-lg overflow-hidden">
            {/* Mac / Browser Header Strip */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#F4F5F6] rounded-t-xl border-b border-[#C8CFD5] mb-2 font-mono text-[11px] text-[#747F88]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8CFD5]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8CFD5]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8CFD5]" />
                </div>
                <div className="h-3 w-[1px] bg-[#C8CFD5] mx-1" />
                <span className="text-[#1D2227] font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#315F50] animate-pulse" />
                  oxeous.app/cockpit — Huila Coffee Basin (Article 2(5) Verified)
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[10px]">
                <span className="text-[#315F50] font-bold">PWRI-3D CONSENSUS</span>
                <span>ESA SENTINEL-1 C-BAND SAR</span>
              </div>
            </div>

            {/* Live Platform Screenshot */}
            <div className="relative rounded-lg overflow-hidden border border-[#C8CFD5] bg-[#E3E7EA]">
              <img
                src="/oxeous-cockpit-hero.png"
                alt="Oxeous Spatial Cockpit Interface"
                className="w-full h-auto object-cover rounded-lg"
              />

              {/* Floating Feature Overlays (CARTO / Linear style) */}
              <div className="absolute top-4 right-4 hidden md:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#C8CFD5] shadow-sm font-mono text-[11px] text-[#1D2227]">
                <CheckCircle2 className="w-4 h-4 text-[#315F50]" />
                <span>10m Radar: 100% Cloud Penetration</span>
              </div>

              <div className="absolute bottom-4 left-4 hidden md:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#C8CFD5] shadow-sm font-mono text-[11px] text-[#1D2227]">
                <EULogoSeal className="w-4 h-4 text-[#315F50]" />
                <span>Article 2(5) Agroforestry Statutory Clearance</span>
              </div>

              <div className="absolute bottom-4 right-4 hidden md:flex items-center gap-2 bg-[#315F50] text-white px-3 py-1.5 rounded-lg shadow-sm font-mono text-[11px] font-medium">
                <span>TRACES NT XML Export Ready</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Quick Metrics Bar Under Frame */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-[#F4F5F6] border border-[#C8CFD5]">
                <div className="text-[10px] text-[#747F88] uppercase">Audit Clearance Speed</div>
                <div className="text-base font-bold text-[#1D2227] mt-0.5">&lt; 30 Seconds</div>
                <div className="text-[10px] text-[#315F50]">Automated pipeline</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F4F5F6] border border-[#C8CFD5]">
                <div className="text-[10px] text-[#747F88] uppercase">Spatial Sensor</div>
                <div className="text-base font-bold text-[#315F50] mt-0.5">Sentinel-1 SAR</div>
                <div className="text-[10px] text-[#747F88]">10m C-Band Radar</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F4F5F6] border border-[#C8CFD5]">
                <div className="text-[10px] text-[#747F88] uppercase">False Alarm Rate</div>
                <div className="text-base font-bold text-[#315F50] mt-0.5">&lt; 0.6%</div>
                <div className="text-[10px] text-[#747F88]">vs 30%+ in optical</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F4F5F6] border border-[#C8CFD5]">
                <div className="text-[10px] text-[#747F88] uppercase">Customs Protocol</div>
                <div className="text-base font-bold text-[#1D2227] mt-0.5">TRACES NT</div>
                <div className="text-[10px] text-[#315F50]">Article 9 & 12 Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
