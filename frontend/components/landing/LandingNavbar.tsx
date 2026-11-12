"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, ExternalLink, ShieldCheck } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

interface LandingNavbarProps {
  onOpenPilotModal: () => void;
}

export default function LandingNavbar({ onOpenPilotModal }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-[#F4F5F6]/95 backdrop-blur-md border-b border-[#C8CFD5] shadow-xs py-3"
          : "bg-[#F4F5F6] border-b border-[#C8CFD5]/60 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo & EU Seal */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/oxeous-logo-tight.png"
                alt="Oxeous"
                style={{ height: "24px", width: "auto" }}
                className="h-[24px] max-h-[24px] w-auto object-contain"
              />
              <div className="h-4 w-[1px] bg-[#C8CFD5]" />
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.25)] px-2 py-0.5 rounded-md">
                <EULogoSeal className="w-3.5 h-3.5 text-[#315F50]" />
                <span>EUDR OS</span>
              </span>
            </Link>

            {/* Copernicus Live Node Ticker */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#E3E7EA] border border-[#C8CFD5] text-[11px] font-mono text-[#747F88]">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#315F50] animate-pulse" />
              <span className="text-[#1D2227] font-medium">Copernicus Sentinel-1 SAR</span>
              <span className="text-[#AAB3BB]">·</span>
              <span className="text-[#315F50]">Azure Sweden Central</span>
            </div>
          </div>

          {/* Center Navigation Links (CARTO / Clay style) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-mono font-medium text-[#747F88]">
            <a href="#radar-advantage" className="hover:text-[#1D2227] transition-colors">
              Radar Advantage
            </a>
            <a href="#dossier-showcase" className="hover:text-[#1D2227] transition-colors">
              Audit Dossiers
            </a>
            <a href="#pipeline" className="hover:text-[#1D2227] transition-colors">
              Architecture
            </a>
            <a href="#smallholder-equity" className="hover:text-[#1D2227] transition-colors">
              Smallholder Equity
            </a>
            <a href="#partners" className="hover:text-[#1D2227] transition-colors">
              Partners
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3 font-mono text-xs">
            <button
              onClick={onOpenPilotModal}
              className="px-3.5 py-2 text-[#1D2227] hover:text-[#315F50] font-medium transition-colors"
            >
              Request Pilot
            </button>

            <Link
              href="/cockpit/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#315F50] hover:bg-[#25493D] text-white font-semibold rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <span>Launch Cockpit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/cockpit/"
              className="px-2.5 py-1.5 text-[11px] font-mono font-semibold text-white bg-[#315F50] rounded-md"
            >
              Cockpit
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-[#747F88] hover:text-[#1D2227]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-[#C8CFD5] flex flex-col gap-2.5 font-mono text-xs pb-3">
            <a
              href="#radar-advantage"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#1D2227] py-1"
            >
              Radar Advantage
            </a>
            <a
              href="#dossier-showcase"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#1D2227] py-1"
            >
              Audit Dossiers
            </a>
            <a
              href="#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#1D2227] py-1"
            >
              Architecture
            </a>
            <a
              href="#smallholder-equity"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#1D2227] py-1"
            >
              Smallholder Equity
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPilotModal();
              }}
              className="w-full mt-2 py-2 text-center rounded-lg bg-[#E3E7EA] text-[#1D2227] font-medium"
            >
              Request Enterprise Pilot
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
