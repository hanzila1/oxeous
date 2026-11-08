"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  FileJson,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Coffee,
  Trees,
  Palmtree,
  Sprout,
  CircleDot,
  TreePine,
  Shield,
  Scan,
  MapPin,
  Layers,
  Sparkles,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { EUDRCommodity } from "@oxeous/shared-types";
import { extractBboxFromGeometry } from "@/lib/maplibre";
import {
  parseBatchFile,
  type BatchPlotItem,
  createGeodesicCirclePolygon,
} from "@/lib/plotParser";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  onPlotReady: (
    geometry: object,
    commodity: EUDRCommodity,
    countryCode: string,
    countryName: string,
    areaHa?: number
  ) => void;
  disabled?: boolean;
}

interface FTWSnapMeta {
  area_ha: number;
  vertex_count: number;
  confidence: number;
  window_a_date?: string;
  window_b_date?: string;
  mode: string;
}

const COMMODITIES: { value: EUDRCommodity; label: string; icon: typeof Coffee }[] = [
  { value: "coffee",   label: "Coffee",   icon: Coffee },
  { value: "cocoa",    label: "Cocoa",    icon: Trees },
  { value: "rubber",   label: "Rubber",   icon: CircleDot },
  { value: "palm_oil", label: "Palm Oil", icon: Palmtree },
  { value: "soya",     label: "Soya",     icon: Sprout },
  { value: "wood",     label: "Wood",     icon: TreePine },
  { value: "cattle",   label: "Cattle",   icon: Shield },
];

const DEMO_BATCHES = [
  {
    label: "Ghana Cocoa Smallholders (5 GPS Points <4ha)",
    shortLabel: "Ghana Cocoa (5 Points)",
    commodity: "cocoa" as EUDRCommodity,
    countryCode: "GH",
    countryName: "Ghana",
    plots: [
      { id: "GH-SML-01", name: "Kofi Mensah Cocoa Farm", lat: 6.2145, lng: -2.7812, area: 1.8 },
      { id: "GH-SML-02", name: "Abena Osei Organic Parcel", lat: 6.223, lng: -2.7745, area: 2.2 },
      { id: "GH-SML-03", name: "Kwame Boateng Sourcing Plot", lat: 6.2088, lng: -2.789, area: 1.5 },
      { id: "GH-SML-04", name: "Akua Sarpong Shade Cocoa", lat: 6.231, lng: -2.768, area: 2.8 },
      { id: "GH-SML-05", name: "Yaw Asante Smallholder Field", lat: 6.219, lng: -2.795, area: 1.9 },
    ],
  },
  {
    label: "Côte d'Ivoire Mixed Batch (Polygons + Smallholder Points)",
    shortLabel: "CI Mixed (Polygon + Points)",
    commodity: "cocoa" as EUDRCommodity,
    countryCode: "CI",
    countryName: "Côte d'Ivoire",
    plots: [
      {
        id: "CI-COOP-01",
        name: "Coopérative Nawa Parcel A (Polygon)",
        isPoly: true,
        poly: [
          [-6.618, 5.792],
          [-6.611, 5.792],
          [-6.611, 5.786],
          [-6.618, 5.786],
          [-6.618, 5.792],
        ],
        area: 5.6,
      },
      { id: "CI-SML-02", name: "Amadou Diallo GPS Point", lat: 5.8012, lng: -6.6245, area: 1.7 },
      { id: "CI-SML-03", name: "Fatou Traoré GPS Point", lat: 5.7845, lng: -6.609, area: 2.1 },
    ],
  },
  {
    label: "Indonesia Palm & Rubber Cooperative (5 Smallholders)",
    shortLabel: "Indonesia Palm/Rubber (5)",
    commodity: "palm_oil" as EUDRCommodity,
    countryCode: "ID",
    countryName: "Indonesia",
    plots: [
      { id: "ID-SML-301", name: "Budi Santoso Smallholder Palm", lat: 0.312, lng: 102.145, area: 2.5 },
      { id: "ID-SML-302", name: "Siti Rahayu Rubber Agroforestry", lat: 0.298, lng: 102.162, area: 2.0 },
      { id: "ID-SML-303", name: "Agus Wijaya Smallholder Palm Point", lat: 0.318, lng: 102.135, area: 2.1 },
      { id: "ID-SML-304", name: "Dewi Lestari Rubber Farm Point", lat: 0.304, lng: 102.17, area: 1.7 },
      { id: "ID-SML-305", name: "Hendra Pratama Mixed Farm", lat: 0.325, lng: 102.152, area: 2.4 },
    ],
  },
];

export default function PlotUploader({ onPlotReady, disabled }: Props) {
  const {
    activeGeoJSON: geometry,
    setActiveGeoJSON: setGeometry,
    addLayer,
    pendingPinCoords,
    setPendingPinCoords,
    batchPlots,
    setBatchPlots,
    setActiveBatchPlotIndex,
  } = useStore();

  const [dragging, setDragging] = useState(false);
  const [commodity, setCommodity] = useState<EUDRCommodity>("cocoa");
  const [detectedCountryCode, setDetectedCountryCode] = useState<string>("");
  const [detectedCountryName, setDetectedCountryName] = useState<string>("");
  const [detectedAreaHa, setDetectedAreaHa] = useState<number | undefined>(undefined);
  const [filename, setFilename] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [gpsInput, setGpsInput] = useState<string>("");
  const [snapping, setSnapping] = useState<boolean>(false);
  const [snapMeta, setSnapMeta] = useState<FTWSnapMeta | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync custom pin drops from map canvas
  useEffect(() => {
    if (pendingPinCoords) {
      const { lat, lng } = pendingPinCoords;
      const formatted = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setGpsInput(formatted);
      const pointGeom = { type: "Point", coordinates: [lng, lat] };
      setGeometry(pointGeom);
      setFilename(`GPS Pin (${formatted})`);
      setBatchPlots([
        {
          id: `pin_${Date.now()}`,
          name: `Custom Map Pin (${formatted})`,
          commodity,
          countryCode: "",
          countryName: "",
          areaHa: 1.8,
          geometry: pointGeom,
          originalGeometry: pointGeom,
          isPoint: true,
          pointCoords: [lng, lat],
          status: "pending",
          sourceFile: "map_drop",
        },
      ]);
      setPendingPinCoords(null);
    }
  }, [pendingPinCoords, setPendingPinCoords, setGeometry, setBatchPlots, commodity]);

  async function handleFile(file: File) {
    setParseError(null);
    setSnapMeta(null);
    setIsProcessingFile(true);

    try {
      const parsedPlots = await parseBatchFile(file);
      if (!parsedPlots || parsedPlots.length === 0) {
        throw new Error("No valid plots or coordinates found in file.");
      }

      const batchItems: BatchPlotItem[] = parsedPlots.map((p) => ({
        ...p,
        status: "pending",
      }));

      setBatchPlots(batchItems);
      setActiveBatchPlotIndex(0);

      const first = batchItems[0];
      setFilename(`${file.name} (${batchItems.length} plots)`);
      setCommodity(first.commodity);
      setDetectedCountryCode(first.countryCode);
      setDetectedCountryName(first.countryName);
      setDetectedAreaHa(first.areaHa);

      if (batchItems.length === 1) {
        setGeometry(first.geometry);
        const bbox = extractBboxFromGeometry(first.geometry);
        if (bbox) {
          (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
        }
      } else {
        const fc = {
          type: "FeatureCollection",
          features: batchItems.map((b) => ({
            type: "Feature",
            id: b.id,
            geometry: b.geometry,
            properties: {
              name: b.name,
              commodity: b.commodity,
              isPoint: b.isPoint,
              area_ha: b.areaHa,
            },
          })),
        };
        setGeometry(fc);
        const bbox = extractBboxFromGeometry(fc);
        if (bbox) {
          (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
        }
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse plot file.");
      setGeometry(null);
      setFilename(null);
    } finally {
      setIsProcessingFile(false);
    }
  }

  function loadDemoBatch(demoIndex: number) {
    const demo = DEMO_BATCHES[demoIndex];
    if (!demo) return;

    setParseError(null);
    const batchItems: BatchPlotItem[] = demo.plots.map((p: any) => {
      let geom: any;
      let isPoint = false;
      let pointCoords: [number, number] | undefined = undefined;

      if (p.isPoly && p.poly) {
        geom = { type: "Polygon", coordinates: [p.poly] };
      } else {
        geom = { type: "Point", coordinates: [p.lng, p.lat] };
        isPoint = true;
        pointCoords = [p.lng, p.lat];
      }

      return {
        id: p.id,
        name: p.name,
        commodity: demo.commodity,
        countryCode: demo.countryCode,
        countryName: demo.countryName,
        areaHa: p.area,
        geometry: geom,
        originalGeometry: geom,
        isPoint,
        pointCoords,
        status: "pending",
        sourceFile: "sample_demo",
      };
    });

    setBatchPlots(batchItems);
    setActiveBatchPlotIndex(0);
    setFilename(demo.label);
    setCommodity(demo.commodity);
    setDetectedCountryCode(demo.countryCode);
    setDetectedCountryName(demo.countryName);

    const fc = {
      type: "FeatureCollection",
      features: batchItems.map((b) => ({
        type: "Feature",
        id: b.id,
        geometry: b.geometry,
        properties: { name: b.name, commodity: b.commodity, isPoint: b.isPoint, area_ha: b.areaHa },
      })),
    };
    setGeometry(fc);
    const bbox = extractBboxFromGeometry(fc);
    if (bbox) {
      (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
    }
  }

  const previewAndFlyToCoords = useCallback((raw: string) => {
    const parts = raw.trim().split(/[\s,;]+/).map(Number).filter((n) => !Number.isNaN(n));
    if (parts.length >= 2 && Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180) {
      const lat = parts[0];
      const lng = parts[1];
      const pointGeom = { type: "Point", coordinates: [lng, lat] };
      setGeometry(pointGeom);
      setFilename(`Smallholder GPS Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      const flyFn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
      if (flyFn) {
        flyFn([lng - 0.015, lat - 0.015, lng + 0.015, lat + 0.015]);
      }
      return { lat, lng };
    }
    return null;
  }, [setGeometry, setFilename]);

  async function handleFtwDelineate(mode: "gps" | "geometry", presetCoords?: string) {
    setParseError(null);
    setSnapping(true);
    try {
      let payload: Record<string, unknown> = { target_area_ha: 12.0 };
      if (mode === "gps") {
        const raw = (presetCoords ?? gpsInput).trim();
        const coords = previewAndFlyToCoords(raw);
        if (!coords) {
          throw new Error("Enter valid Lat, Lng coordinates (e.g. 6.2145, -2.7812)");
        }
        payload = { lat: coords.lat, lng: coords.lng, target_area_ha: 12.0 };
      } else if (geometry) {
        payload = { geometry, target_area_ha: detectedAreaHa ?? 12.0 };
      } else {
        throw new Error("Enter GPS coordinates or load/draw a geometry first");
      }

      const res = await fetch(`${API_BASE}/eudr/ftw-delineate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errBody.detail || "Field boundary delineation failed");
      }
      const data = await res.json();
      setGeometry(data.geometry);
      if (data.ftw_geojson && data.ftw_geojson.features?.length) {
        addLayer({
          id: "ftw-field-boundaries",
          label: "FTW Field Boundaries · Art. 9(1)(d) (Vector)",
          type: "geojson",
          geojsonData: data.ftw_geojson,
          visible: true,
          opacity: 0.95,
          legend: {
            title: "FTW Connected Parcel Vector Mesh (10m S2)",
            classes: [
              { label: "Cultivated Field Boundary (Vector)", color: "#00F5D4" },
              { label: "Agroforestry / Tree-Crop Parcel (Vector)", color: "#38BDF8" },
            ],
          } as unknown as import("@oxeous/shared-types").AnalysisResponse["legend"],
          analysisType: "land_disturbance",
          layer_type: "ftw_boundaries",
        });
      }
      setDetectedCountryCode(data.country_code || "");
      setDetectedCountryName(data.country_name || "");
      setDetectedAreaHa(data.area_ha);
      setFilename(`Art. 9(1)(d) Parcel (${data.area_ha} ha · ${data.vertex_count} pts)`);
      setSnapMeta({
        area_ha: data.area_ha,
        vertex_count: data.vertex_count,
        confidence: data.confidence,
        window_a_date: data.window_a_date,
        window_b_date: data.window_b_date,
        mode: data.mode,
      });

      const bbox = extractBboxFromGeometry(data.geometry);
      if (bbox) {
        (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Field delineation failed");
    } finally {
      setSnapping(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleSubmit() {
    if (!geometry) return;
    onPlotReady(geometry, commodity, detectedCountryCode, detectedCountryName, detectedAreaHa);
  }

  return (
    <div className="space-y-3">
      {/* Commodity selection - Oxeous Light Steel Palette with zero-layout-shift border highlight */}
      <div>
        <label className="block text-[10.5px] font-mono font-semibold uppercase tracking-wider text-[#747F88] mb-1.5">
          EUDR Regulated Commodity (Annex I)
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {COMMODITIES.map((c) => {
            const Icon = c.icon;
            const active = commodity === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCommodity(c.value)}
                className={cn(
                  "h-9 flex items-center gap-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer shadow-2xs select-none",
                  active
                    ? "border-[#315F50] ring-1 ring-[#315F50] bg-[#315F50]/10 text-[#1E4337] shadow-xs"
                    : "border-[#C8CFD5] hover:border-[#8E99A4] bg-white text-[#5B6773] hover:text-[#1D2227] hover:bg-slate-50"
                )}
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 flex-shrink-0 transition-colors",
                    active ? "text-[#315F50]" : "text-[#747F88]"
                  )}
                />
                <span className="truncate">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Universal Multi-Plot & Points Drag-and-Drop Area (Primary Ingestion - Comfortable Padding) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all duration-150 group",
          dragging
            ? "border-[#315F50] bg-[rgba(49,95,80,0.06)] scale-[1.005]"
            : batchPlots.length > 0 || geometry
            ? "border-[rgba(49,95,80,0.45)] bg-[rgba(49,95,80,0.03)]"
            : "border-[#C8CFD5] hover:border-[#315F50] hover:bg-white/80 bg-white/40"
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".geojson,.json,.csv,.tsv,.txt,.kml,.zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
          }}
        />

        {isProcessingFile ? (
          <div className="py-3 space-y-2">
            <Loader2 className="w-6 h-6 text-[#315F50] animate-spin mx-auto" />
            <p className="text-xs text-[#1D2227] font-medium">Parsing multi-plot file &amp; coordinates...</p>
          </div>
        ) : batchPlots.length > 0 ? (
          <div className="space-y-2.5 py-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-left min-w-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[rgba(49,95,80,0.12)] text-[#315F50] shrink-0 border border-[rgba(49,95,80,0.2)]">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1D2227] truncate">
                    {batchPlots.length > 1
                      ? `${batchPlots.length} Plots Ingested (Batch Queue Ready)`
                      : "Plot Geometry Ingested"}
                  </p>
                  <p className="text-[10px] text-[#747F88] truncate font-mono">
                    {filename}
                    {detectedCountryName ? ` · ${detectedCountryName}` : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBatchPlots([]);
                  setGeometry(null);
                  setFilename(null);
                  setSnapMeta(null);
                }}
                className="p-1 text-[#747F88] hover:text-[#1D2227] rounded-md hover:bg-[#F4F5F6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Batch Breakdown Pill */}
            <div className="flex items-center justify-between gap-2 text-[10px] bg-white border border-[#C8CFD5] rounded-md px-2.5 py-1.5 text-[#343B42] font-mono shadow-2xs">
              <span>{batchPlots.filter((p) => !p.isPoint).length} Polygons</span>
              <span className="text-[#C8CFD5]">·</span>
              <span className="text-[#315F50] font-semibold">
                {batchPlots.filter((p) => p.isPoint).length} GPS Points (&lt;4ha)
              </span>
              <span className="text-[#C8CFD5]">·</span>
              <span>
                {batchPlots.reduce((acc, p) => acc + (p.areaHa || 1.8), 0).toFixed(1)} ha total
              </span>
            </div>
          </div>
        ) : geometry ? (
          <div className="flex items-center justify-between gap-2 text-left py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-[#315F50] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#315F50] font-semibold truncate">
                  {snapMeta ? "Field Boundary Snapped" : "Geometry Loaded"}
                </p>
                <p className="text-[10px] text-[#747F88] truncate font-mono">
                  {filename || "Drawn on map"}
                  {detectedCountryName ? ` · ${detectedCountryName}` : ""}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGeometry(null);
                setFilename(null);
                setSnapMeta(null);
              }}
              className="text-[#747F88] hover:text-[#1D2227]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] text-[#315F50] flex items-center justify-center mx-auto shadow-2xs group-hover:scale-105 transition-transform">
              <Upload className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[12.5px] font-semibold text-[#1D2227]">
                Drop Multi-Plot Batch File or Coordinates
              </p>
              <p className="text-[11px] text-[#747F88]">
                Drag and drop files here, or <span className="text-[#315F50] font-semibold underline underline-offset-2">browse device</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-1 text-[9.5px] font-mono text-[#5B6773]">
              <span className="px-1.5 py-0.5 rounded bg-white border border-[#C8CFD5] shadow-2xs">.geojson</span>
              <span className="px-1.5 py-0.5 rounded bg-white border border-[#C8CFD5] shadow-2xs">.csv</span>
              <span className="px-1.5 py-0.5 rounded bg-white border border-[#C8CFD5] shadow-2xs">.kml</span>
              <span className="px-1.5 py-0.5 rounded bg-white border border-[#C8CFD5] shadow-2xs">.zip</span>
            </div>
          </div>
        )}
      </div>

      {/* GPS Pin Snap Bar (Art. 9(1)(d) Smallholder Single GPS) */}
      <div className="p-2.5 rounded-xl border border-[rgba(49,95,80,0.25)] bg-[rgba(49,95,80,0.04)] space-y-2">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Scan className="w-3.5 h-3.5 text-[#315F50] flex-shrink-0" />
            <span className="text-[10.5px] font-semibold text-[#1D2227] truncate">
              Smallholder Single GPS Coordinate
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.1)] border border-[rgba(49,95,80,0.2)] px-1.5 py-0.5 rounded flex-shrink-0">
            EUDR Art. 9(1)(d) &lt;4ha
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <MapPin className="w-3 h-3 text-[#8E99A4] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={gpsInput}
              onChange={(e) => {
                const val = e.target.value;
                setGpsInput(val);
                // Immediately zoom and show point as user types/pastes valid coordinates
                previewAndFlyToCoords(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && gpsInput.trim() && !snapping && !disabled) {
                  e.preventDefault();
                  previewAndFlyToCoords(gpsInput);
                  handleFtwDelineate("gps");
                }
              }}
              placeholder="Lat, Lng (e.g. 6.2145, -2.7812)"
              className="w-full pl-7 pr-2 py-1 text-[11px] font-mono bg-white border border-[#C8CFD5] rounded-md text-[#1D2227] placeholder:text-[#8E99A4] focus:outline-none focus:border-[#315F50]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const coords = gpsInput.trim() || "6.2145, -2.7812";
              setGpsInput(coords);
              // 1. Immediately frame & zoom to coordinate the instant it is inserted!
              previewAndFlyToCoords(coords);
              // 2. Then proceed to delineate boundary via 10m Sentinel-2 FTW model
              handleFtwDelineate("gps", coords);
            }}
            disabled={snapping || disabled}
            title="Auto-delineate physical farm polygon from 10m Sentinel-2 satellite bi-temporal imagery"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[rgba(49,95,80,0.08)] hover:bg-[rgba(49,95,80,0.16)] text-[#315F50] border border-[rgba(49,95,80,0.25)] transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {snapping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
            <span>{snapping ? "Snapping..." : gpsInput.trim() ? "AI Delineate" : "Try GPS"}</span>
          </button>
        </div>
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#A64B45] bg-[rgba(166,75,69,0.08)] border border-[rgba(166,75,69,0.25)] rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Primary Submit / Audit Button - Directly Under Ingestion Inputs */}
      <button
        onClick={handleSubmit}
        disabled={!geometry || disabled}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer shadow-xs",
          geometry && !disabled
            ? "bg-[#315F50] hover:bg-[#274d40] text-white"
            : "bg-[#E3E7EA] text-[#747F88] cursor-not-allowed border border-[#C8CFD5]"
        )}
      >
        {disabled ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : batchPlots.length > 1 ? (
          <Layers className="w-4 h-4" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {disabled
          ? "Running assessment..."
          : batchPlots.length > 1
          ? `Inspect & Audit Batch (${batchPlots.length} Plots)`
          : "Run Single EUDR Assessment"}
      </button>

      {/* Sample Farm Batches - Unified Demo Section Directly Below Primary CTA */}
      <div className="pt-1 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-[#747F88] font-mono">
          <span className="uppercase tracking-wider font-semibold">Sample Farm Batches</span>
          <span className="text-[#315F50] font-semibold">1-Click Test</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {DEMO_BATCHES.map((b, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadDemoBatch(idx)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#C8CFD5] bg-white hover:border-[#315F50] hover:bg-[rgba(49,95,80,0.04)] text-left transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-1.5 py-0.5 rounded flex-shrink-0">
                  {b.countryCode}
                </span>
                <span className="text-[11.5px] font-medium text-[#1D2227] group-hover:text-[#315F50] transition-colors truncate">
                  {b.label}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#747F88] bg-[#F4F5F6] border border-[#C8CFD5] px-1.5 py-0.5 rounded flex-shrink-0 ml-2">
                {b.plots.length} plots
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
