"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Loader2, X, Cpu } from "lucide-react";
import type { JobStatusResponse } from "@oxeous/shared-types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 3000;

export default function ProgressOverlay() {
  const { activePrithviJob, setActivePrithviJob, addLayer } = useStore();
  const [status, setStatus] = useState<JobStatusResponse | null>(null);

  useEffect(() => {
    if (!activePrithviJob) { setStatus(null); return; }

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const s = await api.getJob(activePrithviJob);
        if (!cancelled) {
          setStatus(s);
          if (s.status === "complete") {
            clearInterval(interval);
            if (s.result?.tile_url) {
              addLayer({
                id: activePrithviJob,
                label: "Prithvi AI Analysis",
                type: "raster",
                tileUrl: s.result.tile_url,
                visible: true,
                opacity: 0.9,
                legend: s.result.legend,
                analysisType: "prithvi_change_detection",
              });
            }
            setTimeout(() => { if (!cancelled) setActivePrithviJob(null); }, 4000);
          } else if (s.status === "failed") {
            clearInterval(interval);
          }
        }
      } catch {
        /* ignore transient errors */
      }
    }, POLL_INTERVAL_MS);

    return () => { cancelled = true; clearInterval(interval); };
  }, [activePrithviJob, addLayer, setActivePrithviJob]);

  if (!activePrithviJob || !status) return null;

  const progress = status.progress_pct ?? 0;
  const isComplete = status.status === "complete";
  const isFailed   = status.status === "failed";

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 animate-slide-in">
      <div className="glass panel-shadow border border-border rounded-card px-4 py-3 min-w-72 max-w-sm space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-prithvi-purple flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-text">Prithvi AI Analysis</p>
              <p className="text-[10px] text-muted">IBM–NASA Prithvi-EO 2.0 · Change Detection</p>
            </div>
          </div>
          {(isComplete || isFailed) && (
            <button
              onClick={() => setActivePrithviJob(null)}
              className="text-muted hover:text-text transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!isComplete && !isFailed && (
          <div className="space-y-1">
            <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-prithvi-purple rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted capitalize">{status.status}</span>
              <span className="text-[10px] text-text">{progress}%</span>
            </div>
          </div>
        )}

        {/* Status message */}
        {status.message && (
          <p className="text-[11px] text-muted">{status.message}</p>
        )}

        {/* States */}
        {!isComplete && !isFailed && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <Loader2 className="w-3 h-3 animate-spin text-prithvi-purple" />
            Running inference on CPU…
          </div>
        )}

        {isComplete && (
          <div className="flex items-center gap-1.5 text-[11px] text-success">
            ✓ Analysis complete — layer added to map
          </div>
        )}

        {isFailed && (
          <div className="text-[11px] text-danger">
            ✕ Analysis failed. {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
