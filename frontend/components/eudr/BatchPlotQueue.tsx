"use client";

import { useState, useCallback } from "react";
import {
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Sparkles,
  CircleDot,
  MapPin,
  Trash2,
  Download,
  Maximize2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, type ActiveLayer, type AgentLogEntry } from "@/lib/store";
import {
  type BatchPlotItem,
  createGeodesicCirclePolygon,
} from "@/lib/plotParser";
import { extractBboxFromGeometry } from "@/lib/maplibre";
import type { EUDRAnalysisResponse } from "@oxeous/shared-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  onSelectPlot?: (plot: BatchPlotItem, index: number) => void;
  onAuditFinished?: (plot: BatchPlotItem, result: EUDRAnalysisResponse) => void;
}

export default function BatchPlotQueue({ onSelectPlot, onAuditFinished }: Props) {
  const {
    batchPlots,
    updateBatchPlot,
    activeBatchPlotIndex,
    setActiveBatchPlotIndex,
    batchAuditing,
    setBatchAuditing,
    clearBatchPlots,
    setActiveGeoJSON,
    addLayer,
    addDDSHistory,
    setActiveAnalyticsResult,
    addMessage,
    updateMessage,
    appendHistory,
    setRightPanel,
  } = useStore();

  const [delineatingIdx, setDelineatingIdx] = useState<number | null>(null);
  const [delineatingAll, setDelineatingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "compliant" | "non_compliant">("all");

  const totalPlots = batchPlots.length;
  const pointPlotsCount = batchPlots.filter((p) => p.isPoint).length;
  const auditedPlots = batchPlots.filter((p) => p.status === "compliant" || p.status === "non_compliant");
  const compliantCount = batchPlots.filter((p) => p.status === "compliant").length;
  const nonCompliantCount = batchPlots.filter((p) => p.status === "non_compliant").length;
  const pendingCount = totalPlots - auditedPlots.length;
  const totalHa = batchPlots.reduce((acc, p) => acc + (p.areaHa || 1.8), 0);

  const displayPlots = batchPlots.filter((p) => {
    if (filter === "pending") return p.status === "pending" || p.status === "auditing";
    if (filter === "compliant") return p.status === "compliant";
    if (filter === "non_compliant") return p.status === "non_compliant";
    return true;
  });

  const showAllOnMap = useCallback(() => {
    const currentPlots = useStore.getState().batchPlots;
    const plotsToUse = currentPlots.length > 0 ? currentPlots : batchPlots;
    const fc = {
      type: "FeatureCollection",
      features: plotsToUse.map((p, idx) => ({
        type: "Feature",
        id: p.id || `plot_${idx + 1}`,
        geometry: p.geometry,
        properties: {
          id: p.id,
          name: p.name,
          commodity: p.commodity,
          status: p.status,
          isPoint: p.isPoint,
          area_ha: p.areaHa,
        },
      })),
    };
    setActiveGeoJSON(fc);
    const bbox = extractBboxFromGeometry(fc);
    if (bbox) {
      (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
    }
  }, [batchPlots, setActiveGeoJSON]);

  const handleSelectPlot = useCallback(
    (index: number) => {
      setActiveBatchPlotIndex(index);
      const currentPlots = useStore.getState().batchPlots;
      const plot = currentPlots[index] || batchPlots[index];
      if (!plot) return;

      setActiveGeoJSON(plot.geometry);
      const bbox = extractBboxFromGeometry(plot.geometry);
      if (bbox) {
        (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
      }
      if (plot.auditResult) {
        setActiveAnalyticsResult(plot.auditResult);
      }
      onSelectPlot?.(plot, index);
    },
    [batchPlots, setActiveBatchPlotIndex, setActiveGeoJSON, setActiveAnalyticsResult, onSelectPlot]
  );

  const handleBufferPoint = useCallback(
    (index: number) => {
      const plot = batchPlots[index];
      if (!plot || !plot.pointCoords) return;
      const [lng, lat] = plot.pointCoords;
      const targetAreaHa = plot.areaHa || 2.0;
      const bufferedPoly = createGeodesicCirclePolygon(lng, lat, targetAreaHa);

      updateBatchPlot(index, {
        geometry: bufferedPoly,
        isPoint: false,
        isBuffered: true,
        areaHa: targetAreaHa,
      });

      setActiveGeoJSON(bufferedPoly);
      const bbox = extractBboxFromGeometry(bufferedPoly);
      if (bbox) {
        (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
      }
    },
    [batchPlots, updateBatchPlot, setActiveGeoJSON]
  );

  const handleBufferAllPoints = useCallback(() => {
    batchPlots.forEach((plot, index) => {
      if (plot.isPoint && plot.pointCoords) {
        const [lng, lat] = plot.pointCoords;
        const targetAreaHa = plot.areaHa || 2.0;
        const bufferedPoly = createGeodesicCirclePolygon(lng, lat, targetAreaHa);
        updateBatchPlot(index, {
          geometry: bufferedPoly,
          isPoint: false,
          isBuffered: true,
          areaHa: targetAreaHa,
        });
      }
    });
    setTimeout(() => {
      showAllOnMap();
    }, 100);
  }, [batchPlots, updateBatchPlot, showAllOnMap]);

  const handleFtwDelineatePoint = useCallback(
    async (index: number) => {
      const currentPlots = useStore.getState().batchPlots;
      const plot = currentPlots[index] || batchPlots[index];
      if (!plot || !plot.pointCoords) return;
      const [lng, lat] = plot.pointCoords;

      setDelineatingIdx(index);
      try {
        const res = await fetch(`${API_BASE}/eudr/ftw-delineate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lng,
            target_area_ha: plot.areaHa || 4.0,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || "Field delineation failed");
        }

        const data = await res.json();
        updateBatchPlot(index, {
          geometry: data.geometry,
          areaHa: data.area_ha || plot.areaHa,
          countryCode: data.country_code || plot.countryCode,
          countryName: data.country_name || plot.countryName,
          isPoint: false,
          isDelineated: true,
        });

        if (data.ftw_geojson && data.ftw_geojson.features?.length) {
          addLayer({
            id: `ftw-field-mesh-${index}`,
            label: `FTW Cadastral Mesh (#${index + 1})`,
            type: "geojson",
            geojsonData: data.ftw_geojson,
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

        setActiveGeoJSON(data.geometry);
        const bbox = extractBboxFromGeometry(data.geometry);
        if (bbox) {
          (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
        }
      } catch (err) {
        console.error("FTW Delineation error:", err);
      } finally {
        setDelineatingIdx(null);
      }
    },
    [batchPlots, updateBatchPlot, setActiveGeoJSON, addLayer]
  );

  const handleDelineateAllPoints = useCallback(async () => {
    setDelineatingAll(true);
    try {
      const currentPlots = [...useStore.getState().batchPlots];
      const updatedPlots: typeof currentPlots = [];

      for (let i = 0; i < currentPlots.length; i++) {
        let plot = { ...currentPlots[i] };
        if (plot.isPoint && plot.pointCoords) {
          const [lng, lat] = plot.pointCoords;
          try {
            const res = await fetch(`${API_BASE}/eudr/ftw-delineate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat,
                lng,
                target_area_ha: plot.areaHa || 4.0,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.geometry) {
                plot = {
                  ...plot,
                  geometry: data.geometry,
                  areaHa: data.area_ha || plot.areaHa,
                  countryCode: data.country_code || plot.countryCode,
                  countryName: data.country_name || plot.countryName,
                  isPoint: false,
                  isDelineated: true,
                };
                updateBatchPlot(i, {
                  geometry: data.geometry,
                  areaHa: data.area_ha || plot.areaHa,
                  countryCode: data.country_code || plot.countryCode,
                  countryName: data.country_name || plot.countryName,
                  isPoint: false,
                  isDelineated: true,
                });

                if (data.ftw_geojson && data.ftw_geojson.features?.length) {
                  addLayer({
                    id: `ftw-field-mesh-${i}`,
                    label: `FTW Cadastral Mesh (#${i + 1})`,
                    type: "geojson",
                    geojsonData: data.ftw_geojson,
                    visible: true,
                    opacity: 0.9,
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
              }
            }
          } catch (e) {
            console.warn(`FTW delineation error for plot ${i}:`, e);
          }
        }
        updatedPlots.push(plot);
      }

      // Immediately render all delineated farm polygons onto the satellite map
      const fc = {
        type: "FeatureCollection",
        features: updatedPlots.map((p, idx) => ({
          type: "Feature",
          id: p.id || `plot_${idx + 1}`,
          geometry: p.geometry,
          properties: {
            id: p.id,
            name: p.name,
            commodity: p.commodity,
            status: p.status,
            isPoint: false,
            isDelineated: true,
            area_ha: p.areaHa,
          },
        })),
      };
      setActiveGeoJSON(fc);
      const bbox = extractBboxFromGeometry(fc);
      if (bbox) {
        (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
      }
    } finally {
      setDelineatingAll(false);
    }
  }, [updateBatchPlot, setActiveGeoJSON, addLayer]);

  const auditSinglePlot = useCallback(
    async (index: number): Promise<boolean> => {
      const plot = batchPlots[index];
      if (!plot) return false;

      updateBatchPlot(index, { status: "auditing", errorMessage: undefined });
      setActiveBatchPlotIndex(index);
      setActiveGeoJSON(plot.geometry);

      const bbox = extractBboxFromGeometry(plot.geometry);
      if (bbox) {
        (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
      }

      const t0 = performance.now();
      const locationName = plot.countryName
        ? `${plot.countryName} (${plot.countryCode})`
        : plot.countryCode
        ? `Jurisdiction: ${plot.countryCode}`
        : "Selected Coordinates";

      const promptText = `[Batch Item #${index + 1}] Assess EUDR compliance for ${plot.name} (${plot.commodity.toUpperCase()}, ${plot.areaHa ? `${plot.areaHa.toFixed(1)} ha` : "AOI"}) in ${locationName}`;
      const botMsgId = `batch-eudr-${Date.now()}-${index}`;

      setRightPanel("chat");
      addMessage({ id: `user-batch-${Date.now()}-${index}`, role: "user", content: promptText });
      appendHistory({ role: "user", content: promptText });

      let currentLogs: AgentLogEntry[] = [
        {
          id: "ingest",
          label: "Plot Geometry & RFC 7946 Topology",
          detail: `Ingesting ${plot.name} (${plot.isPoint ? "GPS Point <4ha" : "Vector Polygon"})...`,
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
          detail: "Queued: Official 10m Dec 2020 baseline",
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
          detail: "Queued: IUCN I-VI & sovereign cadastre",
          status: "pending",
        },
        {
          id: "consensus",
          label: "6-Subagent Consensus & TRACES NT DDS",
          detail: "Queued: Multi-agent arbitration",
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

      let effectiveGeometry = plot.geometry;
      let effectiveAreaHa = plot.areaHa;
      let effectiveCountryCode = plot.countryCode;
      let effectiveCountryName = plot.countryName;

      // EUDR Art. 9(1)(d): Auto-delineate smallholder Point into true 10m Sentinel-2 field polygon via FTW
      if (plot.isPoint && plot.pointCoords) {
        const [lng, lat] = plot.pointCoords;
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
            body: JSON.stringify({ lat, lng, target_area_ha: plot.areaHa || 4.0 }),
          });
          if (ftwRes.ok) {
            const ftwData = await ftwRes.json();
            if (ftwData.geometry) {
              effectiveGeometry = ftwData.geometry;
              effectiveAreaHa = ftwData.area_ha || effectiveAreaHa;
              effectiveCountryCode = ftwData.country_code || effectiveCountryCode;
              effectiveCountryName = ftwData.country_name || effectiveCountryName;

              updateBatchPlot(index, {
                geometry: effectiveGeometry,
                areaHa: effectiveAreaHa,
                countryCode: effectiveCountryCode,
                countryName: effectiveCountryName,
                isPoint: false,
                isDelineated: true,
              });

              setActiveGeoJSON(effectiveGeometry);
              const bbox = extractBboxFromGeometry(effectiveGeometry);
              if (bbox) {
                (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);
              }

              currentLogs[0] = {
                id: "ingest",
                label: "Plot Geometry & RFC 7946 Topology",
                detail: `Delineated 10m agricultural field (${(effectiveAreaHa ?? 2.0).toFixed(1)} ha, ${ftwData.vertex_count} vertices, ${Math.round(ftwData.confidence * 100)}% conf)`,
                status: "done",
              };
              updateMessage(botMsgId, { agentLogs: [...currentLogs] });
            }
          }
        } catch (ftwErr) {
          console.warn("Batch FTW delineation fallback:", ftwErr);
        }
      }

      try {
        const res = await fetch(`${API_BASE}/eudr/plots/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commodity: plot.commodity,
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
        let finalResult: EUDRAnalysisResponse | null = null;

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
                    if (i < idx && l.status !== "done") return { ...l, status: "done" as const };
                    if (i === idx) {
                      return {
                        ...l,
                        detail: String(event.detail || l.detail),
                        status: incomingStatus,
                      };
                    }
                    return l;
                  });
                  updateMessage(botMsgId, { agentLogs: [...currentLogs] });
                }
              }

              if (event.step === "done" && event.data) {
                finalResult = event.data as EUDRAnalysisResponse;
              }
            } catch {
              // ignore parse errors
            }
          }
        }

        if (finalResult) {
          const duration = Math.round(performance.now() - t0);
          const ra = finalResult.risk_assessment;
          const isCompliant =
            ra?.overall_risk === "compliant" ||
            ra?.overall_risk === "low_risk" ||
            (!ra?.deforestation?.has_deforestation &&
              !ra?.legality?.overlaps_protected_area);

          const status = isCompliant ? "compliant" : "non_compliant";
          const lossHa = ra?.deforestation?.forest_loss_ha || 0;

          updateBatchPlot(index, {
            status,
            riskScore: ra?.risk_score,
            deforestationHa: lossHa,
            lossYears: ra?.deforestation?.loss_years,
            auditResult: finalResult,
            auditDurationMs: duration,
            geometry: effectiveGeometry,
            areaHa: effectiveAreaHa,
            isPoint: false,
            isDelineated: true,
          });

          addDDSHistory(finalResult);
          setActiveAnalyticsResult(finalResult);
          onAuditFinished?.(plot, finalResult);

          currentLogs = currentLogs.map((l) => ({ ...l, status: "done" as const }));
          updateMessage(botMsgId, {
            agentLogs: [...currentLogs],
            content: finalResult.explanation,
            isLoading: false,
            eudrResult: finalResult,
          });
          appendHistory({ role: "assistant", content: finalResult.explanation });

          if (finalResult.map_layers && finalResult.map_layers.length > 0) {
            const hasPwri = finalResult.map_layers.some(
              (l) => l.id.includes("pwri") || l.id.includes("intersection") || (l as any).layer_type === "intersection"
            );
            finalResult.map_layers.forEach((lyr) => {
              const gj = (lyr as { geojson_data?: object | null }).geojson_data ?? undefined;
              const isPwri = lyr.id.includes("pwri") || lyr.id.includes("intersection") || (lyr as any).layer_type === "intersection";
              addLayer({
                id: lyr.id,
                label: lyr.label,
                type: gj ? "geojson" : "raster",
                tileUrl: lyr.tile_url || undefined,
                geojsonData: gj ?? undefined,
                visible: hasPwri ? isPwri : false,
                opacity: 0.9,
                legend: lyr.legend as unknown as import("@oxeous/shared-types").AnalysisResponse["legend"],
                analysisType: isPwri ? "deforestation" : "land_disturbance",
              });
            });
          }

          return true;
        } else {
          throw new Error("No final assessment returned by engine");
        }
      } catch (err: any) {
        updateBatchPlot(index, {
          status: "error",
          errorMessage: err.message || "Audit failed",
        });
        updateMessage(botMsgId, {
          content: `Assessment failed: ${err.message}`,
          isLoading: false,
          error: err.message,
        });
        return false;
      }
    },
    [
      batchPlots,
      updateBatchPlot,
      setActiveBatchPlotIndex,
      setActiveGeoJSON,
      setRightPanel,
      addMessage,
      updateMessage,
      addDDSHistory,
      onAuditFinished,
      addLayer,
    ]
  );

  const handleRunBatchAudit = useCallback(async () => {
    setBatchAuditing(true);
    for (let i = 0; i < batchPlots.length; i++) {
      if (batchPlots[i].status === "compliant" || batchPlots[i].status === "non_compliant") {
        continue;
      }
      await auditSinglePlot(i);
    }
    setBatchAuditing(false);
  }, [batchPlots, auditSinglePlot, setBatchAuditing]);

  const handleExportPortfolio = useCallback(() => {
    const portfolio = {
      title: "Oxeous EUDR Batch Farm Portfolio Due Diligence Report",
      regulation: "EU Regulation 2023/1115 (EUDR)",
      timestamp: new Date().toISOString(),
      summary: {
        total_plots: totalPlots,
        total_area_ha: Math.round(totalHa * 10) / 10,
        compliant_plots: compliantCount,
        non_compliant_plots: nonCompliantCount,
        pending_plots: pendingCount,
        compliance_rate_pct: totalPlots > 0 ? Math.round((compliantCount / totalPlots) * 100) : 0,
      },
      plots: batchPlots.map((p, idx) => ({
        index: idx + 1,
        id: p.id,
        name: p.name,
        commodity: p.commodity,
        country_code: p.countryCode,
        country_name: p.countryName,
        geometry_type: p.isPoint ? "Point (Art. 9(1)(d))" : "Polygon",
        area_ha: p.areaHa || (p.isPoint ? 1.8 : 10.0),
        status: p.status,
        risk_score: p.riskScore,
        forest_loss_ha: p.deforestationHa,
        dds_id: p.auditResult?.dds?.dds_id,
        verification_hash: p.auditResult?.dds?.sha256_hash,
      })),
    };

    const blob = new Blob([JSON.stringify(portfolio, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EUDR_Portfolio_Batch_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [batchPlots, totalPlots, totalHa, compliantCount, nonCompliantCount, pendingCount]);

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans">
      {/* Top Header / Metrics Bar - Oxeous Light Steel */}
      <div className="p-3.5 border-b border-[#C8CFD5] bg-white">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[rgba(49,95,80,0.1)] text-[#315F50] border border-[rgba(49,95,80,0.25)] shrink-0">
              <Layers className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-[#1D2227] truncate">
                Multi-Plot Batch Queue
              </h3>
              <p className="text-[10px] text-[#747F88] font-mono truncate">
                {totalPlots} Parcels · {totalHa.toFixed(1)} ha Sourcing Portfolio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={showAllOnMap}
              title="Fit and frame all plots on the satellite map"
              className="px-2 py-1 text-[11px] font-medium text-[#343B42] hover:text-[#1D2227] bg-white hover:bg-[#F8F9FA] border border-[#C8CFD5] rounded-md transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <Maximize2 className="w-3 h-3 text-[#315F50]" />
              <span>Fit All</span>
            </button>
            <button
              onClick={clearBatchPlots}
              title="Clear batch"
              className="p-1 text-[#747F88] hover:text-[#A64B45] hover:bg-[rgba(166,75,69,0.08)] rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Portfolio Metric Pills */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          <div className="p-1.5 rounded-md bg-[#F8F9FA] border border-[#C8CFD5] text-center shadow-2xs">
            <span className="block text-[9.5px] text-[#747F88] font-mono uppercase tracking-wider">Total</span>
            <span className="text-xs font-bold text-[#1D2227] font-mono">{totalPlots}</span>
          </div>
          <div className="p-1.5 rounded-md bg-[rgba(49,95,80,0.06)] border border-[rgba(49,95,80,0.25)] text-center shadow-2xs">
            <span className="block text-[9.5px] text-[#315F50] font-mono uppercase tracking-wider font-semibold">Compliant</span>
            <span className="text-xs font-bold text-[#315F50] font-mono">{compliantCount}</span>
          </div>
          <div className="p-1.5 rounded-md bg-[rgba(166,75,69,0.06)] border border-[rgba(166,75,69,0.25)] text-center shadow-2xs">
            <span className="block text-[9.5px] text-[#A64B45] font-mono uppercase tracking-wider font-semibold">Risk/Loss</span>
            <span className="text-xs font-bold text-[#A64B45] font-mono">{nonCompliantCount}</span>
          </div>
          <div className="p-1.5 rounded-md bg-[rgba(197,138,58,0.06)] border border-[rgba(197,138,58,0.25)] text-center shadow-2xs">
            <span className="block text-[9.5px] text-[#C58A3A] font-mono uppercase tracking-wider font-semibold">Pending</span>
            <span className="text-xs font-bold text-[#C58A3A] font-mono">{pendingCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRunBatchAudit}
            disabled={batchAuditing || pendingCount === 0}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer",
              batchAuditing
                ? "bg-[rgba(197,138,58,0.12)] text-[#C58A3A] border border-[rgba(197,138,58,0.3)] cursor-wait"
                : pendingCount === 0
                ? "bg-[#E3E7EA] text-[#747F88] border border-[#C8CFD5] cursor-not-allowed"
                : "bg-[#315F50] hover:bg-[#274d40] text-white"
            )}
          >
            {batchAuditing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C58A3A]" />
                <span>Auditing Batch...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Audit All ({pendingCount})</span>
              </>
            )}
          </button>

          {pointPlotsCount > 0 && (
            <button
              onClick={handleDelineateAllPoints}
              disabled={delineatingAll || batchAuditing}
              title="Auto-trace physical 10m Sentinel-2 field boundaries for all points using the FTW neural model"
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[rgba(49,95,80,0.1)] hover:bg-[rgba(49,95,80,0.18)] text-[#315F50] border border-[rgba(49,95,80,0.3)] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {delineatingAll ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-[#315F50]" />
                  <span>Delineating ({pointPlotsCount})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-[#315F50]" />
                  <span>Delineate All Points (FTW {pointPlotsCount})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleExportPortfolio}
            title="Download complete batch portfolio due diligence JSON"
            className="p-1.5 rounded-lg text-[#343B42] hover:text-[#1D2227] bg-white hover:bg-[#F8F9FA] border border-[#C8CFD5] transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#315F50]" />
          </button>
        </div>

        {/* Smallholder Point Callout if Points Present */}
        {pointPlotsCount > 0 && (
          <div className="mt-2.5 p-2 rounded-lg bg-[rgba(49,95,80,0.04)] border border-[rgba(49,95,80,0.2)] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#315F50] shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-[#343B42] leading-relaxed">
              <strong className="text-[#315F50] font-semibold">EUDR Art. 9(1)(d) Smallholders:</strong>{" "}
              {pointPlotsCount} plots are single GPS points (&lt;4 ha). They will automatically be converted to true 10m Sentinel-2 field boundary polygons via the FTW neural model during auditing, or click <em>Delineate All Points</em> above.
            </p>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-[#C8CFD5] bg-[#E9ECEE] px-3 pt-1 text-[11px] gap-1">
        {(["all", "pending", "compliant", "non_compliant"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-2.5 py-1.5 rounded-t-md font-medium capitalize transition-colors cursor-pointer text-[10.5px]",
              filter === tab
                ? "bg-white text-[#315F50] font-semibold border-t border-x border-[#C8CFD5] shadow-2xs"
                : "text-[#747F88] hover:text-[#1D2227]"
            )}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Plots Queue List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {displayPlots.length === 0 ? (
          <div className="p-6 text-center text-[#747F88] text-xs">
            No plots match the &apos;{filter}&apos; filter.
          </div>
        ) : (
          displayPlots.map((plot) => {
            const actualIndex = batchPlots.indexOf(plot);
            const isSelected = activeBatchPlotIndex === actualIndex;

            return (
              <div
                key={plot.id || actualIndex}
                className={cn(
                  "p-2.5 rounded-lg border transition-all text-xs bg-white shadow-2xs",
                  isSelected
                    ? "border-[#315F50] bg-[rgba(49,95,80,0.03)] ring-1 ring-[#315F50]/20"
                    : "border-[#C8CFD5] hover:border-[#8E99A4]"
                )}
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div
                    onClick={() => handleSelectPlot(actualIndex)}
                    className="flex items-center gap-1.5 min-w-0 cursor-pointer group"
                  >
                    <span className="text-[10px] font-mono text-[#747F88] w-4">
                      #{actualIndex + 1}
                    </span>
                    <span className="font-semibold text-[#1D2227] truncate group-hover:text-[#315F50] transition-colors">
                      {plot.name}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {plot.status === "auditing" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[rgba(197,138,58,0.08)] text-[#C58A3A] border border-[rgba(197,138,58,0.25)]">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>Auditing...</span>
                      </span>
                    )}
                    {plot.status === "compliant" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[rgba(49,95,80,0.08)] text-[#315F50] border border-[rgba(49,95,80,0.25)]">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#315F50]" />
                        <span>Compliant</span>
                      </span>
                    )}
                    {plot.status === "non_compliant" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[rgba(166,75,69,0.08)] text-[#A64B45] border border-[rgba(166,75,69,0.25)]">
                        <AlertTriangle className="w-2.5 h-2.5 text-[#A64B45]" />
                        <span>Deforested ({plot.deforestationHa?.toFixed(1)} ha)</span>
                      </span>
                    )}
                    {plot.status === "pending" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[#747F88] bg-[#F8F9FA] border border-[#C8CFD5]">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Pending</span>
                      </span>
                    )}
                    {plot.status === "error" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[#A64B45] bg-[rgba(166,75,69,0.08)] border border-[rgba(166,75,69,0.25)]">
                        <span>Error</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Plot Meta Details */}
                <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-[#747F88] mb-2 font-mono">
                  <span className="uppercase px-1.5 py-0.5 bg-[#F4F5F6] border border-[#C8CFD5] rounded text-[#343B42] font-semibold">
                    {plot.commodity}
                  </span>

                  {plot.countryCode && (
                    <span className="text-[#343B42]">
                      {plot.countryCode} {plot.countryName ? `· ${plot.countryName}` : ""}
                    </span>
                  )}

                  <span>
                    {plot.areaHa ? `${plot.areaHa.toFixed(1)} ha` : plot.isPoint ? "~1.8 ha (Smallholder)" : "Area Auto"}
                  </span>

                  {plot.isPoint ? (
                    <span className="inline-flex items-center gap-0.5 text-[#C58A3A] font-semibold">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>GPS Point &lt;4ha</span>
                    </span>
                  ) : plot.isDelineated ? (
                    <span className="inline-flex items-center gap-0.5 text-[#315F50] font-semibold">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>10m FTW Field Polygon</span>
                    </span>
                  ) : (
                    <span>Polygon</span>
                  )}
                </div>

                {/* Point Transformation Options (Only shown if Plot is Point) */}
                {plot.isPoint && (
                  <div className="p-2 rounded-md bg-[rgba(49,95,80,0.06)] border border-[rgba(49,95,80,0.25)] mb-2 flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono text-[#315F50] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#315F50]" />
                      <span>EUDR Field Boundary:</span>
                    </span>
                    <button
                      onClick={() => handleFtwDelineatePoint(actualIndex)}
                      disabled={delineatingIdx === actualIndex}
                      className="px-2.5 py-1 text-[10px] font-semibold rounded bg-[#315F50] hover:bg-[#274d40] text-white transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      {delineatingIdx === actualIndex ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Delineating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Auto-Delineate (10m FTW)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between pt-1 border-t border-[#E3E7EA]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectPlot(actualIndex)}
                      className="text-[11px] font-medium text-[#747F88] hover:text-[#1D2227] transition-colors cursor-pointer"
                    >
                      Locate on Map
                    </button>
                    {plot.auditResult && (
                      <span className="text-[10px] text-[#747F88] font-mono">
                        Score: <strong className="text-[#1D2227]">{plot.riskScore ?? 0}</strong>/100
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => auditSinglePlot(actualIndex)}
                      disabled={plot.status === "auditing"}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#315F50] hover:bg-[#274d40] text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{plot.status === "pending" ? "Audit" : "Re-Audit"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
