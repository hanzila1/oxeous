"use client";

import { useState } from "react";
import SiteNav from "@/components/site/SiteNav";
import Hero from "@/components/site/Hero";
import RegulationSection from "@/components/site/RegulationSection";
import ProductSection from "@/components/site/ProductSection";
import SiteFooter from "@/components/site/SiteFooter";
import PilotModal from "@/components/site/PilotModal";
import CommandPalette from "@/components/site/CommandPalette";

export default function HomePage() {
  const [pilotOpen, setPilotOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="site-root min-h-screen bg-paper text-ink selection:bg-canopy/20 selection:text-ink">
      {/* Raycast / Linear Floating Glass Pill Navigation with ⌘K Trigger */}
      <SiteNav
        onPilot={() => setPilotOpen(true)}
        onCommand={() => setCmdOpen(true)}
      />

      {/* Full-Bleed Poster Hero (matches docs/oxeous-hero-banner.png) */}
      <Hero onPilot={() => setPilotOpen(true)} />

      {/* EUDR Regulation & 7 Key Commodities Wheel (matches docs/EUDR Regulation.png) */}
      <RegulationSection />

      {/* Precision Bento Grid, Mapbox-Style Spatial Stage & Impact Calculator */}
      <ProductSection onPilot={() => setPilotOpen(true)} />

      {/* Co-Branded Footer (Oxeous | Imagine Cup By Microsoft for Startups) */}
      <SiteFooter onPilot={() => setPilotOpen(true)} />

      {/* Raycast / Linear ⌘K Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onPilot={() => setPilotOpen(true)}
      />

      {/* Enterprise Pilot Modal */}
      <PilotModal open={pilotOpen} onClose={() => setPilotOpen(false)} />
    </div>
  );
}
