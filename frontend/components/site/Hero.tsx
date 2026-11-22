"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, CalendarClock, Play } from "lucide-react";
import { asset, EUDR_APPLIES_ISO } from "@/lib/site";

function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = now === null ? null : Math.max(0, new Date(EUDR_APPLIES_ISO).getTime() - now);
  const p = (n: number) => String(n).padStart(2, "0");
  const d = diff === null ? "42" : String(Math.floor(diff / 86_400_000));
  const h = diff === null ? "09" : p(Math.floor((diff % 86_400_000) / 3_600_000));
  const m = diff === null ? "57" : p(Math.floor((diff % 3_600_000) / 60_000));
  const s = diff === null ? "00" : p(Math.floor((diff % 60_000) / 1000));

  return (
    <div className="inline-flex min-w-[232px] items-center gap-3 rounded-2xl border border-line bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink text-paper">
        <CalendarClock className="h-4 w-4" />
      </span>
      <div>
        <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          EUDR Enforcement · 31 Dec 2026
        </div>
        {diff === 0 ? (
          <div className="font-display text-sm font-semibold text-ink">Active today</div>
        ) : (
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="font-display text-[20px] font-semibold leading-none text-ink">
              {d}
            </span>
            <span className="text-[12px] text-ink-2">days</span>
            <span className="font-data text-[11.5px] text-ink-2">
              {h}:{m}:{s}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MicrosoftBadge() {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-2xl border border-line bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
      <span className="text-[12px] font-medium text-ink-2">Powered by</span>
      <span className="inline-flex items-center gap-1.5 font-display text-[14px] font-semibold text-ink">
        <svg className="h-3.5 w-3.5" viewBox="0 0 21 21" aria-hidden>
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        Microsoft
      </span>
    </div>
  );
}

/**
 * Full Choreographed Typewriter + GIS Polygon Draw:
 * 1. Waits 180ms after page load so fonts & layout are 100% settled (zero startup jump)
 * 2. Types "Ask the Earth." character by character
 * 3. Types "See the" character by character
 * 4. GIS Arrow Cursor expands the square polygon from top-left to bottom-right while typing "evidence." inside it
 */
function AnimatedHeroTitle() {
  const LINE1 = "Ask the Earth.";
  const LINE2 = "See the";
  const WORD3 = "evidence.";

  const [runId, setRunId] = useState(0);
  const [c1, setC1] = useState(0);
  const [c2, setC2] = useState(0);
  const [boxStarted, setBoxStarted] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [c3, setC3] = useState(0);
  const [done, setDone] = useState(false);

  const replay = useCallback(() => {
    setC1(0);
    setC2(0);
    setBoxStarted(false);
    setBoxOpen(false);
    setC3(0);
    setDone(false);
    setRunId((n) => n + 1);
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Fluid, smooth start after layout stabilization
    const INITIAL_SETTLE = 120;

    // 1. Type "Ask the Earth."
    for (let i = 1; i <= LINE1.length; i++) {
      timers.push(setTimeout(() => setC1(i), INITIAL_SETTLE + i * 38));
    }

    const tAfterLine1 = INITIAL_SETTLE + LINE1.length * 38 + 100;

    // 2. Type "See the"
    for (let i = 1; i <= LINE2.length; i++) {
      timers.push(setTimeout(() => setC2(i), tAfterLine1 + i * 40));
    }

    const tAfterLine2 = tAfterLine1 + LINE2.length * 40 + 70;

    // 3. Spawn GIS arrow at vertex and expand polygon smoothly
    timers.push(setTimeout(() => setBoxStarted(true), tAfterLine2));
    timers.push(setTimeout(() => setBoxOpen(true), tAfterLine2 + 25));

    // 4. Type "evidence." inside the expanding polygon
    const tWord3Start = tAfterLine2 + 120;
    for (let i = 1; i <= WORD3.length; i++) {
      timers.push(setTimeout(() => setC3(i), tWord3Start + i * 44));
    }

    timers.push(
      setTimeout(() => {
        setDone(true);
      }, tWord3Start + WORD3.length * 44 + 100)
    );

    return () => timers.forEach(clearTimeout);
  }, [runId]);

  const typingLine1 = c1 < LINE1.length;
  const typingLine2 = !typingLine1 && c2 < LINE2.length;

  return (
    <h1
      onClick={replay}
      title="Click to replay typing & polygon animation"
      className="mt-5 min-h-[140px] cursor-pointer select-none font-display text-[clamp(2.75rem,5vw,4.7rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-ink"
    >
      {/* Line 1: Ask the Earth. */}
      <span className="relative block">
        <span className="invisible">{LINE1}</span>
        <span className="absolute inset-0">
          {LINE1.slice(0, c1)}
          {typingLine1 && c1 > 0 && (
            <span className="ml-1 inline-block h-[0.78em] w-[3px] translate-y-[0.08em] bg-canopy animate-pulse" />
          )}
        </span>
      </span>

      {/* Line 2: See the  [evidence.] */}
      <span className="mt-1.5 block whitespace-nowrap">
        {/* "See the" */}
        <span className="relative inline-block">
          <span className="invisible">{LINE2}</span>
          <span className="absolute inset-0">
            {LINE2.slice(0, c2)}
            {typingLine2 && (
              <span className="ml-1 inline-block h-[0.78em] w-[3px] translate-y-[0.08em] bg-canopy animate-pulse" />
            )}
          </span>
        </span>

        {/* "[evidence.]" with snug GIS polygon frame */}
        <span className="relative ml-3 inline-block align-baseline">
          <span className="invisible inline-block px-2.5">{WORD3}</span>

          {/* GPU-Smooth Expanding Polygon Frame */}
          {boxStarted && (
            <span
              aria-hidden
              className={`pointer-events-none absolute left-0 top-[5%] border-[1.5px] border-canopy bg-canopy/[0.08] transition-all duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                boxOpen ? "h-[92%] w-full opacity-100" : "h-[20%] w-[12%] opacity-90"
              }`}
            >
              {/* 4 Crisp Square GIS Vertex Handles */}
              <span className="absolute -left-[3.5px] -top-[3.5px] h-1.5 w-1.5 border border-ink bg-white shadow-sm" />
              <span className="absolute -right-[3.5px] -top-[3.5px] h-1.5 w-1.5 border border-ink bg-white shadow-sm" />
              <span className="absolute -bottom-[3.5px] -left-[3.5px] h-1.5 w-1.5 border border-ink bg-white shadow-sm" />
              <span className="absolute -bottom-[3.5px] -right-[3.5px] h-1.5 w-1.5 border border-ink bg-white shadow-sm" />

              {/* Sleek GIS Pointer Arrow at the bottom-right vertex */}
              <span className="absolute -bottom-4 -right-3 z-20 flex items-center gap-1">
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 drop-shadow-sm">
                  <path
                    d="M3 3L9.5 17L12 11.5L17.5 9L3 3Z"
                    fill="#12302A"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  className={`whitespace-nowrap rounded px-1.5 py-0.5 font-sans text-[8.5px] font-bold uppercase tracking-wider shadow-sm transition-colors duration-300 ${
                    done ? "bg-canopy text-paper" : "bg-ink text-emerald-300"
                  }`}
                >
                  {done ? "✓ Verified" : "Drawing..."}
                </span>
              </span>
            </span>
          )}

          {/* Typed "evidence." inside the polygon */}
          <span className="absolute inset-0 inline-block px-2.5 text-canopy">
            {WORD3.slice(0, c3)}
            {c3 > 0 && c3 < WORD3.length && (
              <span className="ml-0.5 inline-block h-[0.78em] w-[3px] translate-y-[0.08em] bg-canopy animate-pulse" />
            )}
          </span>
        </span>
      </span>
    </h1>
  );
}

export default function Hero({ onPilot }: { onPilot: () => void }) {
  return (
    <section className="relative isolate overflow-hidden bg-paper">
      {/* Left-side topographic contour lines + survey dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-90"
        style={{
          backgroundImage: `url(${asset("/site/contours.svg")})`,
          backgroundSize: "cover",
          backgroundPosition: "left top",
        }}
      />
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 -z-20 opacity-45"
        style={{
          maskImage: "radial-gradient(ellipse at 26% 45%, black, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 26% 45%, black, transparent 70%)",
        }}
      />

      {/* Full-bleed right-side forest canopy (softly fades left AND bottom so there is zero cut line) */}
      <div
        aria-hidden
        className="pointer-events-none relative h-[360px] w-full overflow-hidden lg:absolute lg:inset-y-0 lg:right-0 lg:z-0 lg:h-full lg:w-[49%]"
      >
        <div
          className="h-full w-full"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 24%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 24%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/site/hero-canopy-bleed.webp")}
            alt="Aerial forest canopy with verified farm boundary polygons"
            className="h-full w-full object-cover object-right"
          />
          {/* Subtle horizontal satellite scan line */}
          <div
            className="anim-scan-y absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 84%, rgba(255,255,255,.14) 98%, rgba(255,255,255,.75) 100%)",
            }}
          />
        </div>
      </div>

      {/* Seamless bottom atmospheric dissolve into #EEF1F3 paper (eliminates horizontal cut line) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-44"
        style={{
          background:
            "linear-gradient(to bottom, rgba(238,241,243,0) 0%, rgba(238,241,243,0.68) 54%, #EEF1F3 100%)",
        }}
      />

      {/* Main Hero Content Container — locked height & zero hydration jump */}
      <div className="relative z-10 mx-auto flex max-w-[1340px] flex-col justify-center px-6 pb-10 pt-24 sm:px-8 lg:min-h-screen lg:px-12 lg:pb-8 lg:pt-20">
        <div className="max-w-xl">
          {/* Stable Top Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white/90 py-1.5 pl-2.5 pr-4 shadow-sm backdrop-blur">
            <span className="relative grid h-4 w-4 place-items-center">
              <span className="absolute inset-0 rounded-full border border-ink/50" />
              <span className="h-1.5 w-1.5 rounded-full bg-canopy" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
              EU Regulation 2023/1115 · Spatial AI
            </span>
          </div>

          {/* Full Typewriter + Polygon Draw Headline */}
          <AnimatedHeroTitle />

          <p className="mt-6 text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
            <strong className="font-semibold text-ink">
              Autonomous spatial agent for verified EUDR compliance.
            </strong>{" "}
            Upload supplier farm polygons to verify zero post-2020 deforestation via radar and satellite—and generate
            your EU filing in 30 seconds.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/cockpit/"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[14.5px] font-medium text-paper shadow-[0_10px_28px_-10px_rgba(18,48,42,.65)] transition-all hover:-translate-y-0.5 hover:bg-canopy"
            >
              Open the cockpit
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white/90 px-5 py-3.5 text-[14.5px] font-medium text-ink shadow-sm backdrop-blur transition-colors hover:border-ink/50 hover:bg-white"
            >
              <Play className="h-4 w-4 fill-canopy text-canopy" />
              Watch demo
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Countdown />
            <MicrosoftBadge />
          </div>

          {/* Architectural Hairline Metrics Row */}
          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-ink/15 pt-5 sm:grid-cols-4 sm:divide-x sm:divide-ink/15">
            {[
              ["30 sec", "Per farm audit"],
              ["100%", "Verified accuracy"],
              ["~$0.02", "Compute per plot"],
              ["7 Sectors", "EUDR commodities"],
            ].map(([k, v], i) => (
              <div key={k} className={i > 0 ? "sm:pl-5" : ""}>
                <dt className="font-display text-[20px] font-semibold leading-none text-ink">{k}</dt>
                <dd className="mt-1 text-[12px] text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
