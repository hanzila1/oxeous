"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ChatRequest, AnalysisResponse } from "@oxeous/shared-types";

export function useAnalysis() {
  return useMutation<AnalysisResponse, Error, ChatRequest>({
    mutationFn: (req) => api.chat(req),
  });
}
