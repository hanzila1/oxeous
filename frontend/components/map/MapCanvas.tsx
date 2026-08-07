"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { BASE_STYLE, DEFAULT_MAP_OPTIONS, bboxToLngLatBounds } from "@/lib/maplibre";
import { useStore } from "@/lib/store";
import LocationSearch from "./LocationSearch";

let mapInstance: maplibregl.Map | null = null;
export function getMap() { return mapInstance; }

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { setViewport, layers, activeGeoJSON, viewport } = useStore();

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      ...DEFAULT_MAP_OPTIONS,
      center: viewport.center as [number, number],
      zoom: viewport.zoom,
    });

    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Oxeous · ESRI World Imagery · © OpenStreetMap",
      }),
      "bottom-right",
    );

    map.on("moveend", () => {
      const c = map.getCenter();
      const b = map.getBounds();
      setViewport({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      });
    });

    mapRef.current = map;
    mapInstance = map;
    return () => { map.remove(); mapRef.current = null; mapInstance = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync GeoJSON plot outline ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = () => {
      const SRC = "oxeous-plot";
      const FILL = "oxeous-plot-fill";
      const LINE = "oxeous-plot-line";
      if (!activeGeoJSON) {
        [FILL, LINE].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
        if (map.getSource(SRC)) map.removeSource(SRC);
        return;
      }
      const data: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: activeGeoJSON as GeoJSON.Geometry, properties: {} }],
      };
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      if (src) { src.setData(data); return; }
      map.addSource(SRC, { type: "geojson", data });
      map.addLayer({ id: FILL, type: "fill", source: SRC, paint: { "fill-color": "#315F50", "fill-opacity": 0.15 } });
      map.addLayer({ id: LINE, type: "line", source: SRC, paint: { "line-color": "#315F50", "line-width": 2.5, "line-dasharray": [4, 2] } });
    };
    map.loaded() ? sync() : map.once("load", sync);
  }, [activeGeoJSON]);

  // ── Sync raster layers ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = () => {
      layers.forEach(layer => {
        if (!layer.tileUrl) return;
        const srcId = `oxe-src-${layer.id}`;
        const lyrId = `oxe-lyr-${layer.id}`;
        if (!map.getSource(srcId)) {
          map.addSource(srcId, { type: "raster", tiles: [layer.tileUrl], tileSize: 256 });
        }
        if (!map.getLayer(lyrId)) {
          const before = map.getLayer("oxeous-plot-fill") ? "oxeous-plot-fill" : undefined;
          map.addLayer({ id: lyrId, type: "raster", source: srcId, paint: { "raster-opacity": layer.opacity } }, before);
        }
        if (map.getLayer(lyrId)) {
          map.setLayoutProperty(lyrId, "visibility", layer.visible ? "visible" : "none");
          map.setPaintProperty(lyrId, "raster-opacity", layer.opacity);
        }
      });
    };
    map.loaded() ? sync() : map.once("load", sync);
  }, [layers]);

  // ── flyToBbox ─────────────────────────────────────────────────────────────
  const flyToBbox = useCallback((bbox: [number, number, number, number]) => {
    mapRef.current?.fitBounds(bboxToLngLatBounds(bbox), { padding: 80, maxZoom: 13, duration: 1200 });
  }, []);

  useEffect(() => {
    (window as Window & { oxeousFlyTo?: typeof flyToBbox }).oxeousFlyTo = flyToBbox;
  }, [flyToBbox]);

  return (
    <div className="relative w-full h-full">
      {/* Satellite map fills entire area */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Search bar — top-left */}
      <div className="absolute top-3 left-3 z-10 w-64">
        <LocationSearch />
      </div>

      {/* Map hint chip — when no active plot */}
      {!activeGeoJSON && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-[#F4F5F6]/90 backdrop-blur-sm border border-[#C8CFD5] rounded-chip px-3 py-1.5 shadow-panel">
            <span className="w-2 h-2 rounded-full bg-[#315F50] animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-medium text-[#343B42] whitespace-nowrap">
              ESRI World Imagery · Amazon basin · Open EUDR to assess a plot
            </span>
          </div>
        </div>
      )}

      {/* Coordinates HUD */}
      <CoordDisplay mapRef={mapRef} />
    </div>
  );
}

function CoordDisplay({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ref.current) return;
    const el = ref.current;
    const fn = (e: maplibregl.MapMouseEvent) => {
      el.textContent = `${e.lngLat.lat.toFixed(4)}°  ${e.lngLat.lng.toFixed(4)}°`;
    };
    map.on("mousemove", fn);
    return () => { map.off("mousemove", fn); };
  }, [mapRef]);
  return (
    <div
      ref={ref}
      className="absolute bottom-12 left-3 z-10 text-[10px] font-mono text-[#747F88] bg-[#F4F5F6]/90 border border-[#C8CFD5] px-2 py-0.5 rounded pointer-events-none shadow-panel"
    >
      Hover for coordinates
    </div>
  );
}
