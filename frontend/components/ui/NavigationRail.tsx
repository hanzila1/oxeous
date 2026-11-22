"use client";

import {
  SatelliteGlobeIcon,
  ComplianceShieldIcon,
  AgentSparkIcon,
  LayerStackIcon,
  SentinelTimelapseIcon,
  SupplierLinkIcon,
} from "@/components/icons/EOIcons";
import { HelpCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, type SidePanelType } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";

const NAV_ITEMS: { id: SidePanelType; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }[] = [
  { id: null,        icon: SatelliteGlobeIcon,    label: "Map",       desc: "Satellite view" },
  { id: "eudr",      icon: ComplianceShieldIcon,  label: "EUDR",      desc: "Compliance" },
  { id: "timelapse", icon: SentinelTimelapseIcon, label: "Timelapse", desc: "10m Time-series" },
  { id: "chat",      icon: AgentSparkIcon,        label: "Agent",     desc: "Spatial AI" },
  { id: "layers",    icon: LayerStackIcon,        label: "Layers",    desc: "Raster layers" },
  { id: "suppliers", icon: SupplierLinkIcon,      label: "Suppliers", desc: "Magic-link intake" },
];

export default function NavigationRail() {
  const { leftPanel, setLeftPanel, rightPanel, setRightPanel, setTourOpen } = useStore();
  const { user, signOut } = useAuthStore();

  const initials = user?.full_name
    ? user.full_name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "OP";

  const handleNav = (id: SidePanelType) => {
    if (id === "eudr") {
      setLeftPanel(leftPanel === "eudr" ? null : "eudr");
    } else if (id === "timelapse") {
      setLeftPanel(leftPanel === "timelapse" ? null : "timelapse");
    } else if (id === "chat") {
      setRightPanel(rightPanel === "chat" ? null : "chat");
    } else if (id === "layers") {
      setRightPanel(rightPanel === "layers" ? null : "layers");
    } else if (id === "suppliers") {
      setRightPanel(rightPanel === "suppliers" ? null : "suppliers");
    } else if (id === null) {
      // Map view toggle
      if (leftPanel || rightPanel) {
        setLeftPanel(null);
        setRightPanel(null);
      } else {
        setLeftPanel("eudr");
        setRightPanel("chat");
      }
    }
  };

  return (
    <nav
      className="flex flex-col items-center flex-shrink-0 h-full bg-[#F4F5F6] border-r border-[#C8CFD5] z-40 shadow-[1px_0_4px_rgba(0,0,0,0.03)]"
      style={{ width: 68 }}
    >

      {/* Nav buttons */}
      <div className="flex flex-col items-center gap-2 pt-3 flex-1 w-full px-1.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label, desc }) => {
          const active =
            id === "eudr"
              ? leftPanel === "eudr"
              : id === "timelapse"
              ? leftPanel === "timelapse"
              : id === "chat"
              ? rightPanel === "chat"
              : id === "layers"
              ? rightPanel === "layers"
              : id === "suppliers"
              ? rightPanel === "suppliers"
              : !leftPanel && !rightPanel;
          return (
            <button
              key={label}
              data-tour={`nav-${id ?? "map"}`}
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

      {/* Replay Guided Walkthrough + User Account Avatar + Sign Out */}
      <div className="flex flex-col items-center gap-2 pb-2 w-full px-2 border-t border-[#D8DFE4] pt-2.5">
        <button
          type="button"
          onClick={() => setTourOpen(true)}
          aria-label="Interactive walkthrough"
          className="group relative flex h-8 w-8 items-center justify-center rounded-lg text-[#5B6773] transition-colors hover:bg-white hover:text-[#315F50] cursor-pointer"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="oxe-tip" data-side="right">
            Guided Tour <small>Step-by-step walkthrough</small>
          </span>
        </button>

        {user && (
          <>
            <div className="group relative flex items-center justify-center">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#315F50] text-[11px] font-bold text-white shadow-xs">
                {initials}
              </div>
              <span className="oxe-tip" data-side="right">
                {user.full_name}
                <small>{user.organization || user.email}</small>
              </span>
            </div>

            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="group relative flex h-8 w-8 items-center justify-center rounded-lg text-[#747F88] transition-colors hover:bg-rose-50 hover:text-[#A64B45] cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="oxe-tip" data-side="right">
                Sign out <small>Lock cockpit session</small>
              </span>
            </button>
          </>
        )}
      </div>

      {/* Version */}
      <div className="pb-2.5">
        <span className="text-[9px] text-[#AAB3BB] font-mono">v0.1</span>
      </div>
    </nav>
  );
}
