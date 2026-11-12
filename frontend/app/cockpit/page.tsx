"use client";

import dynamic from "next/dynamic";

const CockpitApp = dynamic(() => import("@/components/cockpit/CockpitApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#060A10] text-[#7A8791]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#10B981] border-t-transparent" />
        <span className="font-mono text-xs uppercase tracking-widest text-[#AAB3BB]">
          Initializing Copernicus Spatial OS...
        </span>
      </div>
    </div>
  ),
});

export default function CockpitPage() {
  return <CockpitApp />;
}

