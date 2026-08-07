import type {
  ChatRequest,
  AnalysisResponse,
  JobStatusResponse,
  HealthResponse,
} from "@oxeous/shared-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  chat: (body: ChatRequest): Promise<AnalysisResponse> =>
    request<AnalysisResponse>("/chat", { method: "POST", body: JSON.stringify(body) }),

  getJob: (jobId: string): Promise<JobStatusResponse> =>
    request<JobStatusResponse>(`/jobs/${jobId}`),

  health: (): Promise<HealthResponse> => request<HealthResponse>("/health"),

  exportResult: (requestId: string): Promise<Blob> =>
    fetch(`${API_BASE}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    }).then((r) => r.blob()),

  geocode: (query: string): Promise<{ bbox: [number, number, number, number]; displayName: string } | null> =>
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "User-Agent": "Oxeous/0.1 (earth-observation-platform)" } },
    )
      .then((r) => r.json())
      .then((results) => {
        if (!results.length) return null;
        const r = results[0];
        const bb = r.boundingbox as [string, string, string, string];
        return {
          bbox: [
            parseFloat(bb[2]),
            parseFloat(bb[0]),
            parseFloat(bb[3]),
            parseFloat(bb[1]),
          ] as [number, number, number, number],
          displayName: r.display_name as string,
        };
      })
      .catch(() => null),
};
