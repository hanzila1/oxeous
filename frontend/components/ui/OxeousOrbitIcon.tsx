"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface OxeousOrbitIconProps {
  className?: string;
  size?: number;
  isSpinning?: boolean;
  color?: string;
}

export default function OxeousOrbitIcon({
  className,
  size = 28,
  isSpinning = false,
  color,
}: OxeousOrbitIconProps) {
  return (
    <div
      className={cn("relative flex items-center justify-center select-none flex-shrink-0", className)}
      style={{ width: size, height: size, color: color || "currentColor" }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        {/* Left spoke: from outer circle (x=10) to inner circle (x=25) */}
        <line
          x1="10"
          y1="50"
          x2="25"
          y2="50"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="opacity-40"
        />

        {/* Right spoke: from inner circle (x=75) to outer circle (x=90) */}
        <line
          x1="75"
          y1="50"
          x2="90"
          y2="50"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="opacity-40"
        />

        {/* Outer Ring (Orbit 1) */}
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="currentColor"
          strokeWidth="3.5"
          className="opacity-75"
        />

        {/* Inner Ring (Orbit 2 - where the satellite dot orbits) */}
        <circle
          cx="50"
          cy="50"
          r="25"
          stroke="currentColor"
          strokeWidth="3.2"
          className="opacity-60"
        />

        {/* Orbiting Satellite Dot Group (orbits along Inner Circle, radius 25) */}
        <g
          className={cn(
            "transition-transform",
            isSpinning && "animate-spin"
          )}
          style={{
            transformOrigin: "50px 50px",
            animationDuration: isSpinning ? "1.2s" : "0s",
            animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            animationIterationCount: "infinite",
          }}
        >
          {/* Subtle pulse aura when spinning */}
          {isSpinning && (
            <circle
              cx="25"
              cy="50"
              r="8"
              fill="currentColor"
              className="opacity-20 animate-pulse text-[#315F50]"
            />
          )}

          {/* Satellite Dot (rests at 9 o'clock on the INNER ring at x=25, y=50) */}
          <circle
            cx="25"
            cy="50"
            r="5.5"
            fill={isSpinning ? "#315F50" : "currentColor"}
            className="transition-colors duration-200"
          />

          {/* Dot reflection highlight */}
          <circle
            cx="23.8"
            cy="48.8"
            r="1.6"
            fill="#FFFFFF"
            className="opacity-90"
          />
        </g>
      </svg>
    </div>
  );
}
