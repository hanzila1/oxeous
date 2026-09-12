import type {
  ChatRequest,
  AnalysisResponse,
  JobStatusResponse,
  HealthResponse,
} from "@oxeous/shared-types";

const API_BASE_CANDIDATES = [
  process.env.NEXT_PUBLIC_API_URL,
  "http://127.0.0.1:8001",
  "http://localhost:8001",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index) as string[];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: unknown;

  for (const base of API_BASE_CANDIDATES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "Content-Type": "application/json", ...init?.headers },
        ...init,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json() as Promise<T>;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export const api = {
  chat: (body: ChatRequest): Promise<AnalysisResponse> =>
    request<AnalysisResponse>("/chat", { method: "POST", body: JSON.stringify(body) }),

  getJob: (jobId: string): Promise<JobStatusResponse> =>
    request<JobStatusResponse>(`/jobs/${jobId}`),

  health: (): Promise<HealthResponse> => request<HealthResponse>("/health"),

  exportResult: async (requestId: string): Promise<Blob> => {
    let lastError: unknown;

    for (const base of API_BASE_CANDIDATES) {
      try {
        const res = await fetch(`${base}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: requestId }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`${res.status}: ${text}`);
        }

        return await res.blob();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Export failed");
  },

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
