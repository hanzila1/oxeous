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

/** Shared panel widths - upgraded default from 380px to 460px (and 640px expanded) so cards and charts have ample room to breathe */
const EUDR_PANEL_WIDTH_DEFAULT = 460;
const EUDR_PANEL_WIDTH_EXPANDED = 640;
const TIMELAPSE_PANEL_WIDTH = 420;
const RIGHT_PANEL_WIDTH = 400;

function AppShell() {
  const {
    leftPanel,
    setLeftPanel,
    eudrPanelExpanded,
    rightPanel,
    setRightPanel,
    activeDossier,
    setActiveDossier,
    activeAnalyticsResult,
    setActiveAnalyticsResult,
    timelapsePlaying,
    timelapseFrames,
    setTimelapseIndex,
  } = useStore();

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

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F6]">

      {/* -- 1. Navigation Rail - fixed left ------------------------ */}
      <NavigationRail />

      {/* -- 2. Left Panel (EUDR Suite OR Standalone Plot Timelapse) - slides in from left */}
      <div
        className="flex-shrink-0 h-full overflow-hidden flex justify-end transition-[width] duration-300 ease-panel"
        style={{ width: leftPanel ? activeLeftWidth : 0 }}
        aria-hidden={!leftPanel}
      >
        <div
          className={cn(
            "relative h-full flex-shrink-0 border-r border-[#C8CFD5] bg-[#F4F5F6] transition-all duration-300 ease-panel",
            leftPanel ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          style={{ width: activeLeftWidth }}
        >
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

      {/* -- 3. Map with Top Floating Bar -------------------------- */}
      <div className="relative flex-1 min-w-0 h-full overflow-hidden">
        <BrandLogoBadge />
        <CloudTelemetryBadge />
        <TopFloatingBar />
        <MapCanvas />
        <ProgressOverlay />
      </div>

      {/* -- 4 & 5. Right panel (chat or layers) - slides in from right */}
      <div
        className="flex-shrink-0 h-full overflow-hidden transition-[width] duration-300 ease-panel"
        style={{ width: rightPanel ? RIGHT_PANEL_WIDTH : 0 }}
        aria-hidden={!rightPanel}
      >
        <div
          className={cn(
            "relative h-full border-l border-[#C8CFD5] bg-[#F4F5F6] transition-opacity duration-300 ease-panel",
            rightPanel ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          style={{ width: RIGHT_PANEL_WIDTH }}
        >
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
