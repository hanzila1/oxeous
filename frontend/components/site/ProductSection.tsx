"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CloudRain,
  Compass,
  FileCheck2,
  Layers,
  Play,
  Radio,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { asset } from "@/lib/site";
import { Reveal, fmt } from "@/hooks/useSite";

const FILING_STEPS = [
  {
    step: "01",
    label: "Ingest",
    title: "Drop raw supplier coordinates",
    detail: "Upload GeoJSON, KML, or Shapefiles from any cooperative or trader—no manual GIS formatting needed.",
  },
  {
    step: "02",
    label: "Verify",
    title: "6-Agent satellite & park check",
    detail: "Cross-checks the 31 Dec 2020 forest baseline, radar canopy, protected parks, and biophysical yield limits.",
  },
  {
    step: "03",
    label: "Certify",
    title: "Export EU TRACES statement",
    detail: "Generates the signed Due Diligence Statement and validated plot geometry for immediate customs clearance.",
  },
] as const;

const SAMPLE_PLOTS = [
  {
    id: "colombia",
    label: "Colombia · Coffee",
    coords: "5.4072° N, 75.4881° W",
    area: "123.2 ha",
    clouds: "78% Cloud Deck",
    verdict: "COMPLIANT",
    compliant: true,
    summary: "Zero post-2020 tree loss detected beneath montane clouds. Ready for EU TRACES filing.",
  },
  {
    id: "ghana",
    label: "Ghana · Cocoa",
    coords: "6.6885° N, 2.0944° W",
    area: "12.8 ha",
    clouds: "84% Cloud Deck",
    verdict: "SALVAGED (12.3 ha)",
    compliant: true,
    summary: "0.5 ha reserve buffer overlap surgically trimmed; remaining 12.3 ha harvest cleared.",
  },
  {
    id: "indonesia",
    label: "Indonesia · Palm Oil",
    coords: "0.1893° N, 102.1460° E",
    area: "123.6 ha",
    clouds: "91% Cloud Deck",
    verdict: "BLOCKED (26.7 ha Loss)",
    compliant: false,
    summary: "Active post-2020 peatland forest clearing detected by radar. Shipment blocked before port arrival.",
  },
] as const;

const STAGE_LAYERS = [
  {
    id: "cockpit",
    badge: "01 · Live Workspace",
    title: "Oxeous Spatial Cockpit",
    coords: "GLOBAL MULTI-SENSOR VIEW · MAPLIBRE GL",
    caption: "Interactive 3D map workspace with live EUDR risk tables, multi-year timelapse, and AI agent chat.",
    img: "/oxeous-cockpit-hero.png",
  },
  {
    id: "radar",
    badge: "02 · Radar Layer",
    title: "Cloud-Penetrating SAR Sweep",
    coords: "5.405 GHZ C-BAND · 99.4% PIXEL CLARITY",
    caption: "Active radar waves pierce straight through equatorial storm clouds to verify tree canopy 365 days a year.",
    img: "/site/pillar-radar.webp",
  },
  {
    id: "salvage",
    badge: "03 · Topology Layer",
    title: "Surgical Boundary Carve-Out",
    coords: "SUB-HECTARE PRECISION · ART. 9 GEOMETRY",
    caption: "Isolates minor GPS fence slips (amber) so compliant smallholder harvests (green) pass EU customs.",
    img: "/site/pillar-salvage.webp",
  },
  {
    id: "filing",
    badge: "04 · Compliance Layer",
    title: "3-Stage Verification Stack",
    coords: "EU TRACES NT SCHEMA · SHA-256 VERIFIED",
    caption: "Fuses physical canopy, polygon boundaries, and statutory rules into a single customs-ready seal.",
    img: "/site/pillar-filing.webp",
  },
] as const;

export default function ProductSection({ onPilot }: { onPilot: () => void }) {
  // Pillar 1 interactive state: Cloud cover %
  const [clouds, setClouds] = useState(75);
  const opticalScore = Math.max(0, Math.round(100 - clouds * 1.3));

  // Pillar 2 interactive state: Surgical carve-out toggle
  const [carved, setCarved] = useState(true);

  // Pillar 3 interactive state: Active filing layer (0, 1, 2)
  const [filingStep, setFilingStep] = useState(2);

  // Bento Bottom Bar: Live sample plot inspector
  const [selectedPlotIdx, setSelectedPlotIdx] = useState(0);
  const activePlot = SAMPLE_PLOTS[selectedPlotIdx];

  // Mapbox-style Dark Spatial Stage active tab
  const [stageIdx, setStageIdx] = useState(0);
  const activeStage = STAGE_LAYERS[stageIdx];

  // Impact Calculator interactive state
  const [turnoverM, setTurnoverM] = useState(50);
  const [containersMo, setContainersMo] = useState(40);
  const fineCeiling = turnoverM * 1_000_000 * 0.04;
  const demurrageSaved = Math.round(containersMo * 12 * 0.3 * 12_500);

  return (
    <>
      {/* 1. LINEAR / RAYCAST PRECISION BENTO GRID (#platform) */}
      <section id="platform" className="relative border-b border-line bg-paper py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <Reveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 font-data text-[11px] font-semibold uppercase tracking-[0.16em] text-canopy shadow-sm">
                <Layers className="h-3.5 w-3.5" />
                Core Infrastructure
              </div>
              <h2 className="mt-4 font-display text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[46px]">
                Built for real-world supply chains, not paper promises.
              </h2>
            </div>
            <p className="max-w-md text-[16px] leading-relaxed text-ink-2">
              Three autonomous capabilities that turn messy supplier coordinates into verified, customs-ready EU
              compliance statements.
            </p>
          </Reveal>

          {/* Architectural Bento Grid Container with + Corner Crosshairs */}
          <div className="relative mt-14">
            {/* Corner Crosshairs (Linear style) */}
            <span aria-hidden className="pointer-events-none absolute -left-2 -top-2 font-data text-sm text-ink/30">+</span>
            <span aria-hidden className="pointer-events-none absolute -right-2 -top-2 font-data text-sm text-ink/30">+</span>
            <span aria-hidden className="pointer-events-none absolute -bottom-2 -left-2 font-data text-sm text-ink/30">+</span>
            <span aria-hidden className="pointer-events-none absolute -bottom-2 -right-2 font-data text-sm text-ink/30">+</span>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* PILLAR 1: ALL-WEATHER RADAR VISION */}
              <Reveal
                delay={60}
                className="group flex flex-col justify-between overflow-hidden rounded-[26px] border border-line bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_32px_-16px_rgba(18,48,42,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-canopy/40"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-line bg-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset("/site/pillar-radar.webp")}
                      alt="Radar sweep penetrating tropical clouds to reveal farm plot polygons"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1 font-data text-[10.5px] font-semibold text-ink shadow-sm backdrop-blur">
                        <Radio className="h-3 w-3 text-canopy" />
                        01 · All-Weather Vision
                      </span>
                      <span className="rounded-full bg-ink/85 px-2.5 py-1 font-data text-[10px] font-medium text-emerald-300 backdrop-blur">
                        99.4% Radar Clarity
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <h3 className="font-display text-[21px] font-semibold tracking-[-0.02em] text-ink">
                      Sees straight through tropical cloud cover.
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                      Equatorial coffee, cocoa, and palm regions are cloudy 200+ days a year. When optical satellites go
                      blind, Oxeous radar sees every tree beneath the clouds.
                    </p>

                    <div className="mt-5 rounded-2xl border border-line bg-paper/80 p-4">
                      <div className="flex items-center justify-between text-[12px] font-medium text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <CloudRain className="h-3.5 w-3.5 text-canopy" />
                          Cloud cover: <strong>{clouds}%</strong>
                        </span>
                        <span className="font-data text-[10.5px] text-ink-2">Drag slider</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={clouds}
                        onChange={(e) => setClouds(Number(e.target.value))}
                        className="mt-2.5 h-2 w-full cursor-pointer appearance-none rounded-lg bg-line accent-canopy"
                        aria-label="Simulated cloud cover percentage"
                      />

                      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
                          <div className="text-[11px] text-ink-2">Optical Only</div>
                          <div
                            className={`mt-0.5 font-display text-[19px] font-bold ${
                              opticalScore < 40 ? "text-red-600" : "text-ink"
                            }`}
                          >
                            {opticalScore}%
                          </div>
                          <div className="text-[10.5px] text-ink-2">
                            {opticalScore < 40 ? "Blinded by clouds" : "Clear sky"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-canopy/40 bg-canopy/10 px-3 py-2.5">
                          <div className="text-[11px] font-medium text-canopy">Oxeous Radar</div>
                          <div className="mt-0.5 font-display text-[19px] font-bold text-ink">99.4%</div>
                          <div className="text-[10.5px] font-medium text-canopy">Uninterrupted</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* PILLAR 2: SURGICAL PLOT SALVAGE */}
              <Reveal
                delay={120}
                className="group flex flex-col justify-between overflow-hidden rounded-[26px] border border-line bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_32px_-16px_rgba(18,48,42,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-canopy/40"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-line bg-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset("/site/pillar-salvage.webp")}
                      alt="Aerial farm boundary with minor amber corner overlap surgically separated"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1 font-data text-[10.5px] font-semibold text-ink shadow-sm backdrop-blur">
                        <Scissors className="h-3 w-3 text-canopy" />
                        02 · Surgical Plot Salvage
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 font-data text-[10px] font-medium backdrop-blur ${
                          carved ? "bg-ink/85 text-emerald-300" : "bg-red-900/90 text-red-200"
                        }`}
                      >
                        {carved ? "96.1% Harvest Saved" : "0.5 ha Buffer Overlap"}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <h3 className="font-display text-[21px] font-semibold tracking-[-0.02em] text-ink">
                      Saves clean harvests from minor GPS slips.
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                      If a farmer&apos;s GPS boundary drifts 5 meters into a forest buffer, legacy tools reject the
                      whole shipment. Oxeous isolates the tiny amber sliver so the clean 96% clears customs.
                    </p>

                    <div className="mt-5 rounded-2xl border border-line bg-paper/80 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-ink">
                          {carved ? "Surgical Trim Applied" : "Raw Uncut Boundary"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCarved((v) => !v)}
                          className="rounded-full bg-ink px-3 py-1 font-data text-[10.5px] font-medium text-paper transition-colors hover:bg-canopy"
                        >
                          {carved ? "Show raw plot" : "Trim 0.5 ha overlap"}
                        </button>
                      </div>

                      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
                          <div className="text-[11px] text-ink-2">Customs Status</div>
                          <div
                            className={`mt-0.5 font-display text-[18px] font-bold ${
                              carved ? "text-canopy" : "text-red-600"
                            }`}
                          >
                            {carved ? "12.3 ha Pass" : "12.8 ha Blocked"}
                          </div>
                          <div className="text-[10.5px] text-ink-2">
                            {carved ? "0.5 ha sliver excluded" : "Whole shipment held"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-canopy/40 bg-canopy/10 px-3 py-2.5">
                          <div className="text-[11px] font-medium text-canopy">Cargo Protected</div>
                          <div className="mt-0.5 font-display text-[18px] font-bold text-ink">
                            {carved ? "€108,240" : "€0"}
                          </div>
                          <div className="text-[10.5px] font-medium text-canopy">
                            {carved ? "Cleared for EU import" : "100% rejected"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* PILLAR 3: INSTANT EU FILING */}
              <Reveal
                delay={180}
                className="group flex flex-col justify-between overflow-hidden rounded-[26px] border border-line bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_32px_-16px_rgba(18,48,42,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-canopy/40"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-line bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset("/site/pillar-filing.webp")}
                      alt="Three stacked glass layers transforming forest canopy into a verified EU check seal"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1 font-data text-[10.5px] font-semibold text-ink shadow-sm backdrop-blur">
                        <FileCheck2 className="h-3 w-3 text-canopy" />
                        03 · Instant EU Filing
                      </span>
                      <span className="rounded-full bg-ink/85 px-2.5 py-1 font-data text-[10px] font-medium text-emerald-300 backdrop-blur">
                        30s End-to-End
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <h3 className="font-display text-[21px] font-semibold tracking-[-0.02em] text-ink">
                      From farm coordinates to EU filing in 30 seconds.
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                      Six specialized AI agents cross-check satellite baselines, protected park boundaries, and crop
                      yield limits—then package the official EU statement.
                    </p>

                    <div className="mt-5 rounded-2xl border border-line bg-paper/80 p-4">
                      <div className="grid grid-cols-3 gap-1.5">
                        {FILING_STEPS.map((s, idx) => (
                          <button
                            key={s.step}
                            type="button"
                            onClick={() => setFilingStep(idx)}
                            className={`rounded-xl px-2.5 py-2 text-center font-data text-[10.5px] font-semibold transition-all ${
                              filingStep === idx
                                ? "bg-ink text-paper shadow-sm"
                                : "border border-line bg-white text-ink-2 hover:text-ink"
                            }`}
                          >
                            {s.step} · {s.label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-line bg-white p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-[13.5px] font-semibold text-ink">
                            {FILING_STEPS[filingStep].title}
                          </span>
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-canopy" />
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
                          {FILING_STEPS[filingStep].detail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* 4TH WIDE BENTO CELL: LIVE SPATIAL AGENT TELEMETRY BAR (Linear / Raycast style) */}
            <Reveal delay={220} className="mt-6">
              <div className="overflow-hidden rounded-[26px] border border-line bg-white p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-emerald-300">
                      <Terminal className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-display text-[18px] font-semibold text-ink">
                        Live Spatial Agent Verification Trace
                      </div>
                      <div className="text-[13px] text-ink-2">
                        Select a sample commodity shipment below to see how Oxeous adjudicates it in real time
                      </div>
                    </div>
                  </div>

                  {/* Sample Plot Pills */}
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_PLOTS.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlotIdx(idx)}
                        className={`rounded-full px-4 py-2 font-display text-[13px] font-medium transition-all ${
                          selectedPlotIdx === idx
                            ? "bg-ink text-paper shadow-sm"
                            : "border border-line bg-paper text-ink-2 hover:bg-mist hover:text-ink"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Telemetry Strip */}
                <div className="mt-5 grid grid-cols-1 items-center gap-4 lg:grid-cols-12">
                  <div className="grid grid-cols-3 gap-3 lg:col-span-5">
                    <div className="rounded-2xl border border-line bg-paper/70 p-3.5">
                      <div className="font-data text-[10px] uppercase tracking-wider text-ink-2">Coordinates</div>
                      <div className="mt-1 font-data text-[12px] font-semibold text-ink">{activePlot.coords}</div>
                    </div>
                    <div className="rounded-2xl border border-line bg-paper/70 p-3.5">
                      <div className="font-data text-[10px] uppercase tracking-wider text-ink-2">Plot Area</div>
                      <div className="mt-1 font-display text-[15px] font-bold text-ink">{activePlot.area}</div>
                    </div>
                    <div className="rounded-2xl border border-line bg-paper/70 p-3.5">
                      <div className="font-data text-[10px] uppercase tracking-wider text-ink-2">Weather</div>
                      <div className="mt-1 font-data text-[12px] font-semibold text-canopy">{activePlot.clouds}</div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-paper/50 p-4 sm:flex-row sm:items-center lg:col-span-7">
                    <div className="flex items-start gap-3">
                      {activePlot.compliant ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-canopy" />
                      ) : (
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 font-data text-[10.5px] font-bold ${
                              activePlot.compliant
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {activePlot.verdict}
                          </span>
                          <span className="font-data text-[11px] text-ink-2">· Audited in 28.4s</span>
                        </div>
                        <p className="mt-1 text-[13px] text-ink-2">{activePlot.summary}</p>
                      </div>
                    </div>

                    <Link
                      href="/cockpit/"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] font-medium text-paper transition-colors hover:bg-canopy"
                    >
                      Inspect in Cockpit
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2. MAPBOX-STYLE DEEP FOREST INTERACTIVE SPATIAL STAGE (#demo) */}
      <section
        id="demo"
        className="relative isolate overflow-hidden border-b border-line bg-[#0B1F1A] py-24 text-paper lg:py-32"
      >
        {/* Subtle emerald ambient glow + topographic lines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-10"
          style={{
            backgroundImage: `url(${asset("/site/contours.svg")})`,
            backgroundSize: "cover",
            filter: "invert(1)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-canopy/25 blur-[130px]"
        />

        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <Reveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 font-data text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300 backdrop-blur">
                <Compass className="h-3.5 w-3.5" />
                Interactive Spatial Stage
              </div>
              <h2 className="mt-4 font-display text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-[46px]">
                Watch Oxeous audit a live shipment.
              </h2>
              <p className="mt-3 text-[16.5px] leading-relaxed text-paper/75">
                Switch between spatial layers below or launch the full interactive GIS Cockpit to inspect real
                satellite baselines and recorded walkthroughs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/cockpit/"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-display text-[14px] font-semibold text-ink shadow-lg transition-all hover:bg-emerald-200"
              >
                Open Live Cockpit
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>

          {/* Mapbox-Style Layer Switcher Tabs */}
          <Reveal delay={100} className="mt-10">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {STAGE_LAYERS.map((layer, idx) => {
                const active = stageIdx === idx;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setStageIdx(idx)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? "border-emerald-400/50 bg-white/12 text-white shadow-lg backdrop-blur"
                        : "border-white/10 bg-white/[0.03] text-paper/65 hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div className="font-data text-[10.5px] uppercase tracking-wider text-emerald-300">
                      {layer.badge}
                    </div>
                    <div className="mt-1 font-display text-[15px] font-semibold">{layer.title}</div>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Cinema Viewport Frame */}
          <Reveal delay={160} className="mt-6">
            <div className="overflow-hidden rounded-[28px] border border-white/15 bg-[#071411] shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
              {/* Top Telemetry Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0A1C17] px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="ml-3 font-data text-[11px] tracking-wider text-paper/75">
                    {activeStage.coords}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-0.5 font-data text-[10.5px] font-medium text-emerald-300">
                  {activeStage.title}
                </span>
              </div>

              {/* Main Stage Image + Interactive Overlay */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#06110E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={activeStage.img}
                  src={asset(activeStage.img)}
                  alt={activeStage.title}
                  className="h-full w-full object-cover transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06110E]/90 via-transparent to-[#06110E]/20" />

                {/* Bottom HUD Bar */}
                <div className="absolute inset-x-5 bottom-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/15 bg-[#0B1F1A]/85 p-5 backdrop-blur-xl sm:flex-row sm:items-center">
                  <div>
                    <div className="font-data text-[10.5px] uppercase tracking-wider text-emerald-300">
                      {activeStage.badge}
                    </div>
                    <div className="mt-0.5 font-display text-[18px] font-semibold text-white">
                      {activeStage.title}
                    </div>
                    <p className="mt-0.5 max-w-2xl text-[13.5px] text-paper/75">{activeStage.caption}</p>
                  </div>

                  <Link
                    href="/cockpit/"
                    className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-white px-5 py-3 font-display text-[13.5px] font-semibold text-ink shadow-lg transition-all hover:bg-emerald-200"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Launch Live Cockpit
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. BENCHMARK & EUDR RISK CALCULATOR (#impact) */}
      <section id="impact" className="relative border-b border-line bg-paper py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Clean Benchmark Comparison (6 cols) */}
            <Reveal className="lg:col-span-6">
              <span className="font-data text-[11.5px] font-semibold uppercase tracking-[0.18em] text-canopy">
                Verified Performance
              </span>
              <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[44px]">
                Ground truth beats guesswork.
              </h2>
              <p className="mt-3 text-[16.5px] leading-relaxed text-ink-2">
                Standard AI models only read supplier PDF declarations—catching just 30% of violations. Oxeous verifies
                the physical land directly from orbit.
              </p>

              <div className="mt-8 space-y-5 rounded-3xl border border-line bg-white p-7 shadow-sm">
                <div>
                  <div className="flex justify-between text-[13.5px] font-semibold text-ink">
                    <span>Oxeous Spatial Agent (Satellite + Radar)</span>
                    <span className="font-data text-canopy">100% Accuracy</span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-paper">
                    <div className="h-full w-full rounded-full bg-canopy" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[13.5px] font-medium text-ink-2">
                    <span>Standard AI (Document-only review)</span>
                    <span className="font-data text-red-700">30% Accuracy</span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-paper">
                    <div className="h-full w-[30%] rounded-full bg-red-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-line pt-5">
                  <div>
                    <div className="font-display text-[26px] font-bold text-ink">30 sec</div>
                    <div className="text-[12.5px] text-ink-2">vs. 4–8 hours manual GIS review</div>
                  </div>
                  <div>
                    <div className="font-display text-[26px] font-bold text-canopy">~$0.02</div>
                    <div className="text-[12.5px] text-ink-2">vs. €300–€1,000 per consultancy audit</div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Right Column: Clean EUDR Exposure & Savings Calculator (6 cols) */}
            <Reveal delay={140} className="lg:col-span-6">
              <div className="rounded-3xl border border-line bg-white p-7 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <div className="font-display text-[20px] font-semibold text-ink">
                      EUDR Risk &amp; Savings Estimator
                    </div>
                    <div className="text-[13px] text-ink-2">
                      Estimate your 4% EU turnover penalty ceiling &amp; port delay savings
                    </div>
                  </div>
                  <Sparkles className="h-5 w-5 shrink-0 text-canopy" />
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <div className="flex justify-between text-[13.5px] font-medium text-ink">
                      <span>Annual EU Turnover</span>
                      <span className="font-display text-[18px] font-bold text-canopy">€{turnoverM}M</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={250}
                      step={5}
                      value={turnoverM}
                      onChange={(e) => setTurnoverM(Number(e.target.value))}
                      className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-mist accent-canopy"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[13.5px] font-medium text-ink">
                      <span>Monthly Imported Containers</span>
                      <span className="font-display text-[18px] font-bold text-canopy">{containersMo} / mo</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={150}
                      step={5}
                      value={containersMo}
                      onChange={(e) => setContainersMo(Number(e.target.value))}
                      className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-mist accent-canopy"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-line bg-paper p-4">
                      <div className="text-[11.5px] text-ink-2">Statutory Fine Ceiling (4%)</div>
                      <div className="mt-1 font-display text-[24px] font-bold text-ink">
                        €{fmt(fineCeiling)}
                      </div>
                      <div className="text-[11px] text-ink-2">Max penalty exposure</div>
                    </div>

                    <div className="rounded-2xl border border-canopy/30 bg-canopy/10 p-4">
                      <div className="text-[11.5px] font-medium text-canopy">Port Delay Savings / Yr</div>
                      <div className="mt-1 font-display text-[24px] font-bold text-canopy">
                        €{fmt(demurrageSaved)}
                      </div>
                      <div className="text-[11px] text-ink-2">Cloudy false-alarms avoided</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onPilot}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[14px] font-medium text-paper transition-colors hover:bg-canopy"
                  >
                    Book a pilot on your supply chain
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
