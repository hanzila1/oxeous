"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { EUDRCommodity } from "@oxeous/shared-types";
import { extractBboxFromGeometry } from "@/lib/maplibre";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  onPlotReady: (geometry: object, commodity: EUDRCommodity, countryCode: string, countryName: string, areaHa?: number) => void;
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

export default function PlotUploader({ onPlotReady, disabled }: Props) {
  const {
    activeGeoJSON: geometry,
    setActiveGeoJSON: setGeometry,
    addLayer,
    pendingPinCoords,
    setPendingPinCoords,
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
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setParseError(null);
    setSnapMeta(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        let geom = json;
        let props: Record<string, unknown> = {};
        if (json.type === "FeatureCollection" && json.features?.length) {
          geom = json.features[0].geometry;
          props = json.features[0].properties || {};
        } else if (json.type === "Feature") {
          geom = json.geometry;
          props = json.properties || {};
        }
        if (!["Polygon", "MultiPolygon", "Point"].includes(geom?.type)) {
          throw new Error("GeoJSON must contain a Polygon, MultiPolygon, or Point geometry");
        }
        const rawComm = String(props.commodity || "").toLowerCase();
        if (COMMODITIES.some((c) => c.value === rawComm)) {
          setCommodity(rawComm as EUDRCommodity);
        }
        setDetectedCountryCode(typeof props.country_code === "string" ? props.country_code : "");
        setDetectedCountryName(typeof props.country_name === "string" ? props.country_name : "");
        setDetectedAreaHa(typeof props.area_ha === "number" ? props.area_ha : undefined);
        setGeometry(geom);
        setFilename(file.name);
        const bbox = extractBboxFromGeometry(geom);
        if (bbox) {
          (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
        }
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Invalid GeoJSON file");
        setGeometry(null);
        setFilename(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleFtwDelineate(mode: "gps" | "geometry", presetCoords?: string) {
    setParseError(null);
    setSnapping(true);
    try {
      let payload: Record<string, unknown> = { target_area_ha: 12.0 };
      if (mode === "gps") {
        const raw = (presetCoords ?? gpsInput).trim();
        const parts = raw.split(/[\s,;]+/).map(Number).filter((n) => !Number.isNaN(n));
        if (parts.length < 2 || Math.abs(parts[0]) > 90 || Math.abs(parts[1]) > 180) {
          throw new Error("Enter valid Lat, Lng coordinates (e.g. 5.7920, -6.6180)");
        }
        payload = { lat: parts[0], lng: parts[1], target_area_ha: 12.0 };
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
      setFilename(
        `Art. 9(1)(d) Parcel (${data.area_ha} ha · ${data.vertex_count} pts)`
      );
      setSnapMeta({
        area_ha: data.area_ha,
        vertex_count: data.vertex_count,
        confidence: data.confidence,
        window_a_date: data.bitemporal_stac?.window_a?.datetime,
        window_b_date: data.bitemporal_stac?.window_b?.datetime,
        mode: data.mode,
      });

      const bbox = extractBboxFromGeometry(data.geometry);
      if (bbox) {
        (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Field boundary snap failed");
    } finally {
      setSnapping(false);
    }
  }

  // Auto-populate GPS Pin & run FTW field boundary delineation when user drops a custom point on map
  useEffect(() => {
    if (!pendingPinCoords) return;
    const coordStr = `${pendingPinCoords.lat.toFixed(5)}, ${pendingPinCoords.lng.toFixed(5)}`;
    setGpsInput(coordStr);
    setPendingPinCoords(null);
    void handleFtwDelineate("gps", coordStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPinCoords]);

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
    <div className="space-y-2.5">
      {/* Commodity selector */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Commodity</p>
        <div className="flex flex-wrap gap-1">
          {COMMODITIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.value}
                onClick={() => setCommodity(c.value)}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer",
                  commodity === c.value
                    ? "bg-white border-[#315F50] text-[#1D2227] font-semibold shadow-xs ring-1 ring-[#315F50]/20"
                    : "bg-white border-[#C8CFD5] text-[#343B42] hover:border-[#8E99A4] hover:text-[#1D2227]",
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", commodity === c.value ? "text-[#315F50]" : "text-[#8E99A4]")} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GPS Pin -> Auto-Delineate Field Polygon (Art. 9(1)(d) FTW) */}
      <div className="rounded-lg border border-[#C8CFD5] bg-white px-2.5 py-2 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Scan className="w-3.5 h-3.5 text-[#315F50] flex-shrink-0" />
            <span className="text-[10px] font-semibold text-[#1D2227] truncate">
              GPS Pin → Field Boundary Snap
            </span>
          </div>
          <span className="text-[9px] font-mono font-semibold text-[#315F50] bg-[#315F50]/10 px-1.5 py-0.5 rounded">
            Art. 9(1)(d)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <MapPin className="w-3 h-3 text-[#8E99A4] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={gpsInput}
              onChange={(e) => setGpsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && gpsInput.trim() && !snapping && !disabled) {
                  e.preventDefault();
                  handleFtwDelineate("gps");
                }
              }}
              placeholder="Lat, Lng (e.g. 5.7920, -6.6180)"
              className="w-full pl-6 pr-2 py-1 text-[11px] font-mono bg-[#F8F9FA] border border-[#C8CFD5] rounded-md text-[#1D2227] placeholder:text-[#8E99A4] focus:outline-none focus:border-[#315F50]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!gpsInput.trim()) {
                const demo = "5.7920, -6.6180";
                setGpsInput(demo);
                handleFtwDelineate("gps", demo);
              } else {
                handleFtwDelineate("gps");
              }
            }}
            disabled={snapping || disabled}
            title="Auto-delineate true physical farm polygon from bi-temporal 10m satellite scenes"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#315F50]/10 hover:bg-[#315F50]/20 text-[#315F50] border border-[#315F50]/30 transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {snapping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
            <span>{snapping ? "Snapping..." : gpsInput.trim() ? "Delineate" : "Try Pin"}</span>
          </button>
        </div>
      </div>

      {/* GeoJSON drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl px-3.5 py-3.5 text-center cursor-pointer transition-all duration-150",
          dragging
            ? "border-steel bg-steel/5"
            : geometry
            ? "border-verified/50 bg-verified/5"
            : "border-border hover:border-steel/50 hover:bg-bg-2",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".geojson,.json"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />

        {geometry ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-verified flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-xs text-verified font-medium truncate">
                  {snapMeta ? "Field Boundary Snapped" : "Geometry loaded"}
                </p>
                <p className="text-[10px] text-muted truncate">
                  {filename || "Drawn on map"}
                  {detectedCountryName ? ` · ${detectedCountryName}` : ""}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setGeometry(null);
                  setFilename(null);
                  setSnapMeta(null);
                  setDetectedAreaHa(undefined);
                }}
                className="ml-auto text-muted hover:text-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {snapMeta ? (
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono bg-white/80 border border-[#315F50]/25 rounded-md px-2 py-1 text-[#343B42]">
                <span>
                  {snapMeta.vertex_count} vertices · {Math.round(snapMeta.confidence * 100)}% edge conf
                </span>
                {snapMeta.window_a_date && snapMeta.window_b_date && (
                  <span className="text-[#315F50]">
                    S2 {snapMeta.window_a_date.slice(0, 7)}/{snapMeta.window_b_date.slice(0, 7)}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFtwDelineate("geometry");
                }}
                disabled={snapping || disabled}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[10px] font-semibold bg-white hover:bg-[#315F50]/10 text-[#315F50] border border-[#315F50]/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {snapping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
                <span>{snapping ? "Snapping Bi-Temporal Edges..." : "Snap Rough Box / Pin to True Field Edges"}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <FileJson className="w-5 h-5 text-muted mx-auto" />
            <p className="text-xs text-text">Drop GeoJSON plot file or draw on map</p>
            <p className="text-[10px] text-muted">Polygon, MultiPolygon, or Point GeoJSON</p>
          </div>
        )}
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="flex items-center gap-1.5 text-[11px] text-danger">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!geometry || disabled}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all duration-150",
          geometry && !disabled
            ? "bg-[#315F50] hover:bg-[#274d40] text-white shadow-xs font-semibold cursor-pointer"
            : "bg-[#E3E7EA] text-[#747F88] cursor-not-allowed border border-[#C8CFD5]",
        )}
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {disabled ? "Running assessment..." : "Run EUDR Assessment"}
      </button>
    </div>
  );
}
