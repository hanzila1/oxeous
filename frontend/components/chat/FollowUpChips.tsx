"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export default function FollowUpChips({ suggestions, onSelect }: Props) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={cn(
            "flex items-center gap-1 text-[11px] text-text/80 hover:text-text",
            "bg-bg border border-border hover:border-steel/40 hover:bg-bg-2",
            "rounded-chip px-2.5 py-1 transition-all duration-150 text-left",
          )}
        >
          <ArrowRight className="w-2.5 h-2.5 text-steel flex-shrink-0" />
          {s}
        </button>
      ))}
    </div>
  );
}
