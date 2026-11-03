import maplibregl, { type MapOptions } from "maplibre-gl";

// -- Basemap: ESRI World Imagery satellite + Carto dark labels -----------------
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
    "esri-labels": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, HERE, Garmin",
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
        "raster-fade-duration": 150,
      },
    },
    {
      id: "esri-labels",
      type: "raster",
      source: "esri-labels",
      paint: {
        "raster-opacity": 0.9,
        "raster-fade-duration": 150,
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
  fadeDuration: 150,
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

/**
 * Robustly extracts the bounding box [minLng, minLat, maxLng, maxLat] from
 * any GeoJSON structure: Polygon, MultiPolygon, Point, Feature, or FeatureCollection.
 */
export function extractBboxFromGeometry(
  geometry: unknown,
): [number, number, number, number] | null {
  if (!geometry || typeof geometry !== "object") return null;

  const g = geometry as Record<string, any>;

  // Handle FeatureCollection
  if (g.type === "FeatureCollection" && Array.isArray(g.features)) {
    const bboxes = g.features
      .map((f: any) => extractBboxFromGeometry(f?.geometry))
      .filter((b: any): b is [number, number, number, number] => b !== null);
    if (bboxes.length === 0) return null;
    return [
      Math.min(...bboxes.map((b) => b[0])),
      Math.min(...bboxes.map((b) => b[1])),
      Math.max(...bboxes.map((b) => b[2])),
      Math.max(...bboxes.map((b) => b[3])),
    ];
  }

  // Handle Feature
  if (g.type === "Feature" && g.geometry) {
    return extractBboxFromGeometry(g.geometry);
  }

  // Handle Point (buffer ~1.5km for map framing)
  if (g.type === "Point" && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
    const lng = Number(g.coordinates[0]);
    const lat = Number(g.coordinates[1]);
    if (isFinite(lng) && isFinite(lat)) {
      return [lng - 0.015, lat - 0.015, lng + 0.015, lat + 0.015];
    }
  }

  // Extract all coordinates from Polygon or MultiPolygon
  const allCoords: [number, number][] = [];

  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    for (const ring of g.coordinates) {
      if (Array.isArray(ring)) {
        for (const pt of ring) {
          if (Array.isArray(pt) && pt.length >= 2) {
            const lng = Number(pt[0]);
            const lat = Number(pt[1]);
            if (isFinite(lng) && isFinite(lat)) {
              allCoords.push([lng, lat]);
            }
          }
        }
      }
    }
  } else if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    for (const poly of g.coordinates) {
      if (Array.isArray(poly)) {
        for (const ring of poly) {
          if (Array.isArray(ring)) {
            for (const pt of ring) {
              if (Array.isArray(pt) && pt.length >= 2) {
                const lng = Number(pt[0]);
                const lat = Number(pt[1]);
                if (isFinite(lng) && isFinite(lat)) {
                  allCoords.push([lng, lat]);
                }
              }
            }
          }
        }
      }
    }
  }

  if (allCoords.length === 0) return null;

  const lngs = allCoords.map((c) => c[0]);
  const lats = allCoords.map((c) => c[1]);

  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];
}
