"use client";

import { useCallback } from "react";
import { useStore } from "@/lib/store";
import type { AnalysisResponse } from "@oxeous/shared-types";

export function useMapLayers() {
  const { layers, addLayer, removeLayer, updateLayer } = useStore();

  const applyAnalysisResult = useCallback(
    (result: AnalysisResponse) => {
      if (!result.tile_url) return;
      addLayer({
        id: result.request_id,
        label: result.analysis_type.replace(/_/g, " "),
        type: "raster",
        tileUrl: result.tile_url,
        overlayUrl: result.overlay_url,
        visible: true,
        opacity: 0.85,
        legend: result.legend,
        analysisType: result.analysis_type,
      });
    },
    [addLayer],
  );

  return { layers, addLayer, removeLayer, updateLayer, applyAnalysisResult };
}
