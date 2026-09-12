"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Send, Bot, User, Loader2, AlertCircle, X, Sparkles, MapPinned, Activity, FileJson2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useStore, type AgentLogEntry, type ActiveLayer } from "@/lib/store";
import type { AnalysisResponse, EUDRAnalysisResponse, EUDRCommodity } from "@oxeous/shared-types";
import AnalysisResultCard from "./AnalysisResultCard";
import FollowUpChips from "./FollowUpChips";
import FormattedMarkdown from "./FormattedMarkdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface BenchmarkCase {
  id: string;
  title: string;
  region: string;
  commodity: EUDRCommodity;
  countryCode: string;
  countryName: string;
  prompt: string;
  geometry: { type: string; coordinates: number[][][] };
  flag: string;
  tag: string;
  tagColor: string;
}

const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    id: "brazil_soya",
    title: "Mato Grosso Soya Deforestation",
    region: "Brazil · Soya",
    commodity: "soya",
    countryCode: "BR",
    countryName: "Brazil",
    prompt: "Audit Amazon frontier plot for post-2020 commercial soya clearing",
    geometry: { type: "Polygon", coordinates: [[[-55.50,-12.80],[-55.40,-12.80],[-55.40,-12.70],[-55.50,-12.70],[-55.50,-12.80]]] },
    flag: "🇧🇷",
    tag: "Post-2020 Loss",
    tagColor: "text-[#A64B45] bg-[rgba(166,75,69,0.08)] border-[rgba(166,75,69,0.25)]",
  },
  {
    id: "ghana_cocoa",
    title: "Ashanti Cocoa Smallholder Fringe",
    region: "Ghana · Cocoa",
    commodity: "cocoa",
    countryCode: "GH",
    countryName: "Ghana",
    prompt: "Assess Tano Offin cocoa plot for historical clearing & forest degradation",
    geometry: { type: "Polygon", coordinates: [[[-2.05,6.85],[-1.95,6.85],[-1.95,6.95],[-2.05,6.95],[-2.05,6.85]]] },
    flag: "🇬🇭",
    tag: "High Loss Driver",
    tagColor: "text-[#C58A3A] bg-[rgba(197,138,58,0.08)] border-[rgba(197,138,58,0.25)]",
  },
  {
    id: "indonesia_palm",
    title: "Kalimantan Peatland Palm Oil",
    region: "Indonesia · Palm Oil",
    commodity: "palm_oil",
    countryCode: "ID",
    countryName: "Indonesia",
    prompt: "Investigate Sebangau peatland concession for WDPA protected reserve overlap",
    geometry: { type: "Polygon", coordinates: [[[113.80,-2.40],[113.90,-2.40],[113.90,-2.30],[113.80,-2.30],[113.80,-2.40]]] },
    flag: "🇮🇩",
    tag: "Reserve Overlap",
    tagColor: "text-[#A64B45] bg-[rgba(166,75,69,0.08)] border-[rgba(166,75,69,0.25)]",
  },
  {
    id: "germany_timber",
    title: "Bavaria FSC Sustainable Timber",
    region: "Germany · Wood",
    commodity: "wood",
    countryCode: "DE",
    countryName: "Germany",
    prompt: "Certify Ebrach State Forest timber plot for zero-deforestation compliance",
    geometry: { type: "Polygon", coordinates: [[[10.45,49.80],[10.55,49.80],[10.55,49.90],[10.45,49.90],[10.45,49.80]]] },
    flag: "🇩🇪",
    tag: "Pass Benchmark",
    tagColor: "text-[#315F50] bg-[rgba(49,95,80,0.08)] border-[rgba(49,95,80,0.25)]",
  },
];

export default function ConversationPanel({ onClose }: { onClose?: () => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [runningAssessment, setRunningAssessment] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const { messages, addMessage, updateMessage, conversationHistory, appendHistory, viewport, addLayer, setActiveGeoJSON, addDDSHistory } = useStore();

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
    if (!prompt.trim() || sending || runningAssessment) return;
    const msgId = `${uid}-${Date.now()}`;
    addMessage({ id: `${msgId}-user`, role: "user", content: prompt });
    appendHistory({ role: "user", content: prompt });
    const botId = `${msgId}-bot`;
    addMessage({ id: botId, role: "assistant", content: "", isLoading: true, agentLogs: buildAgentLogs(prompt) });
    setSending(true);
    try {
      const res = await api.chat({ prompt, conversation_history: conversationHistory, map_viewport: viewport });
      updateMessage(botId, { content: res.explanation, isLoading: false, analysisResult: res, agentLogs: buildAgentLogs(prompt, res) });
      appendHistory({ role: "assistant", content: res.explanation });
      if (res.tile_url) addLayer({ id: res.request_id, label: res.analysis_type.replace(/_/g, " "), type: "raster", tileUrl: res.tile_url, overlayUrl: res.overlay_url, visible: true, opacity: 1.0, legend: res.legend, analysisType: res.analysis_type });
      if (res.granite_intent?.bbox) { const fn = (window as Window & { oxeousFlyTo?: (b: [number,number,number,number]) => void }).oxeousFlyTo; fn?.(res.granite_intent.bbox); }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Request failed";
      updateMessage(botId, { content: "", isLoading: false, error: errorMessage, agentLogs: buildAgentLogs(prompt) });
    } finally {
      setSending(false);
    }
  }, [sending, uid, addMessage, updateMessage, appendHistory, conversationHistory, viewport, addLayer, buildAgentLogs]);

  const runCaseStudy = useCallback(async (cs: BenchmarkCase) => {
    if (sending || runningAssessment) return;
    setRunningAssessment(true);
    setActiveGeoJSON(cs.geometry);
    
    // Fly to bbox
    const coords = cs.geometry.coordinates[0];
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    const bbox: [number, number, number, number] = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    (window as Window & { oxeousFlyTo?: (b: typeof bbox) => void }).oxeousFlyTo?.(bbox);

    const userPrompt = `Audit ${cs.title} (${cs.region}): ${cs.prompt}`;
    const userMsgId = `user-${Date.now()}`;
    const botMsgId = `earth-bot-${Date.now()}`;

    addMessage({ id: userMsgId, role: "user", content: userPrompt });

    let currentLogs: AgentLogEntry[] = [
      { id: "ingest", label: "Plot Ingestion", detail: `Ingested benchmark geometry for ${cs.commodity.toUpperCase()} (${cs.region})`, status: "done" },
      { id: "hansen", label: "Hansen GFC 2025", detail: "Querying Hansen v1.13 post-cutoff loss & baseline...", status: "active" },
    ];

    addMessage({
      id: botMsgId,
      role: "assistant",
      content: "",
      isLoading: true,
      agentLogs: currentLogs,
    });

    try {
      const res = await fetch(`${API_BASE}/eudr/plots/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commodity: cs.commodity,
          country_code: cs.countryCode,
          country_name: cs.countryName,
          geometry: cs.geometry,
          generate_dds: true
        }),
      });

      if (!res.ok) throw new Error("Assessment failed");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream unavailable");

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
            if (event.step === "agent_log") {
              const stepId = String(event.id || "step");
              const idx = currentLogs.findIndex(l => l.id === stepId);
              const entry: AgentLogEntry = {
                id: stepId,
                label: String(event.label || "Dataset Check"),
                detail: String(event.detail || ""),
                status: (event.status as "done" | "active" | "pending") || "active",
              };
              if (idx >= 0) currentLogs = currentLogs.map((l, i) => i === idx ? entry : l);
              else currentLogs = [...currentLogs, entry];
              updateMessage(botMsgId, { agentLogs: [...currentLogs] });
            }
            if (event.step === "done" && event.data) {
              const data = event.data as EUDRAnalysisResponse;
              addDDSHistory(data);
              currentLogs = currentLogs.map(l => ({ ...l, status: "done" as const }));
              updateMessage(botMsgId, {
                content: data.explanation,
                isLoading: false,
                eudrResult: data,
                agentLogs: currentLogs,
              });
              if (data.map_layers?.length) {
                data.map_layers.forEach(lyr => {
                  addLayer({
                    id: lyr.id,
                    label: lyr.label,
                    type: "raster",
                    tileUrl: lyr.tile_url,
                    visible: lyr.visible,
                    opacity: 1.0,
                    legend: lyr.legend as ActiveLayer["legend"] | undefined,
                    analysisType: (lyr as { layer_type?: string }).layer_type || "land_disturbance",
                    layer_type: (lyr as { layer_type?: string }).layer_type,
                  });
                });
              }
            }
          } catch {
            // ignore malformed
          }
        }
      }
    } catch (e) {
      updateMessage(botMsgId, {
        content: "",
        isLoading: false,
        error: e instanceof Error ? e.message : "Assessment failed",
        agentLogs: currentLogs,
      });
    } finally {
      setRunningAssessment(false);
    }
  }, [sending, runningAssessment, addMessage, updateMessage, addDDSHistory, addLayer, setActiveGeoJSON]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); setInput(""); }
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1D2227] border border-[#343B42] flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-[#4ade80]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-[#1D2227] flex items-center gap-2">
              Oxeous Earth Agent
            </h2>
            <p className="text-[10.5px] text-[#747F88] mt-0.5">Autonomous Earth Observation & Spatial Reasoning</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#7A8791] hover:text-[#343B42] hover:bg-[#E3E7EA] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <Welcome
            disabled={sending || runningAssessment}
            onCaseStudy={runCaseStudy}
            onPrompt={p => { setInput(p); submit(p); }}
          />
        )}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-[#D8E1E5] bg-white/80 px-3 py-2 text-[11px] text-[#44515B]">
          <div className="flex items-center gap-2">
            <MapPinned className="h-3.5 w-3.5 text-[#315F50]" />
            <span className="font-medium text-[#1D2227]">Selected AOI</span>
          </div>
          <span className="font-mono text-[10px] text-[#5B6773]">[{viewport.bbox.map((n) => Number(n).toFixed(3)).join(", ")}]</span>
        </div>
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex gap-2.5 animate-fade-in", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={cn("w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border",
              msg.role === "user" ? "bg-[rgba(49,95,80,0.12)] border-[rgba(49,95,80,0.25)] text-[#315F50]" : "bg-[#E3E7EA] border-[#C8CFD5] text-[#7A8791]"
            )}>
              {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
            </div>
            <div className={cn("flex-1 max-w-[320px] w-full", msg.role === "user" ? "flex flex-col items-end" : "")}>
              {msg.role === "user"
                ? <div className="bg-[#343B42] text-white rounded-xl px-3 py-2 text-[12px] leading-relaxed">{msg.content}</div>
                : msg.isLoading
                  ? (
                    <div className="space-y-2 w-full">
                      <div className="flex items-center gap-2 text-[11px] text-[#315F50] bg-[rgba(49,95,80,0.06)] border border-[rgba(49,95,80,0.2)] rounded-xl px-3 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#315F50] flex-shrink-0" />
                        <span className="font-medium">Oxeous Agent Executing Analysis...</span>
                      </div>
                      {msg.agentLogs && msg.agentLogs.length > 0 && (
                        <div className="rounded-xl border border-[#D8E1E5] bg-white p-2.5 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5B6773] border-b border-[#E3E7EA] pb-1">
                            <span className="flex items-center gap-1.5">
                              <Activity className="h-3 w-3 text-[#315F50]" />
                              Live Agent Trace
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                          </div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {msg.agentLogs.map((log) => (
                              <div key={log.id} className="flex gap-2 rounded-lg bg-[#F5F7F8] p-2">
                                <div className={cn(
                                  "mt-0.5 h-2.5 w-2.5 rounded-full border border-white flex-shrink-0",
                                  log.status === "done" ? "bg-[#315F50]" : log.status === "active" ? "bg-[#D5A85C] animate-pulse" : "bg-[#C8CFD5]"
                                )} />
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] font-semibold text-[#1D2227]">{log.label}</div>
                                  <div className="text-[10px] leading-relaxed text-[#5B6773] break-words">{log.detail}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                  : msg.error
                    ? <div className="flex items-start gap-2 bg-[rgba(166,75,69,0.06)] border border-[rgba(166,75,69,0.2)] rounded-xl px-3 py-2"><AlertCircle className="w-3.5 h-3.5 text-[#A64B45] flex-shrink-0 mt-0.5" /><p className="text-[11px] text-[#A64B45]">{msg.error}</p></div>
                    : (
                      <div className="space-y-2.5 w-full">
                        {/* 1. Final LLM Reasoning & Synthesis */}
                        {msg.content && (
                          <div className="rounded-xl border border-[#C8CFD5] bg-white p-3 space-y-1.5 shadow-sm">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#315F50]">
                              <Sparkles className="w-3 h-3 text-[#315F50]" />
                              Gemini AI Compliance Reasoning
                            </div>
                            <FormattedMarkdown content={msg.content} />
                          </div>
                        )}

                        {/* 2. Completed Agent Trace */}
                        {msg.agentLogs && msg.agentLogs.length > 0 && (
                          <div className="rounded-xl border border-[#D8E1E5] bg-white p-2.5 shadow-sm">
                            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5B6773]">
                              <span className="flex items-center gap-1.5">
                                <Activity className="h-3 w-3 text-[#315F50]" />
                                Verified Agent Trace
                              </span>
                              <span className="text-[9px] text-[#315F50] font-mono font-medium">Tool Calls Complete</span>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {msg.agentLogs.map((log) => (
                                <div key={log.id} className="flex gap-2 rounded-lg bg-[#F5F7F8] p-1.5">
                                  <div className="mt-0.5 h-2 w-2 rounded-full bg-[#315F50] flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[10px] font-semibold text-[#1D2227]">{log.label}</div>
                                    <div className="text-[10px] text-[#5B6773] break-words">{log.detail}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. EUDR Verdict Summary Card */}
                        {msg.eudrResult && (
                          <div className="rounded-xl border border-[#C8CFD5] bg-[#F4F5F6] p-3 space-y-1.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-[#747F88] font-mono">
                                Verdict: {msg.eudrResult.risk_assessment.overall_risk.replace(/_/g, " ").toUpperCase()}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-[#315F50]">
                                Score {msg.eudrResult.risk_assessment.risk_score.toFixed(0)}/100
                              </span>
                            </div>
                            <div className="text-[10px] text-[#747F88] font-mono flex items-center justify-between pt-1 border-t border-[#E3E7EA]">
                              <span>Cutoff Loss: {msg.eudrResult.risk_assessment.deforestation.forest_loss_ha.toFixed(1)} ha</span>
                              <span>Reserves: {msg.eudrResult.risk_assessment.legality.overlaps_protected_area ? "OVERLAP ⚠" : "CLEAR ✓"}</span>
                            </div>
                          </div>
                        )}

                        {/* 4. Regular Spatial Analysis Result */}
                        {msg.analysisResult && (
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
                        {msg.analysisResult && <AnalysisResultCard result={msg.analysisResult} />}
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
            placeholder="Ask about satellite imagery, forest cover, moisture…"
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
        <p className="text-[10px] text-[#AAB3BB] mt-1.5 px-1">Enter to send · Shift+Enter for newline</p>
      </footer>
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
  onCaseStudy,
  onPrompt,
}: {
  disabled?: boolean;
  onCaseStudy: (cs: BenchmarkCase) => void;
  onPrompt: (p: string) => void;
}) {
  return (
    <div className="py-2 space-y-3.5 animate-fade-in">
      <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl bg-[rgba(49,95,80,0.10)] border border-[rgba(49,95,80,0.2)]">
        <Sparkles className="w-5 h-5 text-[#315F50]" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-[13px] font-bold text-[#1D2227]">Oxeous Earth Agent</h3>
        <p className="text-[11px] text-[#747F88] leading-relaxed">
          Autonomous multi-dataset spatial reasoning.<br />
          Click any benchmark case study to execute live in 1 click.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-[#AAB3BB] uppercase tracking-wider font-semibold px-1">
          High-Impact Case Studies (1-Click Run)
        </p>
        <div className="space-y-1.5">
          {BENCHMARK_CASES.map((cs) => (
            <button
              key={cs.id}
              disabled={disabled}
              onClick={() => onCaseStudy(cs)}
              className={cn(
                "w-full text-left bg-white border border-[#C8CFD5] rounded-xl p-2.5 transition-all group shadow-sm",
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-[#315F50] hover:bg-[#F4F5F6]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm flex-shrink-0">{cs.flag}</span>
                    <span className="text-[12px] font-semibold text-[#1D2227] group-hover:text-[#315F50] transition-colors truncate">
                      {cs.title}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#747F88] mt-0.5 leading-snug line-clamp-1">
                    {cs.prompt}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn("text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border", cs.tagColor)}>
                    {cs.tag}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#AAB3BB] group-hover:text-[#315F50] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-1 space-y-1.5">
        <p className="text-[10px] text-[#AAB3BB] uppercase tracking-wider font-medium px-1">
          Or ask freeform Earth questions
        </p>
        <div className="space-y-1">
          {[
            "Show me true color satellite imagery over this active plot",
            "Calculate vegetation index (NDVI) and evaluate canopy loss",
          ].map((q) => (
            <button
              key={q}
              disabled={disabled}
              onClick={() => onPrompt(q)}
              className={cn(
                "w-full text-left text-[11px] text-[#44515B] bg-white border border-[#E3E7EA] rounded-lg px-2.5 py-1.5 transition-all leading-snug",
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:text-[#1D2227] hover:border-[#7A8791]"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
