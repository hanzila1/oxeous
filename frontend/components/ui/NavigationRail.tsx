"use client";

import {
  SatelliteGlobeIcon,
  ComplianceShieldIcon,
  AgentSparkIcon,
  LayerStackIcon,
  SentinelTimelapseIcon,
} from "@/components/icons/EOIcons";
import { cn } from "@/lib/utils";
import { useStore, type SidePanelType } from "@/lib/store";

const NAV_ITEMS: { id: SidePanelType; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }[] = [
  { id: null,        icon: SatelliteGlobeIcon,    label: "Map",       desc: "Satellite view" },
  { id: "eudr",      icon: ComplianceShieldIcon,  label: "EUDR",      desc: "Compliance" },
  { id: "chat",      icon: AgentSparkIcon,        label: "Agent",     desc: "Spatial AI" },
  { id: "layers",    icon: LayerStackIcon,        label: "Layers",    desc: "Raster layers" },
  { id: "timelapse", icon: SentinelTimelapseIcon, label: "Timelapse", desc: "10m Time-series" },
];

export default function NavigationRail() {
  const { eudrPanelOpen, setEudrPanelOpen, rightPanel, setRightPanel, setEudrAuditTab } = useStore();

  const handleNav = (id: SidePanelType) => {
    if (id === "eudr") {
      setEudrPanelOpen(!eudrPanelOpen);
    } else if (id === "chat") {
      setRightPanel(rightPanel === "chat" ? null : "chat");
    } else if (id === "layers") {
      setRightPanel(rightPanel === "layers" ? null : "layers");
    } else if (id === "timelapse") {
      setEudrAuditTab("timelapse");
      setRightPanel(rightPanel === "timelapse" ? null : "timelapse");
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
      className="flex flex-col items-center flex-shrink-0 h-full glass border-r border-[#C8CFD5] z-20 shadow-[1px_0_4px_rgba(0,0,0,0.03)]"
      style={{ width: 68 }}
    >

      {/* Nav buttons */}
      <div className="flex flex-col items-center gap-2 pt-3 flex-1 w-full px-1.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label, desc }) => {
          const active =
            id === "eudr"
              ? eudrPanelOpen
              : id === "chat"
              ? rightPanel === "chat"
              : id === "layers"
              ? rightPanel === "layers"
              : id === "timelapse"
              ? rightPanel === "timelapse"
              : !eudrPanelOpen && !rightPanel;
          return (
            <button
              key={label}
              onClick={() => handleNav(id)}
              aria-label={`${label} - ${desc}`}
              className={cn(
                "group relative flex flex-col items-center justify-center w-full rounded-xl py-3 gap-1.5 border",
                "transition-all duration-150 select-none cursor-pointer",
                active
                  ? "bg-white text-[#1D2227] border-[#C8CFD5] shadow-xs font-bold"
                  : "border-transparent text-[#747F88] hover:bg-white/70 hover:text-[#1D2227]",
              )}
            >
              {active && (
                <span className="absolute -left-1.5 top-2.5 bottom-2.5 w-1 bg-[#315F50] rounded-r-full shadow-2xs" />
              )}
              <Icon className={cn("w-5 h-5 transition-colors", active ? "text-[#315F50]" : "text-[#7A8791] group-hover:text-[#1D2227]")} />
              <span className={cn("text-[10.5px] leading-none tracking-wide", active ? "font-bold text-[#1D2227]" : "font-semibold text-[#5B6773] group-hover:text-[#1D2227]")}>{label}</span>

              {/* Glass Tooltip */}
              <span className="oxe-tip" data-side="right">
                {label} <small>{desc}</small>
              </span>
            </button>
          );
        })}
      </div>

      {/* Version */}
      <div className="pb-3">
        <span className="text-[9px] text-[#AAB3BB] font-mono">v0.1</span>
      </div>
    </nav>
  );
}
