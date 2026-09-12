"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import { BASE_STYLE, DEFAULT_MAP_OPTIONS, bboxToLngLatBounds } from "@/lib/maplibre";
import { useStore } from "@/lib/store";

let mapInstance: maplibregl.Map | null = null;
export function getMap() { return mapInstance; }

const DRAW_SRC = "draw-preview";
const DRAW_POINTS_SRC = "draw-points";
const DRAW_LINE = "draw-preview-line";
const DRAW_FILL = "draw-preview-fill";
const DRAW_VERTICES = "draw-vertices";

// Permanent polygon layer IDs
const PLOT_SRC = "oxeous-plot";
const PLOT_FILL = "oxeous-plot-fill";
const PLOT_CASING = "oxeous-plot-casing";
const PLOT_LINE = "oxeous-plot-line";

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawPointsRef = useRef<[number, number][]>([]);
  const [vertexCount, setVertexCount] = useState(0);
  const {
    setViewport, layers, activeGeoJSON, viewport,
    drawingAOI, setDrawingAOI, setActiveGeoJSON, setActivePanel,
  } = useStore();

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      ...DEFAULT_MAP_OPTIONS,
      center: viewport.center as [number, number],
      zoom: viewport.zoom,
      attributionControl: false,
      fadeDuration: 0,
      maxTileCacheSize: 500,
    });

    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("moveend", () => {
      const c = map.getCenter();
      const b = map.getBounds();
      setViewport({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      });
    });

    // Add empty draw preview sources on load
    map.on("load", () => {
      map.addSource(DRAW_SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource(DRAW_POINTS_SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      map.addLayer({
        id: DRAW_FILL, type: "fill", source: DRAW_SRC,
        paint: { "fill-color": "#FFE600", "fill-opacity": 0 },
      });
      map.addLayer({
        id: DRAW_LINE, type: "line", source: DRAW_SRC,
        paint: { "line-color": "#FFE600", "line-width": 3, "line-dasharray": [3, 2] },
      });
      map.addLayer({
        id: DRAW_VERTICES, type: "circle", source: DRAW_POINTS_SRC,
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-color": "#FFE600",
          "circle-stroke-width": 2.5,
        },
      });
    });

    mapRef.current = map;
    mapInstance = map;
    return () => {
      map.remove();
      mapRef.current = null;
      mapInstance = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helper: render the permanent polygon directly on the map ──────────────
  const renderPermanentPolygon = useCallback((geojson: object | null) => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once("styledata", () => renderPermanentPolygon(geojson));
      return;
    }

    if (!geojson) {
      // Remove permanent polygon layers/source
      [PLOT_FILL, PLOT_CASING, PLOT_LINE].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
      if (map.getSource(PLOT_SRC)) map.removeSource(PLOT_SRC);
      return;
    }

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: geojson as GeoJSON.Geometry, properties: {} }],
    };

    const src = map.getSource(PLOT_SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      // Source already exists — just update the data
      src.setData(data);
    } else {
      // First time — add source + layers
      map.addSource(PLOT_SRC, { type: "geojson", data });
      // 1. Transparent interior fill
      map.addLayer({
        id: PLOT_FILL,
        type: "fill",
        source: PLOT_SRC,
        paint: { "fill-color": "#FFE600", "fill-opacity": 0 },
      });
      // 2. High-contrast dark casing under the yellow border
      map.addLayer({
        id: PLOT_CASING,
        type: "line",
        source: PLOT_SRC,
        paint: { "line-color": "#000000", "line-width": 5.5, "line-opacity": 0.65 },
      });
      // 3. Crisp vivid yellow border line
      map.addLayer({
        id: PLOT_LINE,
        type: "line",
        source: PLOT_SRC,
        paint: { "line-color": "#FFE600", "line-width": 3.5, "line-opacity": 1.0 },
      });
    }

    // Always elevate the polygon border above any raster layers
    if (map.getLayer(PLOT_CASING)) map.moveLayer(PLOT_CASING);
    if (map.getLayer(PLOT_LINE)) map.moveLayer(PLOT_LINE);
  }, []);

  // ── Drawing mode: click to add vertex, dblclick to finish ────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawingAOI) {
      map.getCanvas().style.cursor = "crosshair";
      drawPointsRef.current = [];
      setVertexCount(0);
      // Clear previous draw preview
      const src = map.getSource(DRAW_SRC) as maplibregl.GeoJSONSource | undefined;
      const ptSrc = map.getSource(DRAW_POINTS_SRC) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData({ type: "FeatureCollection", features: [] });
      if (ptSrc) ptSrc.setData({ type: "FeatureCollection", features: [] });
    } else {
      map.getCanvas().style.cursor = "";
    }

    const updatePreview = (cursorPt?: [number, number]) => {
      const pts = drawPointsRef.current;
      const src = map.getSource(DRAW_SRC) as maplibregl.GeoJSONSource | undefined;
      const ptSrc = map.getSource(DRAW_POINTS_SRC) as maplibregl.GeoJSONSource | undefined;
      if (!src || !ptSrc) return;

      // Points layer
      ptSrc.setData({
        type: "FeatureCollection",
        features: pts.map(p => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: p },
          properties: {},
        })),
      });

      // Line/polygon preview
      if (pts.length === 0) {
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      const allPts = cursorPt ? [...pts, cursorPt] : [...pts];
      if (allPts.length >= 3) {
        src.setData({
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[...allPts, allPts[0]]] },
            properties: {},
          }],
        });
      } else if (allPts.length === 2) {
        src.setData({
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "LineString", coordinates: allPts },
            properties: {},
          }],
        });
      } else {
        src.setData({ type: "FeatureCollection", features: [] });
      }
    };

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!drawingAOI) return;
      e.preventDefault();
      const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Prevent duplicate point from dblclick (same coord within ~1m)
      const last = drawPointsRef.current[drawPointsRef.current.length - 1];
      if (last && Math.abs(pt[0] - last[0]) < 0.00001 && Math.abs(pt[1] - last[1]) < 0.00001) {
        return; // Skip duplicate — dblclick fires two clicks at same spot
      }

      drawPointsRef.current = [...drawPointsRef.current, pt];
      setVertexCount(drawPointsRef.current.length);
      updatePreview();
    };

    const handleDblClick = (e: maplibregl.MapMouseEvent) => {
      if (!drawingAOI) return;
      e.preventDefault();

      const pts = drawPointsRef.current;

      if (pts.length >= 3) {
        // Build the closed polygon
        const polygon = { type: "Polygon", coordinates: [[...pts, pts[0]]] };

        // ★ KEY FIX: Render the permanent polygon IMMEDIATELY via imperative
        // MapLibre calls, BEFORE clearing the draw preview. This eliminates the
        // visual flash where the polygon would disappear between the preview
        // being cleared and the React state effect rendering the permanent one.
        renderPermanentPolygon(polygon);

        // Now safely clear the draw preview
        const src = map.getSource(DRAW_SRC) as maplibregl.GeoJSONSource | undefined;
        const ptSrc = map.getSource(DRAW_POINTS_SRC) as maplibregl.GeoJSONSource | undefined;
        if (src) src.setData({ type: "FeatureCollection", features: [] });
        if (ptSrc) ptSrc.setData({ type: "FeatureCollection", features: [] });
        map.getCanvas().style.cursor = "";

        // Update React state (for the rest of the app)
        setActiveGeoJSON(polygon as unknown as object);
        setDrawingAOI(false);
        setVertexCount(0);
        drawPointsRef.current = [];
      }
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!drawingAOI || drawPointsRef.current.length === 0) return;
      updatePreview([e.lngLat.lng, e.lngLat.lat]);
    };

    map.on("click", handleClick);
    map.on("dblclick", handleDblClick);
    map.on("mousemove", handleMouseMove);

    return () => {
      map.off("click", handleClick);
      map.off("dblclick", handleDblClick);
      map.off("mousemove", handleMouseMove);
    };
  }, [drawingAOI, setActiveGeoJSON, setDrawingAOI, setActivePanel, renderPermanentPolygon]);

  // ── Sync GeoJSON plot outline (for non-drawing sources like examples/upload) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = () => renderPermanentPolygon(activeGeoJSON);
    if (map.isStyleLoaded()) {
      sync();
    } else {
      map.once("styledata", sync);
    }
  }, [activeGeoJSON, renderPermanentPolygon]);

  // ── Sync raster layers (100% opacity, non-transparent, always under plot lines) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = () => {
      // 1. Remove map layers/sources that are no longer in the store
      const activeLayerIds = new Set(layers.map(l => l.id));
      const mapStyle = map.getStyle();
      if (mapStyle && mapStyle.layers) {
        mapStyle.layers.forEach(lyr => {
          if (lyr.id.startsWith("oxe-lyr-")) {
            const rawId = lyr.id.replace("oxe-lyr-", "");
            if (!activeLayerIds.has(rawId)) {
              if (map.getLayer(lyr.id)) map.removeLayer(lyr.id);
              const srcId = `oxe-src-${rawId}`;
              if (map.getSource(srcId)) map.removeSource(srcId);
            }
          }
        });
      }

      // 2. Add, update, or refresh layers with new tile URLs
      layers.forEach(layer => {
        if (!layer.tileUrl) return;
        const srcId = `oxe-src-${layer.id}`;
        const lyrId = `oxe-lyr-${layer.id}`;

        const existingSource = map.getSource(srcId) as maplibregl.RasterTileSource | undefined;
        const currentTileUrl = existingSource?.tiles?.[0];

        // If tile URL has changed (e.g. newly drawn polygon analysis), recreate source
        if (existingSource && currentTileUrl !== layer.tileUrl) {
          if (map.getLayer(lyrId)) map.removeLayer(lyrId);
          if (map.getSource(srcId)) map.removeSource(srcId);
        }

        if (!map.getSource(srcId)) {
          map.addSource(srcId, { type: "raster", tiles: [layer.tileUrl], tileSize: 256 });
        }
        if (!map.getLayer(lyrId)) {
          const before = map.getLayer(PLOT_FILL) ? PLOT_FILL : undefined;
          map.addLayer({ id: lyrId, type: "raster", source: srcId, paint: { "raster-opacity": 1.0 } }, before);
        }
        if (map.getLayer(lyrId)) {
          map.setLayoutProperty(lyrId, "visibility", layer.visible ? "visible" : "none");
          map.setPaintProperty(lyrId, "raster-opacity", 1.0);
        }
      });

      // 3. Guarantee that the yellow plot border is ALWAYS on top of all raster layers
      if (map.getLayer(PLOT_CASING)) map.moveLayer(PLOT_CASING);
      if (map.getLayer(PLOT_LINE)) map.moveLayer(PLOT_LINE);
    };
    if (map.isStyleLoaded()) {
      sync();
    } else {
      map.once("styledata", sync);
    }
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

      {/* Draw AOI button — top-right */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => {
            const next = !drawingAOI;
            setDrawingAOI(next);
            if (next) {
              drawPointsRef.current = [];
              setVertexCount(0);
              setActiveGeoJSON(null);
            }
          }}
          className={
            drawingAOI
              ? "border border-[#315F50] bg-[#315F50] text-white px-3 py-1.5 text-[11px] font-medium rounded-lg shadow-panel"
              : "border border-[#C8CFD5] bg-[#F4F5F6]/95 text-[#1D2227] px-3 py-1.5 text-[11px] font-medium rounded-lg shadow-panel hover:border-[#7A8791]"
          }
        >
          {drawingAOI ? "Click map to add vertices · Double-click to finish" : "Draw AOI"}
        </button>
      </div>

      {/* Drawing mode instructions */}
      {drawingAOI && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 bg-[#315F50] text-white rounded-lg px-4 py-2 shadow-lg text-[12px] font-medium">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {vertexCount < 3
              ? `Click to add vertices (${vertexCount}/3 min)`
              : "Double-click to finish polygon"
            }
          </div>
        </div>
      )}

      {/* Coordinates HUD & Subtle Attribution */}
      <CoordDisplay mapRef={mapRef} />
      <div className="absolute bottom-1 right-12 z-10 text-[9px] text-white/60 pointer-events-none font-sans select-none drop-shadow-sm">
        ESRI · Maxar · OpenStreetMap · GEE
      </div>
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
