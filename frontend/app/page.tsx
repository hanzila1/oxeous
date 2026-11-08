"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import MapCanvas from "@/components/map/MapCanvas";
import NavigationRail from "@/components/ui/NavigationRail";
import ConversationPanel from "@/components/chat/ConversationPanel";
import LayerSidebar from "@/components/layers/LayerSidebar";
import TimelapseSidebar from "@/components/layers/TimelapseSidebar";
import EUDRDashboard from "@/components/eudr/EUDRDashboard";
import ProgressOverlay from "@/components/ui/ProgressOverlay";
import TopFloatingBar from "@/components/ui/TopFloatingBar";
import BrandLogoBadge from "@/components/ui/BrandLogoBadge";
import CloudTelemetryBadge from "@/components/ui/CloudTelemetryBadge";
import DossierModal from "@/components/eudr/DossierModal";
import AnalyticsDeckModal from "@/components/eudr/AnalyticsDeckModal";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Shared panel widths - standardized left panels (EUDR & Timelapse) to 460px to eliminate distracting width jumps */
const EUDR_PANEL_WIDTH_DEFAULT = 460;
const EUDR_PANEL_WIDTH_EXPANDED = 640;
const TIMELAPSE_PANEL_WIDTH = EUDR_PANEL_WIDTH_DEFAULT;
const RIGHT_PANEL_WIDTH_DEFAULT = 480; // comfortable standard width for chat & tables
const RIGHT_PANEL_WIDTH_EXPANDED = 700; // wide mode with arrow toggle for deep reading

function AppShell() {
  const {
    leftPanel,
    setLeftPanel,
    eudrPanelExpanded,
    rightPanel,
    setRightPanel,
    chatPanelExpanded,
    setChatPanelExpanded,
    customRightPanelWidth,
    setCustomRightPanelWidth,
    activeDossier,
    setActiveDossier,
    activeAnalyticsResult,
    setActiveAnalyticsResult,
    timelapsePlaying,
    timelapseFrames,
    setTimelapseIndex,
  } = useStore();

  const [isResizingRight, setIsResizingRight] = useState(false);

  // Allow fluid interactive drag-resizing on the left edge of the right panel
  useEffect(() => {
    if (!isResizingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(420, Math.min(880, newWidth));
      setCustomRightPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingRight, setCustomRightPanelWidth]);

  // Keep Timelapse map animation advancing globally even when user switches left/right panels
  useEffect(() => {
    if (!timelapsePlaying || timelapseFrames.length === 0) return;
    const id = setInterval(() => {
      setTimelapseIndex((prev) => (prev + 1) % timelapseFrames.length);
    }, 1500);
    return () => clearInterval(id);
  }, [timelapsePlaying, timelapseFrames.length, setTimelapseIndex]);

  // Remember the last left/right views so content stays visible while panels collapse
  const [lastLeftPanel, setLastLeftPanel] = useState(leftPanel);
  useEffect(() => {
    if (leftPanel) setLastLeftPanel(leftPanel);
  }, [leftPanel]);
  const shownLeftPanel = leftPanel ?? lastLeftPanel;

  const activeLeftWidth =
    shownLeftPanel === "timelapse"
      ? TIMELAPSE_PANEL_WIDTH
      : eudrPanelExpanded
      ? EUDR_PANEL_WIDTH_EXPANDED
      : EUDR_PANEL_WIDTH_DEFAULT;

  const [lastRightPanel, setLastRightPanel] = useState(rightPanel);
  useEffect(() => {
    if (rightPanel) setLastRightPanel(rightPanel);
  }, [rightPanel]);
  const shownRightPanel = rightPanel ?? lastRightPanel;

  const activeRightWidth = customRightPanelWidth
    ? customRightPanelWidth
    : chatPanelExpanded
    ? RIGHT_PANEL_WIDTH_EXPANDED
    : RIGHT_PANEL_WIDTH_DEFAULT;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#F4F5F6] select-none">

      {/* -- 1. Navigation Rail - fixed left ------------------------ */}
      <div className="absolute top-0 bottom-0 left-0 w-[68px] z-40 bg-[#F4F5F6]">
        <NavigationRail />
      </div>

      {/* -- 2. Left Panel (EUDR Suite OR Standalone Plot Timelapse) - slides in from behind rail */}
      <div
        className={cn(
          "absolute top-0 bottom-0 left-[68px] z-20 flex overflow-hidden",
          "border-r border-[#C8CFD5] bg-[#F4F5F6] shadow-[8px_0_32px_rgba(29,34,39,0.08)]",
          "transition-transform duration-300 ease-panel will-change-transform"
        )}
        style={{
          width: activeLeftWidth,
          transform: leftPanel ? "translateX(0)" : "translateX(-100%)",
          pointerEvents: leftPanel ? "auto" : "none",
        }}
        aria-hidden={!leftPanel}
      >
        <div className="relative w-full h-full">
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-200 ease-panel",
              shownLeftPanel === "eudr" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
            )}
            aria-hidden={shownLeftPanel !== "eudr"}
          >
            <EUDRDashboard onClose={() => setLeftPanel(null)} />
          </div>
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-200 ease-panel",
              shownLeftPanel === "timelapse" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
            )}
            aria-hidden={shownLeftPanel !== "timelapse"}
          >
            <TimelapseSidebar onClose={() => setLeftPanel(null)} />
          </div>
        </div>
      </div>

      {/* -- 3. Map (Fixed Full-Bleed Viewport: Zero resize, zero canvas stretching, zero WebGL stutter) -- */}
      <div className="absolute top-0 bottom-0 left-[68px] right-0 z-0 overflow-hidden bg-[#0c141c]">
        <MapCanvas />
        <BrandLogoBadge
          style={{
            left: leftPanel ? `${activeLeftWidth + 14}px` : "14px",
            transition: "left 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        <CloudTelemetryBadge
          style={{
            right: rightPanel ? `${activeRightWidth + 14}px` : "14px",
            transition: isResizingRight ? "none" : "right 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        <TopFloatingBar
          style={{
            right: rightPanel ? `${activeRightWidth + 14}px` : "14px",
            transition: isResizingRight ? "none" : "right 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        <ProgressOverlay />
      </div>

      {/* -- 4 & 5. Right panel (Agent Chat or Raster Layers) - slides in from right as hardware-accelerated overlay */}
      <div
        className={cn(
          "absolute top-0 bottom-0 right-0 z-20 overflow-hidden",
          "border-l border-[#C8CFD5] bg-[#F4F5F6] shadow-[-8px_0_32px_rgba(29,34,39,0.08)] will-change-transform"
        )}
        style={{
          width: activeRightWidth,
          transform: rightPanel ? "translateX(0)" : "translateX(100%)",
          pointerEvents: rightPanel ? "auto" : "none",
          transition: isResizingRight
            ? "none"
            : "transform 300ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        aria-hidden={!rightPanel}
      >
        <div className="relative w-full h-full">
          {/* Interactive Drag-Resize Handle on Left Border */}
          {rightPanel && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingRight(true);
              }}
              onDoubleClick={() => {
                setCustomRightPanelWidth(null);
                setChatPanelExpanded((prev) => !prev);
              }}
              className="absolute top-0 bottom-0 left-0 w-2.5 -translate-x-1.5 cursor-ew-resize hover:bg-[#315F50]/20 z-30 group flex items-center justify-center select-none"
              title="Drag to resize panel width · Double-click to toggle wide mode"
            >
              <div className="w-0.5 h-10 rounded-full bg-[#C8CFD5] group-hover:bg-[#315F50] transition-colors" />
            </div>
          )}
          {/* Both views stay mounted so switching crossfades and closing never flashes empty */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-200 ease-panel",
              shownRightPanel === "chat" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
            )}
            aria-hidden={shownRightPanel !== "chat"}
          >
            <ConversationPanel onClose={() => setRightPanel(null)} />
          </div>
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-200 ease-panel",
              shownRightPanel === "layers" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
            )}
            aria-hidden={shownRightPanel !== "layers"}
          >
            <LayerSidebar onClose={() => setRightPanel(null)} />
          </div>
        </div>
      </div>

      {/* -- 6. Official Publication Dossier Modal ----------------- */}
      {activeDossier && (
        <DossierModal
          dossierKey={activeDossier}
          onClose={() => setActiveDossier(null)}
        />
      )}

      {/* -- 7. Interactive Spatial Analytics & Chart Deck Modal ----- */}
      {activeAnalyticsResult && (
        <AnalyticsDeckModal
          result={activeAnalyticsResult}
          onClose={() => setActiveAnalyticsResult(null)}
        />
      )}

    </div>
  );
}

export default function HomePage() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
