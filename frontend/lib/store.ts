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
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  analysisResult?: AnalysisResponse;
  isLoading?: boolean;
  error?: string;
}

interface OxeousState {
  // Navigation & Side Panel Drawer (Exclusive)
  activePanel: SidePanelType;
  setActivePanel: (panel: SidePanelType) => void;

  // Map Viewport
  viewport: MapViewport;
  setViewport: (v: Partial<MapViewport>) => void;

  // Map GeoJSON Vector Plot Layer
  activeGeoJSON: object | null;
  setActiveGeoJSON: (geojson: object | null) => void;

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
  activePanel: "eudr",
  setActivePanel: (panel) =>
    set((s) => ({ activePanel: s.activePanel === panel ? null : panel })),

  viewport: {
    center: [-55.5, -12.5],
    zoom: 5.5,
    bbox: [-60, -15, -50, -10],
  },
  setViewport: (v) =>
    set((s) => ({ viewport: { ...s.viewport, ...v } })),

  activeGeoJSON: null,
  setActiveGeoJSON: (geojson) => set({ activeGeoJSON: geojson }),

  layers: [
    // ── LAYER 1: Hansen GFC Forest Loss Year (2001–2023) ─────────────────────
    // This IS the EUDR deforestation data. Red pixels = forest cleared after
    // the cutoff year. Dark red = recent (post-2020). Source: Hansen/UMD/Google.
    // Tiles confirmed working from Google Cloud Storage.
    {
      id: "hansen-gfc-loss-year",
      label: "Hansen GFC · Forest Loss Year (2001–2023)",
      type: "raster",
      tileUrl: "https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.11/loss_year/{z}/{x}/{y}.png",
      visible: true,
      opacity: 0.85,
      legend: {
        title: "Hansen GFC Forest Loss Year",
        colormap: "YlOrRd",
        min: 2001,
        max: 2023,
        units: "Year",
        steps: 5,
      },
      analysisType: "land_disturbance",
    },
    // ── LAYER 2: Hansen GFC Forest Gain (2000–2020) ──────────────────────────
    // Green pixels = where forest grew back. Shows net change context.
    // Note: gain layer shows as uniform colour — still useful for context.
    {
      id: "hansen-gfc-loss-year-v1.6",
      label: "Hansen GFC v1.6 · Historical Loss (2001–2020)",
      type: "raster",
      tileUrl: "https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.6/loss_year/{z}/{x}/{y}.png",
      visible: false,
      opacity: 0.60,
      legend: {
        title: "Historical Forest Loss (2001–2020)",
        colormap: "YlOrRd",
        min: 2001,
        max: 2020,
        units: "Year",
        steps: 5,
      },
      analysisType: "vegetation_health_comparison",
    },
    // ── LAYER 3: GFW Primary Forest 2001 Baseline ────────────────────────────
    // Shows where intact primary forest was in 2001. Confirms EUDR baseline.
    {
      id: "gfw-primary-forest",
      label: "GFW · Primary Forest Baseline 2001",
      type: "raster",
      tileUrl: "https://tiles.globalforestwatch.org/umd_regional_primary_forest_2001/v201901/default/{z}/{x}/{y}.png",
      visible: false,
      opacity: 0.65,
      legend: {
        title: "Primary Forest Cover 2001",
        colormap: "RdYlGn",
        min: 0,
        max: 1,
        units: "",
        steps: 2,
      },
      analysisType: "vegetation_health_comparison",
    },
  ],
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
