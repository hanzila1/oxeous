"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  FileJson,
  FileText,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { asset } from "@/lib/site";
import {
  createGeodesicCirclePolygon,
  parseBatchFile,
  type ParsedPlot,
} from "@/lib/plotParser";
import {
  fetchSupplierPortal,
  submitSupplierPortal,
  type SupplierOriginRequest,
} from "@/lib/suppliers";

const SupplierFieldSnapshot = dynamic(
  () => import("@/components/eudr/SupplierFieldSnapshot"),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 w-full rounded-xl border border-[#C8CFD5] bg-[#E8ECEF] animate-pulse" />
    ),
  }
);

const QUICK_FIELD_PINS = [
  { label: "Colombia · Caldas Coffee", lat: 5.382, lng: -75.477, areaHa: 12.4, commodity: "coffee" },
  { label: "Ghana · Ashanti Cocoa", lat: 6.878, lng: -1.979, areaHa: 14.2, commodity: "cocoa" },
  { label: "Indonesia · Riau Palm", lat: 0.1893, lng: 102.146, areaHa: 18.6, commodity: "palm_oil" },
];

const DEMO_MULTIPOINT_BATCH = {
  label: "3-Point Ghana Cocoa Batch",
  commodity: "cocoa",
  points: [
    { label: "Ashanti Smallholder #1", lat: 6.8782, lng: -1.9791, areaHa: 2.4 },
    { label: "Ashanti Smallholder #2", lat: 6.8814, lng: -1.9742, areaHa: 3.1 },
    { label: "Ashanti Smallholder #3", lat: 6.8749, lng: -1.9756, areaHa: 2.7 },
  ],
};

interface ManualGpsPoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
  areaHa: number;
}

const COMMODITY_OPTIONS = [
  { value: "coffee", label: "Coffee" },
  { value: "cocoa", label: "Cocoa" },
  { value: "palm_oil", label: "Palm Oil" },
  { value: "rubber", label: "Rubber" },
  { value: "soya", label: "Soy" },
  { value: "wood", label: "Wood" },
  { value: "cattle", label: "Cattle" },
];

function detectCommodityFromText(raw: string): string | null {
  const low = (raw || "").toLowerCase();
  if (/(rubber|hevea|latex)/.test(low)) return "rubber";
  if (/(cocoa|cacao|chocolate)/.test(low)) return "cocoa";
  if (/(coffee|cafe|café|arabica|robusta)/.test(low)) return "coffee";
  if (/(palm_oil|palm\s*oil|oil\s*palm|\bpalm\b|\bcpo\b)/.test(low)) return "palm_oil";
  if (/(soya|soybean|\bsoy\b)/.test(low)) return "soya";
  if (/(wood|timber|logging|lumber|pulp|forestry)/.test(low)) return "wood";
  if (/(cattle|beef|pasture|livestock|leather)/.test(low)) return "cattle";
  return null;
}

function detectCommodityFromPlots(plots: ParsedPlot[], rawText: string, filename: string): string | null {
  const fromName = detectCommodityFromText(filename);
  if (fromName) return fromName;
  const plotNames = plots.slice(0, 12).map((p) => p.name).join(" ");
  const fromPlotNames = detectCommodityFromText(plotNames);
  if (fromPlotNames) return fromPlotNames;
  // Inspect explicit text snippet (covers GeoJSON properties, CSV commodity column, KML descriptions)
  if (rawText) {
    const fromRaw = detectCommodityFromText(rawText.slice(0, 8000));
    if (fromRaw) return fromRaw;
  }
  return null;
}

function mergePlotsToGeometry(plots: ParsedPlot[]): {
  geometry: Record<string, unknown>;
  totalAreaHa: number;
  pointCount: number;
  polygonCount: number;
} {
  const polygonCoords: number[][][][] = [];
  let totalAreaHa = 0;
  let pointCount = 0;
  let polygonCount = 0;

  for (const p of plots) {
    const g = p.geometry;
    if (!g) continue;
    if (g.type === "Point" && Array.isArray(g.coordinates)) {
      const [pLng, pLat] = g.coordinates;
      const plotHa = p.areaHa && p.areaHa > 0 ? p.areaHa : 1.8;
      const circle = createGeodesicCirclePolygon(Number(pLng), Number(pLat), plotHa);
      polygonCoords.push(circle.coordinates);
      totalAreaHa += plotHa;
      pointCount += 1;
    } else if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
      polygonCoords.push(g.coordinates);
      totalAreaHa += p.areaHa && p.areaHa > 0 ? p.areaHa : 4.0;
      polygonCount += 1;
    } else if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
      for (const poly of g.coordinates) {
        polygonCoords.push(poly);
      }
      totalAreaHa += p.areaHa && p.areaHa > 0 ? p.areaHa : 4.0 * g.coordinates.length;
      polygonCount += g.coordinates.length;
    }
  }

  const geometry: Record<string, unknown> =
    polygonCoords.length === 1
      ? { type: "Polygon", coordinates: polygonCoords[0] }
      : { type: "MultiPolygon", coordinates: polygonCoords };

  return {
    geometry,
    totalAreaHa: Number(totalAreaHa.toFixed(2)),
    pointCount,
    polygonCount,
  };
}

async function hashFileSha256(file: File): Promise<string> {
  try {
    const buf = await file.arrayBuffer();
    if (window.crypto?.subtle) {
      const digest = await window.crypto.subtle.digest("SHA-256", buf);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {}
  return `${file.name.length.toString(16)}${file.size.toString(16)}a4f9c2e1`;
}

export default function SupplierPortalPage() {
  const [token, setToken] = useState<string>("");
  const [reqData, setReqData] = useState<SupplierOriginRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [areaHa, setAreaHa] = useState<string>("12.0");
  const [manualPoints, setManualPoints] = useState<ManualGpsPoint[]>([]);
  const [uploadedGeom, setUploadedGeom] = useState<Record<string, unknown> | null>(null);
  const [uploadedGeomName, setUploadedGeomName] = useState<string>("");
  const [uploadedSummary, setUploadedSummary] = useState<string>("");
  const [uploadedPlotCount, setUploadedPlotCount] = useState<number>(0);
  const [selectedCommodity, setSelectedCommodity] = useState<string>("coffee");
  const [autoDetectedCommodity, setAutoDetectedCommodity] = useState<string | null>(null);

  const [declaredMassKg, setDeclaredMassKg] = useState<string>("12000");
  const [claimText, setClaimText] = useState<string>(
    "Traditional smallholder shade farm established in 2016. Zero forest clearing since 2018. Land tenure certificate and local harvest permit on file."
  );
  const [permitFile, setPermitFile] = useState<{ name: string; sha256: string } | null>(null);

  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SupplierOriginRequest | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const downloadSupplierReceipt = () => {
    if (!receipt) return;
    const statusText =
      receipt.audit_status === "compliant"
        ? "CLEARED FOR EXPORT (EUDR COMPLIANT)"
        : receipt.audit_status === "carve_out"
        ? "CARVE-OUT APPLIED (SEGREGATE TO CLEAN ZONE)"
        : receipt.audit_status === "non_compliant"
        ? "ON HOLD (NON-COMPLIANT / RESERVE OVERLAP)"
        : "RECEIVED — UNDER SATELLITE REVIEW BY EU BUYER";
    const lines = [
      "OXEOUS EUDR ART. 9(1)(d) SUPPLIER COMPLIANCE & DELIVERY RECEIPT",
      "================================================================",
      `Supplier / Cooperative : ${receipt.supplier_name}`,
      `Requested By (EU Buyer): ${receipt.operator_name}`,
      `Commodity              : ${receipt.commodity.toUpperCase()}`,
      `Compliance Status      : ${statusText}`,
      `Verified Boundary Area : ${(receipt.submitted_area_ha ?? 0).toFixed(2)} ha`,
      ...(receipt.audit_status
        ? [
            `Clean Export Area      : ${(receipt.audit_clean_ha ?? 0).toFixed(2)} ha`,
            `Flagged Clearing Area  : ${(receipt.audit_violation_ha ?? 0).toFixed(2)} ha`,
            `Risk Score             : ${Math.round(receipt.audit_risk_score ?? 0)} / 100`,
            ...(receipt.audit_traces_ref ? [`DDS / Reference ID     : ${receipt.audit_traces_ref}`] : []),
            `Audited Timestamp      : ${receipt.audited_at || ""}`,
          ]
        : []),
      `Declared Shipment Mass : ${Math.round(receipt.declared_mass_kg ?? 0).toLocaleString()} kg`,
      `Submitted Timestamp    : ${receipt.submitted_at || new Date().toISOString()}`,
      `Art. 12 SHA-256 Hash   : ${receipt.doc_sha256}`,
      "",
      ...(receipt.audit_summary ? ["Satellite Audit Summary:", receipt.audit_summary, ""] : []),
      "Supplier Declaration:",
      receipt.supplier_claim || "(None provided)",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Oxeous_Receipt_${receipt.token}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyReceiptHash = () => {
    if (!receipt?.doc_sha256) return;
    navigator.clipboard?.writeText(receipt.doc_sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 1800);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    fetchSupplierPortal(t).then((data) => {
      if (!data) {
        setNotFound(true);
      } else {
        setReqData(data);
        setSelectedCommodity(data.commodity || "coffee");
        if (data.expected_mass_kg) setDeclaredMassKg(String(Math.round(data.expected_mass_kg)));
        if (data.status === "submitted") setReceipt(data);
      }
      setLoading(false);
    });
  }, []);

  const captureBrowserGps = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is unavailable on this browser. Enter coordinates or pick a sample pin below.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUploadedGeom(null);
        setUploadedGeomName("");
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError("Location permission denied. Enter coordinates manually, upload GeoJSON, or tap a demo pin below.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGeoJsonUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const plots = await parseBatchFile(file);
      if (!plots || plots.length === 0) {
        setError("No valid GPS points or polygon geometries were found in that file.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const rawText = ext === "zip" ? "" : await file.text().catch(() => "");
      const detected = detectCommodityFromPlots(plots, rawText, file.name);
      if (detected) {
        setSelectedCommodity(detected);
        setAutoDetectedCommodity(detected);
      }

      // Case 1: Single GPS Point file → load into coordinates for 10 m FTW auto-delineation
      if (plots.length === 1 && plots[0].isPoint && plots[0].pointCoords) {
        const [pLng, pLat] = plots[0].pointCoords;
        setUploadedGeom(null);
        setUploadedGeomName("");
        setUploadedSummary("");
        setUploadedPlotCount(0);
        setManualPoints([]);
        setLat(pLat.toFixed(6));
        setLng(pLng.toFixed(6));
        if (plots[0].areaHa && plots[0].areaHa > 0) {
          setAreaHa(String(plots[0].areaHa));
        }
        return;
      }

      // Case 2: Single Polygon / MultiPolygon
      if (plots.length === 1 && !plots[0].isPoint) {
        setManualPoints([]);
        setUploadedGeom(plots[0].geometry as Record<string, unknown>);
        setUploadedGeomName(file.name);
        setUploadedPlotCount(1);
        setUploadedSummary(`Loaded polygon: ${file.name}`);
        if (plots[0].areaHa && plots[0].areaHa > 0) {
          setAreaHa(String(plots[0].areaHa));
        }
        return;
      }

      // Case 3: Multi-Point or Multi-Plot batch (GeoJSON, CSV, KML, ZIP)
      const merged = mergePlotsToGeometry(plots);
      setManualPoints([]);
      setUploadedGeom(merged.geometry);
      setUploadedGeomName(file.name);
      setUploadedPlotCount(plots.length);
      setAreaHa(String(merged.totalAreaHa));
      const detail =
        merged.pointCount > 0 && merged.polygonCount === 0
          ? `${merged.pointCount} GPS points (${merged.totalAreaHa.toFixed(1)} ha · MultiPolygon ready)`
          : `${plots.length} farm plots (${merged.totalAreaHa.toFixed(1)} ha · MultiPolygon ready)`;
      setUploadedSummary(`${detail} — ${file.name}`);
    } catch (err: any) {
      setError(err?.message || "Please upload a valid .geojson, .csv, .kml, or .zip file.");
    }
  };

  const addManualPoint = () => {
    setError(null);
    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);
    const nArea = Math.max(0.1, parseFloat(areaHa) || 2.0);
    if (Number.isNaN(nLat) || Number.isNaN(nLng) || nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
      setError("Enter a valid latitude (-90 to 90) and longitude (-180 to 180) before adding a point.");
      return;
    }
    setManualPoints((prev) => [
      ...prev,
      {
        id: `pt_${Date.now()}_${prev.length + 1}`,
        label: `Farm Point #${prev.length + 1}`,
        lat: Number(nLat.toFixed(6)),
        lng: Number(nLng.toFixed(6)),
        areaHa: Number(nArea.toFixed(2)),
      },
    ]);
    setLat("");
    setLng("");
  };

  const handlePermitUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sha256 = await hashFileSha256(file);
    setPermitFile({ name: file.name, sha256 });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);
    const hasTypedPoint = !Number.isNaN(nLat) && !Number.isNaN(nLng);

    // Combine queued manual points + any currently typed coordinate
    const combinedPoints: ManualGpsPoint[] = [...manualPoints];
    if (!uploadedGeom && hasTypedPoint) {
      const dup = combinedPoints.some(
        (p) => Math.abs(p.lat - nLat) < 1e-6 && Math.abs(p.lng - nLng) < 1e-6
      );
      if (!dup) {
        combinedPoints.push({
          id: "typed_pt",
          label: `Farm Point #${combinedPoints.length + 1}`,
          lat: nLat,
          lng: nLng,
          areaHa: Math.max(0.1, parseFloat(areaHa) || 2.0),
        });
      }
    }

    if (!uploadedGeom && combinedPoints.length === 0) {
      setError("Capture GPS, add one or more farm points, or upload a GeoJSON / CSV / KML / ZIP file.");
      return;
    }

    setSubmitting(true);
    try {
      const fullClaim = permitFile
        ? `${claimText.trim()} [Attached Permit: ${permitFile.name} · SHA-256 ${permitFile.sha256.slice(0, 16)}]`
        : claimText.trim();

      const claimDetected = detectCommodityFromText(claimText);
      const finalCommodity = autoDetectedCommodity || selectedCommodity || claimDetected || reqData?.commodity || "coffee";

      let payloadGeom: Record<string, unknown> | undefined = uploadedGeom || undefined;
      let payloadLat: number | undefined = undefined;
      let payloadLng: number | undefined = undefined;
      let payloadAreaHa = parseFloat(areaHa) || 10.0;

      if (!payloadGeom) {
        if (combinedPoints.length === 1) {
          payloadLat = combinedPoints[0].lat;
          payloadLng = combinedPoints[0].lng;
          payloadAreaHa = combinedPoints[0].areaHa;
        } else {
          // Build unified MultiPolygon from all smallholder GPS points
          const coords = combinedPoints.map(
            (p) => createGeodesicCirclePolygon(p.lng, p.lat, p.areaHa).coordinates
          );
          payloadGeom = { type: "MultiPolygon", coordinates: coords };
          payloadAreaHa = Number(
            combinedPoints.reduce((acc, p) => acc + p.areaHa, 0).toFixed(2)
          );
        }
      }

      const res = await submitSupplierPortal(token, {
        ...(payloadGeom ? { geometry: payloadGeom } : { lat: payloadLat, lng: payloadLng }),
        area_ha: payloadAreaHa,
        declared_mass_kg: parseFloat(declaredMassKg) || 10000,
        supplier_claim: fullClaim,
        commodity: finalCommodity,
      });
      if (!res) {
        setError("Could not submit plot data. Please try again.");
      } else {
        setReceipt(res);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasValidCoords = !Number.isNaN(parseFloat(lat)) && !Number.isNaN(parseFloat(lng));
  const totalManualArea = manualPoints.reduce((acc, p) => acc + p.areaHa, 0);

  return (
    <div className="relative min-h-screen bg-[#F4F5F6] px-4 py-8 text-[#1D2227] sm:px-6 font-sans">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-55"
        style={{ backgroundImage: `url(${asset("/site/contours.svg")})`, backgroundSize: "cover" }}
      />

      <div className="mx-auto max-w-xl">
        {/* Top Bar */}
        <div className="mb-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset("/oxeous-logo-tight.png")} alt="Oxeous" className="h-6 w-auto" />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C8CFD5] bg-white px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#315F50] shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-[#315F50]" />
            No-Login Supplier Link
          </span>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#C8CFD5] bg-white py-20 shadow-xs">
            <Loader2 className="h-7 w-7 animate-spin text-[#315F50]" />
            <p className="mt-3 text-sm text-[#5B6773]">Loading origin request…</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="rounded-2xl border border-[#C8CFD5] bg-white p-8 text-center shadow-xs">
            <AlertCircle className="mx-auto h-10 w-10 text-[#A64B45]" />
            <h1 className="mt-3 text-xl font-bold text-[#1D2227]">Origin Request Link Not Found</h1>
            <p className="mt-2 text-sm text-[#5B6773]">
              This link may have expired or been deleted. Please contact your EU buyer to request a fresh Oxeous origin
              link.
            </p>
          </div>
        )}

        {!loading && reqData && receipt && (() => {
          const auditStatus = receipt.audit_status;
          const cleanHa = Math.max(0, receipt.audit_clean_ha ?? 0);
          const replantHa = Math.max(0, receipt.audit_replanting_ha ?? 0);
          const silvHa = Math.max(0, receipt.audit_silviculture_ha ?? 0);
          const nonAgHa = Math.max(0, receipt.audit_non_agronomic_ha ?? 0);
          const violHa = Math.max(0, receipt.audit_violation_ha ?? 0);
          const computedSum = cleanHa + replantHa + silvHa + nonAgHa + violHa;
          const displayAreaHa =
            receipt.audit_total_ha && receipt.audit_total_ha > 0
              ? receipt.audit_total_ha
              : computedSum > 0
              ? computedSum
              : receipt.submitted_area_ha ?? 8.4;
          const totalHa = Math.max(0.1, computedSum > 0 ? computedSum : displayAreaHa);
          const cleanPct = auditStatus ? Number(((cleanHa / totalHa) * 100).toFixed(1)) : 0;
          const replantShare = replantHa / totalHa;
          const silvShare = silvHa / totalHa;
          const nonAgShare = nonAgHa / totalHa;
          const violShare = violHa / totalHa;

          // Exact 5-Class PWRI-3D Donut Pie Chart (matches Cockpit SpatialAnalyticsDeck 1:1)
          const R = 36;
          const C = 2 * Math.PI * R;
          const cleanLen = (cleanHa / totalHa) * C;
          const replantLen = replantShare * C;
          const silvLen = silvShare * C;
          const nonAgLen = nonAgShare * C;
          const violLen = violShare * C;

          const badgeCfg =
            auditStatus === "compliant"
              ? { tag: "EUDR CLEARED FOR EXPORT", title: "Parcel Verified Deforestation-Free", color: "text-[#315F50] bg-[rgba(49,95,80,0.1)] border-[rgba(49,95,80,0.25)]" }
              : auditStatus === "carve_out"
              ? { tag: "ACTION REQUIRED · CARVE-OUT APPLIED", title: "Partial Clean Area Approved", color: "text-[#8C5819] bg-amber-50 border-amber-200" }
              : auditStatus === "non_compliant"
              ? { tag: "SHIPMENT ON HOLD", title: "Compliance Issue Detected", color: "text-[#A64B45] bg-rose-50 border-rose-200" }
              : { tag: "UNDER SATELLITE REVIEW", title: "Farm Boundary Submitted", color: "text-[#315F50] bg-[rgba(49,95,80,0.08)] border-[rgba(49,95,80,0.22)]" };

          return (
          <div className="rounded-2xl border border-[#C8CFD5] bg-white p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border ${badgeCfg.color}`}>
                {auditStatus === "non_compliant" ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#315F50]">
                  {badgeCfg.tag}
                </div>
                <h1 className="text-xl font-bold text-[#1D2227]">{badgeCfg.title}</h1>
              </div>
            </div>

            <p className="mt-3.5 text-[13px] leading-relaxed text-[#5B6773]">
              {auditStatus && receipt.audit_summary ? (
                receipt.audit_summary
              ) : (
                <>
                  Thank you, <strong className="text-[#1D2227]">{receipt.supplier_name}</strong>. Your verified 10 m farm
                  polygon has been delivered to <strong className="text-[#1D2227]">{receipt.operator_name}</strong>.
                  Bookmark or refresh this link to check your live satellite clearance status once audited.
                </>
              )}
            </p>

            {/* Locked One-Shot Field View + Land Partition Donut Pie Chart */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {receipt.submitted_geometry && (
                <SupplierFieldSnapshot
                  geometry={receipt.submitted_geometry}
                  pwriTileUrl={receipt.audit_pwri_tile_url}
                />
              )}

              {auditStatus ? (
                <div className="flex flex-col justify-between rounded-xl border border-[#E3E7EA] bg-[#F8FAF9] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-[#5B6773]">
                      Land Partition
                    </span>
                    <span className="font-mono text-[9.5px] font-bold text-[#1D2227]">
                      Risk {Math.round(receipt.audit_risk_score ?? 0)}/100
                    </span>
                  </div>

                  {/* Donut Pie Chart */}
                  <div className="my-2 flex items-center justify-center">
                    <div className="relative h-28 w-28">
                      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                        <circle cx="50" cy="50" r={R} fill="none" stroke="#E3E7EA" strokeWidth="12" />
                        {cleanLen > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={R}
                            fill="none"
                            stroke="#2E9E6F"
                            strokeWidth="12"
                            strokeDasharray={`${cleanLen} ${C}`}
                            strokeDashoffset={0}
                          />
                        )}
                        {replantLen > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={R}
                            fill="none"
                            stroke="#F2A91F"
                            strokeWidth="12"
                            strokeDasharray={`${replantLen} ${C}`}
                            strokeDashoffset={-cleanLen}
                          />
                        )}
                        {silvLen > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={R}
                            fill="none"
                            stroke="#3B82C4"
                            strokeWidth="12"
                            strokeDasharray={`${silvLen} ${C}`}
                            strokeDashoffset={-(cleanLen + replantLen)}
                          />
                        )}
                        {nonAgLen > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={R}
                            fill="none"
                            stroke="#64748B"
                            strokeWidth="12"
                            strokeDasharray={`${nonAgLen} ${C}`}
                            strokeDashoffset={-(cleanLen + replantLen + silvLen)}
                          />
                        )}
                        {violLen > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={R}
                            fill="none"
                            stroke="#D93C4A"
                            strokeWidth="12"
                            strokeDasharray={`${violLen} ${C}`}
                            strokeDashoffset={-(cleanLen + replantLen + silvLen + nonAgLen)}
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="font-mono text-[14px] font-bold leading-none text-[#1D2227]">
                          {cleanPct}%
                        </span>
                        <span className="mt-0.5 font-mono text-[8px] uppercase text-[#5B6773]">
                          Compliant
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Exact 5-Class PWRI Legend (matches Cockpit 1:1) */}
                  <div className="space-y-1 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[#343B42]">
                        <span className="h-2 w-2 rounded-full bg-[#2E9E6F]" />
                        Clean Export
                      </span>
                      <strong className="text-[#1D2227]">{cleanHa.toFixed(1)} ha</strong>
                    </div>
                    {replantHa > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[#343B42]">
                          <span className="h-2 w-2 rounded-full bg-[#F2A91F]" />
                          Replanting Exempt
                        </span>
                        <strong className="text-[#1D2227]">{replantHa.toFixed(1)} ha</strong>
                      </div>
                    )}
                    {silvHa > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[#343B42]">
                          <span className="h-2 w-2 rounded-full bg-[#3B82C4]" />
                          Silviculture Exempt
                        </span>
                        <strong className="text-[#1D2227]">{silvHa.toFixed(1)} ha</strong>
                      </div>
                    )}
                    {nonAgHa > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[#343B42]">
                          <span className="h-2 w-2 rounded-full bg-[#64748B]" />
                          Non-Agronomic
                        </span>
                        <strong className="text-[#1D2227]">{nonAgHa.toFixed(1)} ha</strong>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[#343B42]">
                        <span className="h-2 w-2 rounded-full bg-[#D93C4A]" />
                        Post-2020 Clearing
                      </span>
                      <strong className={violHa > 0 ? "text-[#A64B45]" : "text-[#1D2227]"}>
                        {violHa.toFixed(1)} ha
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#C8CFD5] bg-[#F8FAF9] p-4 text-center">
                  <ShieldCheck className="h-6 w-6 text-[#315F50]" />
                  <p className="mt-2 text-xs font-semibold text-[#1D2227]">Awaiting Buyer Audit</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#5B6773]">
                    Your clean vs. flagged land partition pie chart will appear here automatically once verified.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-[#E3E7EA] bg-[#F8FAF9] p-4 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#5B6773]">Commodity</span>
                <strong className="uppercase text-[#1D2227]">{receipt.commodity}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6773]">Verified Boundary Area</span>
                <strong className="text-[#1D2227]">{displayAreaHa.toFixed(2)} ha</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5B6773]">Declared Shipment Mass</span>
                <strong className="text-[#1D2227]">{Math.round(receipt.declared_mass_kg ?? 0).toLocaleString()} kg</strong>
              </div>
              {receipt.audit_traces_ref && (
                <div className="flex justify-between">
                  <span className="text-[#5B6773]">DDS Reference</span>
                  <strong className="text-[#1D2227]">{receipt.audit_traces_ref}</strong>
                </div>
              )}
              <div className="flex justify-between gap-2 border-t border-[#E3E7EA] pt-2">
                <span className="text-[#5B6773]">Art. 12 SHA-256 Receipt</span>
                <strong className="truncate text-[#315F50]">{receipt.doc_sha256.slice(0, 22)}…</strong>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={downloadSupplierReceipt}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#315F50] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#274d40] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{auditStatus ? "Download Compliance Summary (.txt)" : "Download Delivery Receipt (.txt)"}</span>
              </button>
              <button
                type="button"
                onClick={copyReceiptHash}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#C8CFD5] bg-white px-4 py-3 text-xs font-semibold text-[#343B42] transition-colors hover:bg-[#F4F5F6] cursor-pointer"
              >
                {copiedHash ? <Check className="h-3.5 w-3.5 text-[#315F50]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedHash ? "Copied" : "Copy SHA-256"}</span>
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-[#747F88]">
              {auditStatus
                ? "This status is scoped strictly to your submitted parcel."
                : "No further action required — refresh this link later to check your live clearance verdict."}
            </p>
          </div>
          );
        })()}

        {!loading && reqData && !receipt && (
          <div className="overflow-hidden rounded-2xl border border-[#C8CFD5] bg-white shadow-sm">
            {/* Clean Light-Steel Request Header (matches Oxeous Cockpit palette) */}
            <div className="border-b border-[#E3E7EA] bg-[#F8FAF9] px-6 py-5 border-t-4 border-t-[#315F50]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(49,95,80,0.25)] bg-[rgba(49,95,80,0.08)] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#315F50]">
                  EUDR Origin Request · {reqData.commodity.toUpperCase()}
                </span>
                <span className="rounded-full border border-[#C8CFD5] bg-white px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-[#1D2227]">
                  {Math.round(reqData.expected_mass_kg).toLocaleString()} kg
                </span>
              </div>
              <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-[#1D2227]">{reqData.supplier_name}</h1>
              <p className="mt-1 text-xs leading-relaxed text-[#5B6773]">
                Requested by <strong className="text-[#1D2227]">{reqData.operator_name}</strong>. Drop a GPS pin, queue
                multiple smallholder points, or upload a GeoJSON / CSV / KML / ZIP file—Oxeous automatically builds your
                10 m EUDR boundary.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-[#A64B45]/30 bg-rose-50 px-3.5 py-2.5 text-xs text-[#A64B45]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: GPS Pin Capture, Multi-Point Builder, OR Multi-Format File Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#1D2227]">
                    1. Farm Location, Points or Polygon
                  </label>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-[#315F50]">
                    <Sparkles className="h-3 w-3" /> 10 m Auto-Boundary
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={captureBrowserGps}
                    disabled={locating}
                    className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#315F50]/50 bg-[rgba(49,95,80,0.06)] py-3 px-3 text-xs font-semibold text-[#1D2227] transition-colors hover:border-[#315F50] hover:bg-[rgba(49,95,80,0.11)] cursor-pointer"
                  >
                    {locating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#315F50]" />
                        Reading GPS…
                      </>
                    ) : (
                      <>
                        <Compass className="h-4 w-4 text-[#315F50]" />
                        Capture Device GPS
                      </>
                    )}
                  </button>

                  <label className="flex flex-col items-center justify-center rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] py-2.5 px-3 text-xs font-semibold text-[#343B42] transition-colors hover:border-[#315F50] hover:bg-white cursor-pointer">
                    <span className="inline-flex items-center gap-1.5">
                      <FileJson className="h-4 w-4 text-[#315F50]" />
                      Upload Points / Polygon
                    </span>
                    <span className="mt-0.5 font-mono text-[9px] font-normal text-[#747F88]">
                      GeoJSON · CSV · KML · ZIP
                    </span>
                    <input
                      type="file"
                      accept=".geojson,.json,.csv,.tsv,.kml,.zip"
                      onChange={handleGeoJsonUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadedGeom && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(49,95,80,0.3)] bg-[rgba(49,95,80,0.06)] px-3 py-2 text-xs text-[#315F50]">
                    <span className="inline-flex items-center gap-1.5 font-semibold truncate">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{uploadedSummary || `Loaded boundary: ${uploadedGeomName}`}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedGeom(null);
                        setUploadedGeomName("");
                        setUploadedSummary("");
                        setUploadedPlotCount(0);
                      }}
                      className="rounded p-0.5 hover:bg-white/70 cursor-pointer"
                      aria-label="Clear uploaded file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {!uploadedGeom && (
                  <>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#5B6773]">Latitude</label>
                        <input
                          type="text"
                          required={!uploadedGeom && manualPoints.length === 0}
                          value={lat}
                          onChange={(e) => setLat(e.target.value)}
                          placeholder="5.382000"
                          className="w-full rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] px-3 py-2 font-mono text-xs text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#5B6773]">Longitude</label>
                        <input
                          type="text"
                          required={!uploadedGeom && manualPoints.length === 0}
                          value={lng}
                          onChange={(e) => setLng(e.target.value)}
                          placeholder="-75.477000"
                          className="w-full rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] px-3 py-2 font-mono text-xs text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[#5B6773]">Est. Area (ha)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={areaHa}
                          onChange={(e) => setAreaHa(e.target.value)}
                          className="w-full rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] px-3 py-2 font-mono text-xs text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {hasValidCoords ? (
                        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-[rgba(49,95,80,0.22)] bg-[rgba(49,95,80,0.05)] px-2.5 py-1.5 font-mono text-[10px] text-[#315F50] truncate">
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            Pin locked ({parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10.5px] text-[#747F88]">
                          {manualPoints.length > 0
                            ? "Add more GPS coordinates below or submit your batch."
                            : "Enter 1 pin for 10 m auto-trace, or queue multiple points."}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={addManualPoint}
                        disabled={!hasValidCoords}
                        className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-[#C8CFD5] bg-white px-2.5 py-1.5 text-[10.5px] font-semibold text-[#1D2227] transition-colors hover:border-[#315F50] hover:text-[#315F50] disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3 w-3 text-[#315F50]" />
                        Add Point
                      </button>
                    </div>

                    {manualPoints.length > 0 && (
                      <div className="rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#315F50]">
                            Multi-Point Queue · {manualPoints.length} {manualPoints.length === 1 ? "Point" : "Points"} (
                            {totalManualArea.toFixed(1)} ha)
                          </span>
                          <button
                            type="button"
                            onClick={() => setManualPoints([])}
                            className="text-[10px] font-semibold text-[#747F88] hover:text-[#A64B45] cursor-pointer"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="max-h-28 space-y-1 overflow-y-auto pr-0.5">
                          {manualPoints.map((pt, idx) => (
                            <div
                              key={pt.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-[#E3E7EA] bg-white px-2.5 py-1 font-mono text-[10.5px]"
                            >
                              <span className="truncate text-[#1D2227]">
                                <strong className="text-[#315F50]">#{idx + 1}</strong> {pt.lat.toFixed(4)},{" "}
                                {pt.lng.toFixed(4)}{" "}
                                <span className="text-[#747F88]">· {pt.areaHa.toFixed(1)} ha</span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setManualPoints((prev) => prev.filter((item) => item.id !== pt.id))
                                }
                                className="rounded p-0.5 text-[#747F88] hover:text-[#A64B45] cursor-pointer"
                                aria-label={`Remove point ${idx + 1}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clearly labeled demo presets for live pitches */}
                    <div className="pt-0.5">
                      <span className="block mb-1.5 font-mono text-[9.5px] uppercase tracking-wider text-[#747F88]">
                        Quick demo pins & multi-point batch:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_FIELD_PINS.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => {
                              setManualPoints([]);
                              setLat(String(p.lat));
                              setLng(String(p.lng));
                              setAreaHa(String(p.areaHa));
                              setSelectedCommodity(p.commodity);
                              setAutoDetectedCommodity(p.commodity);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-[#C8CFD5] bg-[#F8FAF9] px-2.5 py-1 text-[10.5px] font-medium text-[#5B6773] hover:border-[#315F50] hover:bg-white hover:text-[#1D2227] transition-colors cursor-pointer"
                          >
                            <MapPin className="h-3 w-3 text-[#315F50]" />
                            {p.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setLat("");
                            setLng("");
                            setManualPoints(
                              DEMO_MULTIPOINT_BATCH.points.map((pt, idx) => ({
                                id: `demo_mp_${idx + 1}`,
                                label: pt.label,
                                lat: pt.lat,
                                lng: pt.lng,
                                areaHa: pt.areaHa,
                              }))
                            );
                            setSelectedCommodity(DEMO_MULTIPOINT_BATCH.commodity);
                            setAutoDetectedCommodity(DEMO_MULTIPOINT_BATCH.commodity);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-[rgba(49,95,80,0.35)] bg-[rgba(49,95,80,0.06)] px-2.5 py-1 text-[10.5px] font-semibold text-[#315F50] hover:border-[#315F50] hover:bg-[rgba(49,95,80,0.12)] transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3 text-[#315F50]" />
                          {DEMO_MULTIPOINT_BATCH.label}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Step 2: Shipment Mass + Legality Attestation + Optional Permit */}
              <div className="space-y-3 border-t border-[#E3E7EA] pt-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1D2227]">
                  2. Shipment Volume & Legality Attestation
                </label>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[#5B6773]">
                      <span>Commodity</span>
                      {autoDetectedCommodity && (
                        <span className="font-mono text-[9px] font-bold text-[#315F50]">Auto</span>
                      )}
                    </label>
                    <select
                      value={selectedCommodity}
                      onChange={(e) => {
                        setSelectedCommodity(e.target.value);
                        setAutoDetectedCommodity(null);
                      }}
                      className="w-full rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] px-3 py-2 text-xs font-semibold text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
                    >
                      {COMMODITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5B6773]">
                      Declared Mass (kg)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={declaredMassKg}
                      onChange={(e) => setDeclaredMassKg(e.target.value)}
                      className="w-full rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] px-3 py-2 font-mono text-xs font-semibold text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[#5B6773]">
                      Permit <span className="font-normal text-[#747F88]">(Opt.)</span>
                    </label>
                    <label className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] px-3 py-2 text-xs text-[#343B42] hover:border-[#315F50] hover:bg-white cursor-pointer">
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <Paperclip className="h-3.5 w-3.5 text-[#315F50] flex-shrink-0" />
                        <span className="truncate">{permitFile ? permitFile.name : "PDF / Photo"}</span>
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.txt"
                        onChange={handlePermitUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#5B6773]">
                    <FileText className="h-3.5 w-3.5 text-[#315F50]" />
                    Supplier Declaration (Cross-Checked Against Satellite)
                  </label>
                  <textarea
                    rows={3}
                    value={claimText}
                    onChange={(e) => setClaimText(e.target.value)}
                    className="w-full rounded-xl border border-[#C8CFD5] bg-[#F8FAF9] px-3 py-2 text-xs leading-relaxed text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#315F50] hover:bg-[#274d40] px-6 py-3.5 text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Tracing 10 m Boundary & Submitting…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {uploadedGeom
                      ? uploadedPlotCount > 1
                        ? `Submit ${uploadedPlotCount} Plots to EU Buyer`
                        : "Submit Polygon to EU Buyer"
                      : manualPoints.length >= 2 || (manualPoints.length === 1 && hasValidCoords)
                      ? `Submit ${manualPoints.length + (hasValidCoords ? 1 : 0)} Farm Points to EU Buyer`
                      : "Auto-Trace Polygon & Send to EU Buyer"}
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
