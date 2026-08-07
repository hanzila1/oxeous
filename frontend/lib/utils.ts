import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatArea(km2: number): string {
  if (km2 >= 1000) return `${(km2 / 1000).toFixed(1)} ×10³ km²`;
  return `${km2.toFixed(1)} km²`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getCoverageColor(quality: string): string {
  const map: Record<string, string> = {
    good: "#22c55e",
    partial: "#f59e0b",
    poor: "#ef4444",
    unavailable: "#64748b",
  };
  return map[quality] ?? "#64748b";
}

export function getCoverageLabel(quality: string): string {
  const map: Record<string, string> = {
    good: "Full Coverage",
    partial: "Partial Coverage",
    poor: "Poor Coverage",
    unavailable: "No Data",
  };
  return map[quality] ?? "Unknown";
}
