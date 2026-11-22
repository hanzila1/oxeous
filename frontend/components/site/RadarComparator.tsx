"use client";

import { useState } from "react";
import {
  Cloud,
  CloudRain,
  Radio,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Sliders,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Reveal } from "@/hooks/useSite";

export default function RadarComparator() {
  const [cloudCover, setCloudCover] = useState<number>(75);
  const [mode, setMode] = useState<"split" | "optical" | "sar">("split");

  // Physics calculation
  const isOpticalBlinded = cloudCover > 35;
  const opticalConfidence = Math.max(0, Math.round(100 - cloudCover * 1.3));
  const sarConfidence = 99.4; // C-band microwaves penetrate clouds unaffected

  return (
    <section id="radar" className="relative border-t border-line/70 bg-paper py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-mist/60 px-3.5 py-1 font-data text-[11px] font-semibold text-canopy">
            <Radio className="h-3.5 w-3.5" />
            <span>SPECTRAL PHYSICS · ARTICLE 9 COMPLIANCE</span>
          </div>
          <h2 className="mt-3 font-display text-[34px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
            Why Optical Satellites Fail the Tropics{" "}
            <span className="text-canopy font-normal">(And Why SAR Radar Wins)</span>
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
            Over 70% of global cocoa, coffee, and palm oil originates along the equatorial intertropical convergence zone—blanketed
            by persistent clouds 200+ days a year. Drag the slider below to simulate tropical cloud cover against Sentinel sensors.
          </p>
        </Reveal>

        {/* Interactive Controls Card */}
        <Reveal delay={100} className="mt-10">
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-line pb-6">
              {/* Slider Component */}
              <div className="flex-1 max-w-xl">
                <div className="flex items-center justify-between text-[13px] font-data mb-2">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <CloudRain className="h-4 w-4 text-canopy" />
                    Simulated Tropical Cloud Cover
                  </span>
                  <span className="font-bold text-canopy text-[16px]">{cloudCover}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={cloudCover}
                  onChange={(e) => setCloudCover(Number(e.target.value))}
                  className="w-full h-2.5 bg-mist rounded-lg appearance-none cursor-pointer accent-canopy"
                />
                <div className="flex justify-between text-[11px] text-ink-2 font-data mt-1.5">
                  <span>0% (Clear dry sky)</span>
                  <span>40% (Typical cumulus)</span>
                  <span>80% (Equatorial monsoon)</span>
                  <span>100% (Dense stratus)</span>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-mist/40 p-1.5 shrink-0">
                <button
                  onClick={() => setMode("split")}
                  className={`rounded-xl px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    mode === "split" ? "bg-ink text-paper shadow-sm" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setMode("optical")}
                  className={`rounded-xl px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    mode === "optical" ? "bg-ink text-paper shadow-sm" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  Optical Only
                </button>
                <button
                  onClick={() => setMode("sar")}
                  className={`rounded-xl px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    mode === "sar" ? "bg-ink text-paper shadow-sm" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  SAR Radar Only
                </button>
              </div>
            </div>

            {/* Simulated Satellite Viewports Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Viewport: Sentinel-2 Multispectral Optical */}
              {(mode === "split" || mode === "optical") && (
                <div className="relative overflow-hidden rounded-2xl border border-line bg-paper/60 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-ink-2" />
                        <span className="font-display font-semibold text-ink text-[15px]">Sentinel-2 (Optical)</span>
                      </div>
                      <span className="font-data text-[11px] text-ink-2">Bands 4, 3, 2 (10 m RGB)</span>
                    </div>

                    {/* Sensor Screen Mockup */}
                    <div className="relative my-4 aspect-[16/10] w-full overflow-hidden rounded-xl border border-line bg-slate-900 shadow-inner">
                      {/* Background Ground Texture */}
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-opacity"
                        style={{
                          backgroundImage: "url(/site/dossiers/colombia-map.webp)",
                          filter: isOpticalBlinded ? `blur(${cloudCover * 0.08}px)` : "none",
                        }}
                      />

                      {/* Procedural Simulated Cloud Veil */}
                      <div
                        className="absolute inset-0 bg-white transition-opacity duration-300 pointer-events-none"
                        style={{
                          opacity: cloudCover / 100,
                          backdropFilter: `blur(${Math.min(12, cloudCover * 0.15)}px)`,
                        }}
                      />

                      {/* Blinded Banner if obscured */}
                      {isOpticalBlinded ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/40 backdrop-blur-[2px]">
                          <AlertTriangle className="h-8 w-8 text-amber-400 mb-2 animate-bounce" />
                          <div className="font-display text-[15px] font-bold text-white">
                            GROUND DEFECT BLINDED BY CLOUD COVER
                          </div>
                          <div className="font-data text-[11px] text-white/80 mt-1">
                            Cannot resolve Dec 31, 2020 cutoff pixels ({cloudCover}% cloud obstruction)
                          </div>
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3 rounded-lg bg-emerald-950/80 px-2.5 py-1 font-data text-[10px] text-emerald-300 backdrop-blur">
                          CLEAR SKY CONDITIONS
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="rounded-xl border border-line bg-white p-3.5">
                    <div className="flex items-center justify-between text-[12px] font-data">
                      <span className="text-ink-2">Ground Pixel Confidence:</span>
                      <span
                        className={`font-bold ${
                          opticalConfidence > 60
                            ? "text-emerald-700"
                            : opticalConfidence > 20
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {opticalConfidence}%
                      </span>
                    </div>
                    <div className="mt-2 text-[12px] text-ink-2 leading-relaxed">
                      {isOpticalBlinded
                        ? "Cloud reflectance saturates CMOS sensor. High risk of missing active clear-cutting beneath the cloud canopy."
                        : "Sufficient sunlight available for 10m NDVI calculation."}
                    </div>
                  </div>
                </div>
              )}

              {/* Right Viewport: Sentinel-1 C-Band SAR Radar */}
              {(mode === "split" || mode === "sar") && (
                <div className="relative overflow-hidden rounded-2xl border border-line bg-paper/60 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4 text-canopy" />
                        <span className="font-display font-semibold text-ink text-[15px]">Sentinel-1 (SAR Radar)</span>
                      </div>
                      <span className="font-data text-[11px] text-canopy font-semibold">C-Band (5.405 GHz)</span>
                    </div>

                    {/* Sensor Screen Mockup */}
                    <div className="relative my-4 aspect-[16/10] w-full overflow-hidden rounded-xl border border-line bg-emerald-950 shadow-inner">
                      {/* Radar Backscatter Texture */}
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: "url(/site/dossiers/colombia-heat.webp)",
                          filter: "contrast(1.2) hue-rotate(30deg)",
                        }}
                      />

                      {/* Microwave sweep scan line */}
                      <div
                        aria-hidden
                        className="absolute inset-y-0 w-1 bg-emerald-400 shadow-[0_0_15px_#34d399] animate-pulse"
                        style={{ left: "48%" }}
                      />

                      {/* All-Weather Badge */}
                      <div className="absolute top-3 left-3 rounded-lg bg-emerald-900/90 px-2.5 py-1 font-data text-[10px] text-emerald-200 border border-emerald-600/50 backdrop-blur">
                        <ShieldCheck className="inline h-3 w-3 mr-1 -mt-0.5" />
                        MICROWAVES PENETRATE RAIN &amp; CLOUDS
                      </div>

                      <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2.5 py-1 font-data text-[10px] text-emerald-300">
                        VV/VH Polarized Backscatter: ACTIVE
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="rounded-xl border border-line bg-white p-3.5">
                    <div className="flex items-center justify-between text-[12px] font-data">
                      <span className="text-ink-2">Ground Pixel Confidence:</span>
                      <span className="font-bold text-emerald-700">{sarConfidence}% (Zero Attenuation)</span>
                    </div>
                    <div className="mt-2 text-[12px] text-ink-2 leading-relaxed">
                      5.6 cm active microwaves pass straight through atmospheric water droplets and tropical thunderstorms,
                      measuring true biomass volume regardless of weather.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Insight Bar */}
            <div className="mt-6 rounded-2xl bg-mist/40 p-4 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-canopy text-paper shrink-0">
                  <Zap className="h-4 w-4" />
                </span>
                <div className="text-[13px] text-ink">
                  <strong className="font-semibold">Oxeous Solution:</strong> Dual-sensor fusion automatically pairs
                  Sentinel-1 C-band SAR with Sentinel-2 10 m to deliver 365-day uninterrupted statutory auditing.
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
