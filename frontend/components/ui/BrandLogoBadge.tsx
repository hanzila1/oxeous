"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface BrandLogoBadgeProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function BrandLogoBadge({ style, className }: BrandLogoBadgeProps = {}) {
  const { eudrPanelOpen, setEudrPanelOpen, compareMode } = useStore();

  // If the EUDR dashboard is open or compare mode is active, keep header clear
  if (eudrPanelOpen || compareMode) return null;

  return (
    <button
      type="button"
      onClick={() => setEudrPanelOpen(true)}
      title="Open EUDR Compliance Suite"
      style={style}
      className={cn(
        "absolute top-3 left-3 z-20 flex items-center bg-white/95 border border-[#C8CFD5] shadow-sm hover:shadow-md hover:border-[#AAB3BB] px-3.5 py-2 rounded-xl select-none transition-all cursor-pointer",
        className
      )}
    >
      <img
        src="/oxeous-logo-tight.png"
        alt="Oxeous"
        style={{ height: "24px", width: "auto" }}
        className="h-[24px] max-h-[24px] w-auto object-contain"
      />
    </button>
  );
}
