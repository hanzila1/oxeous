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

export interface TimelapseFrame {
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
  result?: EUDRAnalysisResponse | null;
}

const DEFAULT_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

let cachedGeomSignature = "";
let cachedFrames: TimelapseFrame[] = [];

export default function SentinelTimelapsePlayer({ result }: Props) {
  const { activeGeoJSON, ddsHistory, basemapMode, setBasemapMode } = useStore();
  const effectiveResult = result ?? ddsHistory[0] ?? null;

  const plotGeom = effectiveResult?.plot?.geometry ?? activeGeoJSON ?? null;
  const geomSig = plotGeom ? `v2:${JSON.stringify(plotGeom).slice(0, 180)}` : "";

  const areaHa = effectiveResult?.plot?.area_ha ?? 100.0;
  const def = effectiveResult?.risk_assessment?.deforestation;

  const [frames, setFrames] = useState<TimelapseFrame[]>(() =>
    geomSig && geomSig === cachedGeomSignature ? cachedFrames : []
  );
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStepYear, setLoadStepYear] = useState(2020);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<boolean>(() =>
    Boolean(geomSig && geomSig === cachedGeomSignature && cachedFrames.length > 0)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [spectralMode, setSpectralMode] = useState<"pinpoint" | "rgb" | "nir">("pinpoint");
  const [syncToMap, setSyncToMap] = useState(true);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      try {
        if (map.getLayer("oxeous-plot-casing")) map.moveLayer("oxeous-plot-casing");
        if (map.getLayer("oxeous-plot-line")) map.moveLayer("oxeous-plot-line");
      } catch {}
    },
    [clearMapTimelapseLayers]
  );

  const loadTimelapse = async (autoPlay = true) => {
    if (loading) return;
    if (!plotGeom) {
      setErrorMsg("Select or draw a plot on the map first.");
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
              geometry: plotGeom,
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
        cachedGeomSignature = geomSig;
        cachedFrames = data.frames;
        setFrames(data.frames);
        setLoaded(true);
        setActiveIndex(0);
        if (autoPlay) setIsPlaying(true);

        const bbox = extractBboxFromGeometry(plotGeom as object);
        const flyFn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
        if (bbox && flyFn) flyFn(bbox);
      } else {
        setErrorMsg(`Could not load timelapse (${lastErr || "No frames"}).`);
      }
    } catch {
      setErrorMsg("Failed to stream timelapse.");
    } finally {
      clearInterval(progInterval);
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (!loaded || frames.length === 0) return;
    syncFramesToMap(frames, activeIndex, spectralMode, syncToMap);
  }, [loaded, frames, activeIndex, spectralMode, syncToMap, syncFramesToMap]);

  useEffect(() => {
    if (geomSig && geomSig === cachedGeomSignature && cachedFrames.length > 0) {
      setFrames(cachedFrames);
      setLoaded(true);
      return;
    }
    setFrames([]);
    setLoaded(false);
    setIsPlaying(false);
    setActiveIndex(0);
    clearMapTimelapseLayers();
  }, [geomSig, clearMapTimelapseLayers]);

  const currentFrame = frames[activeIndex] ?? {
    year: DEFAULT_YEARS[activeIndex] ?? 2020,
    label: `${DEFAULT_YEARS[activeIndex]}`,
    is_cutoff: DEFAULT_YEARS[activeIndex] === 2020,
    rgb_tile_url: null,
    nir_tile_url: null,
    rgb_thumb_url: null,
    nir_thumb_url: null,
    sensor: "Sentinel-2 10m",
  };

  const activeThumbUrl =
    spectralMode === "pinpoint"
      ? currentFrame.pinpoint_thumb_url || currentFrame.rgb_thumb_url
      : spectralMode === "rgb"
      ? currentFrame.rgb_thumb_url
      : currentFrame.nir_thumb_url;

  const cutoff2020Cover = Number(def?.forest_cover_2020_pct ?? 85);
  const postLossPct = Number(def?.forest_loss_pct ?? 0);
  const lossYears = def?.loss_years ?? [];
  const getYearCanopyPct = (yr: number) => {
    if (yr <= 2020) return cutoff2020Cover;
    const progress = Math.min(1, (yr - 2020) / 5);
    return Math.max(0, cutoff2020Cover - postLossPct * progress);
  };
  const yearCanopyPct = getYearCanopyPct(currentFrame.year);
  const isLossYear = lossYears.includes(currentFrame.year);

  return (
    <div className="bg-white rounded-xl border border-[#C8CFD5] p-3 shadow-2xs space-y-2.5 text-[#1D2227]">
      {/* Compact Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[rgba(49,95,80,0.1)] border border-[rgba(49,95,80,0.25)] flex items-center justify-center text-[#315F50] flex-shrink-0">
            <SentinelTimelapseIcon className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-bold text-[#1D2227]">
            10m Plot Timelapse
          </span>
          <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(49,95,80,0.08)] text-[#315F50] border border-[rgba(49,95,80,0.22)]">
            {areaHa.toFixed(1)} ha
          </span>
        </div>

        {/* Mode & Map Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-[#E3E7EA] p-0.5 rounded-lg border border-[#C8CFD5] text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setSpectralMode("pinpoint")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                spectralMode === "pinpoint"
                  ? "bg-white text-[#A64B45] shadow-2xs font-bold"
                  : "text-[#5B6773] hover:text-[#1D2227]"
              )}
              title="Sentinel-2 + Red Loss Pinpoint"
            >
              Pinpoint
            </button>
            <button
              type="button"
              onClick={() => setSpectralMode("rgb")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                spectralMode === "rgb"
                  ? "bg-white text-[#1D2227] shadow-2xs font-bold"
                  : "text-[#5B6773] hover:text-[#1D2227]"
              )}
              title="True Color (RGB)"
            >
              RGB
            </button>
            <button
              type="button"
              onClick={() => setSpectralMode("nir")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                spectralMode === "nir"
                  ? "bg-white text-[#315F50] shadow-2xs font-bold"
                  : "text-[#5B6773] hover:text-[#1D2227]"
              )}
              title="NIR False Color (B8)"
            >
              NIR
            </button>
          </div>

          {loaded && (
            <button
              type="button"
              onClick={() => setSyncToMap((v) => !v)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer",
                syncToMap
                  ? "bg-[#315F50] text-white border-[#315F50]"
                  : "bg-white text-[#5B6773] border-[#C8CFD5]"
              )}
              title="Toggle Map Plot Overlay"
            >
              {syncToMap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Map</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      {!loaded ? (
        <div className="rounded-xl bg-[#F8FAF9] border border-[#C8CFD5] p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11.5px] font-semibold text-[#1D2227]">
              2020 Cutoff → 2025 Annual S2 Series
            </div>
            <button
              type="button"
              onClick={() => loadTimelapse(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#315F50] hover:bg-[#274d40] text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer flex-shrink-0 disabled:opacity-75"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{loadStepYear} ({loadProgress}%)</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Timelapse</span>
                </>
              )}
            </button>
          </div>

          {loading && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full bg-[#E3E7EA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#315F50] transition-all duration-300 rounded-full"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-6 gap-1">
                {DEFAULT_YEARS.map((yr) => {
                  const done = yr < loadStepYear;
                  const active = yr === loadStepYear;
                  return (
                    <div
                      key={yr}
                      className={cn(
                        "text-center py-0.5 rounded text-[9px] font-mono border",
                        done
                          ? "bg-[rgba(49,95,80,0.12)] border-[rgba(49,95,80,0.3)] text-[#315F50] font-bold"
                          : active
                          ? "bg-[rgba(197,138,58,0.15)] border-[#C58A3A] text-[#8C5819] font-bold animate-pulse"
                          : "bg-white border-[#E3E7EA] text-[#747F88]"
                      )}
                    >
                      {yr}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2 rounded-lg bg-[rgba(166,75,69,0.08)] border border-[rgba(166,75,69,0.28)] text-[#A64B45] text-[10.5px] font-mono">
              ⚠ {errorMsg}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Full-Width Clipped Satellite Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-[#1D2227] border border-[#C8CFD5] h-[220px] flex items-center justify-center">
            {activeThumbUrl ? (
              <img
                src={activeThumbUrl}
                alt={`Sentinel-2 10m ${currentFrame.year}`}
                className="w-full h-full object-cover transition-opacity duration-200"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center text-slate-300 space-y-1">
                <Sentinel2MSIIcon className="w-6 h-6 text-emerald-400" />
                <p className="text-[11px] font-semibold">
                  {currentFrame.year} Active on Map
                </p>
              </div>
            )}

            {/* Top-left Year Pill */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-[11px] font-mono font-extrabold shadow-md border backdrop-blur-md",
                  currentFrame.is_cutoff
                    ? "bg-[#C58A3A] text-white border-amber-300"
                    : isLossYear
                    ? "bg-[#A64B45] text-white border-rose-300"
                    : "bg-[#1D2227]/90 text-white border-slate-600"
                )}
              >
                {currentFrame.year} {currentFrame.is_cutoff ? "· CUTOFF" : isLossYear ? "· LOSS" : ""}
              </span>
            </div>

            {/* Top-right Focus Plot & Basemap Quick Toggle */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBasemapMode(basemapMode === "satellite" ? "light" : "satellite")}
                className="px-2 py-0.5 rounded-md bg-black/65 hover:bg-black/80 text-white border border-white/20 text-[9.5px] font-mono font-semibold backdrop-blur-md cursor-pointer"
                title="Switch Map Background between Satellite and White Map"
              >
                {basemapMode === "light" ? "White Map ✓" : "White Map"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (plotGeom) {
                    const bbox = extractBboxFromGeometry(plotGeom as object);
                    const flyFn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
                    if (bbox && flyFn) flyFn(bbox);
                  }
                }}
                className="p-1 rounded-md bg-black/65 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md cursor-pointer"
                title="Focus Plot on Map"
              >
                <PixelInspectorIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom Compact Telemetry Strip */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-white">
              <span>
                {spectralMode === "pinpoint" ? "S2 + Red Loss" : spectralMode === "rgb" ? "S2 RGB" : "S2 NIR"}
              </span>
              <span className="text-emerald-300 font-bold">
                Canopy: {yearCanopyPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Play/Pause + Year Scrubber Bar (Two Clean Rows — Zero Clipping) */}
          <div className="p-2.5 rounded-xl bg-[#F4F5F6] border border-[#C8CFD5] space-y-2">
            {/* Row 1: Transport Controls + Active Year Label */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveIndex((prev) => (prev - 1 + frames.length) % frames.length);
                  }}
                  className="p-1.5 rounded-lg bg-white border border-[#C8CFD5] text-[#5B6773] hover:text-[#1D2227] cursor-pointer"
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
                      ? "bg-[#C58A3A] text-white"
                      : "bg-[#315F50] text-white"
                  )}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveIndex((prev) => (prev + 1) % frames.length);
                  }}
                  className="p-1.5 rounded-lg bg-white border border-[#C8CFD5] text-[#5B6773] hover:text-[#1D2227] cursor-pointer"
                  title="Next Year"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-[10.5px] font-mono font-bold text-[#5B6773]">
                {currentFrame.year} {currentFrame.is_cutoff ? "· Cutoff Baseline" : isLossYear ? "· Loss Detected" : "· Verified"}
              </span>
            </div>

            {/* Row 2: 6 Equal-Width Year Pills (2020–2025) */}
            <div className="grid grid-cols-6 gap-1.5 w-full">
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
                      "py-1.5 rounded-lg font-mono text-[10.5px] font-bold transition-all cursor-pointer border flex items-center justify-center gap-1",
                      active
                        ? f.is_cutoff
                          ? "bg-[#C58A3A] text-white border-[#C58A3A] shadow-2xs"
                          : "bg-[#315F50] text-white border-[#315F50] shadow-2xs"
                        : "bg-white text-[#5B6773] border-[#C8CFD5] hover:text-[#1D2227]"
                    )}
                  >
                    <span>{f.year}</span>
                    {yrLoss && !f.is_cutoff && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full inline-block flex-shrink-0",
                          active ? "bg-rose-300" : "bg-[#A64B45]"
                        )}
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
