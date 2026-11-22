"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import {
  SendHorizontal,
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  X,
  FileJson2,
  ChevronRight,
  ArrowRight,
  FileText,
  Coffee,
  Trees,
  CircleDot,
  Palmtree,
  Leaf,
  Play,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from "lucide-react";
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

const PROMPTS_TO_TYPE = [
  "How does the 2020 deforestation cutoff apply?",
  "Can single GPS points be accepted under Art. 9?",
  "How to segregate clean hectares with plot carve-out?",
  "Why is cyclical crop replanting exempt under Art. 2?",
  "How does 10m PWRI consensus beat legacy 30m alerts?",
];

function useTypewriter(prompts: string[], typingSpeed = 38, pauseTime = 2200, deletingSpeed = 18) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      const timeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
      return () => clearTimeout(timeout);
    }

    if (isDeleting) {
      if (subIndex === 0) {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % prompts.length);
        return;
      }
      const timeout = setTimeout(() => {
        setSubIndex((prev) => prev - 1);
      }, deletingSpeed);
      return () => clearTimeout(timeout);
    }

    // Typing
    if (subIndex === prompts[index].length) {
      setIsPaused(true);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + 1);
    }, typingSpeed);
    return () => clearTimeout(timeout);
  }, [subIndex, index, isDeleting, isPaused, prompts, typingSpeed, pauseTime, deletingSpeed]);

  return {
    typedText: prompts[index].substring(0, subIndex),
    fullPrompt: prompts[index],
  };
}

const AGENT_BUSY_KEYWORDS = [
  "Orbiting",
  "Scanning",
  "Verifying",
  "Grounding",
];

export default function ConversationPanel({ onClose }: { onClose?: () => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [busyKeywordIdx, setBusyKeywordIdx] = useState(0);
  const { typedText, fullPrompt } = useTypewriter(PROMPTS_TO_TYPE);
  const [panelTab, setPanelTab] = useState<"agent" | "law">("agent");
  const [expandedMsgIds, setExpandedMsgIds] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const {
    messages,
    addMessage,
    updateMessage,
    conversationHistory,
    appendHistory,
    viewport,
    addLayer,
    addAuditLayers,
    setActiveGeoJSON,
    setActiveEudrResult,
    addDDSHistory,
    reopenAudit,
    clearMessages,
    isScanning,
    setIsScanning,
    setActiveDossier,
    setEudrPanelExpanded,
    chatPanelExpanded,
    setChatPanelExpanded,
    setCustomRightPanelWidth,
    ddsHistory,
    activeEudrResult,
    activeAnalyticsResult,
    batchPlots,
    activeBatchPlotIndex,
  } = useStore();
  const isBusy = sending || isScanning || messages.some((m) => m.isLoading);

  // Active assessment currently in scope (active EUDR result, selected batch plot, recent DDS, or active analytics)
  const activeAssessment =
    activeEudrResult ||
    activeAnalyticsResult ||
    (activeBatchPlotIndex !== null && activeBatchPlotIndex >= 0 ? batchPlots[activeBatchPlotIndex]?.auditResult : null) ||
    ddsHistory[0] ||
    messages.slice().reverse().find((m) => m.eudrResult)?.eudrResult ||
    null;

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
    if (!isBusy) {
      setBusyKeywordIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setBusyKeywordIdx((prev) => (prev + 1) % AGENT_BUSY_KEYWORDS.length);
    }, 1300);
    return () => clearInterval(timer);
  }, [isBusy]);

  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return;
    ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  // Only auto-scroll when a new message bubble is added (not on every SSE log tick, preventing up/down bounce)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

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

      const storeState = useStore.getState();
      const effectiveHistory =
        storeState.conversationHistory && storeState.conversationHistory.length > 0
          ? storeState.conversationHistory
          : conversationHistory;

      const effectiveAssessment =
        storeState.activeAnalyticsResult ||
        (storeState.activeBatchPlotIndex !== null && storeState.activeBatchPlotIndex >= 0
          ? storeState.batchPlots[storeState.activeBatchPlotIndex]?.auditResult
          : null) ||
        storeState.ddsHistory[0] ||
        storeState.messages.slice().reverse().find((m) => m.eudrResult)?.eudrResult ||
        activeAssessment ||
        null;

      const res = await api.chat({
        prompt,
        conversation_history: effectiveHistory,
        map_viewport: effectiveViewport,
        active_assessment: effectiveAssessment as Record<string, unknown> | null,
      });
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
  }, [sending, uid, addMessage, updateMessage, appendHistory, conversationHistory, viewport, addLayer, buildAgentLogs, activeAssessment]);

  const handleInspectInEUDR = useCallback((eudrResult: EUDRAnalysisResponse) => {
    reopenAudit(eudrResult);
    setEudrPanelExpanded(true);

    if (eudrResult.plot?.geometry) {
      const bbox = extractBboxFromGeometry(eudrResult.plot.geometry);
      if (bbox) {
        const flyFn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
        flyFn?.(bbox);
      }
    }
  }, [reopenAudit, setEudrPanelExpanded]);

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
                setActiveEudrResult(data);
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

                addAuditLayers(data, c.label);
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
    [sending, isBusy, setActiveGeoJSON, setActiveEudrResult, addMessage, appendHistory, updateMessage, addDDSHistory, addAuditLayers, setIsScanning]
  );


  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Tab" && !input.trim() && fullPrompt) {
      e.preventDefault();
      setInput(fullPrompt);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !sending && !isBusy) {
        submit(input);
        setInput("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header (fixed single-line layout — never wraps or contracts while streaming) */}
      <header className="flex items-center justify-between gap-2 px-3.5 h-[52px] border-b border-[#C8CFD5] bg-white flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-white border border-[#C8CFD5] flex items-center justify-center shadow-2xs flex-shrink-0">
            <OxeousOrbitIcon size={18} isSpinning={isBusy} className={isBusy ? "text-[#315F50]" : "text-[#1D2227]"} />
          </div>
          <h2 className="text-[12.5px] font-bold text-[#1D2227] tracking-tight whitespace-nowrap truncate">
            Oxeous Earth Agent
          </h2>
          <span className={cn(
            "flex items-center gap-1.5 text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-colors duration-200 w-[78px] justify-center flex-shrink-0 whitespace-nowrap",
            isBusy
              ? "bg-[#315F50]/10 text-[#315F50] border-[#315F50]/30"
              : "bg-[#F4F5F6] text-[#343B42] border-[#C8CFD5]"
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#315F50] flex-shrink-0" />
            <span className="truncate">
              {isBusy ? AGENT_BUSY_KEYWORDS[busyKeywordIdx] : "Ready"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Mode Switch: Agent Chat vs Live EUR-Lex Search */}
          <div className="flex items-center bg-[#F4F5F6] p-0.5 rounded-lg border border-[#C8CFD5] text-[10px] flex-shrink-0">
            <button
              type="button"
              onClick={() => setPanelTab("agent")}
              className={cn(
                "px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap",
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
                "px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap",
                panelTab === "law"
                  ? "bg-white text-[#315F50] shadow-2xs font-bold"
                  : "text-[#747F88] hover:text-[#1D2227]"
              )}
            >
              EUR-Lex
            </button>
          </div>

          {/* Clear chat thread (preserves saved audit history) */}
          {messages.length > 0 && panelTab === "agent" && (
            <button
              type="button"
              onClick={clearMessages}
              disabled={isBusy}
              className="p-1.5 rounded-lg transition-all cursor-pointer border bg-white text-[#5B6773] border-[#C8CFD5] hover:text-[#1D2227] hover:border-[#9AA5AF] shadow-2xs disabled:opacity-40"
              title="Reset chat view (saved audits remain persisted)"
              aria-label="Reset chat view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Width Expansion Arrow Toggle (Icon Only) */}
          <button
            type="button"
            onClick={() => {
              setCustomRightPanelWidth(null);
              setChatPanelExpanded((prev) => !prev);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer border flex items-center justify-center",
              chatPanelExpanded
                ? "bg-[#315F50]/10 text-[#315F50] border-[#315F50]/30 hover:bg-[#315F50]/20"
                : "bg-white text-[#5B6773] border-[#C8CFD5] hover:text-[#1D2227] hover:border-[#9AA5AF] shadow-2xs"
            )}
            title={chatPanelExpanded ? "Collapse panel width (480px)" : "Expand panel width (700px)"}
            aria-label={chatPanelExpanded ? "Collapse panel" : "Expand panel"}
          >
            {chatPanelExpanded ? (
              <ChevronsRight className="w-3.5 h-3.5 text-[#315F50]" />
            ) : (
              <ChevronsLeft className="w-3.5 h-3.5 text-[#5B6773]" />
            )}
          </button>

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
            ddsHistory={ddsHistory}
            onReopenAudit={handleInspectInEUDR}
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
      <footer className="flex-shrink-0 border-t border-[#C8CFD5] p-3 bg-[#F4F5F6] space-y-2">
        {/* Active Plot Situational Awareness Pill & Quick Inquiries */}
        {activeAssessment && (
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-[#C8CFD5] rounded-lg text-[11px] shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    activeAssessment.risk_assessment?.overall_risk === "compliant" ? "bg-[#315F50]" : "bg-[#A64B45]"
                  )}
                />
                <span className="font-semibold text-[#1D2227] text-[11.5px] truncate max-w-[140px]" title={activeAssessment.plot?.name || "Active Parcel"}>
                  {activeAssessment.plot?.name || "Active Parcel"}
                </span>
                <span className="text-[#747F88] text-[10px] font-mono whitespace-nowrap flex-shrink-0">
                  ({(activeAssessment.plot?.commodity || "cocoa").toUpperCase()} • {Number(activeAssessment.plot?.area_ha ?? 3.6).toFixed(1)} ha • {activeAssessment.plot?.country_name || "GH"})
                </span>
              </div>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider flex-shrink-0",
                  activeAssessment.risk_assessment?.overall_risk === "compliant"
                    ? "bg-[#315F50]/10 text-[#315F50]"
                    : "bg-[#A64B45]/10 text-[#A64B45]"
                )}
              >
                {activeAssessment.risk_assessment?.overall_risk?.replace(/_/g, " ") || "COMPLIANT"} ({Number(activeAssessment.risk_assessment?.risk_score ?? 0).toFixed(0)}/100)
              </span>
            </div>

            {/* Situational Follow-Up Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 no-scrollbar scroll-smooth">
              {(activeAssessment.risk_assessment?.overall_risk === "compliant"
                ? [
                    `Why is this plot compliant under Art. 3(a)?`,
                    `How does the 4 ha rule apply to this farm?`,
                    `Compare analysis stats with EUDR rules`,
                    `Check TRACES NT customs export status`,
                  ]
                : [
                    `Why did this plot fail under Art. 3(a)?`,
                    `How does May 2026 plot carve-out work here?`,
                    `Compare analysis stats with EUDR rules`,
                    `What documents prove sovereign legality?`,
                  ]
              ).map((chipText) => (
                <button
                  key={chipText}
                  type="button"
                  onClick={() => {
                    setInput("");
                    submit(chipText);
                  }}
                  disabled={sending || isBusy}
                  className="px-2 py-1 rounded-md bg-white border border-[#C8CFD5] hover:border-[#315F50] hover:bg-[#315F50]/5 text-[#343B42] hover:text-[#315F50] text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer shadow-2xs flex-shrink-0"
                >
                  {chipText}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 bg-white border border-[#C8CFD5] hover:border-[#9AA5AF] focus-within:border-[#315F50] focus-within:ring-2 focus-within:ring-[#315F50]/15 rounded-2xl shadow-xs transition-all px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                activeAssessment
                  ? `Ask about ${activeAssessment.plot?.name || "this plot"}'s stats, Art. 3(a), or 4 ha rule…`
                  : typedText
                  ? `Ask: "${typedText}"`
                  : "Ask any EUDR compliance or statutory question…"
              }
              rows={1}
              className="flex-1 bg-transparent text-[12px] text-[#1D2227] placeholder:text-[#8E99A4] resize-none outline-none leading-relaxed min-h-[24px] max-h-28"
            />
            <button
              type="button"
              onClick={() => {
                if (input.trim() && !sending && !isBusy) {
                  submit(input);
                  setInput("");
                  if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                  }
                }
              }}
              disabled={!input.trim() || sending || isBusy}
              title={input.trim() ? "Send inquiry (Enter)" : "Enter a message to send"}
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 flex-shrink-0 group",
                input.trim() && !sending && !isBusy
                  ? "bg-[#315F50] text-white hover:bg-[#274d40] border border-[#274d40] shadow-xs active:scale-95 cursor-pointer"
                  : "bg-[#F4F5F6] text-[#8E99A4] border border-[#D8DFE4] cursor-not-allowed opacity-80"
              )}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#315F50]" />
              ) : (
                <SendHorizontal
                  className={cn(
                    "w-4 h-4 transition-transform duration-150",
                    input.trim() && !sending && !isBusy ? "group-hover:translate-x-0.5 text-white" : "text-[#8E99A4]"
                  )}
                />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-[#8E99A4] px-1 select-none">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-[#F4F5F6] border border-[#D8DFE4] rounded text-[8.5px] font-semibold text-[#5B6773]">Enter ↵</kbd>
              <span>to send</span>
              <span className="text-[#C8CFD5]">·</span>
              <kbd className="px-1 py-0.2 bg-[#F4F5F6] border border-[#D8DFE4] rounded text-[8.5px] font-semibold text-[#5B6773]">Tab ⇥</kbd>
              <span>fill prompt</span>
            </span>
            <span className="text-[#315F50] font-semibold flex items-center gap-1.5 transition-all">
              <span className={cn("w-1.5 h-1.5 rounded-full bg-[#315F50]", isBusy && "animate-ping")} />
              <span>{isBusy ? AGENT_BUSY_KEYWORDS[busyKeywordIdx] : "EUDR Statutory RAG"}</span>
            </span>
          </div>
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

const FEATURED_PLAYBOOKS = [
  {
    caseId: "06_Cote_dIvoire_Cocoa",
    title: "Côte d'Ivoire Agroforestry",
    badge: "Compliant · 5",
    badgeStyle: "bg-[#F4F5F6] border-[#C8CFD5] text-[#315F50]",
    chipStyle: "bg-[rgba(49,95,80,0.08)] text-[#315F50] border-[rgba(49,95,80,0.22)]",
    icon: Trees,
  },
  {
    caseId: "02_Ghana_Cocoa",
    title: "Ghana Cocoa Cooperative",
    badge: "Breach · 100",
    badgeStyle: "bg-[#F4F5F6] border-[#C8CFD5] text-[#A64B45]",
    chipStyle: "bg-[rgba(166,75,69,0.08)] text-[#A64B45] border-[rgba(166,75,69,0.22)]",
    icon: AlertCircle,
  },
  {
    caseId: "03_Thailand_Rubber",
    title: "Thailand River Bend",
    badge: "Exempt · 18",
    badgeStyle: "bg-[#F4F5F6] border-[#C8CFD5] text-[#315F50]",
    chipStyle: "bg-[rgba(49,95,80,0.08)] text-[#315F50] border-[rgba(49,95,80,0.22)]",
    icon: CircleDot,
  },
];

function Welcome({
  disabled,
  ddsHistory,
  onReopenAudit,
  onSelectBenchmark,
  onSelectPrompt,
}: {
  disabled?: boolean;
  ddsHistory: EUDRAnalysisResponse[];
  onReopenAudit: (res: EUDRAnalysisResponse) => void;
  onSelectBenchmark: (c: BenchmarkCase) => void;
  onSelectPrompt?: (prompt: string) => void;
}) {
  const benchmarkMap = new Map(BENCHMARK_CASES.map((c) => [c.id, c]));

  return (
    <div className="py-1 space-y-3 animate-fade-in">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between px-0.5">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-[#C8CFD5] text-[9.5px] font-mono font-semibold text-[#343B42] leading-none">
          <Sparkles className="w-2.5 h-2.5 text-[#315F50]" />
          <span>EUDR STATUTORY INTELLIGENCE</span>
        </div>
        <span className="text-[9.5px] font-mono text-[#747F88]">EU 2023/1115</span>
      </div>

      {/* Best 3 Compact 1-Click Audits */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[9.5px] text-[#747F88] uppercase tracking-wider font-mono font-bold">
            1-Click Audits
          </span>
          <span className="text-[9px] text-[#747F88] font-mono">3 Playbooks</span>
        </div>

        <div className="space-y-1">
          {FEATURED_PLAYBOOKS.map((item) => {
            const targetCase = benchmarkMap.get(item.caseId) || BENCHMARK_CASES[0];
            return (
              <button
                key={item.caseId}
                type="button"
                disabled={disabled}
                onClick={() => onSelectBenchmark(targetCase)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg bg-white border border-[#C8CFD5] hover:border-[#315F50] hover:bg-[#F8FAF9] transition-all group shadow-2xs cursor-pointer active:scale-[0.99] flex items-center justify-between gap-2",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                title={`Launch live audit for ${item.title}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border",
                      item.badgeStyle
                    )}
                  >
                    <item.icon className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#1D2227] group-hover:text-[#315F50] transition-colors truncate">
                    {item.title}
                  </span>
                  <span className={cn("inline-flex items-center text-[8.5px] leading-none font-mono font-semibold px-1.5 py-0.5 rounded border flex-shrink-0", item.chipStyle)}>
                    {item.badge}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-[#F4F5F6] text-[#343B42] border border-[#C8CFD5] group-hover:bg-[#315F50] group-hover:text-white group-hover:border-[#315F50] transition-all flex-shrink-0">
                  <Play className="w-2 h-2 fill-current" />
                  <span>Run</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact 4 Statutory Inquiries (Single-line pills) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[9.5px] text-[#747F88] uppercase tracking-wider font-mono font-bold">
            Statutory Inquiries
          </span>
          <span className="text-[9px] text-[#AAB3BB] font-mono">1-Click Ask</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[
            {
              short: "Art. 3(a) 2020 Cutoff",
              prompt: "How does the EUDR Article 3(a) December 31, 2020 deforestation cutoff apply, and what satellite baseline is required?",
            },
            {
              short: "Art. 9(1)(d) <4ha Rules",
              prompt: "What are the EUDR Article 9(1)(d) geolocation rules for smallholder plots under 4 hectares, and how does Oxeous polygon snap help?",
            },
            {
              short: "May 2026 Carve-Outs",
              prompt: "How does the May 2026 plot carve-out segregation protocol work for a farm with partial deforestation to avoid full rejection?",
            },
            {
              short: "Oxeous vs 30m Legacy",
              prompt: "How does Oxeous true 10m pixel-wise raster intersection compare to legacy 30m satellite tools in the market?",
            },
          ].map((item) => (
            <button
              key={item.short}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPrompt?.(item.prompt)}
              className="text-left px-2.5 py-1.5 rounded-lg bg-white border border-[#C8CFD5] hover:border-[#315F50] hover:bg-[#F8FAF9] transition-all group shadow-2xs cursor-pointer active:scale-[0.98] flex items-center justify-between gap-1.5"
            >
              <span className="text-[10.5px] font-medium text-[#1D2227] group-hover:text-[#315F50] transition-colors truncate">
                {item.short}
              </span>
              <ArrowRight className="w-2.5 h-2.5 text-[#7A8791] group-hover:text-[#315F50] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Persisted Saved Audits (shown only after the user has run audits) */}
      {ddsHistory.length > 0 && (
        <div className="rounded-lg border border-[#C8CFD5] bg-white p-2 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-[#343B42]">
              Saved Audits ({ddsHistory.length})
            </span>
            <span className="text-[9px] font-mono text-[#747F88]">Persisted</span>
          </div>
          <div className="space-y-1">
            {ddsHistory.slice(0, 3).map((item) => {
              const isOk = item.risk_assessment?.overall_risk === "compliant" || item.risk_assessment?.overall_risk === "low_risk";
              return (
                <button
                  key={item.dds?.dds_id || item.request_id}
                  type="button"
                  onClick={() => onReopenAudit(item)}
                  className="w-full flex items-center justify-between gap-2 rounded-md border border-[#E3E7EA] bg-[#F4F5F6]/60 hover:border-[#315F50] hover:bg-white px-2 py-1 text-left transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isOk ? "bg-[#315F50]" : "bg-[#A64B45]")} />
                    <span className="text-[10.5px] font-medium text-[#1D2227] truncate">
                      {item.plot?.name || `${item.plot?.commodity?.toUpperCase()} · ${item.plot?.country_name || item.plot?.country_code}`}
                    </span>
                  </div>
                  <span className="text-[9.5px] font-semibold text-[#315F50] flex-shrink-0">Reopen →</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
