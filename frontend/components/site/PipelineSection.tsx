"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  FileCheck2,
  Layers,
  MapPin,
  Radar,
  Radio,
  Scale,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trees,
  X,
  XCircle,
} from "lucide-react";
import { AGENT_LANES, asset } from "@/lib/site";
import { Reveal } from "@/hooks/useSite";

const BENCHMARK_CASES = [
  { id: "TC-01", flag: "🇧🇷", country: "Brazil Soya", type: "Amazon clearing", baseline: "FAIL (Uncertain)", oxeous: "FAIL (82.4 Risk)", verdict: "Match", note: "Loss confirmed" },
  { id: "TC-02", flag: "🇬🇭", country: "Ghana Cocoa", type: "High-risk frontier", baseline: "FAIL (Uncertain)", oxeous: "FAIL (71.5 Risk)", verdict: "Match", note: "Loss confirmed" },
  { id: "TC-03", flag: "🇮🇩", country: "Indonesia Palm Oil", type: "Peatland clearing", baseline: "FAIL (Uncertain)", oxeous: "FAIL (76.8 Risk)", verdict: "Match", note: "Drainage detected" },
  { id: "TC-04", flag: "🇩🇪", country: "Germany Wood", type: "Bavaria FSC Forest", baseline: "PASS", oxeous: "PASS (0.0 Risk)", verdict: "Match", note: "Sustainable management" },
  { id: "TC-05", flag: "🇨🇴", country: "Colombia Coffee", type: "Deceptive claim (2019)", baseline: "FALSE PASS ❌", oxeous: "FAIL (58.4 Risk) ✅", verdict: "Caught Lie", note: "2.1 ha cleared in 2022" },
  { id: "TC-06", flag: "🇧🇷", country: "Brazil Cocoa", type: "0.6 ha small corner", baseline: "FAIL (Uncertain)", oxeous: "FAIL (41.2 Risk) ✅", verdict: "Caught Edge Case", note: "Sub-hectare resolution" },
  { id: "TC-07", flag: "🇫🇮", country: "Finland Wood", type: "Boreal PEFC Forest", baseline: "PASS", oxeous: "PASS (0.0 Risk)", verdict: "Match", note: "Zero loss post-2020" },
  { id: "TC-08", flag: "🇵🇪", country: "Peru Coffee", type: "Park reserve overlap", baseline: "FALSE PASS ❌", oxeous: "FAIL (45.0 + Hard Veto) ✅", verdict: "Caught Reserve Breach", note: "WDPA hard veto triggered" },
  { id: "TC-09", flag: "🇧🇷", country: "Brazil Cattle", type: "Amazon pasture", baseline: "FAIL (Uncertain)", oxeous: "FAIL (89.2 Risk)", verdict: "Match", note: "Illegal conversion" },
  { id: "TC-10", flag: "🇦🇹", country: "Austria Wood", type: "Alpine FSC Forest", baseline: "PASS", oxeous: "PASS (0.0 Risk)", verdict: "Match", note: "Full legal chain" },
];

export default function PipelineSection() {
  const [activeLane, setActiveLane] = useState<number>(0);

  return (
    <>
      {/* SECTION 1: HOW IT WORKS (#how) */}
      <section id="how" className="relative border-t border-line/70 bg-mist/20 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <Reveal className="max-w-3xl">
            <span className="font-data text-[12px] uppercase tracking-[0.18em] text-canopy">
              Architecture · Planetary Spatial Engine
            </span>
            <h2 className="mt-3 font-display text-[34px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
              The Tri-Axial Planetary Audit Engine
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
              Most compliance software uses LLMs to summarize supplier PDF declarations—a recipe for greenwashing.
              Oxeous executes a mathematical <strong className="font-semibold text-ink">Spatial ⊗ Temporal ∩ Statutory</strong>{" "}
              tensor across planetary rasters before generating evidence.
            </p>
          </Reveal>

          {/* Tri-Axial Visual Breakdown */}
          <Reveal delay={120} className="mt-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-line bg-white p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy/15 text-canopy">
                  <Layers className="h-6 w-6" />
                </div>
                <div className="mt-5 font-data text-[11px] uppercase tracking-wider text-canopy font-semibold">
                  Axis 1 · Spatial
                </div>
                <h3 className="mt-1 font-display text-[20px] font-semibold text-ink">
                  Sub-Pixel Geolocation
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
                  Ingests multi-vertex GeoJSON polygons. Trims topological boundary slivers, resolves administrative
                  cadastres, and flags direct overlaps with IUCN/WDPA gazetted reserves.
                </p>
              </div>

              <div className="rounded-3xl border border-line bg-white p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy/15 text-canopy">
                  <Radar className="h-6 w-6" />
                </div>
                <div className="mt-5 font-data text-[11px] uppercase tracking-wider text-canopy font-semibold">
                  Axis 2 · Temporal
                </div>
                <h3 className="mt-1 font-display text-[20px] font-semibold text-ink">
                  Dec 31, 2020 Strict Cutoff
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
                  Queries 25-year Hansen GFC v1.13 raster loss trees, Sentinel-1 SAR backscatter (cloud-penetrating C-band),
                  and Sentinel-2 10 m NDVI to catch clearings down to 0.1 hectare.
                </p>
              </div>

              <div className="rounded-3xl border border-line bg-white p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy/15 text-canopy">
                  <Scale className="h-6 w-6" />
                </div>
                <div className="mt-5 font-data text-[11px] uppercase tracking-wider text-canopy font-semibold">
                  Axis 3 · Statutory
                </div>
                <h3 className="mt-1 font-display text-[20px] font-semibold text-ink">
                  Deterministic Legal Gating
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
                  Maps evidence against EU 2023/1115 rules. Applies biophysical regional yield ceilings to stop
                  commodity laundering, and emits verified TRACES NT Due Diligence Statements.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Cockpit Interactive Preview Banner */}
          <Reveal delay={200} className="mt-12">
            <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-r from-ink to-ink-2 p-8 lg:p-12 text-paper shadow-xl">
              <div
                aria-hidden
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `url(${asset("/site/contours.svg")})`,
                  backgroundSize: "cover",
                }}
              />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-data text-[11px] uppercase tracking-wider text-emerald-300 backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Interactive Workspace
                  </span>
                  <h3 className="mt-3 font-display text-[26px] sm:text-[34px] font-semibold text-white">
                    Experience the Full Operational GIS Cockpit
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-paper/80 max-w-xl">
                    Inspect high-resolution MapLibre vector tiles, toggle Sentinel-1 radar and Google FDP 10 m tree
                    cover, review live agent telemetry SSE streams, and export signed DDS packages.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4 items-center">
                    <Link
                      href="/cockpit/"
                      className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-mist transition-colors shadow"
                    >
                      Launch GIS Cockpit
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                    <span className="font-data text-[12px] text-paper/70">
                      Zero credentials required · Instant mock &amp; live modes
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 font-data text-[12px] text-paper/90">
                      <span>Telemetry Telemetry</span>
                      <span className="text-emerald-300">STREAMING ACTIVE</span>
                    </div>
                    <div className="mt-3 font-data text-[11px] text-paper/75 space-y-1.5">
                      <div>▶ [A1-OPTICAL] Ingesting Sentinel-2 S2B_MSIL2A 10m grid</div>
                      <div>▶ [A2-RADAR] Penetrating wet-season cloud deck: VH/VV ratio</div>
                      <div>▶ [A3-WDPA] Intersecting WCMC protected gazetted boundaries</div>
                      <div>▶ [A4-CARVE] Topology clean: zero non-forest sliver bleed</div>
                      <div>▶ [GATE] Supervisor verified: Deterministic pass</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* SECTION 2: THE 6 AUTONOMOUS AGENTS (#agents) */}
      <section id="agents" className="relative border-t border-line/70 bg-paper py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <Reveal className="max-w-3xl">
            <span className="font-data text-[12px] uppercase tracking-[0.18em] text-canopy">
              Autonomous Intelligence · Multi-Agent Swarm
            </span>
            <h2 className="mt-3 font-display text-[34px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
              6 Specialized Domain Agents + Hard Supervisor Gate
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
              Instead of one prompt guessing answers, Oxeous assigns dedicated micro-agents to specific sensor data.
              No LLM can override a detected physical deforestation event or illegal protected area boundary.
            </p>
          </Reveal>

          {/* 3 Swarm Lanes */}
          <Reveal delay={120} className="mt-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {AGENT_LANES.map((lane, lIdx) => (
                <div key={lane.lane} className="rounded-3xl border border-line bg-mist/20 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-line pb-4">
                      <span className="font-display font-semibold text-[17px] text-ink">{lane.lane}</span>
                      <span className="font-data text-[11px] text-canopy font-semibold">LANE 0{lIdx + 1}</span>
                    </div>

                    <div className="mt-5 space-y-4">
                      {lane.agents.map((ag) => (
                        <div key={ag.code} className="rounded-2xl border border-line bg-white p-4.5 shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink font-data text-[11px] font-bold text-paper">
                              {ag.code}
                            </span>
                            <span className="font-display text-[15px] font-semibold text-ink">{ag.name}</span>
                          </div>
                          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{ag.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-line/60 pt-4 font-data text-[11px] text-ink-2 flex items-center justify-between">
                    <span>Validation</span>
                    <span className="text-canopy font-semibold">Automated Sensory</span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Supervisor Gate Card */}
          <Reveal delay={200} className="mt-8">
            <div className="rounded-3xl border border-canopy/40 bg-mist/40 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-canopy text-paper shadow">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <div className="font-data text-[11px] uppercase tracking-wider text-canopy font-semibold">
                    Deterministic Gatekeeper
                  </div>
                  <h3 className="font-display text-[18px] font-semibold text-ink">
                    Hard Legal Supervisor &amp; TRACES NT DDS Export
                  </h3>
                  <p className="mt-1 text-[13px] text-ink-2">
                    Synthesizes all 6 sensory signals. Emits signed JSON &amp; XML statements ready for direct submission to the EU TRACES NT platform.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <span className="rounded-xl bg-white px-3 py-1.5 font-data text-[12px] font-semibold text-ink border border-line">
                  Article 4 Compliant
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* SECTION 3: EMPIRICAL EVIDENCE & BENCHMARK (#evidence) */}
      <section id="evidence" className="relative border-t border-line/70 bg-mist/30 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <Reveal className="max-w-3xl">
            <span className="font-data text-[12px] uppercase tracking-[0.18em] text-canopy">
              Empirical Evaluation · 10-Case Ground Truth
            </span>
            <h2 className="mt-3 font-display text-[34px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
              Ground Truth Beats Model Size
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
              Text-only LLMs are blind auditors that enable greenwashing: in testing, standard LLMs achieved only{" "}
              <strong className="text-red-700 font-semibold">30% accuracy</strong> and accepted false claims.
              Grounding in 6 planetary rasters brought Oxeous to{" "}
              <strong className="text-canopy font-semibold">100% accuracy (10/10)</strong>.
            </p>
          </Reveal>

          {/* Metric Comparison Cards */}
          <Reveal delay={100} className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div className="font-data text-[11px] uppercase tracking-wider text-ink-2">Audit Accuracy</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-[36px] font-bold text-canopy">100%</span>
                <span className="text-[13px] text-ink-2 font-data">vs 30% baseline</span>
              </div>
              <div className="mt-2 text-[12px] text-ink-2">
                Zero false passes across all 10 international ground-truth test cases.
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div className="font-data text-[11px] uppercase tracking-wider text-ink-2">Audit Turnaround</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-[36px] font-bold text-ink">&lt; 30s</span>
                <span className="text-[13px] text-ink-2 font-data">vs 4–8 hours</span>
              </div>
              <div className="mt-2 text-[12px] text-ink-2">
                Automated planetary rasters replace manual GIS desktop analyst workflows.
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div className="font-data text-[11px] uppercase tracking-wider text-ink-2">Audit Unit Cost</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-[36px] font-bold text-canopy">~$0.02</span>
                <span className="text-[13px] text-ink-2 font-data">vs $300–$1,000</span>
              </div>
              <div className="mt-2 text-[12px] text-ink-2">
                Dynamic pyramid sampling prevents cloud timeouts even on 1,000,000 ha plots.
              </div>
            </div>
          </Reveal>

          {/* Benchmark Table */}
          <Reveal delay={180} className="mt-10">
            <div className="overflow-x-auto rounded-3xl border border-line bg-white shadow-sm">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-line bg-mist/50 font-data text-[11px] uppercase tracking-wider text-ink-2">
                  <tr>
                    <th className="py-3.5 px-5">Case</th>
                    <th className="py-3.5 px-5">Frontier / Scenario</th>
                    <th className="py-3.5 px-5">Naive LLM Baseline</th>
                    <th className="py-3.5 px-5">Oxeous Earth Multi-Agent</th>
                    <th className="py-3.5 px-5">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-sans text-ink">
                  {BENCHMARK_CASES.map((c) => (
                    <tr key={c.id} className="hover:bg-mist/30 transition-colors">
                      <td className="py-3.5 px-5 font-data font-semibold text-canopy">{c.id}</td>
                      <td className="py-3.5 px-5">
                        <span className="mr-1.5">{c.flag}</span>
                        <strong className="font-medium text-ink">{c.country}</strong>
                        <span className="text-ink-2 block text-[11px] font-data">{c.type}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            c.baseline.includes("FALSE PASS")
                              ? "bg-red-100 text-red-800"
                              : "bg-paper text-ink-2 border border-line"
                          }`}
                        >
                          {c.baseline}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-data font-semibold text-canopy">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800 border border-emerald-200">
                          <Check className="h-3 w-3 text-emerald-700" />
                          {c.oxeous}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-ink text-[12px]">{c.verdict}:</span>{" "}
                        <span className="text-ink-2 text-[12px]">{c.note}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between text-[12px] text-ink-2 font-data gap-2 px-2">
              <span>Reproduce instantly: <code className="bg-white px-2 py-0.5 rounded border border-line text-ink">python evaluate.py</code></span>
              <span>Ground truth benchmark source: Oxeous Benchmark Suite v1.4</span>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

