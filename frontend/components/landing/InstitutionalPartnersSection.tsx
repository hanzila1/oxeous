"use client";

import React from "react";
import { ShieldCheck, Award, Sparkles, Building, Landmark } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

const partners = [
  {
    name: "Microsoft for Startups",
    tier: "$150,000 Cloud & AI Resources",
    description: "Azure AI infrastructure and Microsoft Planetary Computer STAC access.",
  },
  {
    name: "Google DeepMind",
    tier: "Research Grantee",
    description: "Supported the development of GeoGemma, winning 'Best AI Use Case' in APAC.",
  },
  {
    name: "Z_GIS · University of Salzburg",
    tier: "Academic Research Anchor",
    description: "Department of Geoinformatics & Erasmus Mundus Copernicus Master in Digital Earth.",
  },
  {
    name: "Microsoft Imagine Cup",
    tier: "Global Challenger 2027",
    description: "Selected to compete in Earth Observation AI and global environmental compliance.",
  },
];

export default function InstitutionalPartnersSection() {
  return (
    <section id="partners" className="py-16 md:py-24 bg-[#FFFFFF] border-t border-[#C8CFD5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3E7EA] border border-[#C8CFD5] text-xs font-mono text-[#315F50] mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#315F50]" />
            <span>INSTITUTIONAL BACKING</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1D2227] tracking-tight">
            Supported by Leading Geospatial & AI Institutions
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto font-mono text-xs">
          {partners.map((p) => (
            <div
              key={p.name}
              className="p-5 rounded-xl bg-[#F4F5F6] border border-[#C8CFD5] flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] text-[#315F50] font-bold uppercase tracking-wider">
                  {p.tier}
                </span>
                <h3 className="text-sm font-bold text-[#1D2227] mt-1">
                  {p.name}
                </h3>
                <p className="mt-2 text-xs text-[#747F88] leading-relaxed">
                  {p.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
