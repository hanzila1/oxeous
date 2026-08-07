"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";

interface Suggestion { bbox: [number, number, number, number]; displayName: string; }

export default function LocationSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setViewport } = useStore();

  useEffect(() => {
    if (!query.trim()) { setSuggestion(null); setError(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true); setError(null);
      const r = await api.geocode(query);
      setLoading(false);
      if (r) setSuggestion(r);
      else if (query.trim()) setError("Location not found");
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function flyTo(s: Suggestion) {
    const fn = (window as Window & { oxeousFlyTo?: (b: [number,number,number,number]) => void }).oxeousFlyTo;
    fn?.(s.bbox);
    setViewport({ center: [(s.bbox[0]+s.bbox[2])/2, (s.bbox[1]+s.bbox[3])/2], bbox: s.bbox });
    setQuery(s.displayName.split(",")[0]);
    setSuggestion(null);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-[#F4F5F6]/95 backdrop-blur-sm border border-[#C8CFD5] rounded-lg px-2.5 py-1.5 shadow-panel transition-all focus-within:border-[#7A8791] focus-within:shadow-panel-lg">
        {loading
          ? <Loader2 className="w-3.5 h-3.5 text-[#7A8791] animate-spin flex-shrink-0" />
          : <Search className="w-3.5 h-3.5 text-[#AAB3BB] flex-shrink-0" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && suggestion) flyTo(suggestion); }}
          placeholder="Search location…"
          className="flex-1 bg-transparent text-[12px] text-[#1D2227] placeholder:text-[#AAB3BB] outline-none min-w-0"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button onClick={() => { setQuery(""); setSuggestion(null); setError(null); inputRef.current?.focus(); }} className="text-[#AAB3BB] hover:text-[#343B42] transition-colors">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {suggestion && (
        <button onClick={() => flyTo(suggestion)}
          className="absolute top-full mt-1 w-full bg-[#F4F5F6] border border-[#C8CFD5] rounded-lg shadow-panel-lg flex items-start gap-2 px-3 py-2 text-left hover:bg-[#E3E7EA] transition-colors animate-fade-in z-50"
        >
          <MapPin className="w-3.5 h-3.5 text-[#315F50] flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[12px] text-[#1D2227] font-medium truncate">{suggestion.displayName.split(",")[0]}</p>
            <p className="text-[10px] text-[#747F88] truncate">{suggestion.displayName.split(",").slice(1,3).join(",").trim()}</p>
          </div>
        </button>
      )}

      {error && !suggestion && (
        <div className="absolute top-full mt-1 w-full bg-[#F4F5F6] border border-[#C8CFD5] rounded-lg px-3 py-2 animate-fade-in z-50">
          <p className="text-[11px] text-[#A64B45]">{error}</p>
        </div>
      )}
    </div>
  );
}
