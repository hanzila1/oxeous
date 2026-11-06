"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMap } from "@/components/map/MapCanvas";
import { extractBboxFromGeometry } from "@/lib/maplibre";
import { useStore } from "@/lib/store";
import {
  SentinelTimelapseIcon,
  Sentinel2MSIIcon,
  JRC2020Emblem,
  May2026CarveIcon,
  PixelInspectorIcon,
} from "@/components/icons/EOIcons";
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
    <div className="bg-white rounded-xl border border-[#C8CFD5] p-3.5 shadow-2xs space-y-3 text-[#1D2227]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E3E7EA]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(49,95,80,0.1)] border border-[rgba(49,95,80,0.25)] flex items-center justify-center text-[#315F50] flex-shrink-0">
            <SentinelTimelapseIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[12.5px] font-bold text-[#1D2227] flex items-center gap-1.5 flex-wrap">
              <span>Sentinel-2 10m Plot Timelapse (2020–2025)</span>
              <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(49,95,80,0.08)] text-[#315F50] border border-[rgba(49,95,80,0.22)]">
                10m Native · Clipped to Plot
              </span>
            </h4>
            <p className="text-[10.5px] text-[#747F88]">
              Annual cloud-free satellite composites projected directly inside the plot boundary
            </p>
          </div>
        </div>

        {/* Band Mode & Map Sync Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-[#E3E7EA] p-0.5 rounded-lg border border-[#C8CFD5] text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setSpectralMode("pinpoint")}
              className={cn(
                "px-2 py-1 rounded-md transition-all cursor-pointer",
                spectralMode === "pinpoint"
                  ? "bg-white text-[#A64B45] shadow-2xs font-bold border border-[#C8CFD5]/60"
                  : "text-[#5B6773] hover:text-[#1D2227]"
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
                  ? "bg-white text-[#1D2227] shadow-2xs font-bold border border-[#C8CFD5]/60"
                  : "text-[#5B6773] hover:text-[#1D2227]"
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
                  ? "bg-white text-[#315F50] shadow-2xs font-bold border border-[#C8CFD5]/60"
                  : "text-[#5B6773] hover:text-[#1D2227]"
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
                  : "bg-white text-[#5B6773] border-[#C8CFD5] hover:bg-[#F4F5F6]"
              )}
              title="Stick & animate 10m Sentinel-2 timelapse directly inside the plot polygon on the main map"
            >
              {syncToMap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{syncToMap ? "Live in Map Plot" : "Map Overlay Off"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Player Body — Light Steel & Forest Green Theme */}
      {!loaded ? (
        <div className="rounded-xl bg-[#F8FAF9] border border-[#C8CFD5] p-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-wider font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.22)] px-2 py-0.5 rounded-md">
                <Sentinel2MSIIcon className="w-3.5 h-3.5 text-[#315F50]" />
                <span>On-Demand 10m Multi-Temporal Verification</span>
              </div>
              <h5 className="text-[13px] font-bold text-[#1D2227]">
                Verify Plot Canopy History Year-by-Year (Dec 2020 Cutoff → 2025)
              </h5>
              <p className="text-[11px] text-[#5B6773] leading-relaxed">
                Streams 6 annual cloud-masked 10m Sentinel-2 composites clipped strictly inside{" "}
                <span className="text-[#315F50] font-mono font-bold">
                  {(plot.area_ha ?? 10).toFixed(1)} ha
                </span>{" "}
                plot geometry—animating both here and live inside the plot boundary on the satellite map with year-by-year red loss pinpointing.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadTimelapse(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#315F50] hover:bg-[#274d40] text-white font-bold text-[11.5px] shadow-xs transition-all cursor-pointer flex-shrink-0 disabled:opacity-75"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing {loadStepYear} ({loadProgress}%)...</span>
                </>
              ) : (
                <>
                  <SentinelTimelapseIcon className="w-4 h-4" />
                  <span>Play 10m Plot Timelapse</span>
                </>
              )}
            </button>
          </div>

          {/* Feature Pills Strip */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E3E7EA] text-[10px] font-mono">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#E3E7EA] text-[#5B6773]">
              <JRC2020Emblem className="w-3.5 h-3.5 text-[#C58A3A] flex-shrink-0" />
              <span className="truncate">2020 Cutoff Baseline</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#E3E7EA] text-[#5B6773]">
              <May2026CarveIcon className="w-3.5 h-3.5 text-[#A64B45] flex-shrink-0" />
              <span className="truncate">Red Loss Pinpoint</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#E3E7EA] text-[#5B6773]">
              <Sentinel2MSIIcon className="w-3.5 h-3.5 text-[#315F50] flex-shrink-0" />
              <span className="truncate">10m S2 RGB & NIR</span>
            </div>
          </div>

          {/* Live 6-Year Sentinel-2 Synthesis Progress Bar */}
          {loading && (
            <div className="space-y-2 pt-2.5 border-t border-[#E3E7EA]">
              <div className="flex items-center justify-between text-[10.5px] font-mono text-[#315F50]">
                <span>
                  Cloud-masking & clipping 10m Sentinel-2 L2A composite for <strong>{loadStepYear}</strong>...
                </span>
                <span className="font-bold">{loadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-[#E3E7EA] rounded-full overflow-hidden border border-[#C8CFD5]">
                <div
                  className="h-full bg-[#315F50] transition-all duration-300 rounded-full"
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
                          ? "bg-[rgba(49,95,80,0.12)] border-[rgba(49,95,80,0.3)] text-[#315F50] font-bold"
                          : active
                          ? "bg-[rgba(197,138,58,0.15)] border-[#C58A3A] text-[#8C5819] font-bold animate-pulse"
                          : "bg-white border-[#E3E7EA] text-[#747F88]"
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
            <div className="p-2.5 rounded-lg bg-[rgba(166,75,69,0.08)] border border-[rgba(166,75,69,0.28)] text-[#A64B45] text-[11px] font-mono">
              ⚠ {errorMsg}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Visual Frame + Telemetry Overlay */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
            {/* Clipped Plot Satellite Viewport */}
            <div className="sm:col-span-7 relative rounded-xl overflow-hidden bg-[#1D2227] border border-[#C8CFD5] min-h-[210px] flex items-center justify-center">
              {activeThumbUrl ? (
                <img
                  src={activeThumbUrl}
                  alt={`Sentinel-2 10m ${currentFrame.year}`}
                  className="w-full h-[220px] object-cover transition-opacity duration-200"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-1.5">
                  <Sentinel2MSIIcon className="w-6 h-6 text-emerald-400" />
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
                      ? "bg-[#C58A3A] text-white border-amber-300"
                      : isLossYear
                      ? "bg-[#A64B45] text-white border-rose-300"
                      : "bg-[#1D2227]/90 text-white border-slate-600"
                  )}
                >
                  {currentFrame.year}{" "}
                  {currentFrame.is_cutoff
                    ? "· EUDR CUTOFF"
                    : isLossYear
                    ? "· LOSS PINPOINTED"
                    : ""}
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
            <div className="sm:col-span-5 rounded-xl bg-[#F8FAF9] border border-[#E3E7EA] p-3 flex flex-col justify-between space-y-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#747F88]">
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
                    <PixelInspectorIcon className="w-3.5 h-3.5" />
                    <span>Focus Plot</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-[#E3E7EA] space-y-1">
                  <div className="text-[11.5px] font-bold text-[#1D2227]">
                    {currentFrame.label}
                  </div>
                  <div className="text-[10px] font-mono text-[#747F88]">
                    Sensor: {currentFrame.sensor}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="p-2 rounded-lg bg-white border border-[#E3E7EA]">
                    <span className="text-[#747F88] block text-[9px]">PLOT CANOPY</span>
                    <span className="text-[#1D2227] font-bold text-[12px]">
                      {yearCanopyPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-[#E3E7EA]">
                    <span className="text-[#747F88] block text-[9px]">FRAME STATUS</span>
                    <span
                      className={cn(
                        "font-bold text-[11px]",
                        currentFrame.is_cutoff
                          ? "text-[#C58A3A]"
                          : isLossYear && !def.is_plantation_replanting_exemption
                          ? "text-[#A64B45]"
                          : "text-[#315F50]"
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

              <div className="text-[10px] text-[#5B6773] bg-[rgba(49,95,80,0.06)] border border-[rgba(49,95,80,0.2)] rounded-lg p-2 leading-snug">
                <strong className="text-[#315F50]">Clipped to Plot:</strong>{" "}
                {spectralMode === "pinpoint"
                  ? "Post-2020 loss lights up in red in the exact year it occurred."
                  : `Masked strictly to the ${(plot.area_ha ?? 10).toFixed(1)} ha polygon.`}
              </div>
            </div>
          </div>

          {/* Interactive Play/Pause Scrubber Bar */}
          <div className="p-2 rounded-xl bg-[#F4F5F6] border border-[#C8CFD5] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex((prev) => (prev - 1 + frames.length) % frames.length);
                }}
                className="p-1.5 rounded-lg bg-white border border-[#C8CFD5] text-[#5B6773] hover:text-[#1D2227] hover:bg-[#F8FAF9] cursor-pointer"
                title="Previous Year"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-2xs",
                  isPlaying
                    ? "bg-[#C58A3A] text-white hover:bg-[#b0792f]"
                    : "bg-[#315F50] text-white hover:bg-[#274d40]"
                )}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex((prev) => (prev + 1) % frames.length);
                }}
                className="p-1.5 rounded-lg bg-white border border-[#C8CFD5] text-[#5B6773] hover:text-[#1D2227] hover:bg-[#F8FAF9] cursor-pointer"
                title="Next Year"
              >
                <SkipForward className="w-3.5 h-3.5" />
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
                      "px-2 py-1 rounded-lg font-mono text-[10.5px] font-bold transition-all cursor-pointer border flex items-center gap-1",
                      active
                        ? f.is_cutoff
                          ? "bg-[#C58A3A] text-white border-[#C58A3A] shadow-2xs"
                          : "bg-[#315F50] text-white border-[#315F50] shadow-2xs"
                        : "bg-white text-[#5B6773] border-[#C8CFD5] hover:bg-[#F8FAF9] hover:text-[#1D2227]"
                    )}
                  >
                    <span>{f.year}</span>
                    {f.is_cutoff && (
                      <span
                        className={cn(
                          "text-[8px] px-1 rounded",
                          active ? "bg-black/20 text-white" : "bg-amber-100 text-[#8C5819]"
                        )}
                      >
                        CUTOFF
                      </span>
                    )}
                    {yrLoss && !f.is_cutoff && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full inline-block",
                          active ? "bg-rose-300" : "bg-[#A64B45]"
                        )}
                        title={`Canopy loss detected in ${f.year}`}
                      />
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
