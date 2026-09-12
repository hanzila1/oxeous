"use client";

import { useState, useRef } from "react";
import { Upload, FileJson, AlertCircle, Loader2, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { EUDRCommodity } from "@oxeous/shared-types";

interface Props {
  onPlotReady: (geometry: object, commodity: EUDRCommodity, countryCode: string, countryName: string, areaHa?: number) => void;
  disabled?: boolean;
}

const COMMODITIES: { value: EUDRCommodity; label: string; emoji: string }[] = [
  { value: "cocoa",    label: "Cocoa",    emoji: "🍫" },
  { value: "coffee",   label: "Coffee",   emoji: "☕" },
  { value: "palm_oil", label: "Palm Oil", emoji: "🌴" },
  { value: "soya",     label: "Soya",     emoji: "🌱" },
  { value: "cattle",   label: "Cattle",   emoji: "🐄" },
  { value: "wood",     label: "Wood",     emoji: "🪵" },
  { value: "rubber",   label: "Rubber",   emoji: "⚙️" },
];

export default function PlotUploader({ onPlotReady, disabled }: Props) {
  const { activeGeoJSON: geometry, setActiveGeoJSON: setGeometry, drawingAOI } = useStore();
  const [dragging, setDragging] = useState(false);
  const [commodity, setCommodity] = useState<EUDRCommodity>("cocoa");
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
        if (json.type === "FeatureCollection" && json.features?.length) {
          geom = json.features[0].geometry;
        } else if (json.type === "Feature") {
          geom = json.geometry;
        }
        if (!["Polygon", "MultiPolygon", "Point"].includes(geom?.type)) {
          throw new Error("GeoJSON must contain a Polygon, MultiPolygon, or Point geometry");
        }
        setGeometry(geom);
        setFilename(file.name);
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
    onPlotReady(geometry, commodity, "", "");
  }

  return (
    <div className="space-y-3">
      {/* Commodity selector */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Commodity</p>
        <div className="flex flex-wrap gap-1">
          {COMMODITIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCommodity(c.value)}
              className={cn(
                "flex items-center gap-1 text-[11px] px-2 py-1 rounded-chip border transition-all",
                commodity === c.value
                  ? "bg-verified/10 border-verified/40 text-verified font-medium"
                  : "bg-bg border-border text-text-2 hover:border-steel/50 hover:text-text",
              )}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
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
            <p className="text-[10px] text-muted">or click to browse · Polygon / MultiPolygon / Point · passed to the agent for EUDR analysis</p>
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

      {/* Brazil example hint */}
      <p className="text-[10px] text-muted leading-relaxed">
        💡 Try the <span className="text-verified font-medium">Brazil soya / Amazon cocoa example</span> below — pre-loaded coordinates from a known deforestation-risk area.
      </p>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!geometry || disabled}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all duration-150",
          geometry && !disabled
            ? "bg-graphite hover:bg-text text-bg"
            : "bg-bg-2 text-muted cursor-not-allowed border border-border",
        )}
      >
        {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {disabled ? "Running assessment…" : "Run EUDR Assessment"}
      </button>
    </div>
  );
}
