"use client";

import React from "react";
import Link from "next/link";
import { Users, HeartHandshake, ShieldCheck, Globe, ArrowRight } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

export default function SmallholderMissionSection() {
  return (
    <section id="smallholder-equity" className="py-20 md:py-28 bg-[#F4F5F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3E7EA] border border-[#C8CFD5] text-xs font-mono text-[#315F50] mb-3">
            <HeartHandshake className="w-3.5 h-3.5 text-[#315F50]" />
            <span>SMALLHOLDER INCLUSION</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-[#1D2227] tracking-tight">
            Protecting 50 Million Smallholders While Ending Deforestation
          </h2>

          <p className="mt-4 text-base text-[#747F88] leading-relaxed">
            Over <strong>70% of the world’s cocoa and coffee</strong> is produced by smallholder farming families on plots smaller than 4 hectares. 
            When crude satellite tools generate false deforestation alarms, corporate buyers cut smallholders off from European trade—accelerating poverty and unintended forest conversion.
          </p>
        </div>

        {/* 3 Inclusion Pillars (Clay style) */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#C8CFD5] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[rgba(49,95,80,0.08)] text-[#315F50] flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold font-mono text-[#1D2227]">
                Zero Hardware Burden
              </h3>
              <p className="mt-2 text-xs text-[#747F88] leading-relaxed">
                Smallholders cannot afford multi-thousand-dollar survey gear. 
                Using Microsoft FTW AI, Oxeous automatically reconstructs topological farm boundaries from single GPS coordinates.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#C8CFD5] text-[10px] font-mono text-[#315F50] font-semibold">
              Article 9 Accessible
            </div>
          </div>

          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#C8CFD5] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[rgba(49,95,80,0.08)] text-[#315F50] flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold font-mono text-[#1D2227]">
                All-Weather Truth
              </h3>
              <p className="mt-2 text-xs text-[#747F88] leading-relaxed">
                Routine tropical rains and pruning cycles should not result in innocent farmers being falsely flagged as illegal deforesters. 
                Our radar pipeline provides cloud-immune verification 365 days a year.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#C8CFD5] text-[10px] font-mono text-[#315F50] font-semibold">
              Article 2(5) Verified
            </div>
          </div>

          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#C8CFD5] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[rgba(49,95,80,0.08)] text-[#315F50] flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold font-mono text-[#1D2227]">
                Surgical Boundary Repair
              </h3>
              <p className="mt-2 text-xs text-[#747F88] leading-relaxed">
                By automatically carving out minor boundary overlaps rather than disqualifying entire cooperatives, 
                we keep compliant smallholder harvests flowing legally into European ports.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#C8CFD5] text-[10px] font-mono text-[#315F50] font-semibold">
              Salvaged Clean Volume
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-14 max-w-4xl mx-auto p-8 rounded-2xl bg-white border border-[#C8CFD5] text-center shadow-panel">
          <h3 className="text-xl sm:text-2xl font-bold font-mono text-[#1D2227]">
            Ready to Verify Your Supply Chain?
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-[#747F88] max-w-lg mx-auto">
            Test the live spatial cockpit with our sample batch of smallholder plots across Colombia, Ghana, and Indonesia.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/cockpit/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#315F50] hover:bg-[#25493D] text-white font-mono font-semibold text-xs rounded-xl shadow-sm transition-all"
            >
              <span>Launch Live Spatial Cockpit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
