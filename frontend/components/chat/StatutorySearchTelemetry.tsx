"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Loader2,
  Hash,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface EurLexCitationItem {
  id: string;
  celex_id: string;
  oj_ref: string;
  eurlex_url: string;
  sha256_verbatim: string;
  article_ref: string;
  title: string;
  category: string;
  hs_codes: string;
  score: number;
  legal_summary?: string;
  verbatim_excerpt: string;
}

interface CitationsDrawerProps {
  citations: EurLexCitationItem[];
  searchLatencyMs?: number;
  ragMode?: string;
  corpusDocs?: number;
}

export function StatutoryCitationsDrawer({
  citations,
  searchLatencyMs,
  ragMode,
  corpusDocs = 114,
}: CitationsDrawerProps) {
  const [open, setOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  if (!citations || citations.length === 0) return null;

  const isCloudIndex = ragMode === "eurlex_cloud_index" || ragMode === "azure_ai_search";

  return (
    <div className="rounded-xl border border-[#C8CFD5] bg-white overflow-hidden shadow-2xs text-[11px]">
      {/* Interactive Telemetry Strip */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#F8FAFB] hover:bg-[#EFF3F5] transition-colors cursor-pointer gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              isCloudIndex ? "bg-[#315F50]" : "bg-amber-500"
            )}
          />
          <span className="font-semibold text-[#1D2227] truncate">
            EUR-Lex Primary Index
          </span>
          <span className="text-[9.5px] font-mono font-semibold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.22)] px-1.5 py-0.5 rounded">
            {citations.length}/{corpusDocs} Verbatim
          </span>
          {typeof searchLatencyMs === "number" && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[9.5px] font-mono text-[#747F88]">
              <Clock className="w-2.5 h-2.5" />
              {searchLatencyMs} ms
            </span>
          )}
        </div>

        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#315F50] flex-shrink-0">
          <span>{open ? "Hide Official Law" : "Verbatim Law"}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Unfolded Verbatim Official Journal Provision Cards */}
      {open && (
        <div className="divide-y divide-[#E3E7EA] border-t border-[#E3E7EA] bg-white">
          {citations.map((c) => {
            const isExpanded = expandedCardId === c.id;
            return (
              <div key={c.id} className="p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1 mb-1">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1D2227] text-white">
                        CELEX:{c.celex_id}
                      </span>
                      {c.hs_codes && c.hs_codes !== "ALL" && (
                        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[165px]">
                          HS: {c.hs_codes}
                        </span>
                      )}
                      {c.sha256_verbatim && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[8.5px] font-mono text-[#5B6773] bg-[#F4F5F6] px-1.5 py-0.5 rounded border border-[#D8DFE4]"
                          title={`Verbatim Official Journal SHA-256: ${c.sha256_verbatim}`}
                        >
                          <ShieldCheck className="w-2.5 h-2.5 text-[#315F50]" />
                          SHA-256:{c.sha256_verbatim.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-[#1D2227] leading-snug">
                      {c.article_ref}
                    </p>
                    <p className="text-[9.5px] text-[#747F88] font-mono mt-0.5">
                      {c.oj_ref}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : c.id)}
                      className="px-2 py-1 rounded-lg bg-[#F4F5F6] hover:bg-[#E3E7EA] text-[#1D2227] font-semibold text-[9.5px] border border-[#C8CFD5] transition-colors cursor-pointer"
                    >
                      {isExpanded ? "Collapse" : "Read Text"}
                    </button>
                    {c.eurlex_url && (
                      <a
                        href={c.eurlex_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg bg-[rgba(49,95,80,0.08)] hover:bg-[rgba(49,95,80,0.16)] text-[#315F50] border border-[rgba(49,95,80,0.22)] transition-colors"
                        title="Open Official Journal source on EUR-Lex"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-1.5 rounded-lg bg-[#F8FAFB] border border-[#D8DFE4] p-2.5 max-h-56 overflow-y-auto">
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#E3E7EA] text-[9px] font-mono text-[#5B6773]">
                      <span>OFFICIAL JOURNAL OF THE EUROPEAN UNION (VERBATIM)</span>
                      <span>SCORE {Number(c.score || 1).toFixed(2)}</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-[10.5px] text-[#1D2227] leading-relaxed">
                      {c.verbatim_excerpt}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Interactive EUR-Lex Law & Customs HS Code Explorer Tab
// ---------------------------------------------------------------------------
const CATEGORY_FILTERS = [
  { id: "all", label: "All (114)" },
  { id: "official_article", label: "Articles 1–38" },
  { id: "annex_i_hs_codes", label: "Annex I HS" },
  { id: "official_commission_guidance", label: "EU Guidance" },
  { id: "official_country_benchmarking", label: "Country Risk" },
  { id: "official_recitals", label: "Recitals" },
];

const QUICK_SEARCH_TERMS = [
  "HS 1801 Cocoa",
  "HS 4011 Tyres",
  "Article 2(5) Plantation",
  "Recital 37 JRC",
  "2025/1093 Country Risk",
  "Article 9(4) 5 Years",
];

export function EurLexLiveSearchExplorer({
  onAskAgent,
}: {
  onAskAgent: (prompt: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<EurLexCitationItem[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [engineMode, setEngineMode] = useState<string>("eurlex_cloud_index");
  const [totalDocs, setTotalDocs] = useState<number>(114);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runSearch = useCallback(async (qText: string, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: qText,
        category: cat === "all" ? "" : cat,
        top_k: "10",
      });
      const res = await fetch(`${API_BASE}/eudr/statutory-search?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.results ?? []);
      setLatencyMs(data.latency_ms ?? null);
      setEngineMode(data.engine_mode ?? "eurlex_cloud_index");
      setTotalDocs(data.total_corpus_documents ?? 114);
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query, category);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, category, runSearch]);

  const isCloud = engineMode === "eurlex_cloud_index";

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#F4F5F6]">
      {/* Search Box + Telemetry Strip */}
      <div className="p-3 bg-white border-b border-[#C8CFD5] space-y-2.5 flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#747F88] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search verbatim EU law, HS codes (1801, 4011), Article 9, Recital 37..."
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#F4F5F6] border border-[#C8CFD5] focus:bg-white focus:border-[#315F50] text-[11.5px] text-[#1D2227] placeholder:text-[#8E99A2] outline-none transition-all"
          />
          {loading && (
            <Loader2 className="w-3.5 h-3.5 text-[#315F50] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Quick Search Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {QUICK_SEARCH_TERMS.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setQuery(term)}
              className="px-2 py-0.5 rounded-md bg-[#F4F5F6] hover:bg-[rgba(49,95,80,0.1)] text-[9.5px] font-mono font-semibold text-[#5B6773] hover:text-[#315F50] border border-[#D8DFE4] whitespace-nowrap transition-colors cursor-pointer"
            >
              {term}
            </button>
          ))}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCategory(f.id)}
              className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer border",
                category === f.id
                  ? "bg-[#315F50] text-white border-[#315F50]"
                  : "bg-white text-[#5B6773] border-[#C8CFD5] hover:text-[#1D2227]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Live Search Telemetry Status Bar */}
        <div className="flex items-center justify-between pt-0.5 text-[9.5px] font-mono text-[#5B6773]">
          <span className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", isCloud ? "bg-[#315F50]" : "bg-amber-500")} />
            <span className="font-semibold text-[#1D2227]">
              {isCloud ? "Live Cloud Search Index" : "Local Verbatim Index"}
            </span>
            <span>· {totalDocs} EUR-Lex Docs</span>
          </span>
          {latencyMs !== null && (
            <span className="text-[#315F50] font-bold">
              {results.length} hits · {latencyMs} ms
            </span>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {results.map((item) => {
          const isOpen = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-xl bg-white border border-[#C8CFD5] hover:border-[#315F50]/50 p-3 space-y-2 shadow-2xs transition-all"
            >
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1D2227] text-white">
                    CELEX:{item.celex_id}
                  </span>
                  {item.hs_codes && item.hs_codes !== "ALL" && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[160px]">
                      <Hash className="w-2.5 h-2.5" />
                      {item.hs_codes}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono text-[#315F50] bg-[rgba(49,95,80,0.08)] px-1.5 py-0.5 rounded border border-[rgba(49,95,80,0.2)] font-semibold">
                  Score {Number(item.score || 1).toFixed(2)}
                </span>
              </div>

              <div>
                <h4 className="text-[11.5px] font-bold text-[#1D2227] leading-snug">
                  {item.article_ref}
                </h4>
                <p className="text-[9.5px] font-mono text-[#747F88] mt-0.5">
                  {item.oj_ref}
                </p>
              </div>

              {!isOpen && item.legal_summary && (
                <p className="text-[10.5px] text-[#343B42] leading-relaxed line-clamp-3">
                  {item.legal_summary}
                </p>
              )}

              {isOpen && (
                <div className="rounded-lg bg-[#F8FAFB] border border-[#D8DFE4] p-2.5 max-h-64 overflow-y-auto space-y-1.5">
                  <div className="flex items-center justify-between text-[8.5px] font-mono text-[#5B6773] pb-1 border-b border-[#E3E7EA]">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#315F50]" />
                      SHA-256: {item.sha256_verbatim?.slice(0, 16)}…
                    </span>
                    <span>VERBATIM PRIMARY TEXT</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-[10.5px] text-[#1D2227] leading-relaxed">
                    {item.verbatim_excerpt}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-[#EEF1F3] gap-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F4F5F6] hover:bg-[#E3E7EA] text-[10px] font-semibold text-[#1D2227] border border-[#C8CFD5] transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3 text-[#315F50]" />
                    <span>{isOpen ? "Collapse Text" : "Read Verbatim"}</span>
                  </button>
                  {item.eurlex_url && (
                    <a
                      href={item.eurlex_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-[#F4F5F6] text-[10px] font-semibold text-[#5B6773] hover:text-[#1D2227] border border-[#C8CFD5] transition-colors"
                    >
                      <span>EUR-Lex</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onAskAgent(`Explain ${item.article_ref} in simple practical terms for an importer.`)
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#315F50] hover:bg-[#274d40] text-white text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Ask Agent</span>
                </button>
              </div>
            </div>
          );
        })}

        {!loading && results.length === 0 && (
          <div className="text-center py-8 text-[11px] text-[#747F88]">
            No Official Journal provisions matched that filter. Try a broader keyword or HS code.
          </div>
        )}
      </div>
    </div>
  );
}

