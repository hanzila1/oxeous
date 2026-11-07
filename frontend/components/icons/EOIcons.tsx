"use client";

/**
 * Oxeous custom icon family.
 *
 * Design rules (keep every new icon consistent with these):
 *  - 24 x 24 grid, 1.6px stroke, round caps and joins.
 *  - Monochrome: stroke uses `currentColor`; secondary "tint" fills use
 *    `currentColor` at low opacity. Colour comes from the parent text colour,
 *    so icons always match the Light Steel palette (graphite, steel, forest
 *    green #315F50, amber #C58A3A, forest red #A64B45).
 */

import React from "react";

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const TINT = 0.16;

function Svg({ className = "w-4 h-4", size, strokeWidth = 1.6, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

/* ------------------------- Regulatory / data-source icons ----------------- */

/** EUDR statutory seal: ring of 12 stars around a verification tick (EU 2023/1115). */
export function EULogoSeal(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9.6" fill="currentColor" fillOpacity={0.08} />
      <circle cx="12" cy="12" r="9.6" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <circle
            key={i}
            cx={12 + 6.5 * Math.sin(a)}
            cy={12 - 6.5 * Math.cos(a)}
            r="0.85"
            fill="currentColor"
            stroke="none"
          />
        );
      })}
      <path d="M9.7 12.1l1.6 1.6 3-3.2" />
    </Svg>
  );
}

/** Sentinel-1 C-band SAR satellite emitting radar pulses towards the ground. */
export function Sentinel1RadarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="10" y="3.5" width="4" height="6" rx="1" />
      <rect x="3" y="4.5" width="5" height="4" rx="0.8" fill="currentColor" fillOpacity={TINT} />
      <rect x="16" y="4.5" width="5" height="4" rx="0.8" fill="currentColor" fillOpacity={TINT} />
      <path d="M8 6.5h2M14 6.5h2M12 9.5v2" />
      <path d="M9.2 14c1.6 1.2 4 1.2 5.6 0" />
      <path d="M6.8 17c2.9 2.2 7.5 2.2 10.4 0" opacity="0.75" />
      <path d="M4.6 20c4.1 3 10.7 3 14.8 0" opacity="0.5" />
    </Svg>
  );
}

/** Sentinel-2 MSI optical satellite with a multispectral light cone. */
export function Sentinel2MSIIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="10" y="2.5" width="4" height="6" rx="1" />
      <rect x="3.5" y="3.5" width="5" height="4" rx="0.8" fill="currentColor" fillOpacity={TINT} />
      <rect x="15.5" y="3.5" width="5" height="4" rx="0.8" fill="currentColor" fillOpacity={TINT} />
      <path d="M8.5 5.5H10M14 5.5h1.5" />
      <path d="M10.6 10.5L7 21h10l-3.6-10.5z" fill="currentColor" fillOpacity={TINT} />
      <path d="M8.9 15.5h6.2M8 18.3h8" opacity="0.6" />
    </Svg>
  );
}

/** EC JRC GFC2020 baseline: a forest pinned to the 31 Dec 2020 cutoff calendar. */
export function JRC2020Emblem(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 9.5h17" />
      <path d="M12 11.3l-2.9 3.9h1.7l-2.1 2.8h6.6l-2.1-2.8h1.7z" fill="currentColor" fillOpacity={TINT} />
      <path d="M12 18v1.4" />
    </Svg>
  );
}

/** Google FDP commodity probability map: classified pixel grid with a crop sprout. */
export function GoogleFDPIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" opacity="0.28" />
      <path d="M12 19.5v-6" />
      <path d="M12 13.5c0-2.6 1.9-4.3 4.6-4.3 0 2.6-1.9 4.3-4.6 4.3z" fill="currentColor" fillOpacity={0.22} />
      <path d="M12 15.6c0-2.1-1.5-3.4-3.7-3.4 0 2.1 1.5 3.4 3.7 3.4z" fill="currentColor" fillOpacity={0.22} />
    </Svg>
  );
}

/** May 2026 segregation protocol: parcel with the violation zone carved out. */
export function May2026CarveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M3 7.5A1.5 1.5 0 0 1 4.5 6H11v7h6v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 17.5z"
        fill="currentColor"
        fillOpacity={TINT}
      />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" strokeDasharray="2 1.8" />
      <path d="M12.2 11.8l1.6-1.6" />
    </Svg>
  );
}

/** Radar sweep reticle (active scan). */
export function RadarSweepIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" opacity="0.55" />
      <path d="M12 12V3a9 9 0 0 1 8.2 5.3z" fill="currentColor" fillOpacity={0.22} stroke="none" />
      <path d="M12 12l8.2-3.7" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Hansen GFC canopy loss: tree with a downward trend arrow. */
export function CanopyLossIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 3.5L5 10h2.4L4.5 15h9l-2.9-5H13z" fill="currentColor" fillOpacity={TINT} />
      <path d="M9 15v4.5" />
      <path d="M18 7v10m0 0l-2.5-2.5M18 17l2.5-2.5" />
    </Svg>
  );
}

/** Natural forest (Nature Trace): two broadleaf canopies on the ground line. */
export function NaturalForestIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8.5" cy="9" r="4.2" fill="currentColor" fillOpacity={TINT} />
      <path d="M8.5 13.2V20" />
      <circle cx="16" cy="8" r="3.2" fill="currentColor" fillOpacity={TINT} />
      <path d="M16 11.2V20M3 20h18" />
    </Svg>
  );
}

/** Forest typology (ForTy): four-class land-use matrix. */
export function TypologyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" fill="currentColor" fillOpacity={0.22} />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.6" fill="currentColor" fillOpacity={0.22} />
    </Svg>
  );
}

/** WRI drivers of loss: felling axe. */
export function LossDriverIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 19.5l9.8-9.8" />
      <path
        d="M12.6 5.6l5.8 5.8 1.9-1.9a2 2 0 0 0 0-2.8l-3-3a2 2 0 0 0-2.8 0z"
        fill="currentColor"
        fillOpacity={TINT}
      />
    </Svg>
  );
}

/** WDPA protected area: dashed reserve boundary around a conifer. */
export function ProtectedAreaIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" strokeDasharray="2.6 2.2" />
      <path d="M12 6.5l-4.2 7h8.4z" fill="currentColor" fillOpacity={TINT} />
      <path d="M12 13.5v4" />
    </Svg>
  );
}

/* ----------------------------- App chrome icons --------------------------- */

/** Satellite globe (map view). */
export function SatelliteGlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="13" r="7.5" />
      <path d="M3.5 13h15" opacity="0.6" />
      <path d="M11 5.5c2 2 3 4.6 3 7.5s-1 5.5-3 7.5c-2-2-3-4.6-3-7.5s1-5.5 3-7.5z" opacity="0.6" />
      <path d="M17.3 2.8l3.9 3.9" />
      <circle cx="19.25" cy="4.75" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** EUDR compliance: shield with a leaf. */
export function ComplianceShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" fill="currentColor" fillOpacity={0.1} />
      <path d="M9 15c0-3.1 2.3-5.2 6-5.2 0 3.5-2.4 5.4-6 5.2z" />
      <path d="M9 15l3.2-3" />
    </Svg>
  );
}

/** Spatial AI agent: chat bubble with an orbit spark. */
export function AgentSparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4.2A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M12 6.8l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" fill="currentColor" fillOpacity={0.3} />
    </Svg>
  );
}

/** Raster layer stack. */
export function LayerStackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5l8.5 4.5L12 12.5 3.5 8z" fill="currentColor" fillOpacity={TINT} />
      <path d="M3.5 12L12 16.5l8.5-4.5" />
      <path d="M3.5 16L12 20.5l8.5-4.5" />
    </Svg>
  );
}

/** Benchmark plots: flagged reference parcel. */
export function BenchmarkFlagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 16.5L12 20.5l8.5-4L12 12.5z" fill="currentColor" fillOpacity={TINT} />
      <path d="M12 16.5V3.5" />
      <path d="M12 4h6.5l-1.8 2.3 1.8 2.3H12" fill="currentColor" fillOpacity={0.22} />
    </Svg>
  );
}

/** Draw AOI: polygon with editable vertices. */
export function DrawParcelIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 8.5L12 4l7 5-2.5 9.5h-9z" fill="currentColor" fillOpacity={0.1} strokeDasharray="0" />
      {[
        [5, 8.5],
        [12, 4],
        [19, 9],
        [16.5, 18.5],
        [7.5, 18.5],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 1.6} y={y - 1.6} width="3.2" height="3.2" rx="0.8" fill="white" />
      ))}
    </Svg>
  );
}

/** Swipe compare: split frame with drag handle. */
export function SwipeCompareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <path d="M5.2 5H12v14H5.2A2.2 2.2 0 0 1 3 16.8V7.2A2.2 2.2 0 0 1 5.2 5z" fill="currentColor" fillOpacity={0.2} stroke="none" />
      <path d="M12 2.5v19" />
      <path d="M8.6 10.3L6.9 12l1.7 1.7M15.4 10.3l1.7 1.7-1.7 1.7" />
    </Svg>
  );
}

/** Publication dossier: document with an audit seal. */
export function DossierIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 10.5h6M9 13.5h3.5" />
      <circle cx="14.5" cy="17.2" r="2" fill="currentColor" fillOpacity={0.22} />
    </Svg>
  );
}

/** Point inspector: crosshair over a pixel. */
export function PixelInspectorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5" />
      <rect x="10.6" y="10.6" width="2.8" height="2.8" rx="0.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Custom GPS Pin -> Auto-snap field parcel boundary (Art. 9(1)(d)). */
export function PinSnapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Snapped isometric field boundary */}
      <path
        d="M4 17.2l8-3.4 8 3.4-8 3.6z"
        fill="currentColor"
        fillOpacity={TINT}
      />
      {/* GPS pin dropping onto parcel center */}
      <path
        d="M12 15.2s-4.5-4.1-4.5-7.4a4.5 4.5 0 1 1 9 0c0 3.3-4.5 7.4-4.5 7.4z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <circle cx="12" cy="7.8" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Audit plot: magnifier over a parcel. */
export function AuditPlotIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.3 15.3l5.2 5.2" />
      <path d="M7.6 11.8l2.5-3.1 3.1 1.4-.9 3.1H8.4z" fill="currentColor" fillOpacity={0.22} />
    </Svg>
  );
}

/** Start a new assessment. */
export function NewAssessmentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4v4h4" />
      <path d="M12 9v6M9 12h6" />
    </Svg>
  );
}

/** Download the Due Diligence Statement. */
export function DownloadDDSIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M12 10v7M9.5 14.5L12 17l2.5-2.5" />
    </Svg>
  );
}

/** Analytics deck. */
export function AnalyticsDeckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M8 16v-3M12 16V8.5M16 16v-5.5" />
    </Svg>
  );
}

/** Sentinel-2 multi-temporal timelapse: stacked annual frames with a play prism & timeline ticks. */
export function SentinelTimelapseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      {/* Back stacked temporal frame (2020 cutoff reference) */}
      <path d="M6.5 3.5h12A2 2 0 0 1 20.5 5.5v9.5" opacity="0.55" />
      {/* Front active parcel frame */}
      <rect x="3.5" y="6.5" width="14" height="11" rx="2.2" fill="currentColor" fillOpacity={TINT} />
      {/* Play triangle inside parcel viewport */}
      <path d="M9 9.7l4.2 2.3L9 14.3z" fill="currentColor" stroke="none" />
      {/* Multi-year timeline scrubber bar & ticks below */}
      <path d="M3.5 20.5h17" />
      <circle cx="6.5" cy="20.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="20.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="20.5" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Overview grid (summary tab). */
export function OverviewGridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" fill="currentColor" fillOpacity={TINT} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </Svg>
  );
}

/** Multi-sensor datasets (stacked constellation). */
export function SensorStackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="6" rx="7.5" ry="2.8" fill="currentColor" fillOpacity={TINT} />
      <path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6" />
      <path d="M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6" />
    </Svg>
  );
}

/** Live telemetry trace. */
export function TelemetryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12h4l2.2-5.5 4.4 11 2.2-5.5H21" />
    </Svg>
  );
}

/** Expand side panel to the wide deck. */
export function PanelExpandIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16" fill="none" />
      <path d="M12.5 12h5m0 0l-2-2m2 2l-2 2" />
    </Svg>
  );
}

/** Collapse side panel back to standard width. */
export function PanelCollapseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16" />
      <path d="M17.5 12h-5m0 0l2-2m-2 2l2 2" />
    </Svg>
  );
}

/** Exemption leaf (Art. 2(5) plantation replanting). */
export function ExemptLeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 19c0-8 5.5-13.5 14-14 0 8.5-5.5 14-14 14z" fill="currentColor" fillOpacity={TINT} />
      <path d="M5 19l8-8" />
    </Svg>
  );
}

/** Verified clean (check inside a rounded square). */
export function VerifiedIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="currentColor" fillOpacity={0.1} />
      <path d="M8.3 12.2l2.5 2.5 4.9-5.2" />
    </Svg>
  );
}

/** Alert triangle (statutory violation). */
export function ViolationIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.3 4.4L2.9 17.3A2 2 0 0 0 4.6 20.3h14.8a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0z" fill="currentColor" fillOpacity={0.1} />
      <path d="M12 9.5v4M12 16.8v.1" />
    </Svg>
  );
}
