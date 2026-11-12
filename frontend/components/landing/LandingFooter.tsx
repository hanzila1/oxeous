"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

export default function LandingFooter() {
  return (
    <footer className="bg-[#F4F5F6] border-t border-[#C8CFD5] pt-14 pb-12 font-mono text-xs text-[#747F88]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#C8CFD5]">
          {/* Col 1: Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <img
                src="/oxeous-logo-tight.png"
                alt="Oxeous"
                style={{ height: "20px", width: "auto" }}
                className="h-[20px] max-h-[20px] w-auto object-contain"
              />
              <span className="text-[10px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] px-1.5 py-0.5 rounded border border-[rgba(49,95,80,0.25)]">
                EUDR OS
              </span>
            </div>
            <p className="text-[11px] text-[#747F88] leading-relaxed">
              Autonomous spatial-legal verification engine for European Union Deforestation Regulation (EUDR) compliance.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-[#315F50]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315F50] animate-pulse" />
              <span>Azure Sweden Central · Operational</span>
            </div>
          </div>

          {/* Col 2: Platform Links */}
          <div className="space-y-2.5">
            <div className="text-[#1D2227] font-bold tracking-wider text-[11px] uppercase">
              Platform
            </div>
            <ul className="space-y-1.5">
              <li>
                <Link href="/cockpit/" className="hover:text-[#1D2227] flex items-center gap-1 text-[#315F50] font-medium">
                  <span>Spatial Cockpit</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <a href="#radar-advantage" className="hover:text-[#1D2227]">
                  Radar Advantage
                </a>
              </li>
              <li>
                <a href="#dossier-showcase" className="hover:text-[#1D2227]">
                  Audit Dossiers
                </a>
              </li>
              <li>
                <a href="#pipeline" className="hover:text-[#1D2227]">
                  4-Node Pipeline
                </a>
              </li>
              <li>
                <a href="#smallholder-equity" className="hover:text-[#1D2227]">
                  Smallholder Inclusion
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Statutory Standards */}
          <div className="space-y-2.5">
            <div className="text-[#1D2227] font-bold tracking-wider text-[11px] uppercase">
              Statutory Basis
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li><span className="text-[#343B42]">Regulation (EU) 2023/1115</span></li>
              <li><span className="text-[#747F88]">Article 2(5) Agricultural Exemption</span></li>
              <li><span className="text-[#747F88]">Article 9 Polygon Geolocation</span></li>
              <li><span className="text-[#747F88]">Article 10 Due Diligence Systems</span></li>
              <li><span className="text-[#747F88]">EU TRACES NT Customs Schema</span></li>
            </ul>
          </div>

          {/* Col 4: Institutional Backing */}
          <div className="space-y-2.5">
            <div className="text-[#1D2227] font-bold tracking-wider text-[11px] uppercase">
              Backed By
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li><span className="text-[#343B42]">Microsoft for Startups ($150k)</span></li>
              <li><span className="text-[#343B42]">Google DeepMind Research Grant</span></li>
              <li><span className="text-[#343B42]">Z_GIS · University of Salzburg</span></li>
              <li><span className="text-[#343B42]">Copernicus Digital Earth (EM CDE)</span></li>
              <li><span className="text-[#343B42]">Microsoft Imagine Cup 2027</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom line */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
          <div>
            © 2026 Oxeous. Contains modified Copernicus Sentinel data (2020–2026). All rights reserved.
          </div>
          <div className="flex items-center gap-3 text-[#747F88]">
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Terms of Service</span>
            <span>·</span>
            <span>GDPR Data Residency: EU Only</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
