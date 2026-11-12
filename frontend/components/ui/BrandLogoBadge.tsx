"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { EULogoSeal } from "@/components/icons/EOIcons";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface BrandLogoBadgeProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function BrandLogoBadge({ style, className }: BrandLogoBadgeProps = {}) {
  const { eudrPanelOpen, setEudrPanelOpen, compareMode } = useStore();

  // If the EUDR dashboard is open or compare mode is active, keep header clear
  if (eudrPanelOpen || compareMode) return null;

  return (
    <div
      style={style}
      className={cn(
        "absolute top-3 left-3 z-20 flex items-center gap-2 bg-white/95 border border-[#C8CFD5] shadow-sm hover:shadow hover:border-[#AAB3BB] px-2.5 py-1.5 rounded-xl select-none transition-all",
        className
      )}
    >
      <Link
        href="/"
        title="Return to Main Website"
        className="flex items-center gap-1 text-[10px] font-mono font-medium text-[#747F88] hover:text-[#1D2227] px-1 py-0.5 rounded hover:bg-[#E3E7EA] transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        <span>Overview</span>
      </Link>

      <div className="h-3.5 w-[1px] bg-[#C8CFD5]" />

      <button
        onClick={() => setEudrPanelOpen(true)}
        title="Open EUDR Compliance Suite"
        className="flex items-center gap-2 cursor-pointer group"
      >
        <img
          src="/oxeous-logo-tight.png"
          alt="Oxeous"
          style={{ height: "20px", width: "auto" }}
          className="h-[20px] max-h-[20px] w-auto object-contain"
        />
        <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-[#315F50] bg-[rgba(49,95,80,0.08)] border border-[rgba(49,95,80,0.25)] px-1.5 py-0.5 rounded group-hover:bg-[rgba(49,95,80,0.14)] transition-colors">
          <EULogoSeal className="w-3 h-3 text-[#315F50]" />
          <span>EU 2023/1115</span>
        </span>
      </button>
    </div>
  );
}
