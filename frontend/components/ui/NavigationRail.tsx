"use client";

import { Globe2, ShieldCheck, Layers, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, type SidePanelType } from "@/lib/store";

const NAV_ITEMS: { id: SidePanelType; icon: typeof Globe2; label: string; desc: string }[] = [
  { id: null,     icon: Globe2,        label: "Map",     desc: "Satellite view" },
  { id: "eudr",   icon: ShieldCheck,   label: "EUDR",    desc: "Compliance" },
  { id: "chat",   icon: MessageSquare, label: "Agent",   desc: "Spatial AI" },
  { id: "layers", icon: Layers,        label: "Layers",  desc: "Raster layers" },
];

export default function NavigationRail() {
  const { eudrPanelOpen, setEudrPanelOpen, rightPanel, setRightPanel } = useStore();

  const handleNav = (id: SidePanelType) => {
    if (id === "eudr") {
      setEudrPanelOpen(!eudrPanelOpen);
    } else if (id === "chat") {
      setRightPanel(rightPanel === "chat" ? null : "chat");
    } else if (id === "layers") {
      setRightPanel(rightPanel === "layers" ? null : "layers");
    } else if (id === null) {
      // Map view toggle
      if (eudrPanelOpen || rightPanel) {
        setEudrPanelOpen(false);
        setRightPanel(null);
      } else {
        setEudrPanelOpen(true);
        setRightPanel("chat");
      }
    }
  };

  return (
    <nav
      className="flex flex-col items-center flex-shrink-0 h-full bg-[#F4F5F6] border-r border-[#C8CFD5] z-20"
      style={{ width: 56 }}
    >
      {/* ── Nav buttons ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1 pt-3 flex-1 w-full px-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label, desc }) => {
          const active =
            id === "eudr"
              ? eudrPanelOpen
              : id === "chat"
              ? rightPanel === "chat"
              : id === "layers"
              ? rightPanel === "layers"
              : !eudrPanelOpen && !rightPanel;
          return (
            <button
              key={label}
              onClick={() => handleNav(id)}
              title={`${label} — ${desc}`}
              aria-label={label}
              className={cn(
                "relative group flex flex-col items-center justify-center w-full rounded-lg py-2.5 gap-0.5",
                "transition-all duration-100 select-none",
                active
                  ? "bg-[#E3E7EA] text-[#315F50]"
                  : "text-[#7A8791] hover:bg-[#E3E7EA] hover:text-[#343B42]",
              )}
            >
              <Icon strokeWidth={active ? 2.2 : 1.7} className="w-[17px] h-[17px]" />
              <span className="text-[9px] font-medium leading-none tracking-wide">{label}</span>

              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-2 z-50 px-2 py-1 rounded-md bg-[#343B42] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-panel">
                {label} — {desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Version ─────────────────────────────────────────────────────── */}
      <div className="pb-3">
        <span className="text-[9px] text-[#AAB3BB] font-mono">v0.1</span>
      </div>
    </nav>
  );
}
