"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Satellite, Radio, ShieldCheck, ArrowRight, Menu, X, Cpu } from "lucide-react";

interface LandingNavbarProps {
  onOpenPilotModal: () => void;
}

export default function LandingNavbar({ onOpenPilotModal }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#060A10]/90 backdrop-blur-md border-b border-[#1B283D] shadow-2xl py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Orbital Brand */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[#0F1724] to-[#162234] border border-[#1B283D] group-hover:border-[#00F2FE]/50 transition-colors shadow-lg">
                <Satellite className="w-5 h-5 text-[#00F2FE] group-hover:rotate-12 transition-transform duration-300" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-lg font-bold tracking-tight text-white group-hover:text-[#00F2FE] transition-colors">
                    OXEOUS
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    EUDR OS
                  </span>
                </div>
                <span className="text-[10px] text-[#747F88] font-mono tracking-wider -mt-0.5">
                  EARTH OBSERVATION AI
                </span>
              </div>
            </Link>

            {/* Live Telemetry Pill */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F1724]/80 border border-[#1B283D] text-[11px] font-mono text-[#747F88]">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#00F2FE] animate-pulse" />
              <span className="text-[#AAB3BB]">COPERNICUS SENTINEL-1 SAR</span>
              <span className="text-[#1B283D]">|</span>
              <span className="text-[#10B981]">AZURE SWEDEN CENTRAL</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            <a
              href="#dual-sensor"
              className="text-xs font-mono uppercase tracking-wider text-[#AAB3BB] hover:text-[#00F2FE] transition-colors"
            >
              Radar vs Optical
            </a>
            <a
              href="#surgical-repair"
              className="text-xs font-mono uppercase tracking-wider text-[#AAB3BB] hover:text-[#00F2FE] transition-colors"
            >
              Surgical Remediation
            </a>
            <a
              href="#pipeline"
              className="text-xs font-mono uppercase tracking-wider text-[#AAB3BB] hover:text-[#00F2FE] transition-colors"
            >
              Pipeline Architecture
            </a>
            <a
              href="#calculator"
              className="text-xs font-mono uppercase tracking-wider text-[#AAB3BB] hover:text-[#00F2FE] transition-colors"
            >
              Fine Calculator
            </a>
            <a
              href="#mission"
              className="text-xs font-mono uppercase tracking-wider text-[#AAB3BB] hover:text-[#00F2FE] transition-colors"
            >
              Mission
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onOpenPilotModal}
              className="px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-[#C8CFD5] hover:text-white rounded-lg border border-[#1B283D] hover:border-[#2A3D5B] bg-[#0F1724] transition-all"
            >
              Request Pilot
            </button>

            <Link
              href="/cockpit/"
              className="relative inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#060A10] bg-gradient-to-r from-[#00F2FE] to-[#10B981] hover:brightness-110 rounded-lg shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Launch Cockpit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/cockpit/"
              className="px-2.5 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#060A10] bg-[#00F2FE] rounded"
            >
              Cockpit
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded text-[#AAB3BB] hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-[#1B283D] flex flex-col gap-3 pb-4 font-mono text-xs">
            <a
              href="#dual-sensor"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#C8CFD5] py-1"
            >
              Radar vs Optical
            </a>
            <a
              href="#surgical-repair"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#C8CFD5] py-1"
            >
              Surgical Remediation
            </a>
            <a
              href="#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#C8CFD5] py-1"
            >
              Pipeline Architecture
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#C8CFD5] py-1"
            >
              Fine Calculator
            </a>
            <a
              href="#mission"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#C8CFD5] py-1"
            >
              Mission
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPilotModal();
              }}
              className="w-full mt-2 py-2 text-center rounded bg-[#0F1724] border border-[#1B283D] text-[#C8CFD5]"
            >
              Request Enterprise Pilot
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
