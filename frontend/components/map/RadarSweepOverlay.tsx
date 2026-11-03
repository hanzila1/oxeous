"use client";

import React, { useEffect, useState } from "react";
import { RadarSweepIcon, Sentinel1RadarIcon, Sentinel2MSIIcon } from "@/components/icons/EOIcons";
import { cn } from "@/lib/utils";

interface Props {
  active: boolean;
  commodity?: string;
  country?: string;
}

export default function RadarSweepOverlay({ active, commodity, country }: Props) {
  const [dots, setDots] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (!active) {
      setDots([]);
      return;
    }
    // Generate simulated radar telemetry blips
    const generated = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: 35 + Math.random() * 30,
      y: 35 + Math.random() * 30,
      delay: Math.random() * 2,
    }));
    setDots(generated);
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden animate-fadeIn">
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#1D2227]/10 to-[#1D2227]/35" />

      {/* Grid Scan Lines */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(rgba(49, 95, 80, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(49, 95, 80, 0.45) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Center Radar Scanner Circle */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-full border border-[#315F50]/40 flex items-center justify-center">
        {/* Concentric rings */}
        <div className="absolute inset-4 rounded-full border border-[#315F50]/20" />
        <div className="absolute inset-14 rounded-full border border-[#315F50]/25" />
        <div className="absolute inset-28 rounded-full border border-[#315F50]/30" />
        <div className="absolute w-2 h-2 rounded-full bg-[#315F50] shadow-[0_0_10px_#315F50]" />

        {/* Crosshairs */}
        <div className="absolute w-full h-[1px] bg-[#315F50]/25" />
        <div className="absolute h-full w-[1px] bg-[#315F50]/25" />

        {/* Rotating Radar Beam */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            animation: "radarSweep 3s linear infinite",
            background: "conic-gradient(from 0deg, rgba(49, 95, 80, 0.45) 0deg, rgba(49, 95, 80, 0) 65deg)",
          }}
        />

        {/* Pulse sonar wave */}
        <div className="absolute inset-0 rounded-full border-2 border-[#315F50] animate-ping opacity-25" />

        {/* Telemetry Blips */}
        {dots.map((d) => (
          <div
            key={d.id}
            className="absolute w-2.5 h-2.5 rounded-full bg-[#315F50] animate-pulse shadow-[0_0_8px_#315F50]"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Top Floating Telemetry Strip - Glass Strong */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2.5 glass-strong border border-[#C8CFD5] text-[#1D2227] px-4 py-2 rounded-xl shadow-panel-lg font-mono text-[11px] animate-bounce">
        <Sentinel1RadarIcon className="w-4 h-4 text-[#C58A3A] animate-spin" />
        <span className="w-2 h-2 rounded-full bg-[#315F50] animate-ping inline-block" />
        <span className="font-bold text-[#315F50]">
          RADAR SWEEP ACTIVE:
        </span>
        <span className="text-[#343B42]">
          Querying Sentinel-1 C-SAR & Sentinel-2 MSI Multi-Constellation Grid...
        </span>
      </div>

      <style jsx>{`
        @keyframes radarSweep {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
