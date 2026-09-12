import maplibregl, { type MapOptions } from "maplibre-gl";

// ── Basemap: ESRI World Imagery satellite + Carto dark labels ─────────────────
// Both are free, require no API key, and always load reliably.
export const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "Oxeous Satellite",
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
    "carto-labels": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "esri-satellite",
      type: "raster",
      source: "esri-satellite",
      paint: {
        "raster-opacity": 1,
        "raster-fade-duration": 0,
      },
    },
    {
      id: "carto-labels",
      type: "raster",
      source: "carto-labels",
      paint: {
        "raster-opacity": 0.85,
        "raster-fade-duration": 0,
      },
    },
  ],
};

export const DEFAULT_MAP_OPTIONS: Partial<MapOptions> = {
  center: [-55.5, -12.5],   // Amazon basin / Brazil sourcing region
  zoom: 5.5,                 // Wide enough to see the full basin
  minZoom: 1,
  maxZoom: 18,
  pitchWithRotate: false,
  attributionControl: false,
  fadeDuration: 0,
  maxTileCacheSize: 500,
  refreshExpiredTiles: false,
};

export function snapBbox(
  bbox: [number, number, number, number],
  grid = 0.01,
): [number, number, number, number] {
  return [
    Math.floor(bbox[0] / grid) * grid,
    Math.floor(bbox[1] / grid) * grid,
    Math.ceil(bbox[2] / grid) * grid,
    Math.ceil(bbox[3] / grid) * grid,
  ];
}

export function bboxToLngLatBounds(
  bbox: [number, number, number, number],
): maplibregl.LngLatBoundsLike {
  return [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
}
