"use client";

import React, { useState } from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import RadarAdvantageSection from "@/components/landing/RadarAdvantageSection";
import DossierShowcaseSection from "@/components/landing/DossierShowcaseSection";
import ArchitectureSection from "@/components/landing/ArchitectureSection";
import SmallholderMissionSection from "@/components/landing/SmallholderMissionSection";
import InstitutionalPartnersSection from "@/components/landing/InstitutionalPartnersSection";
import LandingFooter from "@/components/landing/LandingFooter";
import EnterprisePilotModal from "@/components/landing/EnterprisePilotModal";

export default function LandingPage() {
  const [pilotModalOpen, setPilotModalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#F4F5F6] text-[#1D2227] selection:bg-[rgba(49,95,80,0.18)] selection:text-[#1D2227]">
      {/* Editorial Navigation */}
      <LandingNavbar onOpenPilotModal={() => setPilotModalOpen(true)} />

      {/* Hero Section with Real Cockpit Interface Frame */}
      <HeroSection onOpenPilotModal={() => setPilotModalOpen(true)} />

      {/* Remote Sensing Physics: Radar vs Optical */}
      <RadarAdvantageSection />

      {/* Real Earth Observation Audit Dossier Portfolio */}
      <DossierShowcaseSection />

      {/* Cloud-Native 4-Node Pipeline Architecture */}
      <ArchitectureSection />

      {/* Smallholder Inclusion & Human-Centered Mission */}
      <SmallholderMissionSection />

      {/* Institutional Backing & Ecosystem Partners */}
      <InstitutionalPartnersSection />

      {/* Light Steel Editorial Footer */}
      <LandingFooter />

      {/* Enterprise Pilot Modal */}
      <EnterprisePilotModal
        isOpen={pilotModalOpen}
        onClose={() => setPilotModalOpen(false)}
      />
    </main>
  );
}
