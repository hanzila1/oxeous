import JSZip from "jszip";
import type { EUDRCommodity } from "@oxeous/shared-types";

export interface ParsedPlot {
  id: string;
  name: string;
  commodity: EUDRCommodity;
  countryCode: string;
  countryName: string;
  areaHa?: number;
  geometry: any; // GeoJSON Geometry (Polygon, MultiPolygon, Point)
  originalGeometry: any;
  isPoint: boolean;
  pointCoords?: [number, number]; // [lng, lat]
  isDelineated?: boolean;
  isBuffered?: boolean;
  sourceFile: string;
}

export interface BatchPlotItem extends ParsedPlot {
  status: "pending" | "auditing" | "compliant" | "non_compliant" | "error";
  riskScore?: number;
  deforestationHa?: number;
  lossYears?: number[];
  auditResult?: any;
  errorMessage?: string;
  auditDurationMs?: number;
}

const VALID_COMMODITIES: EUDRCommodity[] = [
  "coffee",
  "cocoa",
  "rubber",
  "palm_oil",
  "soya",
  "wood",
  "cattle",
];

export function normalizeCommodity(val: unknown, fallback: EUDRCommodity = "cocoa"): EUDRCommodity {
  if (!val || typeof val !== "string") return fallback;
  const s = val.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (VALID_COMMODITIES.includes(s as EUDRCommodity)) return s as EUDRCommodity;
  if (s.includes("palm")) return "palm_oil";
  if (s.includes("soy")) return "soya";
  if (s.includes("timber") || s.includes("forest") || s.includes("tree")) return "wood";
  if (s.includes("beef") || s.includes("cow") || s.includes("livestock")) return "cattle";
  if (s.includes("cacao")) return "cocoa";
  return fallback;
}

/**
 * Generate a 32-vertex geodesic circular Polygon corresponding to a declared area in hectares.
 * Complies with EUDR Art. 9(1)(d) smallholder statutory parcel specifications.
 */
export function createGeodesicCirclePolygon(
  lng: number,
  lat: number,
  areaHa: number = 1.8,
  numPoints: number = 32
): { type: "Polygon"; coordinates: number[][][] } {
  const safeAreaHa = Math.max(0.1, Math.min(areaHa || 1.8, 100));
  const areaM2 = safeAreaHa * 10000;
  const radiusMeters = Math.sqrt(areaM2 / Math.PI);

  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLat = 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerDegLng = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad);

  const ring: number[][] = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i * 2 * Math.PI) / numPoints;
    const dx = radiusMeters * Math.cos(theta);
    const dy = radiusMeters * Math.sin(theta);
    const pLng = Number((lng + dx / metersPerDegLng).toFixed(7));
    const pLat = Number((lat + dy / metersPerDegLat).toFixed(7));
    ring.push([pLng, pLat]);
  }
  // Close the ring
  ring.push([ring[0][0], ring[0][1]]);

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

/**
 * Parse WKT strings (e.g. POINT(10 20) or POLYGON(((...))))
 */
function parseWkt(wkt: string): any | null {
  const clean = wkt.trim();
  const pointMatch = clean.match(/^POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)$/i);
  if (pointMatch) {
    const lng = parseFloat(pointMatch[1]);
    const lat = parseFloat(pointMatch[2]);
    if (!isNaN(lng) && !isNaN(lat)) {
      return { type: "Point", coordinates: [lng, lat] };
    }
  }

  const polyMatch = clean.match(/^POLYGON\s*\(\s*\(\s*(.+?)\s*\)\s*\)$/i);
  if (polyMatch) {
    const coordPairs = polyMatch[1].split(",");
    const ring: number[][] = [];
    for (const pair of coordPairs) {
      const parts = pair.trim().split(/\s+/).map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        ring.push([parts[0], parts[1]]);
      }
    }
    if (ring.length >= 4) {
      return { type: "Polygon", coordinates: [ring] };
    }
  }
  return null;
}

/**
 * Parse GeoJSON object (FeatureCollection, Feature, or single geometry)
 */
export function parseGeoJSONContent(json: any, filename: string): ParsedPlot[] {
  const plots: ParsedPlot[] = [];

  let features: any[] = [];
  if (json.type === "FeatureCollection" && Array.isArray(json.features)) {
    features = json.features;
  } else if (json.type === "Feature") {
    features = [json];
  } else if (Array.isArray(json)) {
    features = json.map((item, idx) =>
      item.type === "Feature" ? item : { type: "Feature", geometry: item, properties: { id: `item_${idx + 1}` } }
    );
  } else if (json.type && ["Polygon", "MultiPolygon", "Point"].includes(json.type)) {
    features = [{ type: "Feature", geometry: json, properties: {} }];
  }

  features.forEach((feat, idx) => {
    const geom = feat.geometry || feat;
    if (!geom || !["Polygon", "MultiPolygon", "Point"].includes(geom.type)) return;

    const props = feat.properties || {};
    const id = String(props.id || props.plot_id || feat.id || `plot_${idx + 1}`);
    const name = String(props.name || props.plot_name || props.farm_name || props.farmer || `Plot #${idx + 1} (${geom.type})`);
    const commodity = normalizeCommodity(props.commodity || props.crop);
    const countryCode = String(props.country_code || props.country || "");
    const countryName = String(props.country_name || "");
    const areaHa = typeof props.area_ha === "number" ? props.area_ha : undefined;

    const isPoint = geom.type === "Point";
    const pointCoords = isPoint && Array.isArray(geom.coordinates) ? [geom.coordinates[0], geom.coordinates[1]] as [number, number] : undefined;

    plots.push({
      id,
      name,
      commodity,
      countryCode,
      countryName,
      areaHa,
      geometry: geom,
      originalGeometry: JSON.parse(JSON.stringify(geom)),
      isPoint,
      pointCoords,
      sourceFile: filename,
    });
  });

  return plots;
}

/**
 * Parse CSV or TSV content into ParsedPlot[]
 */
export function parseCsvContent(text: string, filename: string): ParsedPlot[] {
  const plots: ParsedPlot[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return plots;

  // Auto-detect delimiter
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = tabCount > commaCount && tabCount > semiCount ? "\t" : semiCount > commaCount ? ";" : ",";

  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  // Detect column indices
  const latIdx = headers.findIndex((h) =>
    ["lat", "latitude", "y", "lat_deg", "coord_lat", "coord_y", "centroid_lat"].includes(h)
  );
  const lngIdx = headers.findIndex((h) =>
    ["lng", "lon", "long", "longitude", "x", "coord_lon", "coord_x", "centroid_lng"].includes(h)
  );
  const nameIdx = headers.findIndex((h) =>
    ["name", "id", "plot_id", "plot_name", "farm", "farmer", "title", "label", "parcel"].includes(h)
  );
  const commodityIdx = headers.findIndex((h) =>
    ["commodity", "crop", "produce", "product"].includes(h)
  );
  const areaIdx = headers.findIndex((h) =>
    ["area_ha", "area", "hectares", "ha", "size", "declared_area"].includes(h)
  );
  const countryIdx = headers.findIndex((h) =>
    ["country_code", "country", "iso", "iso2", "jurisdiction"].includes(h)
  );
  const geomIdx = headers.findIndex((h) =>
    ["geometry", "geom", "the_geom", "wkt", "geojson"].includes(h)
  );

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (rawCols.length < 2) continue;

    let geom: any = null;
    let isPoint = false;
    let pointCoords: [number, number] | undefined = undefined;

    // Check for explicit WKT or GeoJSON in column
    if (geomIdx >= 0 && rawCols[geomIdx]) {
      const rawGeom = rawCols[geomIdx];
      if (rawGeom.startsWith("{")) {
        try {
          geom = JSON.parse(rawGeom);
        } catch {
          // ignore
        }
      } else {
        geom = parseWkt(rawGeom);
      }
    }

    // Fallback to lat/lng columns
    if (!geom && latIdx >= 0 && lngIdx >= 0) {
      const lat = parseFloat(rawCols[latIdx]);
      const lng = parseFloat(rawCols[lngIdx]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        geom = { type: "Point", coordinates: [lng, lat] };
        isPoint = true;
        pointCoords = [lng, lat];
      }
    }

    if (!geom) continue;

    const id = nameIdx >= 0 && rawCols[nameIdx] ? rawCols[nameIdx] : `csv_row_${i}`;
    const name = nameIdx >= 0 && rawCols[nameIdx] ? rawCols[nameIdx] : `Farm Plot ${i}`;
    const comm = commodityIdx >= 0 ? normalizeCommodity(rawCols[commodityIdx]) : "cocoa";
    const area = areaIdx >= 0 ? parseFloat(rawCols[areaIdx]) : undefined;
    const ctry = countryIdx >= 0 ? rawCols[countryIdx] : "";

    plots.push({
      id,
      name,
      commodity: comm,
      countryCode: ctry,
      countryName: "",
      areaHa: !isNaN(area as number) ? area : undefined,
      geometry: geom,
      originalGeometry: JSON.parse(JSON.stringify(geom)),
      isPoint: geom.type === "Point",
      pointCoords: geom.type === "Point" ? [geom.coordinates[0], geom.coordinates[1]] : pointCoords,
      sourceFile: filename,
    });
  }

  return plots;
}

/**
 * Parse KML content into ParsedPlot[]
 */
export function parseKmlContent(text: string, filename: string): ParsedPlot[] {
  const plots: ParsedPlot[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");
    const placemarks = doc.querySelectorAll("Placemark");

    placemarks.forEach((pm, idx) => {
      const name = pm.querySelector("name")?.textContent?.trim() || `Placemark #${idx + 1}`;
      const desc = pm.querySelector("description")?.textContent?.trim() || "";

      // Check for Polygon
      const polyCoordsEl = pm.querySelector("Polygon coordinates, LinearRing coordinates");
      if (polyCoordsEl && polyCoordsEl.textContent) {
        const rawCoords = polyCoordsEl.textContent.trim().split(/\s+/);
        const ring: number[][] = [];
        for (const str of rawCoords) {
          const parts = str.split(",").map(Number);
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            ring.push([parts[0], parts[1]]);
          }
        }
        if (ring.length >= 4) {
          plots.push({
            id: `kml_${idx + 1}`,
            name,
            commodity: normalizeCommodity(desc),
            countryCode: "",
            countryName: "",
            geometry: { type: "Polygon", coordinates: [ring] },
            originalGeometry: { type: "Polygon", coordinates: [ring] },
            isPoint: false,
            sourceFile: filename,
          });
          return;
        }
      }

      // Check for Point
      const ptCoordsEl = pm.querySelector("Point coordinates");
      if (ptCoordsEl && ptCoordsEl.textContent) {
        const parts = ptCoordsEl.textContent.trim().split(",").map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const lng = parts[0];
          const lat = parts[1];
          plots.push({
            id: `kml_pt_${idx + 1}`,
            name,
            commodity: normalizeCommodity(desc),
            countryCode: "",
            countryName: "",
            geometry: { type: "Point", coordinates: [lng, lat] },
            originalGeometry: { type: "Point", coordinates: [lng, lat] },
            isPoint: true,
            pointCoords: [lng, lat],
            sourceFile: filename,
          });
        }
      }
    });
  } catch (err) {
    console.error("Failed to parse KML:", err);
  }
  return plots;
}

/**
 * Universal multi-format parser supporting .geojson, .json, .csv, .tsv, .kml, and .zip
 */
export async function parseBatchFile(file: File): Promise<ParsedPlot[]> {
  const filename = file.name;
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (ext === "zip") {
    const zip = await JSZip.loadAsync(file);
    const allPlots: ParsedPlot[] = [];

    const fileEntries = Object.keys(zip.files).filter(
      (path) => !path.startsWith("__MACOSX/") && !zip.files[path].dir
    );

    for (const path of fileEntries) {
      const subExt = path.split(".").pop()?.toLowerCase();
      const subName = path.split("/").pop() || path;

      if (subExt === "geojson" || subExt === "json") {
        const text = await zip.files[path].async("string");
        try {
          const json = JSON.parse(text);
          allPlots.push(...parseGeoJSONContent(json, subName));
        } catch {
          // skip
        }
      } else if (subExt === "csv" || subExt === "tsv") {
        const text = await zip.files[path].async("string");
        allPlots.push(...parseCsvContent(text, subName));
      } else if (subExt === "kml") {
        const text = await zip.files[path].async("string");
        allPlots.push(...parseKmlContent(text, subName));
      }
    }

    if (allPlots.length === 0) {
      throw new Error(
        `Zip archive '${filename}' contains no supported GeoJSON, CSV, or KML files.`
      );
    }
    return allPlots;
  }

  if (ext === "geojson" || ext === "json") {
    const text = await file.text();
    const json = JSON.parse(text);
    return parseGeoJSONContent(json, filename);
  }

  if (ext === "csv" || ext === "tsv" || ext === "txt") {
    const text = await file.text();
    return parseCsvContent(text, filename);
  }

  if (ext === "kml") {
    const text = await file.text();
    return parseKmlContent(text, filename);
  }

  throw new Error(`Unsupported file type: .${ext}. Please upload .geojson, .csv, .kml, or .zip`);
}

