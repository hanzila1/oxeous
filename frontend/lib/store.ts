import { create } from "zustand";
import type {
  AnalysisResponse,
  ConversationMessage,
  MapViewport,
  EUDRAnalysisResponse,
} from "@oxeous/shared-types";

export type SidePanelType = "eudr" | "chat" | "layers" | "audit" | null;

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

export type RightPanelType = "chat" | "layers" | null;

interface OxeousState {
  // Navigation & Panels (Simultaneous EUDR + Right Panel)
  eudrPanelOpen: boolean;
  setEudrPanelOpen: (open: boolean) => void;
  rightPanel: RightPanelType;
  setRightPanel: (panel: RightPanelType) => void;

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
  activePrithviJob: string | null;
  setActivePrithviJob: (id: string | null) => void;
}

export const useStore = create<OxeousState>((set) => ({
  eudrPanelOpen: false,
  setEudrPanelOpen: (open) => set({ eudrPanelOpen: open }),

  rightPanel: "chat",
  setRightPanel: (panel) => set({ rightPanel: panel }),

  activePanel: "chat",
  setActivePanel: (panel) =>
    set((s) => {
      if (panel === "eudr") {
        return { eudrPanelOpen: !s.eudrPanelOpen, activePanel: !s.eudrPanelOpen ? "eudr" : null };
      }
      if (panel === "chat" || panel === "layers") {
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

  // Start with NO pre-loaded layers — clean satellite basemap only.
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
  activePrithviJob: null,
  setActivePrithviJob: (id) => set({ activePrithviJob: id }),
}));
