"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, CheckCircle2, AlertOctagon, ExternalLink, ArrowRight, ShieldCheck } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

interface DossierCase {
  id: string;
  name: string;
  commodity: string;
  country: string;
  area: string;
  verdict: "COMPLIANT" | "NON-COMPLIANT" | "REMEDIATED";
  article: string;
  summary: string;
  figurePath: string;
  heatmapPath: string;
  pdfPath: string;
  htmlPath: string;
}

const dossiers: DossierCase[] = [
  {
    id: "colombia",
    name: "01 · Huila Agroforestry Coffee",
    commodity: "Coffee (Arabica)",
    country: "Colombia",
    area: "12.4 ha",
    verdict: "COMPLIANT",
    article: "Article 2(5) Agricultural Use",
    summary: "Sentinel-1 SAR backscatter and Sentinel-2 NDVI confirm continuous shade-grown coffee canopy since 2018. Zero primary forest conversion detected against the JRC 2020 cutoff baseline.",
    figurePath: "/dossiers/01_Colombia_Coffee/individual_figures/Figure_1_Forest_Canopy_and_Deforestation_Verification_Map_with_Legend.png",
    heatmapPath: "/dossiers/01_Colombia_Coffee/individual_figures/Figure_2_Google_FDP_Coffee_Canopy_Probability_Heatmap_with_Legend.png",
    pdfPath: "/dossiers/01_Colombia_Coffee/EUDR_Compliance_Audit_Report_Colombia_Coffee.pdf",
    htmlPath: "/dossiers/01_Colombia_Coffee/EUDR_Compliance_Audit_Report_Colombia_Coffee.html",
  },
  {
    id: "ghana",
    name: "02 · Ashanti Smallholder Cocoa",
    commodity: "Cocoa",
    country: "Ghana",
    area: "8.7 ha",
    verdict: "NON-COMPLIANT",
    article: "Article 3 Deforestation Cutoff Violation",
    summary: "Multi-sensor analysis detected 3.2 hectares of forest canopy loss occurring in March 2022 inside a gazetted forest reserve buffer. Non-compliant for EU import.",
    figurePath: "/dossiers/02_Ghana_Cocoa/individual_figures/Figure_1_Forest_Canopy_Loss_and_Protected_Reserves_Map_with_Legend.png",
    heatmapPath: "/dossiers/02_Ghana_Cocoa/individual_figures/Figure_2_Google_FDP_Cocoa_Canopy_Density_Heatmap_with_Legend.png",
    pdfPath: "/dossiers/02_Ghana_Cocoa/EUDR_Compliance_Audit_Report_Ghana_Cocoa.pdf",
    htmlPath: "/dossiers/02_Ghana_Cocoa/EUDR_Compliance_Audit_Report_Ghana_Cocoa.html",
  },
  {
    id: "thailand",
    name: "03 · Songkhla Natural Rubber",
    commodity: "Natural Rubber",
    country: "Thailand",
    area: "15.2 ha",
    verdict: "COMPLIANT",
    article: "Article 2(5) Planted Forest Baseline",
    summary: "C-band radar dielectric roughness metrics identify mature Hevea brasiliensis stand established in 2014. No post-2020 deforestation identified. Customs-ready statement issued.",
    figurePath: "/dossiers/03_Thailand_Rubber/individual_figures/Figure_1_Forest_Canopy_and_Deforestation_Verification_Map_with_Legend.png",
    heatmapPath: "/dossiers/03_Thailand_Rubber/individual_figures/Figure_2_Google_FDP_Rubber_Canopy_Probability_Heatmap_with_Legend.png",
    pdfPath: "/dossiers/03_Thailand_Rubber/EUDR_Compliance_Audit_Report_Thailand_Rubber.pdf",
    htmlPath: "/dossiers/03_Thailand_Rubber/EUDR_Compliance_Audit_Report_Thailand_Rubber.html",
  },
  {
    id: "indonesia",
    name: "04 · Riau Smallholder Palm Oil",
    commodity: "Oil Palm",
    country: "Indonesia",
    area: "24.1 ha",
    verdict: "REMEDIATED",
    article: "Article 9 Parcel Boundary Repair",
    summary: "A 0.8-hectare perimeter overlap with adjacent protected peatland was surgically carved out. The remaining 23.3 hectares were certified compliant with a strict 46.6 MT biological yield ceiling.",
    figurePath: "/dossiers/04_Indonesia_Palm_Oil/individual_figures/Figure_1_Forest_Canopy_and_Deforestation_Verification_Map_with_Legend.png",
    heatmapPath: "/dossiers/04_Indonesia_Palm_Oil/individual_figures/Figure_2_Google_FDP_Palm_Canopy_Density_Heatmap_with_Legend.png",
    pdfPath: "/dossiers/04_Indonesia_Palm_Oil/EUDR_Compliance_Audit_Report_Indonesia_Palm_Oil.pdf",
    htmlPath: "/dossiers/04_Indonesia_Palm_Oil/EUDR_Compliance_Audit_Report_Indonesia_Palm_Oil.html",
  },
];

export default function DossierShowcaseSection() {
  const [activeDossier, setActiveDossier] = useState<DossierCase>(dossiers[0]);

  return (
    <section id="dossier-showcase" className="py-20 md:py-28 bg-[#F4F5F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3E7EA] border border-[#C8CFD5] text-xs font-mono text-[#315F50] mb-3">
            <FileText className="w-3.5 h-3.5 text-[#315F50]" />
            <span>AUDIT-GRADE DOSSIER PORTFOLIO</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-[#1D2227] tracking-tight">
            Statutory Verification Evidence in Action
          </h2>

          <p className="mt-4 text-base text-[#747F88] leading-relaxed">
            Every parcel processed through Oxeous receives a tamper-proof statutory audit dossier 
            combining satellite raster evidence, phenology trajectories, and customs-ready TRACES NT declarations.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto font-mono text-xs">
          {dossiers.map((d) => {
            const isSelected = activeDossier.id === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setActiveDossier(d)}
                className={`px-4 py-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-[#315F50] text-white border-[#315F50] font-bold shadow-xs"
                    : "bg-white text-[#343B42] border-[#C8CFD5] hover:bg-[#E3E7EA]"
                }`}
              >
                {d.name}
              </button>
            );
          })}
        </div>

        {/* Active Dossier Display Card */}
        <div className="mt-8 max-w-5xl mx-auto rounded-2xl bg-white border border-[#C8CFD5] p-6 sm:p-8 shadow-panel-lg">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4 pb-6 border-b border-[#C8CFD5]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#747F88] mb-1">
                <span>COMMODITY: {activeDossier.commodity.toUpperCase()}</span>
                <span>·</span>
                <span>ORIGIN: {activeDossier.country.toUpperCase()}</span>
                <span>·</span>
                <span>ACREAGE: {activeDossier.area}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-mono text-[#1D2227]">
                {activeDossier.name}
              </h3>
            </div>

            {/* Verdict Badge */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${
                  activeDossier.verdict === "COMPLIANT"
                    ? "bg-[rgba(49,95,80,0.08)] text-[#315F50] border border-[rgba(49,95,80,0.25)]"
                    : activeDossier.verdict === "REMEDIATED"
                    ? "bg-[rgba(197,138,58,0.08)] text-[#C58A3A] border border-[rgba(197,138,58,0.25)]"
                    : "bg-[rgba(166,75,69,0.08)] text-[#A64B45] border border-[rgba(166,75,69,0.25)]"
                }`}
              >
                {activeDossier.verdict === "COMPLIANT" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertOctagon className="w-4 h-4" />
                )}
                <span>{activeDossier.verdict}</span>
              </span>

              <a
                href={activeDossier.pdfPath}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F4F5F6] border border-[#C8CFD5] hover:border-[#747F88] text-xs font-mono text-[#1D2227] transition-all"
              >
                <span>View Full PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Evidence Figures Grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            <div className="rounded-xl overflow-hidden border border-[#C8CFD5] bg-[#F4F5F6]">
              <img
                src={activeDossier.figurePath}
                alt="Deforestation Cartographic Map"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="rounded-xl overflow-hidden border border-[#C8CFD5] bg-[#F4F5F6]">
              <img
                src={activeDossier.heatmapPath}
                alt="Canopy Probability Heatmap"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* Statutory Reasoning Box */}
          <div className="mt-6 p-4 rounded-xl bg-[#F4F5F6] border border-[#C8CFD5] font-mono text-xs">
            <div className="flex items-center justify-between text-[#747F88] pb-1.5 mb-1.5 border-b border-[#C8CFD5] text-[11px]">
              <span className="font-semibold text-[#1D2227]">STATUTORY FINDINGS // {activeDossier.article}</span>
              <span className="text-[#315F50]">REGULATION (EU) 2023/1115</span>
            </div>
            <p className="text-[#343B42] leading-relaxed">
              {activeDossier.summary}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
