"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Calendar,
  ChevronDown,
  Cpu,
  Handshake,
  Leaf,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { asset, type CommodityKey } from "@/lib/site";
import { Reveal } from "@/hooks/useSite";

/** Bespoke vector silhouettes for the 7 EUDR Annex I commodities */
const COMMODITY_ICONS: Record<CommodityKey, ReactNode> = {
  cocoa: (
    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M21.5 6.5c-4.5-1-9.5 2-12 6.5-2.5 4.5-1.5 10 2 12.5 3.5 2.5 9 .5 11.5-4 2.5-4.5 3-14-1.5-15zm-4.5 15c-2.2 0-4-2.2-4-5s1.8-5 4-5 4 2.2 4 5-1.8 5-4 5z" />
      <circle cx="17" cy="14.5" r="1.2" />
      <circle cx="17" cy="17.5" r="1.2" />
    </svg>
  ),
  coffee: (
    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current" aria-hidden>
      <ellipse cx="16" cy="11" rx="4.2" ry="3.2" transform="rotate(-20 16 11)" />
      <ellipse cx="11.5" cy="19.5" rx="4.2" ry="3.2" transform="rotate(25 11.5 19.5)" />
      <ellipse cx="20.5" cy="19.5" rx="4.2" ry="3.2" transform="rotate(-25 20.5 19.5)" />
    </svg>
  ),
  palm: (
    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M16 14c-3-4-8-4.5-10-2 3-.5 6 .5 8 3-4-1-8 1-9 4 3-1.5 6.5-1 9 1l-1.5 7h4.5l-1-7c2.5-2 6-2.5 9-1-1-3-5-5-9-4 2-2.5 5-3.5 8-3-2-2.5-7-2-8 2z" />
    </svg>
  ),
  rubber: (
    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-none stroke-current" strokeWidth="2.2" aria-hidden>
      <path d="M16 6c0 0-7 8.2-7 13.5a7 7 0 0 0 14 0C23 14.2 16 6 16 6z" />
      <path d="M13 20a3.5 3.5 0 0 0 3 3" strokeLinecap="round" />
    </svg>
  ),
  cattle: (
    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M26 11c-1.5 0-2.5 1-3 2H11c-2.2 0-4 1.8-4 4v5h2v4h2.5v-4h7v4H21v-4h1.5v-3.5l2.5-2.5h2v-2.5L26 11zm-19 6v3H5.5v-2.5c0-.8.7-1.5 1.5-1.5v1z" />
    </svg>
  ),
  soy: (
    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M23 7c-4 1-8.5 5.5-12 10.5S7 25 9 26.5s6-1.5 9.5-6.5S24.5 10 23 7zm-11 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4-4.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm4-4.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    </svg>
  ),
  wood: (
    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current" aria-hidden>
      <path d="M8 18h12a3 3 0 1 1 0 6H8a3 3 0 1 1 0-6zm3-6h12a3 3 0 1 1 0 6H11a3 3 0 1 1 0-6z" />
    </svg>
  ),
};

interface OrbitCommodity {
  key: CommodityKey;
  index: string;
  label: string;
  eyebrow: string;
  headline: string;
  description: string;
  image: string;
  algorithmName: string;
  algorithmTag: string;
  agents: string;
  hudFooter: string;
  /** Subtle lightweight ambient radial wash behind the stage */
  glow: string;
}

const ORBIT_COMMODITIES: OrbitCommodity[] = [
  {
    key: "cocoa",
    index: "01",
    label: "Cocoa",
    eyebrow: "Equatorial Agroforestry · EUDR Annex I",
    headline: "Separating shade-grown cacao from hidden reserve clearing.",
    description:
      "Tropical cocoa grows beneath dense canopy and year-round cloud decks. Oxeous combines PWRI cloud-piercing radar with protected-area geometry to verify every smallholder plot without blocking compliant harvests.",
    image: "/site/commodities/cocoa.webp",
    algorithmName: "PWRI Radar Fusion",
    algorithmTag: "PWRI · C-BAND SAR PULSE",
    agents: "A2 SAR Radar · A3 WDPA Reserves",
    hudFooter: "Cloud-penetrating backscatter locked to 31 Dec 2020 baseline",
    glow: "radial-gradient(circle at 72% 48%, rgba(49, 95, 80, 0.14), rgba(140, 92, 62, 0.06) 45%, transparent 72%)",
  },
  {
    key: "coffee",
    index: "02",
    label: "Coffee",
    eyebrow: "Montane Cloud Forests · EUDR Annex I",
    headline: "Seeing highland arabica straight through mountain cloud cover.",
    description:
      "High-altitude coffee regions remain obscured by mist for months at a time. Our optical and radar agents fuse 10 m canopy probability with terrain elevation to distinguish intact shade coffee from forest conversion.",
    image: "/site/commodities/coffee.webp",
    algorithmName: "Optical + SAR Convergence",
    algorithmTag: "A1 OPTICAL + A2 SAR FUSION",
    agents: "A1 Optical NDVI · A2 SAR Backscatter",
    hudFooter: "Multi-sensor canopy convergence across montane slopes",
    glow: "radial-gradient(circle at 72% 48%, rgba(49, 95, 80, 0.16), rgba(166, 75, 69, 0.05) 45%, transparent 72%)",
  },
  {
    key: "palm",
    index: "03",
    label: "Palm oil",
    eyebrow: "Tropical Lowlands & Peat · EUDR Annex I",
    headline: "Detecting peatland drainage and concession expansion early.",
    description:
      "Lowland palm concessions often change rapidly along canal networks before replanting. Oxeous monitors structural canopy coherence and boundary topology continuously against the 2020 deforestation cutoff.",
    image: "/site/commodities/palm.webp",
    algorithmName: "Canopy Coherence Matrix",
    algorithmTag: "PWRI · PEAT & CANOPY GRID",
    agents: "A2 SAR Coherence · A3 Cadastre",
    hudFooter: "10 m structural change grid tracing concession edges",
    glow: "radial-gradient(circle at 72% 48%, rgba(197, 138, 58, 0.14), rgba(49, 95, 80, 0.07) 45%, transparent 72%)",
  },
  {
    key: "rubber",
    index: "04",
    label: "Rubber",
    eyebrow: "Monoculture vs. Native Forest · EUDR Annex I",
    headline: "Distinguishing planted rubber groves from primary rainforest.",
    description:
      "Under EUDR, replacing natural evergreen forest with rubber plantations still counts as deforestation. Our PWRI spectral-structural engine separates monoculture tree rows from biodiverse native canopy.",
    image: "/site/commodities/rubber.webp",
    algorithmName: "PWRI Spectral Classifier",
    algorithmTag: "PWRI · MONOCULTURE SIGNATURE",
    agents: "A1 Spectral · A5 Statutory Rules",
    hudFooter: "Real-time separation of native evergreen vs. planted canopy",
    glow: "radial-gradient(circle at 72% 48%, rgba(74, 124, 104, 0.16), rgba(122, 135, 145, 0.07) 45%, transparent 72%)",
  },
  {
    key: "cattle",
    index: "05",
    label: "Cattle",
    eyebrow: "Pasture & Indirect Networks · EUDR Annex I",
    headline: "Tracing pasture boundaries and blocking herd laundering.",
    description:
      "Direct and indirect ranch hops can obscure post-2020 pasture clearing. Oxeous cross-checks ranch polygons with biophysical carrying-capacity ceilings so declared herd volumes match what clean land can physically sustain.",
    image: "/site/commodities/cattle.webp",
    algorithmName: "Biophysical Yield Cap",
    algorithmTag: "A6 · CARRYING CAPACITY GRAPH",
    agents: "A3 Cadastre · A6 Yield Cap",
    hudFooter: "Supply-chain node verification & physical head-per-hectare cap",
    glow: "radial-gradient(circle at 72% 48%, rgba(180, 142, 74, 0.13), rgba(49, 95, 80, 0.08) 45%, transparent 72%)",
  },
  {
    key: "soy",
    index: "06",
    label: "Soy",
    eyebrow: "Broadacre & Gallery Corridors · EUDR Annex I",
    headline: "Surgically carving boundary slivers to salvage clean harvests.",
    description:
      "Every soy parcel over 4 hectares requires exact polygon geolocation under EUDR. When a noisy GPS fence clips a forest edge, Agent A4 performs a topological carve-out so verified farmland clears cleanly.",
    image: "/site/commodities/soy.webp",
    algorithmName: "Topological Carve-Out",
    algorithmTag: "A4 · SURGICAL POLYGON CARVE",
    agents: "A4 Topology · A5 Legal Compliance",
    hudFooter: "Sub-hectare boundary isolation preserving compliant acreage",
    glow: "radial-gradient(circle at 72% 48%, rgba(132, 152, 74, 0.15), rgba(49, 95, 80, 0.07) 45%, transparent 72%)",
  },
  {
    key: "wood",
    index: "07",
    label: "Wood",
    eyebrow: "Primary Canopy & Degradation · EUDR Annex I",
    headline: "Verifying zero forest degradation and selective logging limits.",
    description:
      "Timber faces the strictest EUDR bar: zero deforestation and zero degradation of primary forest. Oxeous tracks sub-canopy height profiles, haul-track expansion, and statutory legality rules across every concession.",
    image: "/site/commodities/wood.webp",
    algorithmName: "Canopy Height & Degradation",
    algorithmTag: "PWRI · SUB-CANOPY PROFILE",
    agents: "A2 SAR Height · A5 Statutory Legal",
    hudFooter: "Continuous primary-canopy height & logging-track telemetry",
    glow: "radial-gradient(circle at 72% 48%, rgba(18, 48, 42, 0.15), rgba(49, 95, 80, 0.08) 45%, transparent 72%)",
  },
];

/** Bespoke live animated SVG vector overlays illustrating Oxeous's PWRI & 6-Agent algorithms */
function CommodityVectorOverlay({ type }: { type: CommodityKey }) {
  switch (type) {
    case "cocoa":
      // PWRI Cloud-Piercing SAR Radar Pulses + Farm Polygon Trace + Backscatter Waveform
      return (
        <svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {/* Expanding PWRI radar wave rings */}
          <circle cx="200" cy="138" r="36" fill="none" stroke="#6EE7B7" strokeWidth="1.4" className="anim-pwri-pulse" />
          <circle
            cx="200"
            cy="138"
            r="36"
            fill="none"
            stroke="#6EE7B7"
            strokeWidth="1.2"
            className="anim-pwri-pulse"
            style={{ animationDelay: "0.95s" }}
          />
          <circle
            cx="200"
            cy="138"
            r="36"
            fill="none"
            stroke="#6EE7B7"
            strokeWidth="1"
            className="anim-pwri-pulse"
            style={{ animationDelay: "1.9s" }}
          />
          {/* Traced parcel polygon */}
          <polygon
            points="126,82 268,74 286,184 138,196"
            fill="rgba(49, 95, 80, 0.16)"
            stroke="#6EE7B7"
            strokeWidth="1.8"
            strokeLinejoin="round"
            className="anim-dash-trace"
          />
          {[
            [126, 82],
            [268, 74],
            [286, 184],
            [138, 196],
          ].map(([x, y], i) => (
            <rect key={i} x={x - 3.5} y={y - 3.5} width="7" height="7" fill="#FFFFFF" stroke="#12302A" strokeWidth="1.4" />
          ))}
          {/* Center radar reticle */}
          <circle cx="200" cy="138" r="4" fill="#6EE7B7" />
          {/* Live PWRI waveform bar at bottom */}
          <path
            d="M 28 242 Q 52 228 76 242 T 124 242 T 172 238 T 220 244 T 268 236 T 316 242 T 372 240"
            fill="none"
            stroke="#6EE7B7"
            strokeWidth="1.75"
            strokeOpacity="0.88"
            className="anim-pwri-wave"
          />
        </svg>
      );

    case "coffee":
      // Optical + SAR Convergence Reticle + Highland Contour Rings + Dual Sensor Waves
      return (
        <svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {/* Rotating optical-SAR convergence rings */}
          <g className="anim-orbit" style={{ transformOrigin: "200px 140px" }}>
            <circle cx="200" cy="140" r="68" fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="6 8" />
            <circle cx="268" cy="140" r="4" fill="#6EE7B7" />
          </g>
          <circle cx="200" cy="140" r="44" fill="rgba(18, 48, 42, 0.18)" stroke="#6EE7B7" strokeWidth="1.5" />
          {/* Crosshair axes */}
          <line x1="150" y1="140" x2="250" y2="140" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1" />
          <line x1="200" y1="90" x2="200" y2="190" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1" />
          {/* Dual Sensor Convergence Curves (A1 Optical + A2 SAR) */}
          <path
            d="M 32 236 C 90 214, 145 256, 200 236 C 255 216, 310 248, 368 230"
            fill="none"
            stroke="#6EE7B7"
            strokeWidth="1.8"
            className="anim-pwri-wave"
          />
          <path
            d="M 32 244 C 95 254, 150 222, 200 238 C 250 254, 312 224, 368 238"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.7"
            strokeWidth="1.3"
            className="anim-pwri-wave"
          />
        </svg>
      );

    case "palm":
      // 10m Spatial Matrix Grid + Polygon Vertex Lock
      return (
        <svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {/* Subtle 10m sampling grid */}
          {[100, 150, 200, 250, 300].map((x) => (
            <line key={`v${x}`} x1={x} y1="54" x2={x} y2="226" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1" />
          ))}
          {[80, 120, 160, 200].map((y) => (
            <line key={`h${y}`} x1="76" y1={y} x2="324" y2={y} stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1" />
          ))}
          {/* Traced concession boundary */}
          <polygon
            points="100,80 300,80 300,200 150,200 100,160"
            fill="rgba(49, 95, 80, 0.15)"
            stroke="#FDE68A"
            strokeWidth="2"
            className="anim-dash-trace"
          />
          {[
            [100, 80],
            [300, 80],
            [300, 200],
            [150, 200],
            [100, 160],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="7" fill="#FDE68A" fillOpacity="0.25" className="anim-pwri-pulse" style={{ animationDelay: `${i * 0.35}s` }} />
              <circle cx={x} cy={y} r="3.5" fill="#FDE68A" stroke="#12302A" strokeWidth="1.2" />
            </g>
          ))}
        </svg>
      );

    case "rubber":
      // PWRI Spectral Signature Curves (Native Evergreen vs. Monoculture)
      return (
        <svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {/* Translucent spectral plot card embedded cleanly over bottom-center */}
          <rect x="44" y="158" width="312" height="96" rx="14" fill="rgba(18, 48, 42, 0.56)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          {/* Horizontal gridlines */}
          <line x1="62" y1="184" x2="338" y2="184" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1" />
          <line x1="62" y1="210" x2="338" y2="210" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1" />
          <line x1="62" y1="234" x2="338" y2="234" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1" />
          {/* Primary evergreen signature (emerald) */}
          <path
            d="M 62 228 C 110 220, 145 174, 202 180 C 258 186, 294 170, 338 178"
            fill="none"
            stroke="#6EE7B7"
            strokeWidth="2.2"
            className="anim-dash-trace"
          />
          {/* Monoculture signature (amber dashed) */}
          <path
            d="M 62 232 C 112 228, 152 210, 202 214 C 252 218, 294 202, 338 212"
            fill="none"
            stroke="#FCD34D"
            strokeWidth="1.8"
            className="anim-pwri-wave"
          />
          {/* Target scanner ring up on bark */}
          <circle cx="200" cy="94" r="24" fill="none" stroke="#6EE7B7" strokeWidth="1.5" className="anim-pwri-pulse" />
          <circle cx="200" cy="94" r="3.5" fill="#6EE7B7" />
        </svg>
      );

    case "cattle":
      // Agent A6 Supply-Chain Node Graph & Carrying-Capacity Arc
      return (
        <svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {/* Flowing supply chain hop arcs */}
          <path d="M 88 182 Q 144 102 200 132" fill="none" stroke="#FFFFFF" strokeWidth="2" className="anim-pwri-wave" />
          <path d="M 200 132 Q 256 96 312 162" fill="none" stroke="#6EE7B7" strokeWidth="2" className="anim-pwri-wave" />
          {/* 3 Supply-chain nodes */}
          {[
            { x: 88, y: 182, label: "PASTURE" },
            { x: 200, y: 132, label: "A6 CAP" },
            { x: 312, y: 162, label: "EU PORT" },
          ].map((n, idx) => (
            <g key={n.label}>
              <circle cx={n.x} cy={n.y} r="18" fill="rgba(18, 48, 42, 0.72)" stroke="#6EE7B7" strokeWidth="1.6" />
              <circle
                cx={n.x}
                cy={n.y}
                r="18"
                fill="none"
                stroke="#6EE7B7"
                strokeWidth="1.2"
                className="anim-pwri-pulse"
                style={{ animationDelay: `${idx * 0.7}s` }}
              />
              <circle cx={n.x} cy={n.y} r="4" fill="#6EE7B7" />
              <text
                x={n.x}
                y={n.y + 32}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="8.5"
                fontWeight="700"
                letterSpacing="1.2"
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      );

    case "soy":
      // Agent A4 Surgical Topological Carve-Out (Compliant Emerald Polygon + Isolated Amber Sliver)
      return (
        <svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {/* Compliant main polygon */}
          <polygon
            points="92,76 254,76 238,214 92,214"
            fill="rgba(49, 95, 80, 0.24)"
            stroke="#6EE7B7"
            strokeWidth="2.2"
            strokeLinejoin="round"
            className="anim-dash-trace"
          />
          {/* Isolated surgical carve-out sliver on right edge */}
          <polygon
            points="262,76 306,82 292,212 246,214"
            fill="rgba(245, 158, 11, 0.26)"
            stroke="#FCD34D"
            strokeWidth="1.8"
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
          {/* Surgical cut vector line */}
          <line x1="258" y1="56" x2="242" y2="232" stroke="#FFFFFF" strokeWidth="1.6" className="anim-pwri-wave" />
          {[
            [92, 76],
            [254, 76],
            [238, 214],
            [92, 214],
          ].map(([x, y], i) => (
            <rect key={i} x={x - 3.5} y={y - 3.5} width="7" height="7" fill="#FFFFFF" stroke="#12302A" strokeWidth="1.4" />
          ))}
        </svg>
      );

    case "wood":
      // Sub-Canopy Elevation & LiDAR Height Profile Wave
      return (
        <svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {/* Layered canopy-height contour waves */}
          <path
            d="M 24 196 Q 74 142 124 172 T 224 152 T 324 170 T 376 146"
            fill="none"
            stroke="#6EE7B7"
            strokeWidth="2.2"
            className="anim-dash-trace"
          />
          <path
            d="M 24 216 Q 74 166 124 192 T 224 176 T 324 192 T 376 168"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.65"
            strokeWidth="1.4"
            className="anim-pwri-wave"
          />
          <path
            d="M 24 234 Q 74 190 124 212 T 224 198 T 324 212 T 376 190"
            fill="none"
            stroke="#6EE7B7"
            strokeOpacity="0.38"
            strokeWidth="1.2"
          />
          {/* Vertical height measurement pins */}
          {[124, 224, 324].map((x, idx) => (
            <g key={x}>
              <line x1={x} y1="90" x2={x} y2="170" stroke="#6EE7B7" strokeOpacity="0.55" strokeDasharray="3 4" strokeWidth="1.2" />
              <circle cx={x} cy={idx === 1 ? 152 : 170} r="4.5" fill="#6EE7B7" />
              <circle cx={x} cy={idx === 1 ? 152 : 170} r="10" fill="none" stroke="#6EE7B7" className="anim-pwri-pulse" style={{ animationDelay: `${idx * 0.6}s` }} />
            </g>
          ))}
        </svg>
      );
  }
}

/** SVG circular arc helper (0° = 3 o'clock) */
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = (startDeg * Math.PI) / 180;
  const e = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg >= startDeg ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// Giant Oxeous emblem coordinate space (800x800 centered at left edge of viewport)
const CX = 400;
const CY = 400;
const R_OUTER = 348;
const R_INNER = 216;
const DOT_START_DEG = -62;
const DOT_END_DEG = 62;

export default function RegulationSection() {
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Direct-DOM refs for 60/120fps zero-re-render orbital scrolling!
  const outerTicksRef = useRef<SVGGElement | null>(null);
  const innerArcRef = useRef<SVGPathElement | null>(null);
  const outerArcRef = useRef<SVGPathElement | null>(null);
  const dotGroupRef = useRef<SVGGElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const activeIdxRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // React state ONLY updates on discrete commodity changes (0..6), NEVER per scroll pixel!
  const [activeIdx, setActiveIdx] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);

  const count = ORBIT_COMMODITIES.length;

  /** Apply continuous orbital geometry directly to DOM nodes (zero React reconciliation cost!) */
  const paintOrbit = useCallback(
    (p: number) => {
      const continuous = p * (count - 1);

      // 1. Rotate GIS compass ticks smoothly
      if (outerTicksRef.current) {
        outerTicksRef.current.style.transform = `rotate(${(-p * 180).toFixed(2)}deg)`;
      }

      // 2. Glide signature Oxeous Orbit Dot smoothly along inner ring (-62° -> +62°)
      const dotDeg = DOT_START_DEG + p * (DOT_END_DEG - DOT_START_DEG);
      const dotRad = (dotDeg * Math.PI) / 180;
      const dx = CX + R_INNER * Math.cos(dotRad);
      const dy = CY + R_INNER * Math.sin(dotRad);

      if (dotGroupRef.current) {
        dotGroupRef.current.setAttribute("transform", `translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`);
      }

      // 3. Update inner & outer canopy progress arcs
      if (innerArcRef.current) {
        innerArcRef.current.setAttribute(
          "d",
          p > 0.004 ? describeArc(CX, CY, R_INNER, DOT_START_DEG, dotDeg) : ""
        );
      }
      if (outerArcRef.current) {
        outerArcRef.current.setAttribute(
          "d",
          p > 0.004 ? describeArc(CX, CY, R_OUTER, DOT_START_DEG, dotDeg) : ""
        );
      }

      // 4. Update bottom progress bar width
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${Math.max(4, p * 100).toFixed(2)}%`;
      }

      // 5. Smooth circularly-wrapped rotation of all 7 commodity nodes around the outer ring
      const radiusPct = (R_OUTER / 800) * 100; // 43.5%
      for (let i = 0; i < count; i++) {
        const btn = nodeRefs.current[i];
        if (!btn) continue;

        let delta = i - continuous;
        if (delta > count / 2) delta -= count;
        if (delta < -count / 2) delta += count;

        const angleDeg = delta * 30; // Even 30° arc spacing -> top & bottom arcs always populated!
        const rad = (angleDeg * Math.PI) / 180;
        const leftPct = 50 + radiusPct * Math.cos(rad);
        const topPct = 50 + radiusPct * Math.sin(rad);

        const dist = Math.abs(delta);
        const visible = dist < 2.55;
        const opacity = Math.max(0, Math.min(1, 1 - Math.max(0, dist - 1.5) * 0.95));
        const scale = dist < 0.5 ? 1.15 - dist * 0.3 : Math.max(0.76, 0.94 - dist * 0.08);

        btn.style.left = `${leftPct.toFixed(3)}%`;
        btn.style.top = `${topPct.toFixed(3)}%`;
        btn.style.opacity = opacity.toFixed(3);
        btn.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        btn.style.pointerEvents = visible ? "auto" : "none";
      }

      // 6. Trigger React state update ONLY when active commodity index changes
      const nearest = Math.min(count - 1, Math.max(0, Math.round(continuous)));
      if (nearest !== activeIdxRef.current) {
        activeIdxRef.current = nearest;
        setActiveIdx(nearest);
      }
    },
    [count]
  );

  useEffect(() => {
    // Initial paint on mount so cocoa sits dead-center at 3 o'clock immediately
    paintOrbit(0);

    const tick = () => {
      const diff = targetProgressRef.current - smoothProgressRef.current;
      if (Math.abs(diff) > 0.0004) {
        smoothProgressRef.current += diff * 0.14;
        paintOrbit(smoothProgressRef.current);
        rafRef.current = requestAnimationFrame(tick);
      } else {
        smoothProgressRef.current = targetProgressRef.current;
        paintOrbit(smoothProgressRef.current);
        rafRef.current = null;
      }
    };

    const onScroll = () => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const raw = Math.min(1, Math.max(0, -rect.top / scrollable));
      targetProgressRef.current = raw;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [paintOrbit]);

  const jumpToCommodity = useCallback(
    (idx: number) => {
      setMobileIdx(idx);
      const el = trackRef.current;
      if (!el || window.innerWidth < 1024) return;
      const rect = el.getBoundingClientRect();
      const trackTop = window.scrollY + rect.top;
      const scrollable = Math.max(1, el.offsetHeight - window.innerHeight);
      const targetY = trackTop + (idx / (count - 1)) * scrollable;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    },
    [count]
  );

  const active = ORBIT_COMMODITIES[activeIdx];
  const mobileActive = ORBIT_COMMODITIES[mobileIdx];

  return (
    <section id="regulation" className="relative bg-paper">
      {/* ===================================================================
          PART 1: SEAMLESS EUDR MANDATE INTRO (zero cut line from Hero!)
         =================================================================== */}
      <div className="relative mx-auto max-w-[1340px] px-6 pb-10 pt-8 sm:px-8 lg:px-12 lg:pb-12 lg:pt-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage: `url(${asset("/site/contours.svg")})`,
            backgroundSize: "cover",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 82%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 82%, transparent 100%)",
          }}
        />

        <Reveal className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/85 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-canopy shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-canopy" />
              Regulation (EU) 2023/1115 · EUDR
            </div>
            <h2 className="mt-4 font-display text-[36px] font-bold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[46px]">
              Seven regulated commodities.{" "}
              <span className="text-canopy">One orbital standard.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-2">
              The European Union Deforestation Regulation ensures seven global commodities entering or leaving the EU
              are <strong className="font-semibold text-ink">legal, deforestation-free, and polygon-traceable</strong>{" "}
              against the 31 December 2020 baseline.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-line/80 bg-white/80 p-5 shadow-sm backdrop-blur-md">
              <div className="flex items-center justify-between gap-4 border-b border-line/70 pb-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-paper shadow-sm">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-ink-2">
                      Mandatory Enforcement
                    </div>
                    <div className="font-display text-[22px] font-bold leading-tight text-canopy">
                      December 31, 2026
                    </div>
                  </div>
                </div>
                <span className="hidden rounded-full bg-canopy/10 px-2.5 py-1 font-data text-[10.5px] font-semibold text-canopy sm:inline-block">
                  7 SECTORS
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {[
                  { icon: Leaf, text: "Protects forests" },
                  { icon: ShieldCheck, text: "Full traceability" },
                  { icon: Handshake, text: "Sustainable trade" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
                    <Icon className="h-4 w-4 shrink-0 text-canopy" />
                    <span className="leading-snug">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-7 hidden items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-2/80 lg:flex">
          <span>Scroll smoothly to orbit the 7 commodities</span>
          <ChevronDown className="h-3.5 w-3.5 animate-bounce text-canopy" />
        </div>
      </div>

      {/* ===================================================================
          PART 2: DESKTOP STICKY OXEOUS ORBITAL STAGE (360vh -> snappy 60fps!)
          - Giant Oxeous Logo half outside the left edge of the browser window
          - Direct-DOM rAF gliding orbit dot + circularly-balanced commodity wheel
          - Right side: Clean commodity editorial photography + animated PWRI / Agent vectors
         =================================================================== */}
      <div ref={trackRef} className="relative hidden lg:block lg:h-[360vh]">
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-paper">
          {/* Layer 0: Lightweight Ambient Topographic Background (0ms GPU paint!) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
            <div
              className="absolute inset-0 opacity-65"
              style={{
                backgroundImage: `url(${asset("/site/contours.svg")})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="dot-grid absolute inset-0 opacity-30" />

            {/* Pure-CSS smooth radial mood shift per commodity */}
            {ORBIT_COMMODITIES.map((item, idx) => (
              <div
                key={item.key}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                  idx === activeIdx ? "opacity-100" : "opacity-0"
                }`}
                style={{ background: item.glow }}
              />
            ))}
          </div>

          {/* Layer 1: GIANT HALF-OFF-SCREEN OXEOUS LOGO & ORBIT DIAL (LEFT EDGE) */}
          <div className="pointer-events-none absolute left-0 top-1/2 z-10 h-[min(78vh,680px)] w-[min(78vh,680px)] -translate-x-1/2 -translate-y-1/2 xl:h-[min(82vh,740px)] xl:w-[min(82vh,740px)]">
            <svg viewBox="0 0 800 800" className="h-full w-full overflow-visible" aria-hidden>
              <defs>
                <radialGradient id="oxe-core-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#315F50" stopOpacity="0.11" />
                  <stop offset="70%" stopColor="#315F50" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#315F50" stopOpacity="0" />
                </radialGradient>
                <filter id="oxe-orb-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Soft inner bay glow */}
              <circle cx={CX} cy={CY} r={R_INNER} fill="url(#oxe-core-glow)" />

              {/* Rotating GIS compass ticks on outer ring (direct-DOM transform) */}
              <g ref={outerTicksRef} style={{ transformOrigin: `${CX}px ${CY}px` }}>
                {Array.from({ length: 72 }).map((_, t) => {
                  const rad = ((t * 5) * Math.PI) / 180;
                  const major = t % 6 === 0;
                  const r1 = R_OUTER - (major ? 14 : 7);
                  return (
                    <line
                      key={t}
                      x1={CX + r1 * Math.cos(rad)}
                      y1={CY + r1 * Math.sin(rad)}
                      x2={CX + R_OUTER * Math.cos(rad)}
                      y2={CY + R_OUTER * Math.sin(rad)}
                      stroke="#12302A"
                      strokeOpacity={major ? 0.28 : 0.11}
                      strokeWidth={major ? 1.6 : 1}
                    />
                  );
                })}
              </g>

              {/* Sculptural Outer Oxeous Ring */}
              <circle
                cx={CX}
                cy={CY}
                r={R_OUTER}
                fill="none"
                stroke="#5F6E78"
                strokeOpacity="0.42"
                strokeWidth="4.5"
              />

              {/* Subtle Dashed Orbital Guide */}
              <circle
                cx={CX}
                cy={CY}
                r={R_OUTER - 26}
                fill="none"
                stroke="#315F50"
                strokeOpacity="0.18"
                strokeWidth="1.2"
                strokeDasharray="4 8"
              />

              {/* Outer Scroll Progress Arc (direct-DOM path) */}
              <path
                ref={outerArcRef}
                d=""
                fill="none"
                stroke="#315F50"
                strokeOpacity="0.58"
                strokeWidth="4.5"
                strokeLinecap="round"
              />

              {/* Sculptural Inner Oxeous Ring (matches oxeous-emblem.png proportions) */}
              <circle
                cx={CX}
                cy={CY}
                r={R_INNER}
                fill="none"
                stroke="#5F6E78"
                strokeOpacity="0.58"
                strokeWidth="6"
              />

              {/* Inner Active Progress Trail (direct-DOM path) */}
              <path
                ref={innerArcRef}
                d=""
                fill="none"
                stroke="#315F50"
                strokeWidth="6.5"
                strokeLinecap="round"
              />

              {/* Signature Horizontal Oxeous Bars (9 o'clock & 3 o'clock focal connector) */}
              <line
                x1={CX - R_OUTER}
                y1={CY}
                x2={CX - R_INNER}
                y2={CY}
                stroke="#5F6E78"
                strokeOpacity="0.5"
                strokeWidth="6"
              />
              <line
                x1={CX + R_INNER}
                y1={CY}
                x2={CX + R_OUTER - 44}
                y2={CY}
                stroke="#315F50"
                strokeOpacity="0.78"
                strokeWidth="5.5"
                strokeLinecap="round"
              />

              {/* 3 o'clock Target Reticle Halo */}
              <circle
                cx={CX + R_OUTER}
                cy={CY}
                r={46}
                fill="none"
                stroke="#315F50"
                strokeOpacity="0.32"
                strokeWidth="1.6"
                strokeDasharray="5 5"
              />

              {/* SIGNATURE OXEOUS ORBIT DOT (glides smoothly along inner ring via direct-DOM transform!) */}
              <g ref={dotGroupRef} transform={`translate(${CX + R_INNER * Math.cos((DOT_START_DEG * Math.PI) / 180)}, ${CY + R_INNER * Math.sin((DOT_START_DEG * Math.PI) / 180)})`} filter="url(#oxe-orb-glow)">
                <circle cx="0" cy="0" r="24" fill="#315F50" fillOpacity="0.16" />
                <circle cx="0" cy="0" r="14.5" fill="#12302A" stroke="#EEF1F3" strokeWidth="3.5" />
                <circle cx="0" cy="0" r="4.5" fill="#6EE7B7" />
              </g>
            </svg>

            {/* 7 CIRCULARLY-WRAPPED COMMODITY NODES ON THE OUTER RING (direct-DOM transforms!) */}
            {ORBIT_COMMODITIES.map((item, i) => {
              const isFocus = i === activeIdx;
              return (
                <button
                  key={item.key}
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => jumpToCommodity(i)}
                  aria-label={`Orbit to ${item.label}`}
                  aria-current={isFocus ? "step" : undefined}
                  className="group absolute z-20 flex items-center will-change-transform focus:outline-none"
                >
                  <span
                    className={`grid place-items-center rounded-full transition-colors duration-300 ${
                      isFocus
                        ? "h-[68px] w-[68px] bg-ink text-paper shadow-[0_14px_34px_-8px_rgba(18,48,42,0.55)] ring-[5px] ring-canopy/25"
                        : "h-12 w-12 border border-line bg-white/95 text-canopy shadow-md hover:border-canopy hover:text-ink"
                    }`}
                  >
                    {COMMODITY_ICONS[item.key]}
                  </span>

                  <span
                    className={`pointer-events-none absolute left-[calc(100%+10px)] whitespace-nowrap rounded-full px-2.5 py-0.5 font-display text-[12px] font-semibold tracking-tight transition-all duration-300 ${
                      isFocus
                        ? "bg-ink text-paper shadow-sm"
                        : "bg-white/80 text-ink-2 opacity-90 backdrop-blur-sm group-hover:bg-white group-hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clean Counter Nestled Inside the Visible Half of the Inner Oxeous Circle */}
          <div className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 xl:left-7">
            <div className="font-data text-[9.5px] font-semibold uppercase tracking-[0.2em] text-canopy">
              EUDR Orbit
            </div>
            <div className="mt-1 flex items-baseline gap-1 font-display tabular-nums">
              <span className="text-[40px] font-bold leading-none tracking-[-0.04em] text-ink xl:text-[48px]">
                {active.index}
              </span>
              <span className="font-data text-[12px] font-medium text-ink-2">/ 07</span>
            </div>
            <div className="mt-2 h-[2px] w-8 rounded-full bg-canopy/40" />
          </div>

          {/* Layer 2: RIGHT-SIDE EDITORIAL COMMODITY STAGE + VECTOR PWRI / AGENT ANIMATIONS */}
          <div className="relative z-20 flex h-full w-full flex-col justify-between pb-7 pl-[clamp(370px,46vh,460px)] pr-8 pt-24 xl:pl-[clamp(430px,50vh,515px)] xl:pr-14">
            <div className="mx-auto flex h-full w-full max-w-[1060px] flex-col justify-between">
              {/* Top Context Strip */}
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-2">
                <span className="inline-flex items-center gap-2">
                  <Radar className="h-3.5 w-3.5 text-canopy" />
                  EUDR Annex I · 7 Regulated Commodities
                </span>
                <span className="font-data text-canopy">{active.algorithmTag}</span>
              </div>

              {/* Center Editorial Split: Story (Left) + Commodity Photography & Vector Intelligence (Right) */}
              <div className="my-auto grid grid-cols-12 items-center gap-8 xl:gap-11">
                {/* Left Copy Column */}
                <div key={active.key} className="anim-commodity-in col-span-5 space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-2 shadow-sm backdrop-blur">
                    <span className="font-data text-canopy">{active.index} / 07</span>
                    <span className="text-line">·</span>
                    <span>{active.eyebrow}</span>
                  </div>

                  <div>
                    <h3 className="font-display text-[48px] font-bold leading-[1.0] tracking-[-0.035em] text-ink xl:text-[62px]">
                      {active.label}
                    </h3>
                    <p className="mt-3 font-display text-[19px] font-semibold leading-snug text-canopy xl:text-[21px]">
                      {active.headline}
                    </p>
                  </div>

                  <p className="text-[15px] leading-relaxed text-ink-2 xl:text-[15.5px]">
                    {active.description}
                  </p>

                  {/* Clean Oxeous Algorithm & Agents Strip (zero dossier clutter) */}
                  <div className="grid grid-cols-1 gap-2.5 border-t border-ink/15 pt-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-paper">
                        <Radar className="h-4 w-4 text-emerald-300" />
                      </span>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-2">
                          Oxeous Engine
                        </div>
                        <div className="font-display text-[15px] font-bold text-ink">{active.algorithmName}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canopy/12 text-canopy">
                        <Cpu className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-2">
                          Active Spatial Agents
                        </div>
                        <div className="font-display text-[14.5px] font-semibold text-ink">{active.agents}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Visual Column: Fine-Art Commodity Image + Animated PWRI / Agent Vector Overlay */}
                <div className="col-span-7">
                  <div className="relative overflow-hidden rounded-[26px] border border-white/80 bg-ink shadow-[0_28px_70px_-24px_rgba(18,48,42,0.34)]">
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      {/* Cross-fading Editorial Commodity Photography */}
                      {ORBIT_COMMODITIES.map((item, idx) => {
                        const isCurrent = idx === activeIdx;
                        return (
                          <div
                            key={item.key}
                            className={`absolute inset-0 transition-all duration-700 ease-out ${
                              isCurrent ? "scale-100 opacity-100" : "scale-[1.06] opacity-0"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={asset(item.image)}
                              alt={`${item.label} — EUDR regulated commodity`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        );
                      })}

                      {/* Soft editorial vignette so crisp white/emerald vector animations pop cleanly */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-ink/35"
                      />

                      {/* Live Animated Vector Visualization of Oxeous PWRI / Agents */}
                      <div key={`vec-${active.key}`} className="anim-commodity-in absolute inset-0">
                        <CommodityVectorOverlay type={active.key} />
                      </div>

                      {/* Subtle Horizontal Sensor Sweep */}
                      <div
                        aria-hidden
                        className="anim-scan-y pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to bottom, transparent 88%, rgba(110,231,183,0.12) 97%, rgba(110,231,183,0.5) 100%)",
                        }}
                      />

                      {/* Top Frosted Glass Algorithm Pill */}
                      <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-ink/65 px-3 py-1.5 font-data text-[10.5px] font-semibold uppercase tracking-[0.12em] text-paper backdrop-blur-md">
                          <span className="relative flex h-2 w-2">
                            <span className="anim-ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-300" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                          </span>
                          {active.algorithmTag}
                        </span>

                        <span className="rounded-full border border-white/20 bg-ink/55 px-2.5 py-1 font-data text-[10px] font-medium uppercase tracking-wider text-paper/90 backdrop-blur-md">
                          CUTOFF · 31 DEC 2020
                        </span>
                      </div>

                      {/* Bottom Glass Telemetry Caption */}
                      <div className="absolute inset-x-4 bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-ink/65 px-4 py-2.5 text-[12px] text-paper/95 backdrop-blur-md">
                        <span className="line-clamp-1 font-medium">{active.hudFooter}</span>
                        <span className="shrink-0 font-data text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                          {active.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Commodity Rail + Direct-DOM Progress Bar */}
              <div className="space-y-2.5">
                <div className="h-[2.5px] w-full overflow-hidden rounded-full bg-line/70">
                  <div
                    ref={progressBarRef}
                    className="h-full rounded-full bg-canopy"
                    style={{ width: "4%" }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {ORBIT_COMMODITIES.map((item, i) => {
                      const isCurrent = i === activeIdx;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => jumpToCommodity(i)}
                          className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                            isCurrent
                              ? "bg-ink text-paper shadow-sm"
                              : "text-ink-2 hover:bg-white/80 hover:text-ink"
                          }`}
                        >
                          <span className="mr-1.5 font-data text-[10px] opacity-70">{item.index}</span>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="hidden font-data text-[10.5px] uppercase tracking-[0.14em] text-ink-2/80 xl:inline">
                    Scroll or click to orbit
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          PART 3: MOBILE / TABLET INTERACTIVE FALLBACK (< lg)
         =================================================================== */}
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-2 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {ORBIT_COMMODITIES.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMobileIdx(i)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all ${
                i === mobileIdx
                  ? "border-ink bg-ink text-paper shadow-sm"
                  : "border-line bg-white/90 text-ink-2"
              }`}
            >
              <span className="font-data text-[10.5px] opacity-70">{item.index}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-white/90 p-5 shadow-md backdrop-blur">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset(mobileActive.image)}
              alt={`${mobileActive.label} — EUDR regulated commodity`}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-ink/30" />
            <CommodityVectorOverlay type={mobileActive.key} />
            <div className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-3 py-1 font-data text-[10px] font-semibold uppercase text-emerald-300 backdrop-blur">
              {mobileActive.algorithmTag}
            </div>
          </div>

          <div className="mt-5">
            <div className="font-data text-[11px] font-semibold uppercase tracking-[0.12em] text-canopy">
              {mobileActive.index} / 07 · {mobileActive.eyebrow}
            </div>
            <h3 className="mt-1 font-display text-[32px] font-bold leading-tight text-ink">
              {mobileActive.label}
            </h3>
            <p className="mt-1 font-display text-[16px] font-semibold text-canopy">
              {mobileActive.headline}
            </p>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">{mobileActive.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-semibold text-ink">
                {mobileActive.algorithmName}
              </span>
              <span className="rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-medium text-canopy">
                {mobileActive.agents}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
