"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Calculator,
  Calendar,
  Compass,
  FileCheck2,
  Layers,
  Play,
  Radio,
  Scissors,
  Search,
  Sparkles,
  X,
} from "lucide-react";

interface CommandItem {
  id: string;
  group: "Platform" | "Interactive Tools" | "Commodities";
  label: string;
  hint: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  onPilot,
}: {
  open: boolean;
  onClose: () => void;
  onPilot: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const jump = (hash: string) => {
    onClose();
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const items: CommandItem[] = [
    {
      id: "cockpit",
      group: "Platform",
      label: "Launch Live GIS Cockpit",
      hint: "/cockpit",
      icon: <Compass className="h-4 w-4 text-canopy" />,
      action: () => {
        onClose();
        router.push("/cockpit/");
      },
    },
    {
      id: "demo",
      group: "Platform",
      label: "Watch Interactive Product Demo",
      hint: "#demo",
      icon: <Play className="h-4 w-4 text-canopy" />,
      action: () => jump("#demo"),
    },
    {
      id: "pilot",
      group: "Platform",
      label: "Request an Enterprise Pilot",
      hint: "Contact",
      icon: <Sparkles className="h-4 w-4 text-canopy" />,
      action: () => {
        onClose();
        onPilot();
      },
    },
    {
      id: "radar",
      group: "Interactive Tools",
      label: "Test All-Weather Radar vs. Cloud Cover",
      hint: "01 · Vision",
      icon: <Radio className="h-4 w-4 text-canopy" />,
      action: () => jump("#platform"),
    },
    {
      id: "salvage",
      group: "Interactive Tools",
      label: "Simulate Surgical Plot Boundary Trim",
      hint: "02 · Salvage",
      icon: <Scissors className="h-4 w-4 text-canopy" />,
      action: () => jump("#platform"),
    },
    {
      id: "filing",
      group: "Interactive Tools",
      label: "Inspect 30-Second EU TRACES Filing Stack",
      hint: "03 · Filing",
      icon: <FileCheck2 className="h-4 w-4 text-canopy" />,
      action: () => jump("#platform"),
    },
    {
      id: "calculator",
      group: "Interactive Tools",
      label: "Calculate 4% EUDR Fine & Demurrage Savings",
      hint: "ROI Estimator",
      icon: <Calculator className="h-4 w-4 text-canopy" />,
      action: () => jump("#impact"),
    },
    {
      id: "regulation",
      group: "Commodities",
      label: "Explore the 7 Regulated EUDR Commodities",
      hint: "Dec 31, 2026",
      icon: <Calendar className="h-4 w-4 text-canopy" />,
      action: () => jump("#regulation"),
    },
    {
      id: "layers",
      group: "Commodities",
      label: "Compare Satellite & Radar Benchmark (100% vs 30%)",
      hint: "Verified Accuracy",
      icon: <Layers className="h-4 w-4 text-canopy" />,
      action: () => jump("#impact"),
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.group.toLowerCase().includes(query.toLowerCase()) ||
      item.hint.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
      } else if (open && e.key === "Escape") {
        onClose();
      } else if (open && e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      } else if (open && e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
      } else if (open && e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, filtered, activeIndex]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command menu"
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/50 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_24px_80px_rgba(18,48,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-line bg-white px-5 py-4">
          <Search className="h-4 w-4 text-canopy shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search Oxeous... (e.g. Cockpit, Radar, Calculator)"
            className="w-full bg-transparent text-[14.5px] text-ink placeholder:text-ink-2/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-paper px-2 py-0.5 font-data text-[10.5px] text-ink-2 hover:text-ink"
          >
            ESC
          </button>
        </div>

        {/* Command Items List */}
        <div className="max-h-[360px] overflow-y-auto p-2.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[13.5px] text-ink-2">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.action}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors ${
                    active ? "bg-ink text-paper shadow-sm" : "text-ink hover:bg-mist/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-xl border ${
                        active
                          ? "border-white/15 bg-white/10 text-emerald-300"
                          : "border-line bg-white text-canopy"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <div className="font-display text-[14px] font-medium">{item.label}</div>
                      <div
                        className={`font-data text-[10.5px] uppercase tracking-wider ${
                          active ? "text-paper/65" : "text-ink-2"
                        }`}
                      >
                        {item.group}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-data text-[11px] ${
                      active ? "bg-white/15 text-paper" : "bg-white text-ink-2 border border-line"
                    }`}
                  >
                    {item.hint}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-line bg-mist/40 px-5 py-2.5 font-data text-[11px] text-ink-2">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Oxeous Spatial OS</span>
        </div>
      </div>
    </div>
  );
}
