"use client";

import React, { useState } from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import RadarSpectralComparator from "@/components/landing/RadarSpectralComparator";
import SurgicalRemediationWidget from "@/components/landing/SurgicalRemediationWidget";
import ArchitecturePipeline from "@/components/landing/ArchitecturePipeline";
import RegulatoryCalculator from "@/components/landing/RegulatoryCalculator";
import MissionManifesto from "@/components/landing/MissionManifesto";
import LandingFooter from "@/components/landing/LandingFooter";
import EnterprisePilotModal from "@/components/landing/EnterprisePilotModal";

export default function LandingPage() {
  const [pilotModalOpen, setPilotModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#060A10] text-[#1D2227] selection:bg-[#00F2FE]/30 selection:text-white">
      {/* Sticky Glassmorphic Copernicus Navigation */}
      <LandingNavbar onOpenPilotModal={() => setPilotModalOpen(true)} />

      {/* Hero Section with Live Radar Console */}
      <HeroSection onOpenPilotModal={() => setPilotModalOpen(true)} />

      {/* Dual-Sensor Spectral Physics Comparator (Radar vs Optical) */}
      <RadarSpectralComparator />

      {/* Surgical Polygon Remediation Sandbox */}
      <SurgicalRemediationWidget />

      {/* 4-Agent Pipeline Architecture */}
      <ArchitecturePipeline />

      {/* EUDR Article 25 Regulatory Fine & ROI Calculator */}
      <RegulatoryCalculator onOpenPilotModal={() => setPilotModalOpen(true)} />

      {/* Mission & Smallholder Protection Manifesto */}
      <MissionManifesto />

      {/* Institutional Backing & Legal Footer */}
      <LandingFooter />

      {/* Enterprise Pilot Request Modal */}
      <EnterprisePilotModal
        isOpen={pilotModalOpen}
        onClose={() => setPilotModalOpen(false)}
      />
    </main>
  );
}
