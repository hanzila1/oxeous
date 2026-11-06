"use client";

import { useEffect, useRef, useCallback, useState, memo } from "react";
import maplibregl from "maplibre-gl";
import { BASE_STYLE, DEFAULT_MAP_OPTIONS, bboxToLngLatBounds, extractBboxFromGeometry } from "@/lib/maplibre";
import { useStore, resolveCompareLayerIds } from "@/lib/store";
import MapSwipeSlider from "./MapSwipeSlider";
import PixelInspectorHUD from "./PixelInspectorHUD";

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

function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function MapCanvasComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const compareMapRef = useRef<maplibregl.Map | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const drawPointsRef = useRef<[number, number][]>([]);
  const [vertexCount, setVertexCount] = useState(0);
  const {
    setViewport, layers, activeGeoJSON, viewport,
    drawingAOI, setDrawingAOI, setActiveGeoJSON, setActivePanel,
    ddsHistory, setEudrPanelOpen, isScanning,
    compareMode, comparePosition, compareLeftLayerId, compareRightLayerId,
    basemapMode,
  } = useStore();

  const { effectiveLeftId, effectiveRightId } = resolveCompareLayerIds(
    layers,
    compareLeftLayerId,
    compareRightLayerId
  );

  // -- Init map -------------------------------------------------------------
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      ...DEFAULT_MAP_OPTIONS,
      center: viewport.center as [number, number],
      zoom: viewport.zoom,
      attributionControl: false,
      fadeDuration: 150,
      maxTileCacheSize: 500,
    });

    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");
    
    // Zero-latency real-time coordinate tracking directly on map events
    const updateCoordinatesUI = (lat: number, lng: number) => {
      const coordEl = document.getElementById("oxeous-live-coords");
      if (coordEl) {
        const latDir = lat >= 0 ? "N" : "S";
        const lngDir = lng >= 0 ? "E" : "W";
        coordEl.textContent = `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
      }
      (window as Window & { oxeousCurrentCoords?: { lat: number; lng: number } }).oxeousCurrentCoords = { lat, lng };
    };

    const updateZoomUI = (zoom: number) => {
      const zoomEl = document.getElementById("oxeous-live-zoom");
      if (zoomEl) zoomEl.textContent = `Z ${zoom.toFixed(1)}`;
    };

    // Immediately push current center and zoom to HUD
    updateCoordinatesUI(viewport.center[1], viewport.center[0]);
    updateZoomUI(viewport.zoom);

    // Native container listener guarantees instant response before or across overlay boundaries
    const container = containerRef.current;
    const handleContainerMouseMove = (e: MouseEvent) => {
      if (!map) return;
      const rect = container?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      try {
        const lngLat = map.unproject([x, y]);
        updateCoordinatesUI(lngLat.lat, lngLat.lng);
      } catch {}
    };
    const handleContainerMouseLeave = () => {
      if (!map) return;
      const c = map.getCenter();
      updateCoordinatesUI(c.lat, c.lng);
    };
    container?.addEventListener("mousemove", handleContainerMouseMove, { passive: true });
    container?.addEventListener("mouseleave", handleContainerMouseLeave);

    map.on("mousemove", (e) => {
      updateCoordinatesUI(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("move", () => {
      const c = map.getCenter();
      updateCoordinatesUI(c.lat, c.lng);
    });

    map.on("zoom", () => {
      updateZoomUI(map.getZoom());
    });

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

    // Keep the canvas in sync with the container while side panels animate.
    // Instead of thrashing map.resize() on every 16ms animation frame (which
    // destroys the WebGL drawing buffer and cancels tile requests, causing
    // the map to vanish/flicker), we debounce resize until the CSS transition
    // settles, and listen for transitionend on the panel containers for an instant,
    // smooth resize.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mapRef.current) { mapRef.current.resize(); }
        if (compareMapRef.current) { compareMapRef.current.resize(); }
      }, 120);
    });
    resizeObserver.observe(containerRef.current);

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === "width") {
        if (resizeTimer) clearTimeout(resizeTimer);
        if (mapRef.current) { mapRef.current.resize(); }
        if (compareMapRef.current) { compareMapRef.current.resize(); }
      }
    };
    window.addEventListener("transitionend", onTransitionEnd);

    mapRef.current = map;
    mapInstance = map;
    return () => {
      container?.removeEventListener("mousemove", handleContainerMouseMove);
      container?.removeEventListener("mouseleave", handleContainerMouseLeave);
      window.removeEventListener("transitionend", onTransitionEnd);
      resizeObserver.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      mapInstance = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Helper: render the permanent polygon directly on the map --------------
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
      // Source already exists - just update the data
      src.setData(data);
    } else {
      // First time - add source + layers
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

  // -- Drawing mode: click to add vertex, dblclick to finish ----------------
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
      if (drawingAOI) {
        e.preventDefault();
        const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];

        // Prevent duplicate point from dblclick (same coord within ~1m)
        const last = drawPointsRef.current[drawPointsRef.current.length - 1];
        if (last && Math.abs(pt[0] - last[0]) < 0.00001 && Math.abs(pt[1] - last[1]) < 0.00001) {
          return; // Skip duplicate - dblclick fires two clicks at same spot
        }

        drawPointsRef.current = [...drawPointsRef.current, pt];
        setVertexCount(drawPointsRef.current.length);
        updatePreview();
        return;
      }

      // -- Audit Map Click Tooltip (when not in drawing mode) -----------------
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }

      const activeRes = ddsHistory[0];
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;

      // Check if clicked point is inside the active parcel polygon
      let isInsideParcel = false;
      if (activeGeoJSON) {
        try {
          const geom = activeGeoJSON as { type: string; coordinates: any };
          if (geom.type === "Polygon" && geom.coordinates?.[0]) {
            isInsideParcel = isPointInPolygon([lng, lat], geom.coordinates[0]);
          } else if (geom.type === "MultiPolygon" && geom.coordinates) {
            isInsideParcel = geom.coordinates.some((poly: any) =>
              poly[0] && isPointInPolygon([lng, lat], poly[0])
            );
          }
        } catch {
          isInsideParcel = false;
        }
      }

      if (isInsideParcel && activeRes) {
        const def = activeRes.risk_assessment.deforestation;
        const isExempt = def.is_plantation_replanting_exemption;
        const hasLoss = def.has_deforestation;
        const compPct = def.spatial_compliance_pct ?? (hasLoss ? 0.0 : 100.0);

        let statusBadge = "";
        let legalText = "";
        if (isExempt) {
          statusBadge = `<span style="background:rgba(255,183,3,0.18);color:#b45309;border:1px solid rgba(255,183,3,0.5);font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">🌿 ART. 2(5) EXEMPT</span>`;
          legalText = "Lawful agricultural plantation replanting cycle on pre-2020 tree-crop land. Statutorily compliant under EU 2023/1115.";
        } else if (hasLoss) {
          statusBadge = `<span style="background:rgba(230,57,70,0.18);color:#dc2626;border:1px solid rgba(230,57,70,0.5);font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">⚠️ STATUTORY DEFORESTATION</span>`;
          legalText = "Post-2020 canopy loss overlaps standing 2020 EU forest baseline (Art. 3(a)). Eligible for May 2026 plot carve-out.";
        } else {
          statusBadge = `<span style="background:rgba(16,185,129,0.18);color:#047857;border:1px solid rgba(16,185,129,0.5);font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">✅ 100% DEFORESTATION-FREE</span>`;
          legalText = "Zero post-cutoff deforestation detected. 100% compliant for TRACES NT export customs clearance.";
        }

        const html = `
          <div style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;padding:2px 0;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;">
              <span style="font-size:11px;font-weight:800;color:#0f172a;letter-spacing:0.02em;">EUDR AUDIT INSPECTION</span>
              ${statusBadge}
            </div>
            <div style="font-size:10px;color:#64748b;margin-bottom:8px;font-family:monospace;">
              GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°W
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;margin-bottom:8px;font-size:11px;line-height:1.4;">
              <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span style="color:#64748b;">Commodity / Plot:</span>
                <strong style="color:#0f172a;">${(activeRes.plot.commodity || "Commodity").toUpperCase()} · ${(activeRes.plot.area_ha || 0).toFixed(1)} ha</strong>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span style="color:#64748b;">Spatial Compliance:</span>
                <strong style="color:${compPct >= 90 ? "#059669" : "#dc2626"};">${compPct.toFixed(1)}%</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="color:#64748b;">PWRI Map Algebra:</span>
                <span style="font-size:10px;color:#475569;">Hansen ∩ JRC GFC2020</span>
              </div>
            </div>
            <p style="font-size:10px;color:#475569;margin:0 0 8px 0;line-height:1.35;">${legalText}</p>
            <button id="oxe-popup-btn" style="width:100%;background:#0f172a;color:#ffffff;border:none;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;transition:background 0.15s;">
              Open Due Diligence Suite →
            </button>
          </div>
        `;

        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 12, maxWidth: "300px" })
          .setLngLat([lng, lat])
          .setHTML(html)
          .addTo(map);

        popupRef.current = popup;

        setTimeout(() => {
          const btn = document.getElementById("oxe-popup-btn");
          if (btn) {
            btn.onclick = () => {
              setEudrPanelOpen(true);
              popup.remove();
            };
          }
        }, 50);
      }
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
  }, [drawingAOI, activeGeoJSON, ddsHistory, setEudrPanelOpen, setActiveGeoJSON, setDrawingAOI, setActivePanel, renderPermanentPolygon]);

  // -- Sync basemap mode (Satellite vs Clean White Map) ----------------------
  useEffect(() => {
    const applyBasemap = (m: maplibregl.Map | null) => {
      if (!m) return;
      const run = () => {
        try {
          const isLight = basemapMode === "light";
          if (m.getLayer("carto-light")) {
            m.setLayoutProperty("carto-light", "visibility", isLight ? "visible" : "none");
          }
          if (m.getLayer("esri-satellite")) {
            m.setLayoutProperty("esri-satellite", "visibility", isLight ? "none" : "visible");
          }
          if (m.getLayer("esri-labels")) {
            m.setLayoutProperty("esri-labels", "visibility", isLight ? "none" : "visible");
          }
        } catch {}
      };
      if (m.isStyleLoaded()) run();
      else m.once("styledata", run);
    };
    applyBasemap(mapRef.current);
    applyBasemap(compareMapRef.current);
  }, [basemapMode, compareMode]);

  // -- Sync GeoJSON plot outline (for non-drawing sources like examples/upload) --
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

  
  // -- Sync permanent polygon on compareMap ----------------------------------
  const syncComparePolygon = useCallback((geojson: object | null) => {
    const cmp = compareMapRef.current;
    if (!cmp) return;
    if (!cmp.isStyleLoaded()) {
      cmp.once("styledata", () => syncComparePolygon(geojson));
      return;
    }

    if (!geojson) {
      if (cmp.getLayer(PLOT_CASING)) cmp.removeLayer(PLOT_CASING);
      if (cmp.getLayer(PLOT_LINE)) cmp.removeLayer(PLOT_LINE);
      if (cmp.getSource(PLOT_SRC)) cmp.removeSource(PLOT_SRC);
      return;
    }

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: geojson as GeoJSON.Geometry, properties: {} }],
    };

    const src = cmp.getSource(PLOT_SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data);
    } else {
      cmp.addSource(PLOT_SRC, { type: "geojson", data });
      cmp.addLayer({
        id: PLOT_CASING,
        type: "line",
        source: PLOT_SRC,
        paint: { "line-color": "#000000", "line-width": 5.5, "line-opacity": 0.65 },
      });
      cmp.addLayer({
        id: PLOT_LINE,
        type: "line",
        source: PLOT_SRC,
        paint: { "line-color": "#FFE600", "line-width": 3.5, "line-opacity": 1.0 },
      });
    }

    if (cmp.getLayer(PLOT_CASING)) cmp.moveLayer(PLOT_CASING);
    if (cmp.getLayer(PLOT_LINE)) cmp.moveLayer(PLOT_LINE);
  }, []);

  // -- Initialize & teardown compareMap --------------------------------------
  useEffect(() => {
    if (!compareMode || !compareContainerRef.current || !mapRef.current) {
      if (compareMapRef.current) {
        compareMapRef.current.remove();
        compareMapRef.current = null;
      }
      return;
    }

    const main = mapRef.current;
    const cmp = new maplibregl.Map({
      container: compareContainerRef.current,
      style: BASE_STYLE,
      center: main.getCenter(),
      zoom: main.getZoom(),
      bearing: main.getBearing(),
      pitch: main.getPitch(),
      attributionControl: false,
      interactive: false,
      fadeDuration: 0,
      maxTileCacheSize: 500,
    });
    compareMapRef.current = cmp;

    const syncCam = () => {
      if (!compareMapRef.current || !mapRef.current) return;
      const c = mapRef.current.getCenter();
      const z = mapRef.current.getZoom();
      const b = mapRef.current.getBearing();
      const p = mapRef.current.getPitch();
      compareMapRef.current.jumpTo({ center: c, zoom: z, bearing: b, pitch: p });
    };

    main.on("move", syncCam);

    const onStyleReady = () => {
      syncComparePolygon(activeGeoJSON);
    };
    cmp.on("load", onStyleReady);
    cmp.on("styledata", onStyleReady);

    return () => {
      main.off("move", syncCam);
      if (compareMapRef.current) {
        compareMapRef.current.remove();
        compareMapRef.current = null;
      }
    };
  }, [compareMode, activeGeoJSON, syncComparePolygon]);

  // -- Sync polygon changes to compareMap if active --
  useEffect(() => {
    if (compareMode && compareMapRef.current) {
      syncComparePolygon(activeGeoJSON);
    }
  }, [compareMode, activeGeoJSON, syncComparePolygon]);

  // -- Sync layers on Left Compare Map (Clipped Map) ------------------------
  useEffect(() => {
    if (!compareMode) return;
    const cmp = compareMapRef.current;
    if (!cmp) return;

    const syncLeft = () => {
      if (!cmp.isStyleLoaded()) return;

      // 1. Remove layers that aren't the effective left layer
      const style = cmp.getStyle();
      if (style && style.layers) {
        style.layers.forEach((lyr) => {
          if (lyr.id.startsWith("cmp-lyr-")) {
            const rawId = lyr.id.replace("cmp-lyr-", "");
            if (rawId !== effectiveLeftId) {
              if (cmp.getLayer(lyr.id)) cmp.removeLayer(lyr.id);
              const srcId = "cmp-src-" + rawId;
              if (cmp.getSource(srcId)) cmp.removeSource(srcId);
            }
          }
        });
      }

      // 2. Add or update the effective left layer
      if (effectiveLeftId !== "basemap") {
        const leftLayer = layers.find((l) => l.id === effectiveLeftId);
        if (leftLayer && leftLayer.tileUrl) {
          const srcId = "cmp-src-" + leftLayer.id;
          const lyrId = "cmp-lyr-" + leftLayer.id;
          const targetOpacity = typeof leftLayer.opacity === "number"
            ? Math.max(0, Math.min(1, leftLayer.opacity))
            : 1.0;

          const existingSrc = cmp.getSource(srcId) as maplibregl.RasterTileSource | undefined;
          if (existingSrc && existingSrc.tiles?.[0] !== leftLayer.tileUrl) {
            if (cmp.getLayer(lyrId)) cmp.removeLayer(lyrId);
            if (cmp.getSource(srcId)) cmp.removeSource(srcId);
          }

          if (!cmp.getSource(srcId)) {
            cmp.addSource(srcId, { type: "raster", tiles: [leftLayer.tileUrl], tileSize: 256 });
          }
          if (!cmp.getLayer(lyrId)) {
            const before = cmp.getLayer(PLOT_CASING) ? PLOT_CASING : undefined;
            cmp.addLayer({
              id: lyrId,
              type: "raster",
              source: srcId,
              paint: { "raster-opacity": targetOpacity },
            }, before);
          } else {
            cmp.setPaintProperty(lyrId, "raster-opacity", targetOpacity);
          }
        }
      }

      // Ensure plot border stays on top
      if (cmp.getLayer(PLOT_CASING)) cmp.moveLayer(PLOT_CASING);
      if (cmp.getLayer(PLOT_LINE)) cmp.moveLayer(PLOT_LINE);
    };

    if (cmp.isStyleLoaded()) {
      syncLeft();
    } else {
      cmp.once("styledata", syncLeft);
    }
  }, [compareMode, effectiveLeftId, layers]);

  // -- Sync raster layers (dynamic opacity from store, always under plot lines) --
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
        try {
          if (!layer.tileUrl) return;
          const srcId = `oxe-src-${layer.id}`;
          const lyrId = `oxe-lyr-${layer.id}`;

          // Clamp opacity to valid [0, 1] range
          const targetOpacity = typeof layer.opacity === "number"
            ? Math.max(0, Math.min(1, layer.opacity))
            : 1.0;

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
            map.addLayer({ id: lyrId, type: "raster", source: srcId, paint: { "raster-opacity": targetOpacity } }, before);
          }
          if (map.getLayer(lyrId)) {
            const isVisible = (() => {
              if (!compareMode) return layer.visible;
              if (effectiveRightId === "basemap") return false;
              if (effectiveRightId === "all-other") return layer.id !== effectiveLeftId && layer.visible;
              return layer.id === effectiveRightId;
            })();
            map.setLayoutProperty(lyrId, "visibility", isVisible ? "visible" : "none");
            map.setPaintProperty(lyrId, "raster-opacity", targetOpacity);
          }
        } catch (layerErr) {
          console.warn(`[MapCanvas] Warning syncing layer ${layer.id}:`, layerErr);
        }
      });

      // 3. Enforce exact stacking order matching sidebar list:
      try {
        const anchor = map.getLayer(PLOT_FILL) ? PLOT_FILL : undefined;
        for (let i = layers.length - 1; i >= 0; i--) {
          const lyrId = `oxe-lyr-${layers[i].id}`;
          if (map.getLayer(lyrId)) {
            map.moveLayer(lyrId, anchor);
          }
        }

        // 4. Guarantee that the yellow plot border is ALWAYS on top of all raster layers
        if (map.getLayer(PLOT_FILL)) map.moveLayer(PLOT_FILL);
        if (map.getLayer(PLOT_CASING)) map.moveLayer(PLOT_CASING);
        if (map.getLayer(PLOT_LINE)) map.moveLayer(PLOT_LINE);
      } catch (stackErr) {
        console.warn("[MapCanvas] Warning restacking layers:", stackErr);
      }
    };
    if (map.isStyleLoaded()) {
      sync();
    } else {
      map.once("styledata", sync);
    }
  }, [layers, compareMode, effectiveLeftId, effectiveRightId]);

  // -- flyToBbox -------------------------------------------------------------
  const flyToBbox = useCallback((bbox: [number, number, number, number]) => {
    mapRef.current?.fitBounds(bboxToLngLatBounds(bbox), { padding: 80, maxZoom: 15.5, duration: 1200 });
  }, []);

  useEffect(() => {
    (window as Window & { oxeousFlyTo?: typeof flyToBbox }).oxeousFlyTo = flyToBbox;
  }, [flyToBbox]);

  // Automatically fly to activeGeoJSON whenever it changes (MultiPolygon, Polygon, Point)
  useEffect(() => {
    if (!activeGeoJSON || drawingAOI) return;
    const bbox = extractBboxFromGeometry(activeGeoJSON);
    if (bbox) {
      flyToBbox(bbox);
    }
  }, [activeGeoJSON, drawingAOI, flyToBbox]);

  return (
    <div className={basemapMode === "light" ? "relative w-full h-full bg-[#F8FAF9]" : "relative w-full h-full bg-[#0c141c]"}>
      {/* Map fills entire area */}
      <div ref={containerRef} className={basemapMode === "light" ? "absolute inset-0 bg-[#F8FAF9]" : "absolute inset-0 bg-[#0c141c]"} />

      {/* Synchronized Left Secondary Clipped Map for True Real-Time Layer Comparison */}
      {compareMode && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-10 select-none"
          style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
        >
          <div ref={compareContainerRef} className="w-full h-full pointer-events-none" />
        </div>
      )}

      {/* Real-time Pixel Inspector HUD */}
      <PixelInspectorHUD />

      {/* Before / After Statutory Baseline vs Disturbance Swipe Slider */}
      <MapSwipeSlider />


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

      {/* Real-time GPS Coordinates HUD - Positioned DIRECTLY ON TOP OF THE KM SCALE BAR (Bottom-Left) */}
      <div className="absolute bottom-[45px] left-[10px] z-10 pointer-events-auto select-none group">
        <div
          title="Click to copy coordinates"
          onClick={() => {
            const el = document.getElementById("oxeous-live-coords");
            if (el?.textContent) {
              navigator.clipboard?.writeText(el.textContent);
              const toast = document.getElementById("oxeous-copied-toast");
              if (toast) {
                toast.classList.remove("opacity-0", "pointer-events-none");
                setTimeout(() => toast.classList.add("opacity-0", "pointer-events-none"), 1400);
              }
            }
          }}
          className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/95 border border-[#C8CFD5] shadow-xs text-[#343B42] text-[10px] font-mono transition-all hover:bg-white hover:border-[#AAB3BB] hover:shadow-sm cursor-pointer active:scale-95"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#315F50] flex-shrink-0 animate-pulse" />
          <span id="oxeous-live-coords" className="font-semibold text-[#1D2227] tracking-tight">
            {Math.abs(viewport.center[1]).toFixed(4)}°{viewport.center[1] >= 0 ? "N" : "S"}, {Math.abs(viewport.center[0]).toFixed(4)}°{viewport.center[0] >= 0 ? "E" : "W"}
          </span>
          {/* Hover extra telemetry */}
          <span className="hidden group-hover:inline-flex items-center gap-1.5 pl-1.5 border-l border-[#C8CFD5] text-[9.5px] text-[#747F88] animate-in fade-in duration-150">
            <span id="oxeous-live-zoom">Z {viewport.zoom.toFixed(1)}</span>
            <span className="text-[8.5px] bg-[#E3E7EA] px-1 rounded font-bold text-[#343B42]">WGS84</span>
          </span>
          {/* Copy feedback toast */}
          <span
            id="oxeous-copied-toast"
            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1D2227] text-white text-[9px] font-sans font-medium px-2 py-0.5 rounded shadow-md opacity-0 pointer-events-none transition-opacity duration-150 whitespace-nowrap"
          >
            Copied to clipboard
          </span>
        </div>
      </div>

      <div className="absolute bottom-1 left-36 z-10 pointer-events-none select-none">

        <span className="text-[9px] text-white/70 font-sans drop-shadow-sm">ESRI · Maxar · OpenStreetMap · GEE</span>
      </div>
    </div>
  );
}

const MapCanvas = memo(MapCanvasComponent);
export default MapCanvas;
