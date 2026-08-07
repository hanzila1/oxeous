"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import MapCanvas from "@/components/map/MapCanvas";
import NavigationRail from "@/components/ui/NavigationRail";
import ConversationPanel from "@/components/chat/ConversationPanel";
import LayerSidebar from "@/components/layers/LayerSidebar";
import EUDRDashboard from "@/components/eudr/EUDRDashboard";
import ProgressOverlay from "@/components/ui/ProgressOverlay";
import { useStore } from "@/lib/store";

function AppShell() {
  const { activePanel, setActivePanel } = useStore();

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F4F5F6]">

      {/* ── 1. Navigation Rail — 52px fixed ─────────────────────── */}
      <NavigationRail />

      {/* ── 2. EUDR panel — 360px, slides in from left ──────────── */}
      {activePanel === "eudr" && (
        <div className="flex-shrink-0 w-[360px] h-full border-r border-[#C8CFD5] shadow-panel animate-slide-left overflow-hidden">
          <EUDRDashboard onClose={() => setActivePanel(null)} />
        </div>
      )}

      {/* ── 3. Map — takes all remaining width ──────────────────── */}
      <div className="relative flex-1 min-w-0 h-full">
        <MapCanvas />
        <ProgressOverlay />
      </div>

      {/* ── 4. Chat panel — 340px fixed right ───────────────────── */}
      {activePanel === "chat" && (
        <div className="flex-shrink-0 w-[340px] h-full border-l border-[#C8CFD5] shadow-panel animate-slide-in overflow-hidden">
          <ConversationPanel onClose={() => setActivePanel(null)} />
        </div>
      )}

      {/* ── 5. Layers panel — 300px fixed right ─────────────────── */}
      {activePanel === "layers" && (
        <div className="flex-shrink-0 w-[300px] h-full border-l border-[#C8CFD5] shadow-panel animate-slide-in overflow-hidden">
          <LayerSidebar onClose={() => setActivePanel(null)} />
        </div>
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
