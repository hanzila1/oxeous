"use client";

import { useState, useRef } from "react";
import { Upload, FileJson, AlertCircle, Loader2, CheckCircle2, X, Coffee, Trees, Palmtree, Sprout, CircleDot, TreePine, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { EUDRCommodity } from "@oxeous/shared-types";
import { extractBboxFromGeometry } from "@/lib/maplibre";

interface Props {
  onPlotReady: (geometry: object, commodity: EUDRCommodity, countryCode: string, countryName: string, areaHa?: number) => void;
  disabled?: boolean;
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
  const { activeGeoJSON: geometry, setActiveGeoJSON: setGeometry, drawingAOI } = useStore();
  const [dragging, setDragging] = useState(false);
  const [commodity, setCommodity] = useState<EUDRCommodity>("cocoa");
  const [detectedCountryCode, setDetectedCountryCode] = useState<string>("");
  const [detectedCountryName, setDetectedCountryName] = useState<string>("");
  const [filename, setFilename] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // Accept GeoJSON Feature, FeatureCollection, or geometry directly
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
        // Auto-select commodity if declared in GeoJSON properties
        const rawComm = String(props.commodity || "").toLowerCase();
        if (COMMODITIES.some((c) => c.value === rawComm)) {
          setCommodity(rawComm as EUDRCommodity);
        }
        setDetectedCountryCode(typeof props.country_code === "string" ? props.country_code : "");
        setDetectedCountryName(typeof props.country_name === "string" ? props.country_name : "");
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleSubmit() {
    if (!geometry) return;
    onPlotReady(geometry, commodity, detectedCountryCode, detectedCountryName);
  }

  return (
    <div className="space-y-3">
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

      {/* GeoJSON drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-all duration-150",
          dragging
            ? "border-steel bg-steel/5"
            : geometry
            ? "border-verified/50 bg-verified/5"
            : "border-border hover:border-steel/50 hover:bg-bg-2",
        )}
      >
        <input ref={fileRef} type="file" accept=".geojson,.json" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

        {geometry ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-verified flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs text-verified font-medium">Geometry loaded</p>
              <p className="text-[10px] text-muted">{filename || "Drawn on map"}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setGeometry(null); setFilename(null); }}
              className="ml-auto text-muted hover:text-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <FileJson className="w-6 h-6 text-muted mx-auto" />
            <p className="text-xs text-text">Drop GeoJSON plot file here</p>
            <p className="text-[10px] text-muted">or click to browse (Polygon, MultiPolygon, or Point GeoJSON)</p>
          </div>
        )}
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="flex items-center gap-1.5 text-[11px] text-danger">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {parseError}
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
