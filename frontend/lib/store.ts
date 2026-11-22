import { create } from "zustand";
import type {
  AnalysisResponse,
  ConversationMessage,
  MapViewport,
  EUDRAnalysisResponse,
  EUDRCommodity,
} from "@oxeous/shared-types";
import type { BatchPlotItem } from "./plotParser";
import { extractBboxFromGeometry } from "./maplibre";

export type SidePanelType = "eudr" | "chat" | "layers" | "timelapse" | "suppliers" | "audit" | null;
export type LeftPanelType = "eudr" | "timelapse" | null;
export type EudrAuditTabType = "charts" | "overview" | "pwri" | "layers" | "legality";

export interface PendingSupplierAudit {
  geometry: object;
  commodity: EUDRCommodity;
  countryCode: string;
  countryName: string;
  areaHa?: number;
  supplierName?: string;
  supplierToken?: string;
  ts: number;
}

export interface TimelapseFrameItem {
  year: number;
  label: string;
  is_cutoff: boolean;
  rgb_tile_url: string | null;
  nir_tile_url: string | null;
  pinpoint_tile_url?: string | null;
  rgb_thumb_url: string | null;
  nir_thumb_url: string | null;
  pinpoint_thumb_url?: string | null;
  sensor: string;
}

export interface ActiveLayer {
  id: string;
  label: string;
  type: "raster" | "geojson";
  tileUrl?: string;
  geojsonData?: object;
  overlayUrl?: string;
  visible: boolean;
  opacity: number;
  legend?: AnalysisResponse["legend"];
  analysisType: string;
  layer_type?: string;
  /** Analysis / location grouping so multiple audits never collide in LayerSidebar */
  groupId?: string;
  groupLabel?: string;
  groupCountry?: string;
  groupCommodity?: string;
  groupBbox?: [number, number, number, number];
  groupGeometry?: object;
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

export type RightPanelType = "chat" | "layers" | "suppliers" | null;
export type BasemapMode = "satellite" | "light";

interface OxeousState {
  // Navigation & Panels (Left Panel: EUDR or Timelapse · Right Panel: Agent or Layers)
  leftPanel: LeftPanelType;
  setLeftPanel: (panel: LeftPanelType) => void;
  eudrPanelOpen: boolean;
  setEudrPanelOpen: (open: boolean) => void;
  rightPanel: RightPanelType;
  setRightPanel: (panel: RightPanelType) => void;
  eudrAuditTab: EudrAuditTabType;
  setEudrAuditTab: (tab: EudrAuditTabType) => void;
  basemapMode: BasemapMode;
  setBasemapMode: (mode: BasemapMode) => void;

  // Shared Sentinel-2 Timelapse Layer State (First-Class Draggable Map Layer)
  timelapseFrames: TimelapseFrameItem[];
  setTimelapseFrames: (frames: TimelapseFrameItem[]) => void;
  timelapseIndex: number;
  setTimelapseIndex: (idx: number | ((prev: number) => number)) => void;
  timelapseMode: "pinpoint" | "rgb" | "nir";
  setTimelapseMode: (mode: "pinpoint" | "rgb" | "nir") => void;
  timelapsePlaying: boolean;
  setTimelapsePlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;

  // Legacy activePanel compatibility
  activePanel: SidePanelType;
  setActivePanel: (panel: SidePanelType) => void;

  // Map Viewport
  viewport: MapViewport;
  setViewport: (v: Partial<MapViewport>) => void;

  // Map GeoJSON Vector Plot Layer
  activeGeoJSON: object | null;
  setActiveGeoJSON: (geojson: object | null) => void;

  // AOI drawing & Custom GPS Pin drop state
  drawingAOI: boolean;
  setDrawingAOI: (v: boolean) => void;
  droppingPin: boolean;
  setDroppingPin: (v: boolean) => void;
  pendingPinCoords: { lat: number; lng: number; ts: number } | null;
  setPendingPinCoords: (coords: { lat: number; lng: number; ts: number } | null) => void;

  // Map Raster Layers
  layers: ActiveLayer[];
  addLayer: (layer: ActiveLayer) => void;
  addAuditLayers: (res: EUDRAnalysisResponse, fallbackLabel?: string) => void;
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

  // EUDR DDS Audit History & Active Persisted Result
  activeEudrResult: EUDRAnalysisResponse | null;
  setActiveEudrResult: (res: EUDRAnalysisResponse | null) => void;
  ddsHistory: EUDRAnalysisResponse[];
  addDDSHistory: (res: EUDRAnalysisResponse) => void;
  reopenAudit: (res: EUDRAnalysisResponse) => void;
  clearMessages: () => void;
  hydrateWorkspace: (userKey?: string) => void;
  persistWorkspace: (userKey?: string) => void;
  workspaceHydrated: boolean;

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
  chatPanelExpanded: boolean;
  setChatPanelExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  customRightPanelWidth: number | null;
  setCustomRightPanelWidth: (width: number | null) => void;
  activeAnalyticsResult: EUDRAnalysisResponse | null;
  setActiveAnalyticsResult: (res: EUDRAnalysisResponse | null) => void;

  // Spatial Pixel Inspector Modal
  pixelInspectorOpen: boolean;
  setPixelInspectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Multi-Plot Batch Upload & Farm Queue
  batchPlots: BatchPlotItem[];
  setBatchPlots: (plots: BatchPlotItem[]) => void;
  activeBatchPlotIndex: number | null;
  setActiveBatchPlotIndex: (idx: number | null) => void;
  updateBatchPlot: (index: number, patch: Partial<BatchPlotItem>) => void;
  batchAuditing: boolean;
  setBatchAuditing: (v: boolean) => void;
  clearBatchPlots: () => void;

  // Supplier Magic-Link One-Click Audit Trigger
  pendingSupplierAudit: PendingSupplierAudit | null;
  setPendingSupplierAudit: (req: PendingSupplierAudit | null) => void;

  // Interactive First-Time Onboarding Walkthrough
  tourOpen: boolean;
  setTourOpen: (open: boolean) => void;
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
  chatPanelExpanded: false,
  setChatPanelExpanded: (expanded) =>
    set((s) => ({
      chatPanelExpanded: typeof expanded === "function" ? expanded(s.chatPanelExpanded) : expanded,
    })),
  customRightPanelWidth: null,
  setCustomRightPanelWidth: (width) => set({ customRightPanelWidth: width }),
  activeAnalyticsResult: null,
  setActiveAnalyticsResult: (res) => set({ activeAnalyticsResult: res }),

  leftPanel: null,
  setLeftPanel: (panel) =>
    set({
      leftPanel: panel,
      eudrPanelOpen: panel === "eudr",
    }),

  eudrPanelOpen: false,
  setEudrPanelOpen: (open) =>
    set((s) => ({
      eudrPanelOpen: open,
      leftPanel: open ? "eudr" : s.leftPanel === "eudr" ? null : s.leftPanel,
    })),

  rightPanel: "chat",
  setRightPanel: (panel) => set({ rightPanel: panel }),

  eudrAuditTab: "charts",
  setEudrAuditTab: (tab) => set({ eudrAuditTab: tab }),

  basemapMode: "satellite",
  setBasemapMode: (mode) => set({ basemapMode: mode }),

  timelapseFrames: [],
  setTimelapseFrames: (frames) => set({ timelapseFrames: frames }),
  timelapseIndex: 0,
  setTimelapseIndex: (idx) =>
    set((s) => ({
      timelapseIndex: typeof idx === "function" ? idx(s.timelapseIndex) : idx,
    })),
  timelapseMode: "pinpoint",
  setTimelapseMode: (mode) => set({ timelapseMode: mode }),
  timelapsePlaying: false,
  setTimelapsePlaying: (playing) =>
    set((s) => ({
      timelapsePlaying: typeof playing === "function" ? playing(s.timelapsePlaying) : playing,
    })),

  activePanel: "chat",
  setActivePanel: (panel) =>
    set((s) => {
      if (panel === "eudr" || panel === "timelapse") {
        const nextLeft = s.leftPanel === panel ? null : panel;
        return {
          leftPanel: nextLeft,
          eudrPanelOpen: nextLeft === "eudr",
          activePanel: nextLeft,
        };
      }
      if (panel === "chat" || panel === "layers" || panel === "suppliers") {
        const nextRight = s.rightPanel === panel ? null : panel;
        return { rightPanel: nextRight, activePanel: nextRight };
      }
      return { leftPanel: null, eudrPanelOpen: false, rightPanel: null, activePanel: null };
    }),

  viewport: {
    center: [12, 14],
    zoom: 1.65,
    bbox: [-110, -45, 140, 62],
  },
  setViewport: (v) =>
    set((s) => ({ viewport: { ...s.viewport, ...v } })),

  activeGeoJSON: null,
  setActiveGeoJSON: (geojson) => set({ activeGeoJSON: geojson }),

  drawingAOI: false,
  setDrawingAOI: (v) => set((s) => ({ drawingAOI: v, droppingPin: v ? false : s.droppingPin })),
  droppingPin: false,
  setDroppingPin: (v) => set((s) => ({ droppingPin: v, drawingAOI: v ? false : s.drawingAOI })),
  pendingPinCoords: null,
  setPendingPinCoords: (coords) => set({ pendingPinCoords: coords }),

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
  addAuditLayers: (res, fallbackLabel) =>
    set((s) => {
      const groupId = res.dds?.dds_id || res.request_id || res.plot?.plot_id || `audit-${Date.now()}`;
      const comm = (res.plot?.commodity || "eudr").replace(/_/g, " ");
      const commTitle = comm.charAt(0).toUpperCase() + comm.slice(1);
      const loc = res.plot?.country_name || res.plot?.country_code || "";
      const groupLabel = fallbackLabel || res.plot?.name || (loc ? `${commTitle} · ${loc}` : `${commTitle} Audit`);
      const groupGeometry = res.plot?.geometry ?? undefined;
      const groupBbox = groupGeometry ? extractBboxFromGeometry(groupGeometry) ?? undefined : undefined;

      const built: ActiveLayer[] = [];
      const hasWdpaOverlap = Boolean(res.risk_assessment?.legality?.overlaps_protected_area);
      if (res.map_layers && res.map_layers.length > 0) {
        const hasPwri = res.map_layers.some(
          (l) => l.id.includes("pwri") || l.id.includes("intersection") || (l as { layer_type?: string }).layer_type === "intersection"
        );
        res.map_layers.forEach((lyr) => {
          const gj = (lyr as { geojson_data?: object | null }).geojson_data ?? undefined;
          const idLower = lyr.id.toLowerCase();
          const lType = ((lyr as { layer_type?: string }).layer_type || "").toLowerCase();
          const isPwri = idLower.includes("pwri") || idLower.includes("intersection") || lType === "intersection";
          const isWdpa = idLower.includes("protected") || idLower.includes("wdpa") || lType === "protected_areas";
          built.push({
            id: `${groupId}::${lyr.id}`,
            label: lyr.label,
            type: gj ? "geojson" : "raster",
            tileUrl: lyr.tile_url || undefined,
            geojsonData: gj,
            // Auto-enable PWRI + auto-enable WDPA whenever the plot intersects a protected reserve
            visible: hasPwri ? (isPwri || (hasWdpaOverlap && isWdpa)) : Boolean(lyr.visible),
            opacity: lyr.opacity ?? 0.95,
            legend: lyr.legend as ActiveLayer["legend"] | undefined,
            analysisType: (lyr as { layer_type?: string }).layer_type || "land_disturbance",
            layer_type: (lyr as { layer_type?: string }).layer_type,
            groupId,
            groupLabel,
            groupCountry: loc,
            groupCommodity: res.plot?.commodity,
            groupBbox,
            groupGeometry,
          });
        });
      } else if (res.tile_url) {
        built.push({
          id: `${groupId}::pwri`,
          label: `PWRI 3D Map Algebra (${commTitle})`,
          type: "raster",
          tileUrl: res.tile_url,
          visible: true,
          opacity: 1.0,
          legend: { title: "PWRI 3D Algebra", colormap: "RdYlGn", min: 0, max: 1, units: "" },
          analysisType: "land_disturbance",
          layer_type: "intersection",
          groupId,
          groupLabel,
          groupCountry: loc,
          groupCommodity: res.plot?.commodity,
          groupBbox,
          groupGeometry,
        });
      }

      if (built.length === 0) return s;

      // Place newest analysis group at top of the stack while keeping previous locations intact
      const remaining = s.layers.filter((l) => l.groupId !== groupId && !built.some((b) => b.id === l.id));
      return { layers: [...built, ...remaining] };
    }),
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
  activeEudrResult: null,
  workspaceHydrated: false,
  setActiveEudrResult: (res) => set({ activeEudrResult: res }),
  addDDSHistory: (res) =>
    set((s) => ({
      ddsHistory: [
        res,
        ...s.ddsHistory.filter(
          (item) =>
            (item.dds?.dds_id && item.dds.dds_id !== res.dds?.dds_id) ||
            (!item.dds?.dds_id && item.request_id !== res.request_id)
        ),
      ].slice(0, 15),
    })),
  reopenAudit: (res) => {
    useStore.getState().addAuditLayers(res);
    set((s) => ({
      activeEudrResult: res,
      leftPanel: "eudr",
      eudrPanelOpen: true,
      activeGeoJSON: res.plot?.geometry ?? s.activeGeoJSON,
    }));
  },
  clearMessages: () => set({ messages: [], conversationHistory: [] }),
  hydrateWorkspace: (userKey) => {
    if (typeof window === "undefined") return;
    const key = `oxeous_workspace_v1_${(userKey || "guest").toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        set({ workspaceHydrated: true });
        return;
      }
      const saved = JSON.parse(raw);
      set((s) => ({
        activeEudrResult: saved.activeEudrResult ?? null,
        ddsHistory: Array.isArray(saved.ddsHistory) ? saved.ddsHistory : [],
        activeGeoJSON: saved.activeGeoJSON ?? null,
        layers: Array.isArray(saved.layers) ? saved.layers : [],
        messages: Array.isArray(saved.messages)
          ? saved.messages.filter((m: ChatMessage) => !m.isLoading)
          : [],
        conversationHistory: Array.isArray(saved.conversationHistory) ? saved.conversationHistory : [],
        leftPanel: saved.leftPanel ?? (saved.activeEudrResult ? "eudr" : s.leftPanel),
        eudrPanelOpen: (saved.leftPanel ?? (saved.activeEudrResult ? "eudr" : s.leftPanel)) === "eudr",
        rightPanel: saved.rightPanel !== undefined ? saved.rightPanel : s.rightPanel,
        eudrAuditTab: saved.eudrAuditTab ?? s.eudrAuditTab,
        viewport: saved.activeGeoJSON && saved.viewport ? saved.viewport : s.viewport,
        workspaceHydrated: true,
      }));
    } catch {
      set({ workspaceHydrated: true });
    }
  },
  persistWorkspace: (userKey) => {
    if (typeof window === "undefined") return;
    const s = useStore.getState();
    if (!s.workspaceHydrated) return;
    const key = `oxeous_workspace_v1_${(userKey || "guest").toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}`;
    const cleanMessages = s.messages.filter((m) => !m.isLoading).slice(-35);
    const payload = {
      activeEudrResult: s.activeEudrResult,
      ddsHistory: s.ddsHistory.slice(0, 12),
      activeGeoJSON: s.activeGeoJSON,
      layers: s.layers,
      messages: cleanMessages,
      conversationHistory: s.conversationHistory.slice(-35),
      leftPanel: s.leftPanel,
      rightPanel: s.rightPanel,
      eudrAuditTab: s.eudrAuditTab,
      viewport: s.viewport,
    };
    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Fallback lean payload if large GeoJSON pushes past localStorage quota
      try {
        const lean = {
          activeEudrResult: s.activeEudrResult,
          ddsHistory: s.ddsHistory.slice(0, 5),
          activeGeoJSON: s.activeGeoJSON,
          layers: s.layers.map((l) => (l.type === "geojson" ? { ...l, geojsonData: undefined } : l)),
          messages: cleanMessages.slice(-12).map((m) => ({ ...m, eudrResult: undefined })),
          conversationHistory: s.conversationHistory.slice(-15),
          leftPanel: s.leftPanel,
          rightPanel: s.rightPanel,
          eudrAuditTab: s.eudrAuditTab,
          viewport: s.viewport,
        };
        window.localStorage.setItem(key, JSON.stringify(lean));
      } catch {
        // Ignore storage errors in private browsing mode
      }
    }
  },

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

  // Multi-Plot Batch Upload & Farm Queue
  batchPlots: [],
  setBatchPlots: (plots) => set({ batchPlots: plots, activeBatchPlotIndex: plots.length > 0 ? 0 : null }),
  activeBatchPlotIndex: null,
  setActiveBatchPlotIndex: (idx) => set({ activeBatchPlotIndex: idx }),
  updateBatchPlot: (index, patch) =>
    set((s) => ({
      batchPlots: s.batchPlots.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    })),
  batchAuditing: false,
  setBatchAuditing: (v) => set({ batchAuditing: v }),
  clearBatchPlots: () => set({ batchPlots: [], activeBatchPlotIndex: null, batchAuditing: false }),

  pendingSupplierAudit: null,
  setPendingSupplierAudit: (req) => set({ pendingSupplierAudit: req }),

  tourOpen: false,
  setTourOpen: (open) => set({ tourOpen: open }),
}));
