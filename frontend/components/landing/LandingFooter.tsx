"use client";

import React from "react";
import Link from "next/link";
import { Satellite, ShieldCheck, Cpu, ArrowUpRight, Globe, FileText, Heart } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="bg-[#060A10] border-t border-[#1B283D] pt-16 pb-12 font-mono text-xs text-[#747F88]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#1B283D]">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0F1724] border border-[#1B283D] flex items-center justify-center text-[#00F2FE]">
                <Satellite className="w-4 h-4" />
              </div>
              <span className="font-mono text-base font-bold text-white tracking-tight">
                OXEOUS
              </span>
            </div>
            <p className="text-[11px] text-[#AAB3BB] leading-relaxed">
              Autonomous spatial-legal verification engine for European Union Deforestation Regulation (EUDR) compliance.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Azure Sweden Central · Operational</span>
            </div>
          </div>

          {/* Col 2: Platform Links */}
          <div className="space-y-3">
            <div className="text-white font-bold tracking-wider text-[11px] uppercase">Platform</div>
            <ul className="space-y-2">
              <li>
                <Link href="/cockpit/" className="hover:text-[#00F2FE] flex items-center gap-1">
                  <span>Spatial Cockpit</span>
                  <ArrowUpRight className="w-3 h-3 text-[#00F2FE]" />
                </Link>
              </li>
              <li>
                <a href="#dual-sensor" className="hover:text-[#00F2FE]">
                  Sentinel-1 SAR Radar
                </a>
              </li>
              <li>
                <a href="#surgical-repair" className="hover:text-[#00F2FE]">
                  Surgical Remediation
                </a>
              </li>
              <li>
                <a href="#pipeline" className="hover:text-[#00F2FE]">
                  4-Agent Pipeline
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-[#00F2FE]">
                  Statutory Fine Calculator
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Regulatory & Science */}
          <div className="space-y-3">
            <div className="text-white font-bold tracking-wider text-[11px] uppercase">
              Regulatory Standards
            </div>
            <ul className="space-y-2">
              <li>
                <span className="text-[#C8CFD5]">Regulation (EU) 2023/1115</span>
              </li>
              <li>
                <span className="text-[#AAB3BB]">Article 2(5) Agricultural Use</span>
              </li>
              <li>
                <span className="text-[#AAB3BB]">Article 9 Polygon Geolocation</span>
              </li>
              <li>
                <span className="text-[#AAB3BB]">Article 10 Due Diligence Systems</span>
              </li>
              <li>
                <span className="text-[#AAB3BB]">EU TRACES NT Customs Schema</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Institutional Backing */}
          <div className="space-y-3">
            <div className="text-white font-bold tracking-wider text-[11px] uppercase">
              Institutional Backing
            </div>
            <ul className="space-y-2 text-[11px]">
              <li className="text-[#C8CFD5]">Microsoft for Startups ($150k)</li>
              <li className="text-[#C8CFD5]">Google DeepMind Research Grant</li>
              <li className="text-[#C8CFD5]">Z_GIS · University of Salzburg</li>
              <li className="text-[#C8CFD5]">Copernicus Digital Earth (EM CDE)</li>
              <li className="text-[#C8CFD5]">Microsoft Imagine Cup 2027</li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimers */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px]">
          <div>
            © 2026 Oxeous. Contains modified Copernicus Sentinel data (2020–2026). All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[#747F88]">
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
