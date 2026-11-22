"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Play, X } from "lucide-react";
import { useStore, type LeftPanelType, type RightPanelType } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";
import { BENCHMARK_CASES } from "@/components/ui/TopFloatingBar";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  target?: string;
  stepNum: string;
  title: string;
  body: string;
  openLeft?: LeftPanelType;
  openRight?: RightPanelType;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "eudr",
    target: '[data-tour="nav-eudr"]',
    stepNum: "01 / 06",
    title: "EUDR Compliance Suite",
    body: "Upload farm polygons or drop a single GPS pin to audit post-2020 deforestation, reserves, and yield caps.",
    openLeft: "eudr",
    openRight: null,
  },
  {
    id: "timelapse",
    target: '[data-tour="nav-timelapse"]',
    stepNum: "02 / 06",
    title: "Plot Timelapse (2020–2026)",
    body: "Scrub year-by-year 10 m satellite imagery from the Dec 2020 cutoff through 2026 directly over your parcel.",
    openLeft: "timelapse",
    openRight: null,
  },
  {
    id: "suppliers",
    target: '[data-tour="nav-suppliers"]',
    stepNum: "03 / 06",
    title: "Supplier Magic Links",
    body: "Send a zero-login link to any cooperative. One GPS tap auto-traces their 10 m polygon into your inbox.",
    openLeft: null,
    openRight: "suppliers",
  },
  {
    id: "layers",
    target: '[data-tour="nav-layers"]',
    stepNum: "04 / 06",
    title: "Earth Observation Layers",
    body: "Toggle deforestation alerts, baselines, and split-screen comparison directly on the satellite canvas.",
    openLeft: null,
    openRight: "layers",
  },
  {
    id: "agent",
    target: '[data-tour="nav-chat"]',
    stepNum: "05 / 06",
    title: "Oxeous Earth Agent",
    body: "Run 1-click benchmark playbooks or ask EUR-Lex legal questions grounded in your active farm audit.",
    openLeft: null,
    openRight: "chat",
  },
  {
    id: "launch",
    stepNum: "06 / 06",
    title: "Run Your First Live Audit",
    body: "Launch a real satellite assessment on a Ghana cocoa cooperative to see 10 m clearing detection, harvest carve-out, and TRACES NT filing.",
    openLeft: null,
    openRight: "chat",
  },
];

function getSeenKey(userKey: string) {
  return `oxeous_tour_seen_v1_${userKey.toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}`;
}

export default function OnboardingTour() {
  const { user } = useAuthStore();
  const userKey = user?.email || "guest";
  const {
    tourOpen,
    setTourOpen,
    setLeftPanel,
    setRightPanel,
    setPendingSupplierAudit,
    ddsHistory,
    workspaceHydrated,
  } = useStore();

  const [stepIdx, setStepIdx] = useState(0);
  const [coords, setCoords] = useState<{
    vw: number;
    vh: number;
    spotX: number;
    spotY: number;
    spotW: number;
    spotH: number;
    panelRect: { x: number; y: number; w: number; h: number } | null;
    cardX: number;
    cardY: number;
    centered: boolean;
  } | null>(null);

  // Auto-open once for first-time users with no prior audits
  useEffect(() => {
    if (!workspaceHydrated || typeof window === "undefined") return;
    const seen = window.localStorage.getItem(getSeenKey(userKey));
    if (!seen && ddsHistory.length === 0) {
      const t = setTimeout(() => {
        setStepIdx(0);
        setTourOpen(true);
      }, 650);
      return () => clearTimeout(t);
    }
  }, [workspaceHydrated, userKey, ddsHistory.length, setTourOpen]);

  useEffect(() => {
    if (tourOpen) setStepIdx(0);
  }, [tourOpen]);

  const current = TOUR_STEPS[stepIdx] ?? TOUR_STEPS[0];

  // Open corresponding cockpit panel & compute pure-GPU transform coordinates
  useEffect(() => {
    if (!tourOpen) return;
    if (current.openLeft !== undefined) setLeftPanel(current.openLeft);
    if (current.openRight !== undefined) setRightPanel(current.openRight);

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = Math.min(340, vw - 32);

      // Compute exact sharp cutout for the currently showcased left or right sidebar panel
      let panelRect: { x: number; y: number; w: number; h: number } | null = null;
      if (current.openLeft) {
        const pEl = document.querySelector('[data-tour-panel="left"]');
        const w = pEl ? Math.round(pEl.getBoundingClientRect().width) : 460;
        panelRect = { x: 68, y: 0, w, h: vh };
      } else if (current.openRight) {
        const pEl = document.querySelector('[data-tour-panel="right"]');
        const w = pEl ? Math.round(pEl.getBoundingClientRect().width) : 480;
        panelRect = { x: vw - w, y: 0, w, h: vh };
      }

      if (!current.target) {
        setCoords({
          vw,
          vh,
          spotX: vw / 2,
          spotY: vh / 2,
          spotW: 0,
          spotH: 0,
          panelRect: null,
          cardX: Math.round((vw - cardW) / 2),
          cardY: Math.round((vh - 200) / 2),
          centered: true,
        });
        return;
      }

      const el = document.querySelector(current.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cardX = current.openLeft && vw > 960 ? Math.min(548, vw - cardW - 16) : Math.round(r.right + 16);
      const cardY = Math.round(Math.max(20, Math.min(r.top - 8, vh - 220)));

      setCoords({
        vw,
        vh,
        spotX: Math.round(r.left - 4),
        spotY: Math.round(r.top - 4),
        spotW: Math.round(r.width + 8),
        spotH: Math.round(r.height + 8),
        panelRect,
        cardX,
        cardY,
        centered: false,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tourOpen, current, setLeftPanel, setRightPanel]);

  const finishTour = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(getSeenKey(userKey), "1");
    }
    setTourOpen(false);
  }, [userKey, setTourOpen]);

  const runLiveSampleAudit = useCallback(() => {
    const sample = BENCHMARK_CASES.find((c) => c.id === "02_Ghana_Cocoa") ?? BENCHMARK_CASES[1] ?? BENCHMARK_CASES[0];
    finishTour();
    setLeftPanel("eudr");
    setPendingSupplierAudit({
      geometry: sample.geometry,
      commodity: sample.commodity,
      countryCode: sample.countryCode,
      countryName: sample.country,
      supplierName: sample.label,
      ts: Date.now(),
    });
  }, [finishTour, setLeftPanel, setPendingSupplierAudit]);

  useEffect(() => {
    if (!tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishTour();
      if (e.key === "ArrowRight" && stepIdx < TOUR_STEPS.length - 1) setStepIdx((i) => i + 1);
      if (e.key === "ArrowLeft" && stepIdx > 0) setStepIdx((i) => i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOpen, stepIdx, finishTour]);

  if (!tourOpen || !coords) return null;

  const isLast = stepIdx === TOUR_STEPS.length - 1;

  // Build an even-odd clip path that blurs ONLY the background while keeping BOTH
  // the active NavigationRail icon AND the active open panel 100% razor-sharp!
  const roundedRectSubpath = (x: number, y: number, w: number, h: number, r: number) => {
    const rad = Math.min(r, w / 2, h / 2);
    return `M${x + rad} ${y} H${x + w - rad} A${rad} ${rad} 0 0 1 ${x + w} ${y + rad} V${y + h - rad} A${rad} ${rad} 0 0 1 ${x + w - rad} ${y + h} H${x + rad} A${rad} ${rad} 0 0 1 ${x} ${y + h - rad} V${y + rad} A${rad} ${rad} 0 0 1 ${x + rad} ${y} Z`;
  };

  let backdropClipPath: string | undefined;
  if (!coords.centered) {
    const holes: string[] = [
      roundedRectSubpath(coords.spotX, coords.spotY, coords.spotW, coords.spotH, 14),
    ];
    if (coords.panelRect) {
      const p = coords.panelRect;
      holes.push(`M${p.x} ${p.y} H${p.x + p.w} V${p.y + p.h} H${p.x} Z`);
    }
    backdropClipPath = `path(evenodd, "M0 0 H${coords.vw} V${coords.vh} H0 Z ${holes.join(" ")}")`;
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Soft blurred dim backdrop — active rail icon & active open panel are cut out razor-sharp */}
      <div
        aria-hidden
        onClick={finishTour}
        style={backdropClipPath ? { clipPath: backdropClipPath } : undefined}
        className="fixed inset-0 pointer-events-auto bg-[#0F1720]/26 backdrop-blur-[2.5px]"
      />

      {/* GPU-accelerated crisp ring around the sharp active NavigationRail icon */}
      {!coords.centered && (
        <div
          aria-hidden
          style={{
            width: coords.spotW,
            height: coords.spotH,
            transform: `translate3d(${coords.spotX}px, ${coords.spotY}px, 0)`,
            transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="fixed top-0 left-0 z-[101] pointer-events-none rounded-[14px] border-2 border-[#315F50] shadow-[0_0_0_4px_rgba(49,95,80,0.18)] will-change-transform"
        />
      )}

      {/* GPU-accelerated Light Steel walkthrough card (zero layout reflow) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
        style={{
          transform: `translate3d(${coords.cardX}px, ${coords.cardY}px, 0)`,
          transition: "transform 340ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="fixed top-0 left-0 z-[102] pointer-events-auto w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border border-[#C8CFD5] bg-white p-4 shadow-[0_24px_60px_-18px_rgba(15,23,32,0.32)] text-[#1D2227] will-change-transform"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold tracking-wider text-[#315F50]">
            {current.stepNum}
          </span>
          <button
            type="button"
            onClick={finishTour}
            className="rounded-lg p-1 text-[#747F88] hover:bg-[#F4F5F6] hover:text-[#1D2227] transition-colors cursor-pointer"
            aria-label="Close walkthrough"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <h3 className="mt-1.5 text-[14.5px] font-bold tracking-tight text-[#1D2227]">
          {current.title}
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-[#5B6773]">
          {current.body}
        </p>

        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#E3E7EA] pt-3">
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIdx(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200 cursor-pointer",
                  idx === stepIdx ? "w-5 bg-[#315F50]" : "w-1.5 bg-[#C8CFD5] hover:bg-[#8E99A4]"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#C8CFD5] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#343B42] hover:bg-[#F4F5F6] cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={finishTour}
                className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-[#747F88] hover:text-[#1D2227] cursor-pointer"
              >
                Skip
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={runLiveSampleAudit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#315F50] hover:bg-[#274d40] px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Run Live Audit</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.min(TOUR_STEPS.length - 1, i + 1))}
                className="inline-flex items-center gap-1 rounded-lg bg-[#315F50] hover:bg-[#274d40] px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
