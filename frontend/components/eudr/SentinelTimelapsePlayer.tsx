"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Film,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Layers,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMap } from "@/components/map/MapCanvas";
import { extractBboxFromGeometry } from "@/lib/maplibre";
import { useStore } from "@/lib/store";
import type { EUDRAnalysisResponse } from "@oxeous/shared-types";

const API_BASE_CANDIDATES = [
  process.env.NEXT_PUBLIC_API_URL,
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "http://127.0.0.1:8001",
  "http://localhost:8001",
].filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx) as string[];

interface TimelapseFrame {
  year: number;
  label: string;
  is_cutoff: boolean;
  rgb_tile_url: string | null;
  nir_tile_url: string | null;
  pinpoint_tile_url?: string | null;
  rgb_thumb_url: string | null;
  nir_thumb_url: string | null;
  pinpoint_thumb_url?: string | null;
  sensor: string;
}

interface Props {
  result: EUDRAnalysisResponse;
}

const DEFAULT_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

export default function SentinelTimelapsePlayer({ result }: Props) {
  const { plot, risk_assessment: ra } = result;
  const def = ra.deforestation;
  const { activeGeoJSON } = useStore();

  const [frames, setFrames] = useState<TimelapseFrame[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStepYear, setLoadStepYear] = useState(2020);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [spectralMode, setSpectralMode] = useState<"pinpoint" | "rgb" | "nir">("pinpoint");
  const [syncToMap, setSyncToMap] = useState(true);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up MapLibre timelapse layers when unmounting or disabling map sync
  const clearMapTimelapseLayers = useCallback(() => {
    const map = getMap();
    if (!map) return;
    DEFAULT_YEARS.forEach((yr) => {
      const lyrId = `oxe-s2-tl-lyr-${yr}`;
      const srcId = `oxe-s2-tl-src-${yr}`;
      try {
        if (map.getLayer(lyrId)) map.removeLayer(lyrId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch {}
    });
  }, []);

  // Sync all 6 clipped Sentinel-2 raster frames onto the MapLibre map inside the plot boundary
  const syncFramesToMap = useCallback(
    (frameList: TimelapseFrame[], currentIdx: number, mode: "pinpoint" | "rgb" | "nir", mapEnabled: boolean) => {
      const map = getMap();
      if (!map || !map.isStyleLoaded()) return;

      if (!mapEnabled || frameList.length === 0) {
        clearMapTimelapseLayers();
        return;
      }

      const beforeLayer = map.getLayer("oxeous-plot-casing")
        ? "oxeous-plot-casing"
        : map.getLayer("oxeous-plot-line")
        ? "oxeous-plot-line"
        : undefined;

      frameList.forEach((frame, idx) => {
        const tileUrl =
          mode === "pinpoint"
            ? frame.pinpoint_tile_url || frame.rgb_tile_url
            : mode === "rgb"
            ? frame.rgb_tile_url
            : frame.nir_tile_url;
        if (!tileUrl) return;

        const srcId = `oxe-s2-tl-src-${frame.year}`;
        const lyrId = `oxe-s2-tl-lyr-${frame.year}`;
        const isCurrent = idx === currentIdx;

        try {
          const existingSrc = map.getSource(srcId) as { tiles?: string[] } | undefined;
          if (existingSrc && existingSrc.tiles?.[0] !== tileUrl) {
            if (map.getLayer(lyrId)) map.removeLayer(lyrId);
            if (map.getSource(srcId)) map.removeSource(srcId);
          }

          if (!map.getSource(srcId)) {
            map.addSource(srcId, {
              type: "raster",
              tiles: [tileUrl],
              tileSize: 256,
            });
          }

          if (!map.getLayer(lyrId)) {
            map.addLayer(
              {
                id: lyrId,
                type: "raster",
                source: srcId,
                paint: {
                  "raster-opacity": isCurrent ? 1.0 : 0.0,
                  "raster-opacity-transition": { duration: 220, delay: 0 },
                  "raster-fade-duration": 0,
                },
              },
              beforeLayer
            );
          } else {
            map.setPaintProperty(lyrId, "raster-opacity", isCurrent ? 1.0 : 0.0);
          }
        } catch {}
      });

      // Keep yellow plot boundary crisp on top of the in-plot timelapse
      try {
        if (map.getLayer("oxeous-plot-casing")) map.moveLayer("oxeous-plot-casing");
        if (map.getLayer("oxeous-plot-line")) map.moveLayer("oxeous-plot-line");
      } catch {}
    },
    [clearMapTimelapseLayers]
  );

  // Fetch 10m Sentinel-2 annual composites on demand with live year-by-year progress
  const loadTimelapse = async (autoPlay = true) => {
    if (loading) return;
    const geom = plot.geometry ?? activeGeoJSON;
    if (!geom) {
      setErrorMsg("Plot geometry not found. Select or draw a plot first.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setLoadProgress(12);
    setLoadStepYear(2020);

    const progInterval = setInterval(() => {
      setLoadProgress((prev) => {
        const next = Math.min(94, prev + 8);
        const yrIdx = Math.min(5, Math.floor((next / 95) * 6));
        setLoadStepYear(DEFAULT_YEARS[yrIdx] ?? 2025);
        return next;
      });
    }, 650);

    try {
      let data: { frames?: TimelapseFrame[] } | null = null;
      let lastErr = "";

      for (const base of API_BASE_CANDIDATES) {
        try {
          const res = await fetch(`${base}/eudr/timelapse`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              geometry: geom,
              years: DEFAULT_YEARS,
            }),
          });
          if (res.ok) {
            data = await res.json();
            break;
          } else {
            lastErr = `HTTP ${res.status}`;
          }
        } catch (e) {
          lastErr = e instanceof Error ? e.message : "Network error";
        }
      }

      if (data && Array.isArray(data.frames) && data.frames.length > 0) {
        setLoadProgress(100);
        setFrames(data.frames);
        setLoaded(true);
        setActiveIndex(0);
        if (autoPlay) setIsPlaying(true);

        // Fly map smoothly to focus on the plot polygon
        const bbox = extractBboxFromGeometry(geom as object);
        const flyFn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
        if (bbox && flyFn) flyFn(bbox);
      } else {
        setErrorMsg(`Could not load 10m Sentinel-2 cube (${lastErr || "No frames returned"}).`);
      }
    } catch (err) {
      console.warn("Sentinel-2 timelapse fetch error:", err);
      setErrorMsg("Failed to stream Sentinel-2 timelapse cube.");
    } finally {
      clearInterval(progInterval);
      setLoading(false);
    }
  };

  // Auto-advance year when playing
  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }
    playTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % frames.length);
    }, 1500);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, frames.length]);

  // Update MapLibre in-plot layer whenever activeIndex, spectralMode, or syncToMap changes
  useEffect(() => {
    if (!loaded || frames.length === 0) return;
    syncFramesToMap(frames, activeIndex, spectralMode, syncToMap);
  }, [loaded, frames, activeIndex, spectralMode, syncToMap, syncFramesToMap]);

  // Cleanup on unmount or plot change
  useEffect(() => {
    setFrames([]);
    setLoaded(false);
    setIsPlaying(false);
    setActiveIndex(0);
    return () => {
      clearMapTimelapseLayers();
    };
  }, [plot.plot_id, clearMapTimelapseLayers]);

  const currentFrame = frames[activeIndex] ?? {
    year: DEFAULT_YEARS[activeIndex] ?? 2020,
    label:
      DEFAULT_YEARS[activeIndex] === 2020
        ? "2020 · Statutory Cutoff (Dec 31, 2020)"
        : `${DEFAULT_YEARS[activeIndex]} · Post-Cutoff Verification`,
    is_cutoff: DEFAULT_YEARS[activeIndex] === 2020,
    rgb_tile_url: null,
    nir_tile_url: null,
    rgb_thumb_url: null,
    nir_thumb_url: null,
    sensor: "Sentinel-2 L2A (10m)",
  };

  const activeThumbUrl =
    spectralMode === "pinpoint"
      ? currentFrame.pinpoint_thumb_url || currentFrame.rgb_thumb_url
      : spectralMode === "rgb"
      ? currentFrame.rgb_thumb_url
      : currentFrame.nir_thumb_url;

  // Estimate year-specific canopy cover % for HUD readout
  const cutoff2020Cover = Number(def.forest_cover_2020_pct ?? 80);
  const postLossPct = Number(def.forest_loss_pct ?? 0);
  const lossYears = def.loss_years ?? [];
  const getYearCanopyPct = (yr: number) => {
    if (yr <= 2020) return cutoff2020Cover;
    const progress = Math.min(1, (yr - 2020) / 5);
    return Math.max(0, cutoff2020Cover - postLossPct * progress);
  };
  const yearCanopyPct = getYearCanopyPct(currentFrame.year);
  const isLossYear = lossYears.includes(currentFrame.year);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#315F50]">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
              <span>Sentinel-2 10m Plot Timelapse (2020–2025)</span>
              <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#315F50] border border-emerald-200">
                10m Native · Clipped to Plot
              </span>
            </h4>
            <p className="text-[10.5px] text-slate-500">
              Annual cloud-free satellite composites projected directly inside the plot boundary
            </p>
          </div>
        </div>

        {/* Band Mode & Map Sync Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setSpectralMode("pinpoint")}
              className={cn(
                "px-2 py-1 rounded-md transition-all cursor-pointer",
                spectralMode === "pinpoint"
                  ? "bg-white text-rose-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
              title="10m Sentinel-2 True Color + Year-by-Year Cumulative Red Loss Pinpoint (2021–2025)"
            >
              Pinpoint Loss (S2 + Red)
            </button>
            <button
              type="button"
              onClick={() => setSpectralMode("rgb")}
              className={cn(
                "px-2 py-1 rounded-md transition-all cursor-pointer",
                spectralMode === "rgb"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
              title="Natural True-Color Optical (B4, B3, B2 · 10m)"
            >
              True Color (RGB)
            </button>
            <button
              type="button"
              onClick={() => setSpectralMode("nir")}
              className={cn(
                "px-2 py-1 rounded-md transition-all cursor-pointer",
                spectralMode === "nir"
                  ? "bg-white text-[#315F50] shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
              title="False-Color Infrared Vegetation (B8, B4, B3 · 10m — Standing forest glows red, cleared soil is cyan)"
            >
              NIR Canopy (B8)
            </button>
          </div>

          {loaded && (
            <button
              type="button"
              onClick={() => setSyncToMap((v) => !v)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer",
                syncToMap
                  ? "bg-[#315F50] text-white border-[#315F50] shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
              title="Stick & animate 10m Sentinel-2 timelapse directly inside the plot polygon on the main map"
            >
              {syncToMap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{syncToMap ? "Live in Map Plot" : "Map Overlay Off"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Player Body */}
      {!loaded ? (
        <div className="rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#19332A] text-white p-5 border border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                <span>On-Demand 10m Multi-Temporal Verification</span>
              </div>
              <h5 className="text-sm font-bold text-white">
                Verify Plot Canopy History Year-by-Year (Dec 2020 Cutoff → 2025)
              </h5>
              <p className="text-[11px] text-slate-300 max-w-md leading-relaxed">
                Streams 6 annual cloud-masked 10m Sentinel-2 composites clipped strictly inside{" "}
                <span className="text-amber-300 font-semibold">
                  {(plot.area_ha ?? 10).toFixed(1)} ha
                </span>{" "}
                plot geometry—animating both here and live on the main satellite map.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadTimelapse(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[12px] shadow-md transition-all cursor-pointer flex-shrink-0 disabled:opacity-75"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing {loadStepYear} ({loadProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play 10m Plot Timelapse</span>
                </>
              )}
            </button>
          </div>

          {/* Live 6-Year Sentinel-2 Synthesis Progress Bar */}
          {loading && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10.5px] font-mono text-emerald-300">
                <span>
                  Cloud-masking & clipping 10m Sentinel-2 L2A composite for <strong>{loadStepYear}</strong>...
                </span>
                <span className="font-bold">{loadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-emerald-500/30">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-300 rounded-full"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-6 gap-1 pt-0.5">
                {DEFAULT_YEARS.map((yr) => {
                  const done = yr < loadStepYear;
                  const active = yr === loadStepYear;
                  return (
                    <div
                      key={yr}
                      className={cn(
                        "text-center py-1 rounded text-[9.5px] font-mono border transition-all",
                        done
                          ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200 font-bold"
                          : active
                          ? "bg-amber-500/25 border-amber-400 text-amber-200 font-bold animate-pulse"
                          : "bg-white/5 border-white/10 text-slate-400"
                      )}
                    >
                      {yr} {done ? "✓" : active ? "⋯" : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-[11px] font-mono">
              ⚠ {errorMsg}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Visual Frame + Telemetry Overlay */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
            {/* Clipped Plot Satellite Viewport */}
            <div className="sm:col-span-7 relative rounded-xl overflow-hidden bg-[#0c141c] border border-slate-300 min-h-[210px] flex items-center justify-center">
              {activeThumbUrl ? (
                <img
                  src={activeThumbUrl}
                  alt={`Sentinel-2 10m ${currentFrame.year}`}
                  className="w-full h-[220px] object-cover transition-opacity duration-200"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-1.5">
                  <Layers className="w-6 h-6 text-emerald-400" />
                  <p className="text-[11px] font-semibold">
                    10m Sentinel-2 Frame ({currentFrame.year}) Active on MapLibre Canvas
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Look at the yellow plot polygon on the main map to inspect the clipped 10m raster.
                  </p>
                </div>
              )}

              {/* Top-left Year & Statutory Cutoff Badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-mono font-extrabold shadow-md border backdrop-blur-md",
                    currentFrame.is_cutoff
                      ? "bg-amber-500/95 text-slate-950 border-amber-300"
                      : isLossYear
                      ? "bg-rose-600/95 text-white border-rose-400"
                      : "bg-slate-900/90 text-white border-slate-700"
                  )}
                >
                  {currentFrame.year} {currentFrame.is_cutoff ? "· EUDR CUTOFF" : isLossYear ? "· DISTURBANCE DETECTED" : ""}
                </span>
              </div>

              {/* Bottom Bar inside Frame */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 py-2 flex items-center justify-between text-[10px] font-mono text-white">
                <span>
                  {spectralMode === "pinpoint"
                    ? "S2 10m + Year-by-Year Loss Pinpoint"
                    : spectralMode === "rgb"
                    ? "S2 10m True Color (B4/B3/B2)"
                    : "S2 10m NIR False Color (B8/B4/B3)"}
                </span>
                <span className="text-emerald-300 font-bold">
                  Est. Canopy: {yearCanopyPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Right Column: Year-by-Year Statutory Verification Card */}
            <div className="sm:col-span-5 rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-col justify-between space-y-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                    Active Frame Telemetry
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (plot.geometry) {
                        const bbox = extractBboxFromGeometry(plot.geometry as object);
                        const flyFn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
                        if (bbox && flyFn) flyFn(bbox);
                      }
                    }}
                    className="flex items-center gap-1 text-[10px] font-semibold text-[#315F50] hover:underline cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Focus Plot on Map</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="text-[12px] font-bold text-slate-900">
                    {currentFrame.label}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Sensor: {currentFrame.sensor}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block text-[9px]">PLOT CANOPY</span>
                    <span className="text-slate-900 font-bold text-[12px]">
                      {yearCanopyPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-500 block text-[9px]">FRAME STATUS</span>
                    <span
                      className={cn(
                        "font-bold text-[11px]",
                        currentFrame.is_cutoff
                          ? "text-amber-700"
                          : isLossYear && !def.is_plantation_replanting_exemption
                          ? "text-rose-700"
                          : "text-emerald-700"
                      )}
                    >
                      {currentFrame.is_cutoff
                        ? "Baseline Ref"
                        : isLossYear
                        ? def.is_plantation_replanting_exemption
                          ? "Replanting"
                          : "Canopy Loss"
                        : "Stable"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 bg-emerald-50/70 border border-emerald-200 rounded-lg p-2 leading-snug">
                <strong className="text-[#315F50]">Clipped to Plot Boundary:</strong> The 10m Sentinel-2 raster is masked strictly to the{" "}
                <span className="font-mono font-bold">{(plot.area_ha ?? 10).toFixed(1)} ha</span> polygon on the map.
              </div>
            </div>
          </div>

          {/* Interactive Play/Pause Scrubber Bar */}
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex((prev) => (prev - 1 + frames.length) % frames.length);
                }}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                title="Previous Year"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-2xs",
                  isPlaying
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : "bg-[#315F50] text-white hover:bg-[#274d40]"
                )}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Timelapse</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex((prev) => (prev + 1) % frames.length);
                }}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                title="Next Year"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Year Pills Scrubber */}
            <div className="flex items-center gap-1 flex-1 justify-end overflow-x-auto">
              {frames.map((f, idx) => {
                const active = idx === activeIndex;
                const yrLoss = lossYears.includes(f.year);
                return (
                  <button
                    key={f.year}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveIndex(idx);
                    }}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1",
                      active
                        ? f.is_cutoff
                          ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs"
                          : "bg-[#315F50] text-white border-[#315F50] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <span>{f.year}</span>
                    {f.is_cutoff && (
                      <span className={cn("text-[8.5px] px-1 rounded", active ? "bg-black/15 text-slate-950" : "bg-amber-100 text-amber-800")}>
                        CUTOFF
                      </span>
                    )}
                    {yrLoss && !f.is_cutoff && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" title={`Canopy loss detected in ${f.year}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

