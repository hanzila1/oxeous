"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { extractBboxFromGeometry } from "@/lib/maplibre";

interface Props {
  geometry: Record<string, unknown>;
  pwriTileUrl?: string | null;
}

/**
 * Locked, read-only one-shot satellite + 10m PWRI snapshot of a single supplier farm.
 * Zero pan/zoom/search controls so the supplier sees ONLY their submitted boundary.
 */
export default function SupplierFieldSnapshot({ geometry, pwriTileUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !geometry) return;

    const bbox = extractBboxFromGeometry(geometry);
    const center: [number, number] = bbox
      ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
      : [0, 0];

    const styleSources: maplibregl.StyleSpecification["sources"] = {
      "esri-sat": {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 19,
      },
      parcel: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: geometry as unknown as GeoJSON.Geometry,
        },
      },
    };

    const styleLayers: maplibregl.LayerSpecification[] = [
      {
        id: "esri-sat-layer",
        type: "raster",
        source: "esri-sat",
        paint: { "raster-opacity": 1 },
      },
    ];

    if (pwriTileUrl) {
      styleSources["pwri-overlay"] = {
        type: "raster",
        tiles: [pwriTileUrl],
        tileSize: 256,
        maxzoom: 18,
      };
      styleLayers.push({
        id: "pwri-overlay-layer",
        type: "raster",
        source: "pwri-overlay",
        paint: { "raster-opacity": 0.92 },
      });
    } else {
      styleLayers.push({
        id: "parcel-fill",
        type: "fill",
        source: "parcel",
        paint: { "fill-color": "#315F50", "fill-opacity": 0.22 },
      });
    }

    styleLayers.push(
      {
        id: "parcel-casing",
        type: "line",
        source: "parcel",
        paint: { "line-color": "#111827", "line-width": 4.5, "line-opacity": 0.7 },
      },
      {
        id: "parcel-outline",
        type: "line",
        source: "parcel",
        paint: { "line-color": "#FACC15", "line-width": 2.4 },
      }
    );

    const map = new maplibregl.Map({
      container: containerRef.current,
      interactive: false,
      attributionControl: false,
      center,
      zoom: 13,
      style: {
        version: 8,
        sources: styleSources,
        layers: styleLayers,
      },
    });

    map.on("load", () => {
      if (bbox) {
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          { padding: 28, duration: 0, maxZoom: 16 }
        );
      }
    });

    return () => {
      map.remove();
    };
  }, [geometry, pwriTileUrl]);

  return (
    <div className="relative h-52 w-full overflow-hidden rounded-xl border border-[#C8CFD5] bg-[#0F1720]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1D2227] shadow-xs backdrop-blur-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-[#315F50]" />
        {pwriTileUrl ? "10m Satellite · PWRI View" : "10m Satellite Boundary"}
      </div>
    </div>
  );
}
