"use client";

import React from "react";
import { HeartHandshake, ShieldCheck, Globe, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function MissionManifesto() {
  return (
    <section id="mission" className="py-24 bg-[#0A101A] border-t border-[#1B283D] relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1724] border border-[#1B283D] text-xs font-mono text-[#10B981] mb-4">
            <HeartHandshake className="w-3.5 h-3.5 text-[#10B981]" />
            <span>THE OXEOUS MISSION</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Protecting 50 Million Smallholders{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-[#00F2FE]">
              While Ending Global Deforestation
            </span>
          </h2>

          <p className="mt-6 text-base sm:text-lg text-[#C8CFD5] leading-relaxed">
            Over <strong>70% of the world’s cocoa and coffee</strong> is produced by smallholder farming families living on less than 4 hectares. 
            When crude satellite tools generate false deforestation alerts, corporate buyers panic and cut smallholders off from European trade, 
            driving rural poverty and inadvertently accelerating illegal forest conversion.
          </p>
        </div>

        {/* 3 Mission Pillars */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-[#060A10] border border-[#1B283D] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-mono text-white">Zero Equipment Burden</h3>
              <p className="mt-2 text-xs text-[#747F88] leading-relaxed">
                Smallholders cannot afford multi-thousand-dollar differential GPS hardware. 
                Using Microsoft FTW AI, Oxeous automatically builds accurate farm boundary polygons from a single smartphone GPS point.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1B283D] text-[10px] font-mono text-[#10B981]">
              Article 9 Accessible
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#060A10] border border-[#1B283D] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-mono text-white">Truth Under Cloud Cover</h3>
              <p className="mt-2 text-xs text-[#747F88] leading-relaxed">
                Persistent tropical rains should not result in innocent farmers being labeled illegal deforesters. 
                Our Copernicus Sentinel-1 radar pipeline provides all-weather truth 365 days a year.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1B283D] text-[10px] font-mono text-[#00F2FE]">
              Article 2(5) Verified
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#060A10] border border-[#1B283D] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-mono text-white">Continuous European Access</h3>
              <p className="mt-2 text-xs text-[#747F88] leading-relaxed">
                By surgically repairing minor boundary overlaps rather than condemning whole farms, 
                we keep smallholder cooperatives legally eligible for direct customs clearance at European ports.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1B283D] text-[10px] font-mono text-[#F59E0B]">
              Customs-Ready DDS
            </div>
          </div>
        </div>

        {/* Bottom Cockpit Callout */}
        <div className="mt-16 max-w-4xl mx-auto p-8 rounded-2xl bg-gradient-to-r from-[#0F1724] via-[#162234] to-[#0F1724] border border-[#1B283D] text-center shadow-2xl">
          <h3 className="text-xl sm:text-2xl font-bold font-mono text-white">
            Experience the Autonomous Spatial Cockpit
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-[#AAB3BB] max-w-xl mx-auto">
            Test the live geospatial engine directly with our sample batch of smallholder plots across Colombia, Ghana, and Indonesia.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/cockpit/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#10B981] text-[#060A10] font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-glow-cyan transition-all"
            >
              <span>Launch Live Cockpit</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
