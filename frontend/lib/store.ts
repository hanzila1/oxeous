import { create } from "zustand";
import type {
  AnalysisResponse,
  ConversationMessage,
  MapViewport,
  EUDRAnalysisResponse,
} from "@oxeous/shared-types";

export type SidePanelType = "eudr" | "chat" | "layers" | "timelapse" | "audit" | null;
export type EudrAuditTabType = "charts" | "timelapse" | "overview" | "pwri" | "layers" | "legality";

export interface ActiveLayer {
  id: string;
  label: string;
  type: "raster" | "geojson";
  tileUrl?: string;
  overlayUrl?: string;
  visible: boolean;
  opacity: number;
  legend?: AnalysisResponse["legend"];
  analysisType: string;
  layer_type?: string;
}

export interface AgentLogEntry {
  id: string;
  label: string;
  detail: string;
  status: "done" | "active" | "pending";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  analysisResult?: AnalysisResponse;
  eudrResult?: EUDRAnalysisResponse;
  agentLogs?: AgentLogEntry[];
  isLoading?: boolean;
  error?: string;
}

export type RightPanelType = "chat" | "layers" | "timelapse" | null;

interface OxeousState {
  // Navigation & Panels (Simultaneous EUDR + Right Panel)
  eudrPanelOpen: boolean;
  setEudrPanelOpen: (open: boolean) => void;
  rightPanel: RightPanelType;
  setRightPanel: (panel: RightPanelType) => void;
  eudrAuditTab: EudrAuditTabType;
  setEudrAuditTab: (tab: EudrAuditTabType) => void;

  // Legacy activePanel compatibility
  activePanel: SidePanelType;
  setActivePanel: (panel: SidePanelType) => void;

  // Map Viewport
  viewport: MapViewport;
  setViewport: (v: Partial<MapViewport>) => void;

  // Map GeoJSON Vector Plot Layer
  activeGeoJSON: object | null;
  setActiveGeoJSON: (geojson: object | null) => void;

  // AOI drawing state
  drawingAOI: boolean;
  setDrawingAOI: (v: boolean) => void;

  // Map Raster Layers
  layers: ActiveLayer[];
  addLayer: (layer: ActiveLayer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, patch: Partial<ActiveLayer>) => void;
  reorderLayers: (newLayers: ActiveLayer[]) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;

  // Conversation
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  conversationHistory: ConversationMessage[];
  appendHistory: (msg: ConversationMessage) => void;

  // EUDR DDS Audit History
  ddsHistory: EUDRAnalysisResponse[];
  addDDSHistory: (res: EUDRAnalysisResponse) => void;

  // Additional UI State
  compareMode: boolean;
  setCompareMode: (v: boolean) => void;
  comparePosition: number;
  setComparePosition: (pos: number) => void;
  compareLeftLayerId: string | null;
  compareRightLayerId: string | null;
  setCompareLeftLayerId: (id: string | null) => void;
  setCompareRightLayerId: (id: string | null) => void;
  swapCompareLayers: () => void;
  activePrithviJob: string | null;
  setActivePrithviJob: (id: string | null) => void;

  // Publication Dossier Modal
  activeDossier: string | null;
  setActiveDossier: (dossierKey: string | null) => void;

  // Radar Sweep Scan State
  isScanning: boolean;
  setIsScanning: (v: boolean) => void;

  // Expanded EUDR Workbench & Analytics Deck Modal
  eudrPanelExpanded: boolean;
  setEudrPanelExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  activeAnalyticsResult: EUDRAnalysisResponse | null;
  setActiveAnalyticsResult: (res: EUDRAnalysisResponse | null) => void;

  // Spatial Pixel Inspector Modal
  pixelInspectorOpen: boolean;
  setPixelInspectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export function resolveCompareLayerIds(
  layers: ActiveLayer[],
  leftId: string | null,
  rightId: string | null
): { effectiveLeftId: string; effectiveRightId: string } {
  let resolvedLeft = leftId;
  let resolvedRight = rightId;

  if (!resolvedLeft) {
    const jrc = layers.find((l) => l.id.includes("jrc") || l.id.includes("gfc2020"));
    if (jrc) {
      resolvedLeft = jrc.id;
    } else if (layers.length > 0) {
      resolvedLeft = layers[0].id;
    } else {
      resolvedLeft = "basemap";
    }
  }

  if (!resolvedRight) {
    if (resolvedLeft.includes("jrc") || resolvedLeft.includes("gfc2020")) {
      const pwri = layers.find((l) => l.id.includes("pwri") || l.id.includes("intersection"));
      const hansen = layers.find((l) => l.id.includes("hansen") || l.id.includes("loss"));
      resolvedRight = pwri ? pwri.id : (hansen ? hansen.id : "basemap");
    } else if (layers.length > 1 && layers[0].id === resolvedLeft) {
      resolvedRight = layers[1].id;
    } else {
      resolvedRight = "basemap";
    }
  }

  return { effectiveLeftId: resolvedLeft, effectiveRightId: resolvedRight };
}

export const useStore = create<OxeousState>((set) => ({
  isScanning: false,
  setIsScanning: (v) => set({ isScanning: v }),

  activeDossier: null,
  setActiveDossier: (dossierKey) => set({ activeDossier: dossierKey }),

  pixelInspectorOpen: false,
  setPixelInspectorOpen: (open) =>
    set((s) => ({
      pixelInspectorOpen: typeof open === "function" ? open(s.pixelInspectorOpen) : open,
    })),

  eudrPanelExpanded: false,
  setEudrPanelExpanded: (expanded) =>
    set((s) => ({
      eudrPanelExpanded: typeof expanded === "function" ? expanded(s.eudrPanelExpanded) : expanded,
    })),
  activeAnalyticsResult: null,
  setActiveAnalyticsResult: (res) => set({ activeAnalyticsResult: res }),

  eudrPanelOpen: false,
  setEudrPanelOpen: (open) => set({ eudrPanelOpen: open }),

  rightPanel: "chat",
  setRightPanel: (panel) => set({ rightPanel: panel }),

  eudrAuditTab: "charts",
  setEudrAuditTab: (tab) => set({ eudrAuditTab: tab }),

  activePanel: "chat",
  setActivePanel: (panel) =>
    set((s) => {
      if (panel === "eudr") {
        return { eudrPanelOpen: !s.eudrPanelOpen, activePanel: !s.eudrPanelOpen ? "eudr" : null };
      }
      if (panel === "chat" || panel === "layers" || panel === "timelapse") {
        const nextRight = s.rightPanel === panel ? null : panel;
        return { rightPanel: nextRight, activePanel: nextRight };
      }
      return { eudrPanelOpen: false, rightPanel: null, activePanel: null };
    }),

  viewport: {
    center: [-55.5, -12.5],
    zoom: 5.5,
    bbox: [-60, -15, -50, -10],
  },
  setViewport: (v) =>
    set((s) => ({ viewport: { ...s.viewport, ...v } })),

  activeGeoJSON: null,
  setActiveGeoJSON: (geojson) => set({ activeGeoJSON: geojson }),

  drawingAOI: false,
  setDrawingAOI: (v) => set({ drawingAOI: v }),

  // Start with NO pre-loaded layers - clean satellite basemap only.
  // GEE layers are added dynamically after each EUDR assessment completes.
  layers: [],
  addLayer: (layer) =>
    set((s) => ({
      layers: [
        ...s.layers.filter((l) => l.id !== layer.id),
        layer,
      ],
    })),
  removeLayer: (id) =>
    set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),
  updateLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  reorderLayers: (newLayers) => set({ layers: newLayers }),
  moveLayer: (fromIndex, toIndex) =>
    set((s) => {
      if (fromIndex < 0 || fromIndex >= s.layers.length || toIndex < 0 || toIndex >= s.layers.length) return s;
      const next = [...s.layers];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { layers: next };
    }),

  messages: [],
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  conversationHistory: [],
  appendHistory: (msg) =>
    set((s) => ({ conversationHistory: [...s.conversationHistory, msg] })),

  ddsHistory: [],
  addDDSHistory: (res) =>
    set((s) => ({
      ddsHistory: [res, ...s.ddsHistory.filter((item) => item.dds?.dds_id !== res.dds?.dds_id)],
    })),

  compareMode: false,
  setCompareMode: (v) => set({ compareMode: v }),
  comparePosition: 50,
  setComparePosition: (pos) => set({ comparePosition: Math.max(0, Math.min(100, pos)) }),
  compareLeftLayerId: null,
  compareRightLayerId: null,
  setCompareLeftLayerId: (id) => set({ compareLeftLayerId: id }),
  setCompareRightLayerId: (id) => set({ compareRightLayerId: id }),
  swapCompareLayers: () => set((s) => { const { effectiveLeftId, effectiveRightId } = resolveCompareLayerIds(s.layers, s.compareLeftLayerId, s.compareRightLayerId); return { compareLeftLayerId: effectiveRightId, compareRightLayerId: effectiveLeftId }; }),
  activePrithviJob: null,
  setActivePrithviJob: (id) => set({ activePrithviJob: id }),
}));
