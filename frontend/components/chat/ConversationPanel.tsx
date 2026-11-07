"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Send, Bot, User, Loader2, AlertCircle, X, FileJson2, ChevronRight, ArrowRight, FileText, Coffee, Trees, CircleDot, Palmtree, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import OxeousOrbitIcon from "@/components/ui/OxeousOrbitIcon";
import { api } from "@/lib/api";
import { useStore, type AgentLogEntry, type ActiveLayer } from "@/lib/store";
import type { AnalysisResponse, EUDRAnalysisResponse, EUDRCommodity } from "@oxeous/shared-types";
import { BENCHMARK_CASES, type BenchmarkCase } from "@/components/ui/TopFloatingBar";
import { extractBboxFromGeometry } from "@/lib/maplibre";
import AnalysisResultCard from "./AnalysisResultCard";
import FollowUpChips from "./FollowUpChips";
import FormattedMarkdown from "./FormattedMarkdown";
import AgentTelemetryStepper from "./AgentTelemetryStepper";
import {
  StatutoryCitationsDrawer,
  EurLexLiveSearchExplorer,
  type EurLexCitationItem,
} from "./StatutorySearchTelemetry";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const COMMODITY_ICON: Record<string, typeof Coffee> = {
  coffee: Coffee,
  cocoa: Trees,
  rubber: CircleDot,
  palm_oil: Palmtree,
  soya: Leaf,
};


export default function ConversationPanel({ onClose }: { onClose?: () => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [panelTab, setPanelTab] = useState<"agent" | "law">("agent");
  const [expandedMsgIds, setExpandedMsgIds] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const { messages, addMessage, updateMessage, conversationHistory, appendHistory, viewport, addLayer, setActiveGeoJSON, addDDSHistory, isScanning, setIsScanning, setActiveDossier, setEudrPanelOpen, setEudrPanelExpanded } = useStore();
  const isBusy = sending || isScanning || messages.some((m) => m.isLoading);

  const buildAgentLogs = useCallback(
    (prompt: string, response?: AnalysisResponse | null): AgentLogEntry[] => {
      const bboxText = viewport.bbox.map((n) => Number(n).toFixed(3)).join(", ");
      const toolLabel = response?.analysis_type ? String(response.analysis_type).replace(/_/g, " ") : "geospatial analysis";
      const statsKeys = Object.keys(response?.statistics ?? {}).slice(0, 3);
      const statSummary = statsKeys.length
        ? statsKeys.map((key) => key.replace(/_/g, " ")).join(" • ")
        : "satellite evidence";
      const sourceSummary = response?.provenance?.source ? response.provenance.source : "Earth observation datasets";

      return [
        { id: "intent", label: "Intent parsing", detail: `Prompt interpreted for: “${prompt.trim().slice(0, 90)}${prompt.trim().length > 90 ? "…" : ""}”`, status: "done" },
        { id: "area", label: "AOI selection", detail: `Selected bbox: [${bboxText}]`, status: "done" },
        { id: "dataset", label: "Dataset checks", detail: `Evaluating ${sourceSummary} over the AOI`, status: response ? "done" : "active" },
        { id: "tool", label: "Agent tool call", detail: response ? `Ran ${toolLabel} analysis on the selected region` : "Dispatching geospatial analysis tool", status: response ? "done" : "active" },
        { id: "result", label: "Evidence stage", detail: response ? `Validated ${statSummary}` : "Collecting forest / land data", status: response ? "done" : "active" },
        { id: "explain", label: "Explanation", detail: response ? "Generated final natural-language summary with dataset-backed reasoning" : "Summarizing validated findings", status: response ? "done" : "pending" },
      ];
    },
    [viewport.bbox]
  );

  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return;
    ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = useCallback(async (prompt: string) => {
    if (!prompt.trim() || sending) return;
    const msgId = `${uid}-${Date.now()}`;
    addMessage({ id: `${msgId}-user`, role: "user", content: prompt });
    appendHistory({ role: "user", content: prompt });
    const botId = `${msgId}-bot`;
    const isSpatialCmd = /(calculate|compute|render|generate|display|show)\s+(ndvi|ndwi|moisture|water|true\s+color|rgb|prithvi)/i.test(prompt) ||
                         /run\s+(ndvi|ndwi|land\s+disturbance|prithvi|water)/i.test(prompt);

    addMessage({
      id: botId,
      role: "assistant",
      content: "",
      isLoading: true,
      agentLogs: [
        {
          id: "intent",
          label: isSpatialCmd ? "Query & Intent Parsing" : "EUR-Lex Primary Search Index",
          detail: isSpatialCmd
            ? `Interpreting geospatial query: "${prompt.trim().slice(0, 50)}..."`
            : `Searching 114 verbatim Official Journal provisions (CELEX:32023R1115, 2025/1093, C/2025/4524)...`,
          status: "active",
        },
      ],
    });
    setSending(true);

    const stageTimer = setTimeout(() => {
      updateMessage(botId, {
        agentLogs: isSpatialCmd
          ? [
              {
                id: "intent",
                label: "Query & Intent Parsing",
                detail: `Parsed target AOI: [${viewport.bbox.map((n) => Number(n).toFixed(2)).join(", ")}]`,
                status: "done",
              },
              {
                id: "tool",
                label: "Earth Observation Query",
                detail: "Dispatching spatial analysis engine across Sentinel & Copernicus datasets...",
                status: "active",
              },
            ]
          : [
              {
                id: "intent",
                label: "EUR-Lex Primary Search Index",
                detail: "Retrieved top SHA-256 verified Official Journal Articles & Annex I CN/HS tariff clauses",
                status: "done",
              },
              {
                id: "synthesis",
                label: "Statutory Compliance Synthesis",
                detail: "Drafting plain-English regulatory analysis strictly from primary EU law...",
                status: "active",
              },
            ],
      });
    }, 380);

    try {
      // If viewport bbox area exceeds 3.8 deg², focus on central 1.0° x 1.0° analysis window
      let effectiveViewport = { ...viewport };
      const [w, s, e, n] = viewport.bbox;
      const area = Math.abs(e - w) * Math.abs(n - s);
      if (area > 3.8) {
        const cLng = (w + e) / 2;
        const cLat = (s + n) / 2;
        effectiveViewport = {
          ...viewport,
          bbox: [cLng - 0.45, cLat - 0.45, cLng + 0.45, cLat + 0.45],
        };
      }

      const res = await api.chat({ prompt, conversation_history: conversationHistory, map_viewport: effectiveViewport });
      if (stageTimer) clearTimeout(stageTimer);
      updateMessage(botId, { content: res.explanation, isLoading: false, analysisResult: res });
      appendHistory({ role: "assistant", content: res.explanation });
      if (res.tile_url) addLayer({ id: res.request_id, label: res.analysis_type.replace(/_/g, " "), type: "raster", tileUrl: res.tile_url, overlayUrl: res.overlay_url, visible: true, opacity: 1.0, legend: res.legend, analysisType: res.analysis_type });
      if (res.granite_intent?.bbox) { const fn = (window as Window & { oxeousFlyTo?: (b: [number,number,number,number]) => void }).oxeousFlyTo; fn?.(res.granite_intent.bbox); }
    } catch (err) {
      if (stageTimer) clearTimeout(stageTimer);
      let errorMessage = err instanceof Error ? err.message : "Request failed";
      try {
        const cleaned = errorMessage.replace(/^\d+:\s*/, "");
        const parsed = JSON.parse(cleaned);
        if (parsed.detail) errorMessage = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
      } catch {
        // ignore JSON parse error
      }
      updateMessage(botId, { content: "", isLoading: false, error: errorMessage });
    } finally {
      setSending(false);
    }
  }, [sending, uid, addMessage, updateMessage, appendHistory, conversationHistory, viewport, addLayer, buildAgentLogs]);

  const handleInspectInEUDR = useCallback((eudrResult: EUDRAnalysisResponse) => {
    setEudrPanelOpen(true);
    setEudrPanelExpanded(true);

    if (eudrResult.plot?.geometry) {
      setActiveGeoJSON(eudrResult.plot.geometry);
      const bbox = extractBboxFromGeometry(eudrResult.plot.geometry);
      if (bbox) {
        const flyFn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
        flyFn?.(bbox);
      }
    }
  }, [setEudrPanelOpen, setEudrPanelExpanded, setActiveGeoJSON]);

  const runBenchmark = useCallback(
    async (c: BenchmarkCase) => {
      if (sending || isBusy) return;

      // 1. Set plot on map & fly to bbox
      setActiveGeoJSON(c.geometry);
      const flyFn = (window as Window & { oxeousFlyTo?: (b: typeof c.bbox) => void }).oxeousFlyTo;
      flyFn?.(c.bbox);

      // 2. Add user message
      const promptText = `Assess EUDR statutory compliance for ${c.label} (${c.country})`;
      const userMsgId = `user-${Date.now()}`;
      const botMsgId = `eudr-bot-${Date.now()}`;

      addMessage({ id: userMsgId, role: "user", content: promptText });
      appendHistory({ role: "user", content: promptText });

      let currentLogs: AgentLogEntry[] = [
        {
          id: "ingest",
          label: "Plot Geometry & RFC 7946 Topology",
          detail: `Verifying vector boundary for ${c.label} (${c.country})...`,
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
      setSending(true);
      setIsScanning(true);

      try {
        const res = await fetch(`${API_BASE}/eudr/plots/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commodity: c.commodity,
            country_code: c.countryCode,
            country_name: c.country,
            geometry: c.geometry,
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
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.replace(/^data:\s*/, "").trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.step === "stage") {
                const rawId = String(event.stage_id || "");
                const stageMapping: Record<string, string> = {
                  geometry: "ingest",
                  baseline: "jrc",
                  typology: "jrc",
                  disturbance: "hansen",
                  commodity: "radd",
                  sar: "radd",
                  protected_areas: "protected",
                  sovereign_legality: "protected",
                  consensus: "consensus",
                };
                const mappedId = stageMapping[rawId] || rawId;
                const idx = currentLogs.findIndex((l) => l.id === mappedId);
                const incomingStatus = (event.status as "done" | "active" | "pending") || "active";

                if (idx >= 0) {
                  currentLogs = currentLogs.map((l, i) => {
                    if (i < idx && l.status !== "done") return { ...l, status: "done" as const };
                    if (i === idx) {
                      const isIntermediate =
                        (mappedId === "jrc" && rawId !== "typology") ||
                        (mappedId === "radd" && rawId !== "commodity");
                      return {
                        ...l,
                        detail: String(event.detail || l.detail),
                        status: isIntermediate && incomingStatus === "done" ? ("active" as const) : incomingStatus,
                      };
                    }
                    return l;
                  });
                }
                updateMessage(botMsgId, { agentLogs: [...currentLogs] });
              }

              if (event.step === "done" && event.data) {
                const data = event.data as EUDRAnalysisResponse;
                addDDSHistory(data);

                currentLogs = currentLogs.map((l) => ({ ...l, status: "done" as const }));
                updateMessage(botMsgId, { agentLogs: [...currentLogs] });

                setTimeout(() => {
                  const summary = (data as unknown as { plain_english_summary?: string }).plain_english_summary || data.explanation;
                  updateMessage(botMsgId, {
                    content: summary,
                    isLoading: false,
                    eudrResult: data,
                  });
                  appendHistory({ role: "assistant", content: summary });
                }, 450);

                if (data.map_layers && data.map_layers.length > 0) {
                  data.map_layers.forEach((lyr) => {
                    const gj = (lyr as { geojson_data?: object | null }).geojson_data ?? undefined;
                    addLayer({
                      id: lyr.id,
                      label: lyr.label,
                      type: gj ? "geojson" : "raster",
                      tileUrl: lyr.tile_url || undefined,
                      geojsonData: gj,
                      visible: lyr.visible,
                      opacity: lyr.opacity,
                      legend: lyr.legend as ActiveLayer["legend"] | undefined,
                      analysisType: (lyr as { layer_type?: string }).layer_type || "land_disturbance",
                      layer_type: (lyr as { layer_type?: string }).layer_type,
                    });
                  });
                }
              }

              if (event.step === "error") {
                throw new Error((event.message as string) || "Assessment failed");
              }
            } catch {
              // Ignore parse errors on chunk boundary
            }
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Assessment failed";
        updateMessage(botMsgId, {
          content: "",
          isLoading: false,
          error: errMsg,
          agentLogs: currentLogs,
        });
      } finally {
        setSending(false);
        setIsScanning(false);
      }
    },
    [sending, isBusy, setActiveGeoJSON, addMessage, appendHistory, updateMessage, addDDSHistory, addLayer, setIsScanning]
  );


  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); setInput(""); }
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#C8CFD5] bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-[#C8CFD5] flex items-center justify-center shadow-2xs">
            <OxeousOrbitIcon size={20} isSpinning={isBusy} className={isBusy ? "text-[#315F50]" : "text-[#1D2227]"} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-[#1D2227] tracking-tight">
                Oxeous Earth Agent
              </h2>
              <span className={cn(
                "flex items-center gap-1.5 text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-colors",
                isBusy
                  ? "bg-[#315F50]/10 text-[#315F50] border-[#315F50]/30"
                  : "bg-[#F4F5F6] text-[#343B42] border-[#C8CFD5]"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isBusy ? "bg-[#315F50] animate-ping" : "bg-[#315F50]"
                )} />
                {isBusy ? "Auditing..." : "Ready"}
              </span>
            </div>

          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mode Switch: Agent Chat vs Live EUR-Lex Search */}
          <div className="flex items-center bg-[#F4F5F6] p-0.5 rounded-lg border border-[#C8CFD5] text-[10px]">
            <button
              type="button"
              onClick={() => setPanelTab("agent")}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer",
                panelTab === "agent"
                  ? "bg-white text-[#1D2227] shadow-2xs font-bold"
                  : "text-[#747F88] hover:text-[#1D2227]"
              )}
            >
              Agent
            </button>
            <button
              type="button"
              onClick={() => setPanelTab("law")}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer",
                panelTab === "law"
                  ? "bg-white text-[#315F50] shadow-2xs font-bold"
                  : "text-[#747F88] hover:text-[#1D2227]"
              )}
            >
              EUR-Lex
            </button>
          </div>

          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {panelTab === "law" ? (
        <EurLexLiveSearchExplorer
          onAskAgent={(q) => {
            setPanelTab("agent");
            submit(q);
          }}
        />
      ) : (
      <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <Welcome
            disabled={sending || isBusy}
            isSpinning={sending || isBusy}
            onSelectBenchmark={runBenchmark}
            onSelectPrompt={(text: string) => submit(text)}
          />
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex gap-2.5 animate-fade-in", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={cn("w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border shadow-2xs",
              msg.role === "user" ? "bg-[rgba(49,95,80,0.12)] border-[rgba(49,95,80,0.25)] text-[#315F50]" : "bg-[#E3E7EA] border-[#C8CFD5] text-[#7A8791]"
            )}>
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={cn("flex-1 min-w-0 w-full", msg.role === "user" ? "max-w-[340px] ml-auto flex flex-col items-end" : "max-w-full")}>
              {msg.role === "user"
                ? <div className="bg-[#24473B] text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-xs font-medium">{msg.content}</div>
                : msg.isLoading
                  ? (
                    <div className="w-full">
                      <AgentTelemetryStepper logs={msg.agentLogs || []} />
                    </div>
                  )
                  : msg.error
                    ? <div className="flex items-start gap-2 bg-[rgba(166,75,69,0.06)] border border-[rgba(166,75,69,0.2)] rounded-xl px-3 py-2"><AlertCircle className="w-3.5 h-3.5 text-[#A64B45] flex-shrink-0 mt-0.5" /><p className="text-[11px] text-[#A64B45]">{msg.error}</p></div>
                    : (
                      <div className="space-y-2.5 w-full">
                        {msg.content && (
                          <div className="rounded-xl border border-[#C8CFD5] bg-white p-3.5 space-y-1.5 shadow-xs">
                            <FormattedMarkdown content={msg.content} />
                          </div>
                        )}

                        {/* 3. Statutory Audit Action Pill: View Dossier + Inspect in EUDR */}
                        {msg.eudrResult && (
                          <div className="flex items-center justify-between px-3 py-2 bg-white border border-[#C8CFD5] rounded-xl text-[11px] shadow-2xs gap-2">
                            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#5B6773] truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#315F50] flex-shrink-0" />
                              <span className="truncate">EU 2023/1115 Audit</span>
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveDossier(msg.eudrResult!.plot.commodity)}
                                className="px-2 py-1 rounded-lg bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.25)] text-[#315F50] hover:bg-[rgba(49,95,80,0.15)] font-semibold text-[10.5px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Open Official EUDR Audit Report & PDF Dossier"
                              >
                                <FileText className="w-3 h-3" />
                                <span>View Dossier</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInspectInEUDR(msg.eudrResult!)}
                                className="px-2 py-1 rounded-lg bg-[#315F50] text-white hover:bg-[#274d40] font-semibold text-[10.5px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Fly to plot on satellite map and expand EUDR Deck"
                              >
                                <span>Inspect in EUDR</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 3b. Verbatim Official Journal EUR-Lex Search Telemetry & Primary Sources Drawer */}
                        {Array.isArray((msg.analysisResult?.granite_intent as { rag_citations?: EurLexCitationItem[] } | undefined)?.rag_citations) && (
                          <StatutoryCitationsDrawer
                            citations={
                              ((msg.analysisResult?.granite_intent as unknown) as {
                                rag_citations: EurLexCitationItem[];
                              }).rag_citations
                            }
                            searchLatencyMs={
                              ((msg.analysisResult?.granite_intent as unknown) as {
                                search_latency_ms?: number;
                              })?.search_latency_ms
                            }
                            ragMode={
                              ((msg.analysisResult?.granite_intent as unknown) as {
                                rag_mode?: string;
                              })?.rag_mode
                            }
                            corpusDocs={
                              ((msg.analysisResult?.granite_intent as unknown) as {
                                corpus_docs?: number;
                              })?.corpus_docs ?? 114
                            }
                          />
                        )}

                        {/* 4. Regular Spatial Analysis Result (only when real raster layer was generated) */}
                        {msg.analysisResult && Boolean(msg.analysisResult.tile_url) && (
                          <div className="rounded-xl border border-[#D8E1E5] bg-white p-2.5">
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5B6773]">
                              <FileJson2 className="h-3 w-3 text-[#315F50]" />
                              Evidence snapshot
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {summarizeEvidence(msg.analysisResult).map((fact) => (
                                <div key={fact.label} className="rounded-lg bg-[#F5F7F8] px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-wider text-[#AAB3BB]">{fact.label}</div>
                                  <div className="mt-0.5 text-[11px] font-semibold text-[#1D2227] break-words">{fact.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {msg.analysisResult && Boolean(msg.analysisResult.tile_url) && <AnalysisResultCard result={msg.analysisResult} />}
                        {(msg.analysisResult?.follow_up_suggestions?.length ?? 0) > 0 && (
                          <FollowUpChips suggestions={msg.analysisResult!.follow_up_suggestions} onSelect={s => submit(s)} />
                        )}
                      </div>
                    )
              }
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <footer className="flex-shrink-0 border-t border-[#C8CFD5] p-3 bg-[#F4F5F6]">
        <div className="flex items-end gap-2 bg-white border border-[#C8CFD5] rounded-xl focus-within:border-[#7A8791] transition-all px-2.5 py-2">
          <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about EUDR compliance, Article 3(a) cutoff, carve-outs, or audit a plot…"
            rows={1} className="flex-1 bg-transparent text-[12px] text-[#1D2227] placeholder:text-[#AAB3BB] resize-none outline-none leading-relaxed"
          />
          <button onClick={() => { if (input.trim()) { submit(input); setInput(""); } }} disabled={!input.trim() || sending}
            className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
              input.trim() && !sending ? "bg-[#315F50] text-white hover:bg-[#274d40]" : "bg-[#E3E7EA] text-[#AAB3BB] cursor-not-allowed"
            )}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>

      </footer>
      </>
      )}
    </div>
  );
}

function summarizeEvidence(result: AnalysisResponse) {
  const facts: Array<{ label: string; value: string }> = [];

  if (result.granite_intent?.location) {
    facts.push({ label: "AOI", value: result.granite_intent.location });
  }

  if (result.provenance?.source) {
    facts.push({ label: "Source", value: result.provenance.source });
  }

  const statsEntries = Object.entries(result.statistics ?? {}).slice(0, 4);
  for (const [key, value] of statsEntries) {
    const formatted = typeof value === "number" ? Number(value).toFixed(3) : String(value);
    facts.push({ label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), value: formatted });
  }

  if (result.provenance?.acquisition_dates?.length) {
    facts.push({
      label: "Dates",
      value: `${result.provenance.acquisition_dates[0]} → ${result.provenance.acquisition_dates.at(-1)}`,
    });
  }

  return facts.slice(0, 6);
}

function Welcome({
  disabled,
  onSelectBenchmark,
  onSelectPrompt,
  isSpinning,
}: {
  disabled?: boolean;
  onSelectBenchmark: (c: BenchmarkCase) => void;
  onSelectPrompt?: (prompt: string) => void;
  isSpinning?: boolean;
}) {
  return (
    <div className="py-2 space-y-4 animate-fade-in">
      {/* Agent Identity / Mission */}
      <div className="flex flex-col items-center justify-center text-center space-y-1.5 pt-1">
        <div className="w-11 h-11 rounded-2xl bg-white border border-[#C8CFD5] flex items-center justify-center shadow-xs">
          <OxeousOrbitIcon size={24} isSpinning={isSpinning} className={isSpinning ? "text-[#315F50]" : "text-[#1D2227]"} />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-[#1D2227] tracking-tight">EUDR Compliance & Spatial AI</h3>
          <p className="text-[11px] text-[#747F88] mt-0.5 max-w-[310px] mx-auto leading-relaxed">
            Select a sample plot to audit live, or ask any EU 2023/1115 question below.
          </p>
        </div>
      </div>

      {/* Compact Benchmark Test Chips */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9.5px] text-[#747F88] uppercase tracking-wider font-mono font-bold">
            Quick-Audit Sample Plots
          </span>
          <span className="text-[9px] text-[#AAB3BB] font-mono">
            1-Click Live Run
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {BENCHMARK_CASES.map((c) => {
            const Icon = COMMODITY_ICON[c.commodityKey] ?? Trees;
            const isCompliant = c.verdict.startsWith("COMPLIANT");
            return (
              <button
                key={c.id}
                disabled={disabled}
                onClick={() => onSelectBenchmark(c)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl bg-white border border-[#C8CFD5] hover:border-[#315F50] transition-all text-left shadow-2xs hover:shadow-xs group cursor-pointer active:scale-[0.98]",
                  disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[#315F50]/5"
                )}
                title={"Run full 6-agent EUDR assessment on " + c.label}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border transition-colors",
                    isCompliant
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 group-hover:bg-emerald-100"
                      : "bg-red-50 border-red-200 text-red-700 group-hover:bg-red-100"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-[#1D2227] group-hover:text-[#315F50] transition-colors truncate">
                      {c.country}
                    </span>
                    <span
                      className={cn(
                        "text-[8.5px] font-mono font-bold px-1 rounded border",
                        isCompliant
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      )}
                    >
                      {c.score}/100
                    </span>
                  </div>
                  <p className="text-[9.5px] text-[#747F88] font-mono truncate capitalize">
                    {c.commodity.replace(/_/g, " ")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggested Starter Prompts */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9.5px] text-[#747F88] uppercase tracking-wider font-mono font-bold">
            High-Impact Strategic Inquiries
          </span>
          <span className="text-[9px] text-[#AAB3BB] font-mono">
            1-Click Ask
          </span>
        </div>
        <div className="space-y-1">
          {[
            {
              label: "How does Oxeous compare to legacy 30m satellite tools?",
              prompt: "How does Oxeous compare to legacy 30m satellite tools in the market?",
            },
            {
              label: "How does the May 2026 plot carve-out work for my farm?",
              prompt: "How does the May 2026 plot carve-out segregation protocol work for a farm with partial deforestation?",
            },
            {
              label: "Which rubber and tyre HS codes are regulated under Annex I?",
              prompt: "Which rubber and tyre HS codes (like 4001 and 4011) are regulated under EUDR Annex I, and what is the rule for synthetic rubber?",
            },
            {
              label: "Why is cyclical crop replanting exempt under Article 2(5)?",
              prompt: "Why is cyclical crop replanting exempt under EUDR Article 2(5), and how does Oxeous prevent false alarms?",
            },
          ].map((item) => (
            <button
              key={item.label}
              disabled={disabled}
              onClick={() => onSelectPrompt?.(item.prompt)}
              className="w-full text-left p-2 rounded-xl bg-white border border-[#C8CFD5] hover:border-[#315F50] hover:bg-[#315F50]/5 text-[11px] text-[#343B42] hover:text-[#1D2227] transition-all flex items-center justify-between group shadow-2xs cursor-pointer active:scale-[0.99]"
            >
              <span className="truncate flex-1">{item.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#7A8791] group-hover:text-[#315F50] group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
