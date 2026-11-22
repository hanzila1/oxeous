"use client";

import { useState } from "react";
import {
  Scissors,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  Check,
} from "lucide-react";
import { Reveal, fmt } from "@/hooks/useSite";

export default function SurgicalRemediation() {
  const [remediated, setRemediated] = useState(false);

  // Constants
  const totalArea = 12.8;
  const violationArea = 0.5;
  const cleanArea = totalArea - violationArea;
  const cocoaYieldPerHa = 0.8; // MT/ha
  const marketPricePerMT = 11000; // EUR/MT
  const totalShipmentValue = totalArea * cocoaYieldPerHa * marketPricePerMT;
  const salvagedValue = cleanArea * cocoaYieldPerHa * marketPricePerMT;
  const lostValue = violationArea * cocoaYieldPerHa * marketPricePerMT;

  return (
    <section id="remediation" className="relative border-t border-line/70 bg-mist/25 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1 font-data text-[11px] font-semibold text-canopy shadow-sm">
            <Scissors className="h-3.5 w-3.5" />
            <span>ARTICLE 9 AUTOMATED PARCEL SALVAGE</span>
          </div>
          <h2 className="mt-3 font-display text-[34px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
            Surgical Polygon Remediation:{" "}
            <span className="text-canopy font-normal">Salvage Compliant Harvests</span>
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
            In standard compliance tools, if a smallholder farm boundary slips 5 meters into a forest reserve buffer,
            the <strong>entire multi-ton shipment is permanently rejected</strong>. Oxeous Agent A4 surgically carves out
            the violation, preserving smallholder livelihood and rescuing compliant yields.
          </p>
        </Reveal>

        {/* Interactive Remediation Simulator */}
        <Reveal delay={120} className="mt-10">
          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line bg-mist/40 px-6 py-4.5 gap-4">
              <div className="flex items-center gap-3">
                <span className="font-data text-[12px] font-semibold text-ink bg-white px-3 py-1 rounded-full border border-line">
                  PARCEL ID: GH-ASHANTI-7721
                </span>
                <span className="text-[13px] text-ink-2">Commodity: Cocoa (Fairtrade Certified)</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRemediated(!remediated)}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 font-display text-[13px] font-semibold transition-all ${
                    remediated
                      ? "bg-canopy text-paper shadow ring-2 ring-canopy/30"
                      : "bg-ink text-paper hover:bg-canopy shadow-sm"
                  }`}
                >
                  <Scissors className="h-4 w-4" />
                  {remediated ? "Reset Raw Boundary" : "Execute Surgical Carve-Out"}
                </button>
              </div>
            </div>

            {/* Split Screen: SVG Polygon Viewer on Left, Financial & Regulatory Impact on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line">
              {/* Left Column: Visual Vector Geometry Canvas (7 cols) */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-mist/10">
                <div>
                  <div className="flex items-center justify-between text-[12px] font-data text-ink-2 mb-3">
                    <span>TOPOLOGICAL BOUNDARY ENGINE</span>
                    <span className="font-semibold text-canopy">
                      {remediated ? "STATUS: SURGICALLY PRUNED (PASS)" : "STATUS: BUFFER OVERLAP DETECTED (FAIL)"}
                    </span>
                  </div>

                  {/* SVG Canvas depicting parcel boundary and carve-out */}
                  <div className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl border border-line bg-slate-900 shadow-inner flex items-center justify-center p-4">
                    {/* Topographic background grid lines */}
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    />

                    {/* SVG Graphic */}
                    <svg viewBox="0 0 600 420" className="w-full h-full">
                      {/* Forest Reserve Buffer Zone (Red shaded zone on top-right) */}
                      <path
                        d="M 380,0 L 600,0 L 600,220 L 420,180 Z"
                        fill="rgba(239, 68, 68, 0.18)"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                      <text x="440" y="50" fill="#f87171" fontSize="11" fontFamily="monospace">
                        IUCN GAZETTED BUFFER
                      </text>

                      {/* Main Parcel Polygon (Clean section) */}
                      <polygon
                        points="80,340 180,90 390,110 460,260 370,360 140,380"
                        fill="rgba(16, 185, 129, 0.15)"
                        stroke="#10b981"
                        strokeWidth="2.5"
                      />

                      {/* The 0.5 ha Encroachment Sliver */}
                      <polygon
                        points="390,110 450,80 470,160 460,260"
                        fill={remediated ? "transparent" : "rgba(239, 68, 68, 0.5)"}
                        stroke={remediated ? "rgba(239, 68, 68, 0.4)" : "#ef4444"}
                        strokeWidth={remediated ? "1.5" : "2.5"}
                        strokeDasharray={remediated ? "4 4" : "none"}
                        className="transition-all duration-500"
                      />

                      {/* Cut Line / Severance when Remediated */}
                      {remediated && (
                        <g>
                          <line
                            x1="390"
                            y1="110"
                            x2="460"
                            y2="260"
                            stroke="#34d399"
                            strokeWidth="3"
                            strokeDasharray="6 3"
                          />
                          <circle cx="425" cy="185" r="14" fill="#12302a" stroke="#34d399" strokeWidth="2" />
                          <text x="419" y="189" fill="#34d399" fontSize="12" fontWeight="bold">✓</text>
                        </g>
                      )}

                      {/* Marker labels */}
                      <text x="180" y="240" fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
                        Clean Plot: {cleanArea.toFixed(1)} ha
                      </text>
                      <text x="180" y="260" fill="#a7f3d0" fontSize="11" fontFamily="monospace">
                        100% Deforestation-Free
                      </text>

                      {!remediated ? (
                        <g>
                          <circle cx="435" cy="140" r="12" fill="#ef4444" />
                          <text x="431" y="145" fill="#ffffff" fontSize="12" fontWeight="bold">!</text>
                          <text x="455" y="145" fill="#fca5a5" fontSize="11" fontFamily="monospace">
                            0.5 ha buffer breach
                          </text>
                        </g>
                      ) : (
                        <g>
                          <text x="455" y="145" fill="#9ca3af" fontSize="11" fontFamily="monospace" textDecoration="line-through">
                            Isolated 0.5 ha sliver
                          </text>
                        </g>
                      )}
                    </svg>

                    {/* Badge Overlay */}
                    <div className="absolute bottom-4 left-4 rounded-xl bg-black/80 px-3 py-1.5 font-data text-[11px] text-white backdrop-blur border border-white/10">
                      {remediated
                        ? "Carved GeoJSON vertices validated against EU TRACES schema"
                        : "Raw supplier GPS boundary touches protected reserve"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-ink-2 font-data">
                  <span>EPSG:4326 WGS-84 Coordinate Grid</span>
                  <span>Tolerance: ±0.0001° Topological Carve</span>
                </div>
              </div>

              {/* Right Column: Financial & Legal Impact (5 cols) */}
              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="font-data text-[11px] uppercase tracking-wider text-canopy font-semibold">
                    Statutory Parcel Ledger
                  </div>
                  <h3 className="mt-1 font-display text-[22px] font-semibold text-ink">
                    {remediated ? "Parcel Salvaged for Import" : "Shipment Under Statutory Rejection"}
                  </h3>

                  {/* Status Banner */}
                  <div
                    className={`mt-4 rounded-2xl p-4 border text-[13px] leading-relaxed ${
                      remediated
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-red-50 border-red-200 text-red-950"
                    }`}
                  >
                    <div className="font-semibold mb-1 flex items-center gap-1.5">
                      {remediated ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                          Article 9 Compliant Due Diligence Statement
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-700" />
                          Total Shipment Impounded (Legacy Tool Behavior)
                        </>
                      )}
                    </div>
                    {remediated
                      ? "Oxeous excised the 0.5 ha buffer overlap. The remaining 12.3 ha parcel clears all statutory criteria with zero deforestation pixels."
                      : "Without surgical carve-out, the entire 12.8 ha harvest is blocked at European customs due to a 0.5 ha boundary mistake."}
                  </div>

                  {/* Financial Salvage Cards */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-line bg-paper p-3.5">
                      <div className="font-data text-[10px] uppercase tracking-wider text-ink-2">Salvaged Cargo Value</div>
                      <div className="mt-1 font-display text-[22px] font-bold text-canopy">
                        €{fmt(remediated ? salvagedValue : 0)}
                      </div>
                      <div className="text-[11px] text-ink-2">
                        {remediated ? "€108,240 saved" : "€0 (100% loss)"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-line bg-paper p-3.5">
                      <div className="font-data text-[10px] uppercase tracking-wider text-ink-2">Excised Buffer Loss</div>
                      <div className="mt-1 font-display text-[22px] font-bold text-ink">
                        €{fmt(lostValue)}
                      </div>
                      <div className="text-[11px] text-ink-2">Only 0.5 ha excluded</div>
                    </div>
                  </div>

                  {/* Key Metrics List */}
                  <div className="mt-5 space-y-2 border-t border-line/70 pt-4 text-[13px]">
                    <div className="flex items-center justify-between py-1 border-b border-line/40">
                      <span className="text-ink-2">Original Declared Area</span>
                      <span className="font-data font-semibold text-ink">{totalArea} ha</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-line/40">
                      <span className="text-ink-2">Certified Clean Yield Area</span>
                      <span className="font-data font-semibold text-canopy">
                        {remediated ? `${cleanArea.toFixed(1)} ha` : "0.0 ha"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-line/40">
                      <span className="text-ink-2">Smallholder Farmer Income Retained</span>
                      <span className="font-data font-semibold text-emerald-700">
                        {remediated ? "96.1%" : "0.0%"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call to action */}
                <div className="mt-6 pt-4 border-t border-line">
                  <button
                    onClick={() => setRemediated(!remediated)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 font-display text-[13px] font-medium text-paper hover:bg-canopy transition-colors shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {remediated ? "Revert to Uncut Boundary" : "Test Surgical Carve-Out Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
