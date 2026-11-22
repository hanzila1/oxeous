import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { ShieldCheck, X, AlertCircle, ChevronRight, ChevronDown, Loader2, Coffee, Trees, Palmtree, CircleDot, FileText, Leaf, Layers, Check } from "lucide-react";
import OxeousOrbitIcon from "@/components/ui/OxeousOrbitIcon";
import {
  EULogoSeal,
  JRC2020Emblem,
  PanelExpandIcon,
  PanelCollapseIcon,
  AuditPlotIcon,
  DossierIcon,
  BenchmarkFlagIcon,
} from "@/components/icons/EOIcons";
import { cn } from "@/lib/utils";
import { useStore, type ActiveLayer, type AgentLogEntry } from "@/lib/store";
import type { EUDRAnalysisResponse, EUDRCommodity } from "@oxeous/shared-types";
import PlotUploader from "./PlotUploader";
import BatchPlotQueue from "./BatchPlotQueue";
import ComplianceResultCard from "./ComplianceResultCard";
import { BENCHMARK_CASES, type BenchmarkCase } from "@/components/ui/TopFloatingBar";
import { extractBboxFromGeometry } from "@/lib/maplibre";
import { recordSupplierAuditResult } from "@/lib/suppliers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const COMMODITY_ICON: Record<string, typeof Coffee> = {
  coffee: Coffee,
  cocoa: Trees,
  rubber: CircleDot,
  palm_oil: Palmtree,
  soya: Leaf,
};

export default function EUDRDashboard({ onClose }: { onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [activeAuditLabel, setActiveAuditLabel] = useState<string>("");
  const [liveStages, setLiveStages] = useState<AgentLogEntry[]>([]);
  const activeSupplierTokenRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [benchmarksOpen, setBenchmarksOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"upload" | "batch">("upload");
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    addLayer,
    addAuditLayers,
    setActiveGeoJSON,
    activeEudrResult: result,
    setActiveEudrResult: setResult,
    ddsHistory,
    addDDSHistory,
    reopenAudit,
    addMessage,
    updateMessage,
    setRightPanel,
    setActiveDossier,
    eudrPanelExpanded,
    setEudrPanelExpanded,
    setIsScanning,
    pendingPinCoords,
    drawingAOI,
    batchPlots,
    pendingSupplierAudit,
    setPendingSupplierAudit,
  } = useStore();

  // Auto switch to batch view when multi-plot file is loaded
  useEffect(() => {
    if (batchPlots.length > 1) {
      setViewMode("batch");
    }
  }, [batchPlots.length]);

  // Ensure PlotUploader mounts when user drops a custom GPS pin or draws a new AOI after a previous audit
  useEffect(() => {
    if ((pendingPinCoords || drawingAOI) && !loading) {
      setResult(null);
      setError(null);
    }
  }, [pendingPinCoords, drawingAOI, loading]);

  const run = useCallback(async (geometry: object, commodity: EUDRCommodity, countryCode: string, countryName: string, areaHa?: number) => {
    setLoading(true); setError(null); setResult(null);
    setIsScanning(true);

    let effectiveGeometry = geometry;
    let effectiveAreaHa = areaHa;
    let effectiveCountryCode = countryCode;
    let effectiveCountryName = countryName;

    setActiveGeoJSON(geometry);

    // Fly to geometry (Polygon, MultiPolygon, or Point)
    const bbox = extractBboxFromGeometry(geometry);
    if (bbox) {
      (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
    }

    // Dynamic location label (never assume Ghana)
    const locationName = countryName ? `${countryName} (${countryCode})` : countryCode ? `Jurisdiction: ${countryCode}` : "Selected Geometry Coordinates";
    const promptText = `Assess EUDR compliance for ${commodity.toUpperCase()} sourcing plot (${areaHa ? `${areaHa.toFixed(1)} ha` : "drawn boundary"}) in ${locationName}`;
    const userMsgId = `user-${Date.now()}`;
    const botMsgId = `eudr-bot-${Date.now()}`;

    // Open right Agent panel simultaneously
    setRightPanel("chat");

    addMessage({ id: userMsgId, role: "user", content: promptText });

    let currentLogs: AgentLogEntry[] = [
      {
        id: "ingest",
        label: "Plot Geometry & RFC 7946 Topology",
        detail: `Verifying vector boundary (${areaHa ? `${areaHa.toFixed(1)} ha` : "AOI"}) for ${commodity.replace(/_/g, " ")}...`,
        status: "active",
      },
      {
        id: "hansen",
        label: "Hansen GFC 2025 & Optical S2",
        detail: "Queued: 2021-2025 post-cutoff canopy loss scan",
        status: "pending",
      },
      {
        id: "jrc",
        label: "EC JRC GFC2020 & Forest Typology",
        detail: "Queued: Official 10m Dec 2020 baseline & ForTy",
        status: "pending",
      },
      {
        id: "radd",
        label: "Sentinel-1 SAR & FDP 2026a",
        detail: "Queued: All-weather radar & commodity presence",
        status: "pending",
      },
      {
        id: "protected",
        label: "WDPA Reserves & Art. 2(40) Legality",
        detail: "Queued: IUCN I-VI & 8-domain sovereign cadastre",
        status: "pending",
      },
      {
        id: "consensus",
        label: "6-Subagent Consensus & TRACES NT DDS",
        detail: "Queued: Multi-agent arbitration & statutory dossier",
        status: "pending",
      },
    ];

    addMessage({
      id: botMsgId,
      role: "assistant",
      content: "",
      isLoading: true,
      agentLogs: currentLogs,
    });
    setActiveAuditLabel(`${commodity.replace(/_/g, " ").toUpperCase()} · ${locationName}`);
    setLiveStages([...currentLogs]);

    // EUDR Art. 9(1)(d): Points MUST follow our exact solution of FTW Field Boundary Delineation!
    // If the input plot is a Point, auto-trace the true 10m physical farm polygon before auditing!
    if ((geometry as any)?.type === "Point" && Array.isArray((geometry as any).coordinates)) {
      const [lng, lat] = (geometry as any).coordinates;
      currentLogs[0] = {
        id: "ingest",
        label: "AI Field Boundary Delineation (10m FTW)",
        detail: `Auto-tracing physical Sentinel-2 farm polygon for smallholder GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})...`,
        status: "active",
      };
      updateMessage(botMsgId, { agentLogs: [...currentLogs] });

      try {
        const ftwRes = await fetch(`${API_BASE}/eudr/ftw-delineate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, target_area_ha: areaHa || 12.0 }),
        });
        if (ftwRes.ok) {
          const ftwData = await ftwRes.json();
          if (ftwData.geometry) {
            effectiveGeometry = ftwData.geometry;
            effectiveAreaHa = ftwData.area_ha || effectiveAreaHa;
            effectiveCountryCode = ftwData.country_code || effectiveCountryCode;
            effectiveCountryName = ftwData.country_name || effectiveCountryName;

            // Immediately display the real delineated parcel boundary on the satellite canvas
            setActiveGeoJSON(effectiveGeometry);
            const delineatedBbox = extractBboxFromGeometry(effectiveGeometry);
            if (delineatedBbox) {
              (window as Window & { oxeousFlyTo?: (b: typeof delineatedBbox) => void }).oxeousFlyTo?.(delineatedBbox);
            }

            // Load connected cadastral parcel vector mesh
            if (ftwData.ftw_geojson && ftwData.ftw_geojson.features?.length) {
              addLayer({
                id: "ftw-field-boundaries",
                label: "FTW Connected Parcel Mesh (10m S2)",
                type: "geojson",
                geojsonData: ftwData.ftw_geojson,
                visible: true,
                opacity: 0.95,
                legend: {
                  title: "FTW Connected Parcel Vector Mesh",
                  classes: [
                    { label: "Cultivated Field Boundary", color: "#315F50" },
                    { label: "Agroforestry Parcel", color: "#C58A3A" },
                  ],
                } as unknown as import("@oxeous/shared-types").AnalysisResponse["legend"],
                analysisType: "land_disturbance",
                layer_type: "ftw_boundaries",
              });
            }

            currentLogs[0] = {
              id: "ingest",
              label: "Plot Geometry & RFC 7946 Topology",
              detail: `Delineated 10m field polygon (${(effectiveAreaHa ?? 2.0).toFixed(1)} ha, ${ftwData.vertex_count} vertices, ${Math.round(ftwData.confidence * 100)}% conf)`,
              status: "done",
            };
            updateMessage(botMsgId, { agentLogs: [...currentLogs] });
          }
        }
      } catch (ftwErr) {
        console.warn("FTW delineation fallback:", ftwErr);
      }
    }

    try {
      // Use SSE streaming endpoint for real-time agent logs
      const res = await fetch(`${API_BASE}/eudr/plots/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commodity,
          country_code: effectiveCountryCode,
          country_name: effectiveCountryName,
          geometry: effectiveGeometry,
          area_ha: effectiveAreaHa,
          generate_dds: true,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(e.detail ?? "Assessment failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No stream available");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            // Stream live agent log directly into the 6-stage connected Agent Pipeline
            if (event.step === "agent_log") {
              const rawId = String(event.id || "step");
              const mappedId =
                rawId === "natural_forest" || rawId === "typology"
                  ? "jrc"
                  : rawId === "drivers" || rawId === "commodity"
                  ? "radd"
                  : rawId;

              const idx = currentLogs.findIndex((l) => l.id === mappedId);
              const incomingStatus = (event.status as "done" | "active" | "pending") || "active";

              if (idx >= 0) {
                currentLogs = currentLogs.map((l, i) => {
                  if (i < idx && l.status !== "done") {
                    return { ...l, status: "done" as const };
                  }
                  if (i === idx) {
                    const isIntermediateSubStep =
                      (mappedId === "jrc" && rawId !== "typology") ||
                      (mappedId === "radd" && rawId !== "commodity");
                    return {
                      ...l,
                      detail: String(event.detail || l.detail),
                      status: isIntermediateSubStep && incomingStatus === "done" ? ("active" as const) : incomingStatus,
                    };
                  }
                  return l;
                });
              }
              updateMessage(botMsgId, { agentLogs: [...currentLogs] });
              setLiveStages([...currentLogs]);
            }

            if (event.step === "done" && event.data) {
              const data = event.data as EUDRAnalysisResponse;
              setResult(data);
              addDDSHistory(data);

              // Mark all logs complete and smoothly transition
              currentLogs = currentLogs.map(l => ({ ...l, status: "done" as const }));
              updateMessage(botMsgId, { agentLogs: [...currentLogs] });

              setTimeout(() => {
                updateMessage(botMsgId, {
                  content: data.explanation,
                  isLoading: false,
                  eudrResult: data,
                });
              }, 450);

              // Add grouped GEE layers to map under this analysis location
              addAuditLayers(data);

              // If this audit came from a Supplier Magic Link, publish the farm-scoped verdict back to their link
              if (activeSupplierTokenRef.current) {
                const tok = activeSupplierTokenRef.current;
                activeSupplierTokenRef.current = null;
                const ra = data.risk_assessment;
                const def = ra.deforestation as any;
                const isNonCompliant = ra.overall_risk === "non_compliant" || ra.overall_risk === "at_risk";
                const totalHa = Number(def.total_parcel_ha || data.plot?.area_ha || 0);
                const rawStatDefor = Number(def.statutory_deforestation_ha || 0);
                const violHa = isNonCompliant && !def.is_plantation_replanting_exemption
                  ? (rawStatDefor > 0 ? rawStatDefor : Number(def.forest_loss_ha || 0))
                  : rawStatDefor;
                const replantHa = Math.max(
                  0,
                  Number(
                    def.plantation_replanting_ha ??
                    def.pwri_3d?.statutory_ontology?.art_2_5_replanting_ha ??
                    (def.is_plantation_replanting_exemption ? def.forest_loss_ha : 0) ??
                    0
                  )
                );
                const silvHa = Math.max(
                  0,
                  Number(def.silviculture_replanting_ha ?? def.pwri_3d?.statutory_ontology?.art_2_3_silviculture_ha ?? 0)
                );
                const nonAgHa = Math.max(
                  0,
                  Number(def.non_agronomic_ha ?? def.pwri_3d?.tensor_dimensions?.statutory_ontology?.non_agronomic_urban_water_ha ?? 0)
                );
                const cleanHa = Math.max(0, totalHa - violHa - replantHa - silvHa - nonAgHa);
                const pwriLayer = (data.map_layers || []).find(
                  (l) => l.id.includes("pwri") || l.id.includes("intersection") || (l as any).layer_type === "intersection"
                );
                const pwriTileUrl = pwriLayer?.tile_url || data.tile_url || "";
                const overlap = Boolean(ra.legality?.overlaps_protected_area);
                const overall = ra.overall_risk;
                const auditStatus: "compliant" | "carve_out" | "non_compliant" =
                  overall === "compliant" || overall === "low_risk"
                    ? "compliant"
                    : cleanHa > 0.5 && !overlap
                    ? "carve_out"
                    : "non_compliant";
                const summary =
                  auditStatus === "compliant"
                    ? `Verified deforestation-free (${cleanHa.toFixed(1)} ha clean export area out of ${totalHa.toFixed(1)} ha). Approved for EU customs filing.`
                    : auditStatus === "carve_out"
                    ? `${cleanHa.toFixed(1)} ha verified clean; ${violHa.toFixed(1)} ha showed post-2020 clearing and was excluded via carve-out.`
                    : overlap
                    ? `Parcel intersects a protected reserve (${ra.legality?.protected_area_names?.[0] || "WDPA"}) or post-2020 clearing (${violHa.toFixed(1)} ha). Shipment on hold.`
                    : `Post-2020 deforestation detected (${violHa.toFixed(1)} ha). Shipment on hold pending corrective action.`;

                recordSupplierAuditResult(tok, {
                  audit_status: auditStatus,
                  audit_risk_score: Number(ra.risk_score ?? 0),
                  audit_clean_ha: cleanHa,
                  audit_replanting_ha: replantHa,
                  audit_silviculture_ha: silvHa,
                  audit_non_agronomic_ha: nonAgHa,
                  audit_violation_ha: violHa,
                  audit_total_ha: totalHa,
                  audit_pwri_tile_url: pwriTileUrl,
                  audit_summary: summary,
                  audit_protected_overlap: overlap,
                  audit_traces_ref: data.dds?.dds_id || "",
                }).catch(() => {});
              }
            }

            if (event.step === "error") {
              throw new Error((event.message as string) || "Assessment failed");
            }
          } catch (parseErr) {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";
      setError(errMsg);
      updateMessage(botMsgId, {
        content: "",
        isLoading: false,
        error: errMsg,
        agentLogs: currentLogs,
      });
    } finally {
      setLoading(false);
      setIsScanning(false);
    }
  }, [addLayer, addAuditLayers, setActiveGeoJSON, setResult, addDDSHistory, addMessage, updateMessage, setRightPanel, setIsScanning]);

  // Trigger a live audit automatically when "Audit Plot" is clicked in the Suppliers sidebar
  useEffect(() => {
    if (!pendingSupplierAudit || loading) return;
    const req = pendingSupplierAudit;
    activeSupplierTokenRef.current = req.supplierToken ?? null;
    setPendingSupplierAudit(null);
    run(req.geometry, req.commodity, req.countryCode, req.countryName, req.areaHa);
  }, [pendingSupplierAudit, loading, setPendingSupplierAudit, run]);

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0 glass-header shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/oxeous-logo-tight.png"
            alt="Oxeous"
            style={{ height: "22px", width: "auto" }}
            className="h-[22px] max-h-[22px] w-auto object-contain filter brightness-95"
          />
          <div className="h-4 w-[1px] bg-[#C8CFD5]" />
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.25)] px-2 py-0.5 rounded-chip">
            <EULogoSeal className="w-3 h-3 text-[#315F50]" />
            <span>EU 2023/1115</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setEudrPanelExpanded((v: boolean) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-medium text-[#343B42] hover:text-[#1D2227] hover:bg-white/90 transition-all border border-[#C8CFD5] shadow-2xs cursor-pointer glass"
            title={eudrPanelExpanded ? "Collapse to standard 460px width" : "Expand to wide 640px workbench"}
          >
            {eudrPanelExpanded ? <PanelCollapseIcon className="w-3.5 h-3.5 text-[#315F50]" /> : <PanelExpandIcon className="w-3.5 h-3.5 text-[#315F50]" />}
            <span className="hidden sm:inline font-mono text-[10px]">{eudrPanelExpanded ? "460px" : "Wide Deck"}</span>
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#747F88] hover:text-[#1D2227] hover:bg-white/80 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Regulation info strip */}
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] flex-shrink-0">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Statutory Due Diligence Suite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <JRC2020Emblem className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-bold text-slate-900 font-mono text-[10px] bg-white border border-slate-300 px-1.5 py-0.5 rounded shadow-2xs">
            Cutoff: 31 DEC 2020
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">

        {/* Live Compliance Report Skeleton (distinct from Agent pipeline — zero duplication) */}
        {loading && (
          <div className="p-4">
            {(() => {
              const doneCount = liveStages.filter((s) => s.status === "done").length;
              const activeIdx = liveStages.findIndex((s) => s.status === "active");
              const pct = liveStages.length
                ? Math.min(100, Math.round(((doneCount + (activeIdx >= 0 ? 0.5 : 0)) / liveStages.length) * 100))
                : 15;
              const currentStepLabel =
                liveStages[activeIdx]?.label || "Compiling statutory compliance dossier";

              return (
                <div className="rounded-2xl border border-[#C8CFD5] bg-white overflow-hidden shadow-xs">
                  {/* Top Dossier Header */}
                  <div className="p-3.5 border-b border-[#E3E7EA] bg-[#F8FAF9] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#C8CFD5] flex items-center justify-center flex-shrink-0 shadow-2xs">
                          <OxeousOrbitIcon size={18} isSpinning={true} className="text-[#315F50]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[#1D2227] truncate">
                            Preparing Statutory Dossier
                          </p>
                          <p className="text-[10px] font-mono text-[#5B6773] truncate">
                            {activeAuditLabel || "EU 2023/1115 Assessment"}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-[#315F50] bg-white border border-[#C8CFD5] px-2 py-0.5 rounded-full flex-shrink-0">
                        {pct}%
                      </span>
                    </div>

                    <div className="h-1 w-full rounded-full bg-[#E3E7EA] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#315F50] transition-[width] duration-300 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Report Skeleton Matching ComplianceResultCard Anatomy */}
                  <div className="p-3.5 space-y-3.5">
                    {/* Risk Score Bar Placeholder */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#747F88]">
                          Deforestation Risk Score
                        </span>
                        <span className="h-3 w-12 rounded bg-[#E8ECEF] animate-pulse" />
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#E8ECEF] animate-pulse" />
                    </div>

                    {/* 3 Live Readiness Slots */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Clean Area", ready: doneCount >= 3 },
                        { label: "Canopy Loss", ready: doneCount >= 2 },
                        { label: "Reserves", ready: doneCount >= 5 },
                      ].map((slot) => (
                        <div
                          key={slot.label}
                          className="rounded-xl border border-[#E3E7EA] bg-[#F8FAF9] p-2.5 space-y-1.5"
                        >
                          <span className="block text-[9px] font-mono uppercase text-[#747F88] truncate">
                            {slot.label}
                          </span>
                          {slot.ready ? (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#315F50]">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Computed</span>
                            </div>
                          ) : (
                            <div className="h-3.5 w-14 rounded bg-[#E3E7EA] animate-pulse" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Land Partition & Chart Skeleton */}
                    <div className="rounded-xl border border-[#E3E7EA] bg-[#F8FAF9] p-3 flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-full border-[6px] border-[#E3E7EA] border-t-[#315F50]/45 animate-spin flex-shrink-0" style={{ animationDuration: "2.4s" }} />
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="h-3 w-3/4 rounded bg-[#E3E7EA] animate-pulse" />
                        <div className="h-2.5 w-full rounded bg-[#E8ECEF] animate-pulse" />
                        <div className="h-2.5 w-2/3 rounded bg-[#E8ECEF] animate-pulse" />
                      </div>
                    </div>

                    {/* Footer Status */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#E3E7EA] text-[10px]">
                      <span className="font-mono text-[#747F88] truncate pr-2">
                        {currentStepLabel}…
                      </span>
                      <button
                        type="button"
                        onClick={() => setRightPanel("chat")}
                        className="text-[#315F50] font-semibold hover:underline whitespace-nowrap flex-shrink-0 cursor-pointer"
                      >
                        Agent log →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="m-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-red-900">Assessment failed</p>
              <p className="text-[11px] text-red-700/80 mt-0.5 leading-relaxed">{error}</p>
              <button onClick={() => { setError(null); }} className="text-[11px] text-emerald-800 font-medium mt-1.5 hover:underline">Try another plot</button>
            </div>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="p-4 space-y-3">
            {batchPlots.length > 1 && (
              <button
                onClick={() => setResult(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#315F50] hover:text-[#274d40] mb-1 transition-colors cursor-pointer"
              >
                ← Back to Batch Queue ({batchPlots.length} Plots)
              </button>
            )}
            <ComplianceResultCard result={result} />
            <button
              onClick={() => {
                setResult(null);
                setError(null);
                if (batchPlots.length <= 1) setActiveGeoJSON(null);
              }}
              className="w-full text-[11px] text-[#747F88] hover:text-[#1D2227] border border-[#C8CFD5] hover:border-[#8E99A4] bg-white rounded-lg py-2 transition-all font-medium shadow-2xs cursor-pointer"
            >
              {batchPlots.length > 1 ? "Inspect Another Plot in Batch" : "Assess another plot"}
            </button>
          </div>
        )}

        {/* Upload + Research Benchmarks - idle state */}
        {!loading && !result && !error && (
          <div className="p-4 space-y-3">
            {batchPlots.length > 1 && (
              <div className="flex rounded-lg border border-[#C8CFD5] bg-[#E9ECEE] p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setViewMode("batch")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 font-semibold cursor-pointer text-[11px]",
                    viewMode === "batch"
                      ? "bg-white text-[#315F50] shadow-2xs border border-[#C8CFD5]"
                      : "text-[#747F88] hover:text-[#1D2227]"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-[#315F50]" />
                  <span>Batch Queue ({batchPlots.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("upload")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 font-semibold cursor-pointer text-[11px]",
                    viewMode === "upload"
                      ? "bg-white text-[#315F50] shadow-2xs border border-[#C8CFD5]"
                      : "text-[#747F88] hover:text-[#1D2227]"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-[#747F88]" />
                  <span>New Ingestion</span>
                </button>
              </div>
            )}

            {batchPlots.length > 1 && viewMode === "batch" ? (
              <div className="rounded-xl border border-[#C8CFD5] bg-white shadow-2xs overflow-hidden">
                <BatchPlotQueue
                  onSelectPlot={(plot) => {
                    if (plot.auditResult) {
                      setResult(plot.auditResult);
                    }
                  }}
                  onAuditFinished={(_plot, res) => {
                    setResult(res);
                  }}
                />
              </div>
            ) : (
              <>
                <PlotUploader onPlotReady={run} disabled={loading} />

                {/* Persisted Audit History (survives browser refresh) */}
                {ddsHistory.length > 0 && (
                  <div className="rounded-xl border border-[#C8CFD5] bg-white shadow-2xs overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 bg-[#F8FAF9]">
                      <span className="text-[11px] font-bold text-[#1D2227]">
                        Saved Audits
                      </span>
                      <span className="text-[9.5px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-1.5 py-0.5 rounded">
                        {ddsHistory.length} persisted
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {ddsHistory.map((item) => {
                        const isOk = item.risk_assessment?.overall_risk === "compliant" || item.risk_assessment?.overall_risk === "low_risk";
                        return (
                          <button
                            key={item.dds?.dds_id || item.request_id}
                            type="button"
                            onClick={() => {
                              reopenAudit(item);
                              const bbox = item.plot?.geometry ? extractBboxFromGeometry(item.plot.geometry) : null;
                              if (bbox) {
                                (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
                              }
                            }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#F4F5F6]/80 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-slate-900 truncate">
                                {item.plot?.name || `${item.plot?.commodity?.toUpperCase()} · ${item.plot?.country_name || item.plot?.country_code}`}
                              </p>
                              <p className="text-[9.5px] font-mono text-slate-500 truncate">
                                {item.plot?.commodity?.toUpperCase()} · {Number(item.plot?.area_ha ?? 0).toFixed(1)} ha · {isOk ? "COMPLIANT" : "FLAGGED"} ({Math.round(item.risk_assessment?.risk_score ?? 0)}/100)
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold text-[#315F50] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex-shrink-0">
                              Reopen →
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-[#C8CFD5] bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setBenchmarksOpen(v => !v)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-[#F4F5F6]/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[rgba(49,95,80,0.1)] border border-[rgba(49,95,80,0.2)] flex items-center justify-center">
                    <BenchmarkFlagIcon className="w-3.5 h-3.5 text-[#315F50]" />
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#1D2227]">
                    Sample Benchmark Plots
                  </span>
                  <span className="text-[9.5px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-1.5 py-0.5 rounded">
                    {BENCHMARK_CASES.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-[#747F88] transition-transform duration-200",
                    benchmarksOpen && "rotate-180 text-[#315F50]"
                  )}
                />
              </button>

              {benchmarksOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/40">
                  {BENCHMARK_CASES.map(c => {
                    const Icon = COMMODITY_ICON[c.commodityKey] ?? Trees;
                    const isCompliant = c.verdict.startsWith("COMPLIANT");
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border",
                            isCompliant ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                          )}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-900 truncate">{c.label}</p>
                            <p className="text-[9.5px] text-slate-500 truncate font-mono">
                              {c.country} · {isCompliant ? "PASS" : "FAIL"} ({c.score}/100)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => run(c.geometry, c.commodity, c.countryCode, c.country)}
                            className="flex items-center gap-1 text-[10.5px] font-semibold py-1 px-2.5 rounded-md bg-[#315F50] text-white hover:bg-[#274d40] transition-colors cursor-pointer"
                          >
                            <AuditPlotIcon className="w-3 h-3" />
                            <span>Audit</span>
                          </button>
                          <button
                            onClick={() => setActiveDossier(c.commodityKey)}
                            className="p-1.5 rounded-md border border-[#C8CFD5] bg-white text-[#1D2227] hover:bg-[#F4F5F6] transition-colors cursor-pointer"
                            title="Open Statutory Dossier"
                          >
                            <DossierIcon className="w-3.5 h-3.5 text-[#315F50]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )}
  </div>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-slate-200 px-4 py-2.5 bg-white text-center">
        <p className="text-[10px] text-slate-400 font-mono">
          Copernicus Sentinel-2 · Hansen v1.13 · FDP 2025 · UNEP-WCMC
        </p>
      </footer>
    </div>
  );
}
