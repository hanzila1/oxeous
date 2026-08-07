"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Send, Bot, User, Loader2, AlertCircle, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { AnalysisResponse } from "@oxeous/shared-types";
import AnalysisResultCard from "./AnalysisResultCard";
import FollowUpChips from "./FollowUpChips";

export default function ConversationPanel({ onClose }: { onClose?: () => void }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const { messages, addMessage, updateMessage, conversationHistory, appendHistory, viewport, addLayer } = useStore();

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
    addMessage({ id: botId, role: "assistant", content: "", isLoading: true });
    setSending(true);
    try {
      const res = await api.chat({ prompt, conversation_history: conversationHistory, map_viewport: viewport });
      updateMessage(botId, { content: res.explanation, isLoading: false, analysisResult: res });
      appendHistory({ role: "assistant", content: res.explanation });
      if (res.tile_url) addLayer({ id: res.request_id, label: res.analysis_type.replace(/_/g, " "), type: "raster", tileUrl: res.tile_url, overlayUrl: res.overlay_url, visible: true, opacity: 0.85, legend: res.legend, analysisType: res.analysis_type });
      if (res.granite_intent?.bbox) { const fn = (window as Window & { oxeousFlyTo?: (b: [number,number,number,number]) => void }).oxeousFlyTo; fn?.(res.granite_intent.bbox); }
    } catch (err) {
      updateMessage(botId, { content: "", isLoading: false, error: err instanceof Error ? err.message : "Request failed" });
    } finally { setSending(false); }
  }, [sending, uid, addMessage, updateMessage, appendHistory, conversationHistory, viewport, addLayer]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); setInput(""); }
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(49,95,80,0.12)] border border-[rgba(49,95,80,0.25)] flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#315F50]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-[#1D2227] flex items-center gap-2">
              AI Earth Copilot
              <span className="text-[9px] font-mono text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.2)] px-1.5 py-0.5 rounded-chip">Granite 3.0</span>
            </h2>
            <p className="text-[11px] text-[#747F88] mt-0.5">Natural language geospatial intelligence</p>
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
        {messages.length === 0 && <Welcome onPrompt={p => { setInput(p); submit(p); }} />}
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex gap-2.5 animate-fade-in", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={cn("w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border",
              msg.role === "user" ? "bg-[rgba(49,95,80,0.12)] border-[rgba(49,95,80,0.25)] text-[#315F50]" : "bg-[#E3E7EA] border-[#C8CFD5] text-[#7A8791]"
            )}>
              {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
            </div>
            <div className={cn("flex-1 max-w-[280px]", msg.role === "user" ? "flex flex-col items-end" : "")}>
              {msg.role === "user"
                ? <div className="bg-[#343B42] text-white rounded-xl px-3 py-2 text-[12px] leading-relaxed">{msg.content}</div>
                : msg.isLoading
                  ? <div className="flex items-center gap-2 text-[11px] text-[#315F50] bg-[rgba(49,95,80,0.06)] border border-[rgba(49,95,80,0.2)] rounded-xl px-3 py-2"><Loader2 className="w-3 h-3 animate-spin" />Querying satellite data…</div>
                  : msg.error
                    ? <div className="flex items-start gap-2 bg-[rgba(166,75,69,0.06)] border border-[rgba(166,75,69,0.2)] rounded-xl px-3 py-2"><AlertCircle className="w-3.5 h-3.5 text-[#A64B45] flex-shrink-0 mt-0.5" /><p className="text-[11px] text-[#A64B45]">{msg.error}</p></div>
                    : <div className="space-y-2">
                        {msg.content && <div className="text-[12px] text-[#343B42] leading-relaxed bg-white border border-[#E3E7EA] rounded-xl px-3 py-2">{msg.content}</div>}
                        {msg.analysisResult && <AnalysisResultCard result={msg.analysisResult} />}
                        {(msg.analysisResult?.follow_up_suggestions?.length ?? 0) > 0 && (
                          <FollowUpChips suggestions={msg.analysisResult!.follow_up_suggestions} onSelect={s => submit(s)} />
                        )}
                      </div>
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

function Welcome({ onPrompt }: { onPrompt: (p: string) => void }) {
  const examples = [
    "Show vegetation moisture decline around Lahore this month",
    "Surface water expansion in Bangladesh after recent floods",
    "Land disturbance hotspots in the Amazon this year",
    "Run Prithvi AI change detection over Bahia cocoa farms",
  ];
  return (
    <div className="py-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl bg-[rgba(49,95,80,0.10)] border border-[rgba(49,95,80,0.2)]">
        <Sparkles className="w-5 h-5 text-[#315F50]" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-[13px] font-semibold text-[#1D2227]">Ask IBM Granite Copilot</h3>
        <p className="text-[11px] text-[#747F88] leading-relaxed">Query satellite archives using natural language.<br />Get georeferenced results directly on the map.</p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] text-[#AAB3BB] uppercase tracking-wider font-medium px-1">Suggested prompts</p>
        {examples.map(ex => (
          <button key={ex} onClick={() => onPrompt(ex)}
            className="w-full text-left text-[11px] text-[#343B42] hover:text-[#1D2227] bg-white border border-[#C8CFD5] hover:border-[#7A8791] rounded-lg p-2.5 transition-all leading-relaxed">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
