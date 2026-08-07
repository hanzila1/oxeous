# Oxeous — Implementation Plan

> **Tagline:** Ask the Earth. See the evidence.
> **Built with IBM Bob. Powered by IBM Granite and IBM–NASA Prithvi.**

---

## 1. Product Interpretation and Key Assumptions

### Interpretation

Oxeous is a map-first conversational Earth-observation platform. The core loop is:

```
User types a natural-language question
  → Granite extracts location, time-range, and analytical intent
  → A validated structured request is dispatched to the correct analysis tool
  → The backend retrieves or computes a georeferenced result
  → A MapLibre layer renders the result on a full-screen satellite map
  → Granite explains only the validated, data-backed result
  → Key statistics, provenance, and follow-up suggestions are surfaced
```

The experience is a **spatial dashboard controlled by conversation**, not a chatbot that happens to show a map.

### Key Assumptions

| # | Assumption | Rationale |
|---|-----------|-----------|
| A1 | Granite 3.x (8B Instruct) will be used via Ollama for local development and optionally via watsonx.ai for demo/production | Fastest path, no cloud billing requirement during development |
| A2 | NASA STAC endpoints (LPCLOUD, CMR-STAC, OPERA) are the primary data-discovery mechanism | Stable, public, well-documented |
| A3 | Cloud-Optimized GeoTIFF windowed reads replace full-scene downloads on the interactive path | Essential for sub-5-second response times |
| A4 | TerraTorch is used for Prithvi-EO inference; TerraKit is evaluated but treated as a convenience wrapper rather than a hard dependency | TerraKit is early-stage; all its critical functions can be replicated with rasterio + pystac + odc-stac |
| A5 | TerraMind is excluded from MVP; it may be added in a future phase if accessibility improves | Insufficient production maturity |
| A6 | Prithvi-EO 2.0 (100M) is used for the single advanced AI capability; larger variants are not used unless GPU is confirmed | Challenge demo will run on CPU-capable infrastructure |
| A7 | The Prithvi feature is background/on-demand, not on the critical interactive path | Prevents model inference from blocking map response |
| A8 | All secrets (NASA EarthData, IBM API keys) are managed via `.env` files locally and container secrets in production | No credentials committed to the repository |
| A9 | The MVP targets desktop browsers; mobile layout is a stretch goal | Scope control for challenge timeline |
| A10 | Analysis area of interest is capped at 1° × 1° bounding box for interactive requests | Prevents excessive COG reads |

---

## 2. Recommended MVP Scope

### In Scope (Challenge Demo)

- [ ] Location search (geocoding)
- [ ] Natural-language prompt intake with conversation history
- [ ] Granite-based extraction of location, date range, and analysis intent
- [ ] Validated structured analysis request contract
- [ ] Tool registry with 4 approved analysis tools (moisture change, water extent, disturbance alerts, true-color imagery)
- [ ] Real satellite imagery via NASA GIBS (base map)
- [ ] NDMI/NDVI change layer from HLS-VI COG windowed reads
- [ ] OPERA DSWx water-extent layer
- [ ] OPERA DIST disturbance alert layer
- [ ] Before-and-after comparison slider
- [ ] Per-pixel statistics and hotspot summary (top 5 worst patches)
- [ ] Data provenance card (source, acquisition dates, resolution)
- [ ] Granite-generated natural-language explanation of validated results
- [ ] Follow-up conversation suggestions
- [ ] Layer opacity and visibility controls
- [ ] One Prithvi-powered advanced feature: change-detection segmentation mask on user-selected AOI
- [ ] Basic export (PNG map snapshot + GeoJSON statistics)
- [ ] Loading, no-data, error, and partial-coverage states

### Stretch (If Time Permits)

- [ ] FIRMS fire hotspot layer
- [ ] Animated time-series playback
- [ ] Full mobile responsive layout
- [ ] watsonx.ai Granite deployment toggle
- [ ] User-drawn AOI polygon

### Future (Post-Challenge)

- [ ] TerraMind SAR+optical fusion
- [ ] Multi-user sessions and saved analyses
- [ ] Production-grade job queue (Celery / Redis)
- [ ] Custom Prithvi fine-tuned heads for specific regions
- [ ] S3-backed tile cache with CDN

---

## 3. End-to-End Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (MapLibre GL JS + React)            │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  Map Canvas  │  │  Conversation Panel  │  │  Layer / Stats   │  │
│  │  (MapLibre)  │  │  (Granite-powered)   │  │  Sidebar         │  │
│  └──────┬───────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│         │                     │                        │            │
└─────────┼─────────────────────┼────────────────────────┼────────────┘
          │ tile requests       │ REST/SSE               │ REST
          ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                                 │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │  /chat      │  │  /analyze        │  │  /tiles/{z}/{x}/{y}    │ │
│  │  endpoint   │  │  endpoint        │  │  (tile proxy/renderer) │ │
│  └──────┬──────┘  └────────┬─────────┘  └────────────────────────┘ │
│         │                  │                                         │
│  ┌──────▼──────────────────▼──────────────────────────────────────┐ │
│  │                   Orchestration Layer                           │ │
│  │  GraniteClient → ToolRegistry → AnalysisDispatcher             │ │
│  └──┬──────────────────┬────────────────────┬───────────────────┬─┘ │
│     │                  │                    │                   │   │
│  ┌──▼────┐  ┌──────────▼────────┐  ┌───────▼──────┐  ┌────────▼──┐ │
│  │Granite│  │  Data Pipeline    │  │  Prithvi     │  │  Cache    │ │
│  │Client │  │  (pystac + COG)   │  │  Service     │  │  (Redis/  │ │
│  │       │  │  TerraKit opt.    │  │  (TerraTorch)│  │  disk)    │ │
│  └───────┘  └───────────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
          │                                   │
          ▼                                   ▼
┌───────────────────┐                ┌───────────────────────────────┐
│  Granite (Ollama  │                │  NASA Endpoints               │
│  or watsonx.ai)   │                │  STAC (LPCLOUD, CMR, OPERA)   │
│                   │                │  COG assets (S3/HTTPS)        │
└───────────────────┘                │  GIBS tile service            │
                                     │  FIRMS REST API               │
                                     └───────────────────────────────┘
```

---

## 4. User and Data Flow

### Happy Path: "Show vegetation moisture decline around Lahore this month"

1. **User** types prompt in the Conversation Panel.
2. **Frontend** `POST /chat` with `{prompt, conversation_history, map_viewport}`.
3. **GraniteClient** sends a system-prompted request to the Granite model with tool definitions. Granite returns a `tool_call` JSON structure.
4. **ToolRegistry** validates the tool name and parameter schema. Rejects unknown tools.
5. **Orchestration Layer** resolves "Lahore" to a WGS84 bounding box via Nominatim. Resolves "this month" to ISO dates.
6. **DataPipeline** queries LPCLOUD STAC for HLS-VI NDMI assets covering the bounding box and date range. Selects best-quality scenes (lowest cloud cover). Extracts bounding-box window via COG HTTP range reads using rasterio/vsicurl. Computes NDMI delta between two periods. Generates a GeoTIFF tile output and a statistics summary.
7. **TileRenderer** converts the GeoTIFF to PNG tiles or serves it as a single georeferenced PNG/tile URL.
8. **GraniteClient** receives validated statistics + provenance and generates a natural-language explanation constrained to those facts.
9. **Frontend** receives a `AnalysisResponse` object containing: tile URL(s), legend spec, statistics, provenance, Granite explanation, follow-up suggestions.
10. **MapLibre** adds the layer, optionally shows a before/after comparison slider.
11. **Result Card** renders statistics, acquisition dates, and provenance.

### Prithvi Advanced Path: "Run AI analysis on this area"

1. User explicitly requests AI analysis on a drawn or selected AOI.
2. Backend queues a background Prithvi inference job.
3. Frontend shows progress state with task ID.
4. PrithviService fetches required HLS bands, preprocesses via TerraTorch utilities, runs Prithvi-EO 2.0 (100M) forward pass (change detection head).
5. Output mask is georeferenced and converted to a raster tile + GeoJSON hotspot vector.
6. Background job completes; frontend is notified via SSE or polling.
7. Granite explains the AI-derived output with explicit provenance labeling.

---

## 5. IBM Technology Integration and Justification

### IBM Granite

**Role:** Conversational reasoning, intent extraction, tool selection, result explanation.

**Integration method:** Granite 3.x 8B Instruct via Ollama (local development) + watsonx.ai (demo/production). The backend maintains a thin `GraniteClient` abstraction so the deployment target is switchable via environment variable.

**Tool-calling approach:** Granite 3.x supports tool-calling through structured prompt formatting. The system prompt includes tool definitions as JSON schema. Granite returns a JSON block containing `tool_name` and `parameters`. The backend parses this, validates against the ToolRegistry, and never allows Granite to fabricate data — Granite only explains what the data pipeline returns.

**Justification:** Granite is genuinely used at runtime for every analysis request. It is not a post-processing label generator; it is the intent extraction and explanation layer that makes the product conversational.

### IBM–NASA Prithvi-EO 2.0

**Role:** Advanced change-detection segmentation beyond spectral indices. Provides AI-learned representations of surface change that can detect patterns not captured by simple index arithmetic.

**Model chosen:** Prithvi-EO 2.0 100M (HuggingFace: `ibm-nasa-geospatial/Prithvi-EO-2.0-100M`). The 600M variant is explicitly excluded from MVP due to compute cost.

**Integration method:** Via TerraTorch model loader. Background inference job. Output is a binary/probabilistic change mask at 30m resolution, georeferenced and served as a raster tile.

**When it runs:** Only when explicitly requested (one dedicated capability). Not on every analysis.

**Justification:** Adds a capability that spectral indices cannot deliver — learned feature representations that generalize across surface types, illumination conditions, and phenological variation.

### TerraTorch

**Role:** Prithvi model loading, band preprocessing, tiled inference, GeoTIFF output.

**Integration method:** `pip install terratorch`. Used inside the `PrithviService` module. TerraTorch handles patch tiling (224×224), band normalization, and model forward pass. Outputs are reassembled into a georeferenced mosaic.

**Justification:** Eliminates custom implementation of Prithvi input/output handling. Reduces risk of normalization errors.

### TerraKit

**Role:** Evaluated for data retrieval pipeline convenience. Used where available; not treated as a hard dependency.

**Decision:** TerraKit is used in the `DataPipeline` module to query and align HLS data where its API is stable and reduces boilerplate. A fallback using `pystac-client` + `odc-stac` + `rasterio` is maintained so the system degrades gracefully if TerraKit is unavailable or its API changes.

**Justification:** Reduces boilerplate in STAC queries and dataset alignment. Risk is mitigated by the fallback.

### TerraMind

**Decision:** Excluded from MVP. The research-stage status and uncertain API availability present too high an integration risk for a challenge deadline. The plan reserves a clearly labeled future phase slot for TerraMind SAR+optical flood assessment if the model becomes accessible.

---

## 6. Satellite Data Sources and Access Strategy

| Source | Data | Access | Strategy |
|--------|------|--------|---------|
| NASA GIBS | True-color base imagery (Sentinel-2, Landsat, MODIS) | XYZ tiles (no auth) | Direct MapLibre raster layer. Proxied if CORS required. |
| NASA LPCLOUD STAC | HLS (L30/S30) surface reflectance + HLS-VI indices | STAC API + COG windowed read | pystac-client query + rasterio vsicurl window read. Requires NASA EarthData credentials. |
| NASA CMR-STAC / OPERA | DSWx water extent, DIST disturbance | STAC API + COG | Same pattern as LPCLOUD. |
| NASA FIRMS | Fire radiative power, thermal anomalies | REST API (no STAC) | Direct HTTP GET with bbox/date filter. Returns GeoJSON. |
| OpenStreetMap Nominatim | Geocoding / reverse geocoding | REST API (no auth) | Used to resolve location strings to bounding boxes. |
| Tile Cache (disk/Redis) | All derived tiles | Local cache store | Keyed by `{tool}_{bbox_hash}_{date_hash}`. TTL: 1 hour. |

### COG Access Pattern

```
1. STAC search: collection=HLS.S30.v2.0, bbox=[...], datetime=[start/end], eo:cloud_cover < 20
2. Select asset href for target band (e.g., B8A for SWIR1)
3. rasterio.open(href, env={GDAL_HTTP_HEADERS: earthdata_token}) — no full download
4. dataset.read(1, window=from_bounds(minx, miny, maxx, maxy, dataset.transform))
5. Produce NumPy array → apply index formula → export to memory GeoTIFF
6. Serve as raster tile (gdal2tiles or rio-cogeo) or single PNG overlay
```

### Hybrid Response Tiers

| Tier | Trigger | Latency Target | Method |
|------|---------|----------------|--------|
| 1 — Cached | Same AOI + date + tool seen before | < 0.5 s | Return cached tile URL |
| 2 — GIBS Tile | True-color imagery only | < 1 s | Direct MapLibre tile layer |
| 3 — COG Window | Index computation on small AOI | 2–8 s | Windowed read + NumPy compute |
| 4 — Prithvi | Advanced AI analysis | 30–120 s | Background job + SSE progress |

---

## 7. Granite Tool-Calling and Structured-Output Design

### System Prompt Architecture

The Granite system prompt consists of three sections:
1. Role and constraints (never invent data, use only tool results to explain)
2. Tool definitions (JSON schema for each registered tool)
3. Response format instruction (tool_call JSON block or final explanation)

### Tool Definition Contract (shared schema)

```json
{
  "name": "analyze_vegetation_moisture_change",
  "description": "Compute NDMI change between two time periods for an area of interest",
  "parameters": {
    "type": "object",
    "properties": {
      "location": { "type": "string", "description": "Human-readable location name" },
      "bbox": { "type": "array", "items": { "type": "number" }, "minItems": 4, "maxItems": 4 },
      "current_period": {
        "type": "object",
        "properties": { "start": { "type": "string", "format": "date" }, "end": { "type": "string", "format": "date" } },
        "required": ["start", "end"]
      },
      "comparison_period": {
        "type": "object",
        "properties": { "start": { "type": "string", "format": "date" }, "end": { "type": "string", "format": "date" } },
        "required": ["start", "end"]
      },
      "preferred_product": { "type": "string", "enum": ["HLS_VI_NDMI", "HLS_VI_NDVI", "HLS_S30"] }
    },
    "required": ["location", "current_period", "comparison_period", "preferred_product"]
  }
}
```

### Registered Tools (MVP)

| Tool Name | Analysis | Input | Output |
|-----------|---------|-------|--------|
| `analyze_vegetation_moisture_change` | NDMI delta | bbox, two date ranges | Raster tile + stats |
| `analyze_surface_water_extent` | OPERA DSWx | bbox, date | Raster tile + area stats |
| `analyze_land_disturbance` | OPERA DIST | bbox, date | Vector hotspot + raster |
| `fetch_true_color_imagery` | GIBS Sentinel/Landsat | bbox, date | Tile URL only |
| `analyze_prithvi_change_detection` | Prithvi-EO segmentation | bbox, date range | Background job ID |

### Validation Layer

All Granite outputs pass through a Pydantic `AnalysisRequest` model before dispatch. If validation fails, the error is returned to Granite with a correction prompt (one retry maximum). If the second attempt also fails, the system returns a structured error to the user without executing any data operation.

### Explanation Contract

After data pipeline execution, Granite receives:
```json
{
  "tool_used": "analyze_vegetation_moisture_change",
  "statistics": { "mean_ndmi_change": -0.12, "pct_area_declined": 34.2, "hotspot_count": 8 },
  "provenance": { "source": "HLS.S30.v2.0", "acquisition_dates": ["2025-05-01", "2025-06-02"], "cloud_cover_pct": 4 },
  "coverage_quality": "good"
}
```

Granite must explain only these facts. The system prompt explicitly prohibits extrapolation, causal claims, or invented data points.

---

## 8. Prithvi / TerraTorch / TerraKit Integration Strategy

### Prithvi Inference Pipeline

```
Input:  HLS S30 bands B02, B03, B04, B8A, B11, B12 (6 bands, two time steps)
           ↓ TerraKit (or pystac + rasterio fallback): query, cloud-mask, stack
           ↓ TerraTorch: normalize bands → tile to 224×224 patches → inference
           ↓ Prithvi-EO 2.0 100M: change-detection segmentation head
           ↓ TerraTorch: reassemble tiles → write GeoTIFF with CRS
Output: Georeferenced change probability raster → PNG tiles + GeoJSON hotspots
```

### TerraTorch Usage Points

```python
from terratorch.models import PrithviModelFactory
from terratorch.tasks import ChangeDetectionTask
from terratorch.datamodules import HLSBands

model = PrithviModelFactory.build("Prithvi-EO-2.0-100M", task="change_detection")
task = ChangeDetectionTask(model, bands=HLSBands.SIX_BAND_CHANGE)
output = task.predict(image_stack)  # image_stack: (T, C, H, W) tensor
```

### TerraKit Integration

TerraKit is used to handle STAC search and dataset alignment for the Prithvi pipeline:

```python
from terrakit import HLSDataset

ds = HLSDataset.from_stac(bbox=bbox, start=t1_start, end=t2_end, bands=["B02","B03","B04","B8A","B11","B12"])
stacked = ds.to_xarray()  # (time, band, y, x) aligned array
```

Fallback (if TerraKit unavailable):
```python
import pystac_client, odc.stac, rasterio
# Manual STAC query + odc-stac load + rasterio window read
```

### Output Serving

The Prithvi output GeoTIFF is stored temporarily on disk (or object storage), converted to COG format using `rio-cogeo`, and served either as:
- A single georeferenced PNG overlay via `/tiles/prithvi/{job_id}/overlay.png`
- XYZ tiles via `gdal2tiles` for larger outputs

---

## 9. Frontend and Map-Interface Architecture

### Technology Stack

| Concern | Choice | Rationale |
|---------|--------|---------|
| Framework | Next.js 14 (App Router) | SSR for SEO/perf, React for component model, TypeScript natively |
| Map renderer | MapLibre GL JS 4.x | Open-source, no token required, powerful style API |
| State management | Zustand | Minimal, TypeScript-friendly, no boilerplate |
| Styling | Tailwind CSS + shadcn/ui | Rapid premium UI without custom design system |
| HTTP client | TanStack Query | Caching, loading states, retry logic built in |
| Before/After slider | maplibre-compare plugin | Fork of Mapbox Compare, draggable divider between two map instances |
| Type validation | Zod | Shared with backend contract types |

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Navigation Rail (left, 56px)                                │
│  [Logo] [Search] [Layers] [Export] [Settings]                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   M A P    C A N V A S    ( MapLibre GL JS )                 │
│                                                              │
│   ┌─────────────────────────────────────┐  ┌─────────────┐  │
│   │  Conversation + Result Panel        │  │ Layer Panel │  │
│   │  (right side, 380px, slide-in)      │  │ (toggle)    │  │
│   │                                     │  │             │  │
│   │  [Analysis history]                 │  │ [Legend]    │  │
│   │  [Prompt input]                     │  │ [Opacity]   │  │
│   │  [Result card + stats]              │  │ [Visibility]│  │
│   │  [Follow-up chips]                  │  └─────────────┘  │
│   └─────────────────────────────────────┘                    │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │  Map attribution + scale bar + coordinates           │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Component Map

| Component | File | Responsibility |
|-----------|------|---------------|
| `MapCanvas` | `components/map/MapCanvas.tsx` | MapLibre instance, layer management |
| `LayerManager` | `components/map/LayerManager.ts` | Add/remove/update MapLibre layers from analysis results |
| `CompareSlider` | `components/map/CompareSlider.tsx` | Before/after comparison via maplibre-compare |
| `ConversationPanel` | `components/chat/ConversationPanel.tsx` | Chat history, prompt input, result cards |
| `AnalysisResultCard` | `components/chat/AnalysisResultCard.tsx` | Stats, provenance, Granite explanation |
| `LayerSidebar` | `components/layers/LayerSidebar.tsx` | Layer list, opacity, visibility |
| `LocationSearch` | `components/map/LocationSearch.tsx` | Geocoding search box → map fly-to |
| `FollowUpChips` | `components/chat/FollowUpChips.tsx` | Clickable follow-up suggestions |
| `ProgressOverlay` | `components/ui/ProgressOverlay.tsx` | Prithvi background job progress |

### API Contract (TypeScript types, shared via `packages/shared-types`)

```typescript
// Shared between frontend and backend
export interface AnalysisRequest {
  analysis_type: AnalysisType;
  location: string;
  bbox: [number, number, number, number];
  current_period: { start: string; end: string };
  comparison_period?: { start: string; end: string };
  preferred_product: string;
}

export interface AnalysisResponse {
  request_id: string;
  analysis_type: AnalysisType;
  tile_url?: string;
  overlay_url?: string;
  geojson_hotspots?: GeoJSON.FeatureCollection;
  statistics: Record<string, number | string>;
  provenance: DataProvenance;
  explanation: string;
  follow_up_suggestions: string[];
  coverage_quality: "good" | "partial" | "poor" | "unavailable";
  legend: LegendSpec;
}

export interface DataProvenance {
  source: string;
  acquisition_dates: string[];
  spatial_resolution_m: number;
  cloud_cover_pct: number;
  processing_level: string;
  doi?: string;
}
```

---

## 10. Backend Service Architecture

### Technology Stack

| Concern | Choice | Rationale |
|---------|--------|---------|
| Framework | FastAPI + uvicorn | Async, auto-OpenAPI, Python ecosystem for geo |
| Validation | Pydantic v2 | Type-safe request/response contracts |
| Geo processing | rasterio, numpy, shapely | COG reads, index computation, geometry ops |
| STAC client | pystac-client | NASA STAC queries |
| Array ops | xarray + odc-stac | Multi-temporal stacked rasters |
| Prithvi inference | TerraTorch | Model loading + preprocessing |
| Task queue | Background tasks (FastAPI) for MVP; Celery/Redis for stretch | Async Prithvi jobs |
| Caching | diskcache (local) → Redis in production | Tile and analysis result cache |
| Tile serving | rio-tiler or gdal2tiles | Convert GeoTIFF outputs to web tiles |
| HTTP server | uvicorn + gunicorn | Containerized deployment |

### Module Structure

```
backend/
  app/
    main.py                  # FastAPI app, route registration
    config.py                # Settings (pydantic-settings, reads .env)
    api/
      routes/
        chat.py              # POST /chat — Granite conversation
        analyze.py           # POST /analyze — dispatch tool
        tiles.py             # GET /tiles/{job_id}/{z}/{x}/{y}.png
        jobs.py              # GET /jobs/{job_id} — Prithvi job status
        export.py            # POST /export
    core/
      granite_client.py      # Granite LLM interface (Ollama / watsonx.ai)
      tool_registry.py       # Registered tool definitions + validator
      orchestrator.py        # Route validated request to correct tool
    tools/
      vegetation_moisture.py # NDMI change tool
      surface_water.py       # OPERA DSWx tool
      disturbance.py         # OPERA DIST tool
      true_color.py          # GIBS imagery tool
      prithvi_change.py      # Prithvi advanced AI tool
    data/
      stac_client.py         # pystac-client wrapper
      cog_reader.py          # rasterio windowed COG reads
      terrakit_adapter.py    # TerraKit integration (with fallback)
      index_compute.py       # NDMI, NDVI, NDWI, NBR formulas
      tile_renderer.py       # GeoTIFF → PNG tiles
    prithvi/
      service.py             # Background Prithvi inference job
      preprocessor.py        # Band stacking + TerraTorch preprocessing
      postprocessor.py       # Mask → GeoTIFF → hotspot GeoJSON
    cache/
      store.py               # diskcache wrapper with TTL helpers
    models/
      requests.py            # Pydantic request models
      responses.py           # Pydantic response models
      enums.py               # AnalysisType, CoverageQuality enums
    utils/
      geocoder.py            # Nominatim → bbox resolution
      date_resolver.py       # "this month", "last month" → ISO dates
      logging.py             # Structured JSON logging
      tracing.py             # Request ID generation + context
```

### Key Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Full conversation round-trip (Granite → tool → explain) |
| POST | `/analyze` | Direct structured analysis (bypass Granite, for testing) |
| GET | `/tiles/{job_id}/{z}/{x}/{y}.png` | Serve raster tiles |
| GET | `/tiles/{job_id}/overlay.png` | Serve single-image overlay |
| GET | `/jobs/{job_id}` | Poll Prithvi background job status |
| GET | `/layers/gibs` | Return GIBS layer metadata |
| POST | `/export` | Export result as GeoTIFF + stats JSON |
| GET | `/health` | Health check |

---

## 11. Recommended Repository Structure

```
oxeous/
  packages/
    shared-types/           # TypeScript interfaces + Zod schemas
      src/
        analysis.ts
        responses.ts
        enums.ts
      package.json
  frontend/
    app/                    # Next.js App Router pages
      page.tsx              # Root map page
      layout.tsx
    components/             # React components (see §9)
    hooks/
      useAnalysis.ts        # TanStack Query hook for /chat
      useMapLayers.ts       # MapLibre layer state sync
    lib/
      maplibre.ts           # MapLibre init + defaults
      api.ts                # Typed API client (fetch + Zod)
    public/
    tailwind.config.ts
    next.config.ts
    package.json
  backend/
    app/                    # FastAPI modules (see §10)
    tests/
      unit/
      integration/
      e2e/
    pyproject.toml
    Dockerfile
  infra/
    docker-compose.yml
    docker-compose.prod.yml
    nginx/
      nginx.conf
  docs/
    architecture.md
    api-reference.md
    data-sources.md
  experiments/              # Validation experiments (see §20)
    granite_tool_calling/
    prithvi_inference/
    cog_read_perf/
  .env.example
  .gitignore
  README.md
```

---

## 12. Core Data Models and API Contracts

### AnalysisType Enum

```
vegetation_moisture_change
surface_water_extent
land_disturbance
true_color_imagery
prithvi_change_detection
vegetation_health_comparison
```

### POST /chat Request

```json
{
  "prompt": "Show vegetation moisture decline around Lahore this month",
  "conversation_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "map_viewport": {
    "center": [74.35, 31.52],
    "zoom": 10,
    "bbox": [73.8, 31.1, 74.9, 31.9]
  }
}
```

### POST /chat Response

```json
{
  "request_id": "req_abc123",
  "granite_intent": {
    "analysis_type": "vegetation_moisture_change",
    "location": "Lahore, Pakistan",
    "bbox": [73.8, 31.1, 74.9, 31.9],
    "current_period": { "start": "2025-06-01", "end": "2025-06-25" },
    "comparison_period": { "start": "2025-05-01", "end": "2025-05-25" },
    "preferred_product": "HLS_VI_NDMI"
  },
  "tile_url": "/tiles/req_abc123/{z}/{x}/{y}.png",
  "legend": {
    "title": "NDMI Change",
    "colormap": "RdYlGn",
    "min": -0.5,
    "max": 0.5,
    "units": "Δ NDMI"
  },
  "statistics": {
    "mean_ndmi_change": -0.12,
    "pct_area_declined": 34.2,
    "pct_area_improved": 8.1,
    "hotspot_count": 8,
    "area_declined_km2": 124.5
  },
  "provenance": {
    "source": "HLS.S30.v2.0",
    "acquisition_dates": ["2025-05-03", "2025-06-08"],
    "spatial_resolution_m": 30,
    "cloud_cover_pct": 4,
    "processing_level": "L30 SR",
    "doi": "10.5067/HLS/HLSS30.002"
  },
  "explanation": "Vegetation moisture declined across approximately 34% of the monitored area around Lahore between May and June 2025, with the most significant decreases concentrated in the southeastern agricultural zones. Eight hotspot patches exceeded a 0.3 NDMI decline threshold.",
  "follow_up_suggestions": [
    "Show the same area in NDVI to compare vegetation greenness",
    "Overlay FIRMS fire data to check for thermal stress",
    "Run Prithvi AI analysis on the worst-affected hotspot"
  ],
  "coverage_quality": "good",
  "geojson_hotspots": { "type": "FeatureCollection", "features": [...] }
}
```

---

## 13. Caching and Latency Strategy

### Cache Key Design

```
{tool_name}:{bbox_snapped_0.01deg}:{date_hash}:{product}
```

Bounding boxes are snapped to 0.01° grid to improve cache hit rate for nearby repeat requests.

### Cache Tiers

| Tier | Backend | TTL | What is cached |
|------|---------|-----|---------------|
| Analysis result | diskcache (local), Redis (prod) | 1 hour | Full AnalysisResponse JSON |
| Derived tile | Disk file store | 1 hour | GeoTIFF + PNG tile directory |
| STAC search results | In-memory (lru_cache) | 5 min | STAC item lists for AOI/date |
| GIBS tiles | Browser cache (Cache-Control) | 24 h | Tile images |
| Prithvi output | Disk | 24 h | Change mask GeoTIFF + hotspot GeoJSON |

### Latency Targets

| Operation | P50 target | P95 target |
|-----------|-----------|-----------|
| Granite intent extraction | 1.5 s | 3 s |
| STAC scene search | 0.5 s | 2 s |
| COG windowed read (1° × 1° bbox) | 2 s | 6 s |
| NDMI computation + tile export | 1 s | 3 s |
| Full `/chat` (Tier 3 fresh) | 6 s | 12 s |
| Full `/chat` (Tier 1 cached) | 0.3 s | 0.8 s |
| Prithvi inference (background) | 30 s | 90 s |

---

## 14. Testing and Evaluation Strategy

### Unit Tests

| Module | Tests |
|--------|-------|
| `date_resolver.py` | "this month", "last month", "past 30 days", relative offsets |
| `geocoder.py` | Known cities → expected bbox ranges |
| `tool_registry.py` | Valid tool names pass; unknown names reject; schema validation |
| `index_compute.py` | NDMI, NDVI formulas against known values |
| `granite_client.py` | Mocked LLM responses → correct parsed AnalysisRequest |
| Pydantic models | All required fields validated; enum constraints enforced |

### Integration Tests

| Scenario | Method |
|----------|--------|
| Full `/chat` with mocked Granite | FastAPI TestClient + mocked GraniteClient |
| STAC search against NASA sandbox | Real LPCLOUD query with a known scene ID |
| COG windowed read | Read known public COG asset, verify shape and dtype |
| Tile rendering | Input synthetic GeoTIFF → verify PNG tile output |
| Cache hit path | Call `/chat` twice with same params, verify second is faster |

### End-to-End Tests

| Scenario | Tool |
|----------|------|
| User types prompt → map layer appears | Playwright + mock backend |
| Before/after slider renders two layers | Playwright visual regression |
| Prithvi job polling flow | Playwright + slow mock endpoint |
| No-data state displayed correctly | Playwright + mocked empty STAC response |

### Evaluation (LLM Quality)

A test fixture of 20 prompt/expected-tool pairs is maintained. Each Granite response is scored:
- Correct tool selected (binary)
- All required parameters present (binary)
- Date resolution correct (binary)
- No hallucinated data in explanation (manual review gate)

This fixture runs in CI as a regression check.

---

## 15. Security, Provenance and Observability

### Secrets Management

- All credentials in `.env` (never committed)
- `.env.example` with placeholder values committed
- Docker Compose reads from `.env` at runtime
- Production: environment variables injected via container secrets or Kubernetes secrets

### Input Validation

- All user prompts sanitized (no shell or SQL injection surface)
- AOI area limit enforced: bbox area > 4 deg² is rejected with a clear user message
- Date ranges capped: no more than 1 year spread
- All Granite outputs re-validated via Pydantic before execution

### Provenance

Every `AnalysisResponse` carries a `provenance` object including source dataset, acquisition dates, spatial resolution, processing level, and DOI. Granite's explanation references only data in this object.

### Observability

- Structured JSON logging with `structlog` (Python)
- Every request assigned a `request_id` logged at every step
- Timing spans logged for: Granite call, STAC search, COG read, compute, tile export
- Error types categorized: `GraniteError`, `StacError`, `CogReadError`, `ComputeError`, `ValidationError`
- `/health` endpoint exposes dependency checks (Granite reachable, STAC reachable, cache writable)
- OpenTelemetry trace export (to Jaeger or OTLP collector) in production config

### Dependency Security

- `pip-audit` runs in CI on every PR
- `npm audit` runs in CI on every PR
- Dependabot enabled for both Python and JavaScript
- Docker base images scanned with Trivy

---

## 16. Local Development and Deployment Approach

### Local Development

```bash
# Start all services
docker compose up

# Or develop components individually:
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev  # port 3000
ollama serve                # Granite LLM (port 11434)
```

### docker-compose.yml Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | Next.js dev server |
| `backend` | 8000 | FastAPI + uvicorn |
| `ollama` | 11434 | Granite LLM inference |
| `redis` | 6379 | Cache (production mode) |
| `nginx` | 80 | Reverse proxy (production) |

### Environment Variables (.env.example)

```
# Granite / IBM
GRANITE_DEPLOYMENT=ollama               # ollama | watsonx
GRANITE_MODEL=granite3-8b              # Ollama model name
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# NASA
NASA_EARTHDATA_USERNAME=
NASA_EARTHDATA_PASSWORD=
NASA_EARTHDATA_TOKEN=

# App
MAX_AOI_DEG2=4.0
CACHE_TTL_SECONDS=3600
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000
```

### Production Deployment

- Docker images built via `docker build` for frontend and backend
- `docker-compose.prod.yml` adds nginx reverse proxy, Redis, and replaces Ollama with watsonx.ai config
- No Kubernetes required for challenge demo; single-host Docker Compose is sufficient

---

## 17. Phased Implementation Milestones

### Phase 0 — Validation Experiments (Before Main Implementation)
**Objective:** Resolve the three highest-risk technical uncertainties before committing architecture.

- [ ] **Experiment A:** Granite tool-calling reliability test
- [ ] **Experiment B:** COG windowed read performance test
- [ ] **Experiment C:** Prithvi/TerraTorch smoke test

*See §20 for details.*

---

### Phase 1 — Project Scaffold and Map Shell
**Objective:** A running monorepo with a full-screen MapLibre map, NASA GIBS base layer, and location search. No analysis yet.

**User-visible outcome:** User opens the app, sees a satellite map of the world, can search for a location and fly to it.

**Components:**
- Next.js + MapLibre GL JS frontend scaffold
- GIBS tile layer (Sentinel-2 true color)
- Location search (Nominatim)
- FastAPI backend skeleton with `/health`
- docker-compose.yml with frontend + backend

**Files created:**
- `frontend/app/page.tsx`, `layout.tsx`
- `frontend/components/map/MapCanvas.tsx`
- `frontend/components/map/LocationSearch.tsx`
- `backend/app/main.py`, `config.py`
- `backend/app/api/routes/health.py`
- `docker-compose.yml`, `.env.example`
- `packages/shared-types/src/analysis.ts`

**Dependencies:** Node.js, Python 3.11+, Docker

**Tests:**
- MapCanvas renders without errors (Vitest + React Testing Library)
- `/health` returns 200 (pytest)
- Location search returns a bbox for "Lahore" (unit test)

**Definition of done:** App loads with satellite base map; search "Salzburg" → map flies to Salzburg. CI passes.

---

### Phase 2 — Granite Intent Extraction
**Objective:** A working Granite-powered intent extraction pipeline that takes a user prompt and returns a validated `AnalysisRequest`.

**User-visible outcome:** User types a prompt; the system extracts location, dates, and analysis type and displays the parsed intent in the UI (not yet a map layer — just the structured output shown as a debug card).

**Components:**
- `granite_client.py` (Ollama integration)
- `tool_registry.py` (4 tools registered)
- `orchestrator.py` (route dispatch)
- `date_resolver.py`, `geocoder.py`
- Pydantic request/response models
- `/chat` endpoint (returns intent only, no analysis yet)
- Frontend: conversation panel + parsed intent card

**Files created:**
- `backend/app/core/granite_client.py`
- `backend/app/core/tool_registry.py`
- `backend/app/core/orchestrator.py`
- `backend/app/utils/date_resolver.py`
- `backend/app/utils/geocoder.py`
- `backend/app/models/requests.py`
- `backend/app/models/responses.py`
- `frontend/components/chat/ConversationPanel.tsx`

**Dependencies:** Ollama running with `granite3-8b` pulled

**Tests:**
- 20-prompt fixture test for Granite intent accuracy (≥ 85% pass rate)
- Date resolver unit tests (10 relative date patterns)
- Tool registry rejects unknown tool names
- `/chat` endpoint returns valid AnalysisRequest schema

**Definition of done:** System correctly extracts intent for all 5 example prompts from the product brief. CI passes.

---

### Phase 3 — First Analysis Tool (NDMI Change)
**Objective:** Full end-to-end working analysis for vegetation moisture change: prompt → Granite → validated request → STAC search → COG read → index compute → raster tile → map layer → statistics.

**User-visible outcome:** User asks "Show where vegetation moisture declined around Lahore this month." A colored NDMI change overlay appears on the map. A result card shows statistics and provenance. Granite explains the result.

**Components:**
- `stac_client.py` (LPCLOUD HLS queries)
- `cog_reader.py` (windowed read)
- `index_compute.py` (NDMI formula)
- `tile_renderer.py` (GeoTIFF → PNG tiles)
- `vegetation_moisture.py` tool
- `/tiles` route
- Cache store (diskcache)
- Frontend: LayerManager, AnalysisResultCard, legend

**Files created:**
- `backend/app/data/stac_client.py`
- `backend/app/data/cog_reader.py`
- `backend/app/data/index_compute.py`
- `backend/app/data/tile_renderer.py`
- `backend/app/tools/vegetation_moisture.py`
- `backend/app/api/routes/tiles.py`
- `backend/app/cache/store.py`
- `frontend/components/map/LayerManager.ts`
- `frontend/components/chat/AnalysisResultCard.tsx`
- `frontend/components/layers/LayerSidebar.tsx`

**Dependencies:** NASA EarthData credentials, rasterio, pystac-client, odc-stac, numpy

**Tests:**
- STAC search returns ≥1 scene for Lahore in June 2025 (integration)
- COG read produces correct shape array for known asset (integration)
- NDMI formula unit test against synthetic array
- Tile renderer produces valid PNG from synthetic GeoTIFF
- Cache returns cached result on second call (integration)
- E2E: Lahore prompt → tile appears on map within 15 s (Playwright)

**Definition of done:** Lahore moisture change demo works end-to-end with real data. Response time < 12 s on first request, < 1 s on cached repeat. CI passes.

---

### Phase 4 — Surface Water and Disturbance Tools
**Objective:** Add OPERA DSWx and OPERA DIST analysis tools so the platform covers three distinct analysis types.

**User-visible outcome:** "Highlight possible surface-water expansion after recent rainfall" → DSWx water-extent layer. "Show recent land-disturbance hotspots" → DIST alert layer with clickable hotspot markers.

**Components:**
- `surface_water.py` tool (OPERA DSWx STAC)
- `disturbance.py` tool (OPERA DIST STAC)
- GeoJSON hotspot overlay in MapLibre
- Clickable hotspot popup

**Files created:**
- `backend/app/tools/surface_water.py`
- `backend/app/tools/disturbance.py`
- `frontend/components/map/HotspotLayer.tsx`

**Dependencies:** OPERA STAC endpoint access

**Tests:**
- DSWx STAC query returns results for a known flood event date + location (integration)
- DIST query returns results for a known disturbance event (integration)
- Both tools return correct provenance structure
- Hotspot GeoJSON renders in MapLibre without errors (Vitest)

**Definition of done:** All three prompt examples from the product brief return valid map results. CI passes.

---

### Phase 5 — Before/After Comparison and Export
**Objective:** Enable the before/after comparison slider and basic export capability.

**User-visible outcome:** "Compare vegetation conditions between this month and last month" → side-by-side swipe comparison. Export button produces a downloadable PNG + stats JSON.

**Components:**
- `CompareSlider.tsx` (maplibre-compare)
- `/export` endpoint
- Export format: PNG map snapshot + stats + provenance JSON

**Files created:**
- `frontend/components/map/CompareSlider.tsx`
- `backend/app/api/routes/export.py`

**Tests:**
- Compare slider renders two distinct layers
- Export endpoint returns a zip with PNG + JSON
- Playwright: swipe interaction works correctly

**Definition of done:** Before/after slider functional for NDMI change. Export produces downloadable artifacts. CI passes.

---

### Phase 6 — Prithvi Advanced AI Capability
**Objective:** Add the Prithvi-EO 2.0 change-detection feature as an on-demand background capability.

**User-visible outcome:** User clicks "Run AI Analysis" on a selected hotspot area. A progress indicator appears. After 30–90 seconds, an AI-derived change mask appears on the map with a label "AI Analysis — Powered by IBM–NASA Prithvi-EO 2.0".

**Components:**
- `prithvi/service.py` (background task)
- `prithvi/preprocessor.py` (TerraTorch band prep)
- `prithvi/postprocessor.py` (mask → tiles + hotspot GeoJSON)
- `terrakit_adapter.py` (TerraKit with fallback)
- `/jobs/{job_id}` route (polling)
- `ProgressOverlay.tsx`
- SSE or polling progress in frontend

**Files created:**
- `backend/app/prithvi/service.py`
- `backend/app/prithvi/preprocessor.py`
- `backend/app/prithvi/postprocessor.py`
- `backend/app/data/terrakit_adapter.py`
- `backend/app/api/routes/jobs.py`
- `frontend/components/ui/ProgressOverlay.tsx`

**Dependencies:** TerraTorch, PyTorch (CPU), HuggingFace Hub access

**Tests:**
- Preprocessor produces correct tensor shape for known input (unit)
- Postprocessor converts synthetic mask to valid GeoTIFF (unit)
- Job polling returns status transitions: queued → running → complete (integration)
- Prithvi output tile appears on map after job completes (Playwright)

**Definition of done:** Prithvi analysis runs on a small AOI (e.g., 20×20 km), produces a georeferenced output, and appears on the map. Granite labels the result as AI-derived with model provenance. CI passes.

---

### Phase 7 — Polish, Security, and Demo Readiness
**Objective:** Production-quality UI polish, security review, documentation, and challenge demo preparation.

**User-visible outcome:** The application looks and feels like a polished professional product. Error states are handled gracefully. The demo script covers all 5 example prompts from the product brief.

**Components:**
- Loading, no-data, partial-coverage UI states
- Mobile responsive layout (basic)
- Security: input validation hardening, CORS config, `pip-audit`, `npm audit`, Trivy scan
- `README.md`, `docs/architecture.md`, `docs/api-reference.md`
- Docker production compose (`docker-compose.prod.yml`)
- End-to-end demo run validation

**Tests:**
- All existing tests pass
- Security scan reports zero high/critical CVEs
- Playwright full demo script runs without errors

**Definition of done:** All 5 demo prompts work with real data. Security scan clean. Documentation complete. CI passes on all test suites.

---

## 18. Acceptance Criteria by Milestone

| Milestone | Acceptance Criteria |
|-----------|-------------------|
| Phase 0 | All 3 experiments produce a written outcome (pass/fail/adaptation). No architecture commitments made without experiment data. |
| Phase 1 | Map loads with GIBS tiles. Location search works for 5 test cities. `/health` returns 200. CI green. |
| Phase 2 | 17/20 (85%) Granite intent fixture tests pass. All 5 product-brief example prompts produce a valid AnalysisRequest. CI green. |
| Phase 3 | Lahore NDMI change demo works with real HLS data. Response < 12 s first call, < 1 s cached. Statistics match manual verification. CI green. |
| Phase 4 | DSWx and DIST tools return real data for known events. Provenance displayed. CI green. |
| Phase 5 | Before/after slider works without layout breakage. Export zip is valid and openable. CI green. |
| Phase 6 | Prithvi job completes for a 20×20 km AOI. Output appears on map. Model provenance clearly labeled. CI green. |
| Phase 7 | All 5 demo prompts work. Zero high/critical CVEs. Docs complete. Playwright demo script passes. CI green. |

---

## 19. Major Technical Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **R1: Granite tool-calling unreliable at 8B scale** | High | Structured prompt with JSON examples. One retry with corrective feedback. If reliability < 80% in Experiment A, add constrained grammar decode (llama.cpp grammar) or switch to direct Pydantic-validated prompt parsing. |
| **R2: NASA EarthData authentication blocks COG reads** | High | Test credential flow in Experiment B. Maintain a set of public HLS test assets. Add clear auth error state in UI. |
| **R3: TerraTorch API instability breaks Prithvi integration** | Medium | Pin exact TerraTorch version. Run Experiment C before Phase 6. Keep a plain HuggingFace `transformers` fallback path. |
| **R4: COG windowed read latency exceeds 12 s for some scenes** | Medium | Area cap at 1° × 1°. Scene selection by cloud cover. Cache. Fall back to coarser GIBS tiles if COG too slow. |
| **R5: TerraKit pip install or API fails** | Medium | Fallback to `pystac-client + odc-stac + rasterio` is already in the design. TerraKit is a convenience, not a hard dependency. |
| **R6: Granite explains unavailable data as available** | High | Granite only receives validated, data-backed statistics. System prompt explicitly prohibits unsupported claims. Coverage quality field forces honest reporting. |
| **R7: OPERA STAC endpoints have limited coverage for demo region** | Low-Medium | Pre-validate demo locations against OPERA holdings. Have fallback to NDWI (HLS-computed) if DSWx unavailable. |
| **R8: Prithvi-EO 2.0 change detection head not yet fine-tuned for demo region** | Medium | Evaluate on a known change event during Experiment C. If quality insufficient, use the embedding distance between two temporal patches as a change signal instead of a segmentation head. |
| **R9: MapLibre COG rendering requires plugin** | Low | maplibre-geotiff plugin is available. The backend tile server is the primary serving path and avoids browser-side COG rendering entirely. |
| **R10: Demo environment lacks GPU** | Low | Prithvi 100M runs on CPU (slower). Prithvi jobs are background/async. Cache warms pre-demo results. |

---

## 20. Small Validation Experiments

These experiments must be completed in Phase 0 before committing to the architecture. Each should take less than 2 hours and produce a clear pass/fail/adapt outcome.

### Experiment A — Granite Tool-Calling Reliability

**Question:** Does Granite 3.x 8B Instruct, running via Ollama, reliably produce valid JSON tool-call output for the 5 product-brief example prompts?

**Method:**
1. `ollama pull granite3-8b`
2. Write a Python script that sends each of the 5 example prompts with a system prompt containing 2 tool definitions.
3. Parse the response for valid JSON with required fields.
4. Run 5 times per prompt, record success rate.

**Pass:** ≥ 4/5 prompts produce valid JSON on ≥ 4/5 runs.
**Fail/Adapt:** If below threshold, try (a) adding a JSON example in the system prompt, (b) using `format=json` Ollama option, (c) evaluating `granite3-3b` for speed at (potentially) lower accuracy.

**Location:** `experiments/granite_tool_calling/`

---

### Experiment B — COG Windowed Read Performance

**Question:** Can a 1° × 1° bbox windowed read from an HLS S30 COG asset on LPCLOUD be completed in under 8 seconds with valid NASA EarthData credentials?

**Method:**
1. Query LPCLOUD STAC for a known HLS S30 scene over a test location (e.g., Salzburg, 2024-06).
2. Open the B8A asset URL with `rasterio` and `GDAL_HTTP_HEADERS=Bearer {token}`.
3. Read the window corresponding to the 1° × 1° bbox.
4. Record time, output shape, and data type.

**Pass:** Read completes in < 8 s. Array shape and dtype are correct.
**Fail/Adapt:** If slow, try (a) smaller bbox (0.5° × 0.5°), (b) lower-resolution fallback (HLS L30), (c) pre-fetching from a regional mirror.

**Location:** `experiments/cog_read_perf/`

---

### Experiment C — Prithvi/TerraTorch Smoke Test

**Question:** Can TerraTorch load Prithvi-EO 2.0 100M from HuggingFace and produce a valid output tensor from a synthetic 6-band, 2-timestep, 224×224 input on CPU?

**Method:**
1. `pip install terratorch`
2. Load `ibm-nasa-geospatial/Prithvi-EO-2.0-100M` via TerraTorch model factory.
3. Create a synthetic tensor `(2, 6, 224, 224)` with realistic reflectance values.
4. Run forward pass. Record output shape and inference time.

**Pass:** Model loads without error. Output tensor has expected shape. Inference completes in < 120 s on CPU.
**Fail/Adapt:** If TerraTorch fails, try direct HuggingFace `transformers` load. If inference > 120 s, reduce to 112×112 patch size or consider GPU-only deployment with a CPU skip/cache strategy.

**Location:** `experiments/prithvi_inference/`

---

## Recommended First Implementation Milestone

After plan approval, the recommended first implementation milestone for Bob to execute is:

### **Phase 0 — Run the Three Validation Experiments**

This is the non-negotiable first step. Before writing a single line of application code, the three experiments above must validate:

1. Granite tool-calling works reliably enough to build on
2. NASA COG windowed reads are fast enough for the interactive path
3. TerraTorch + Prithvi load and run on available hardware

Each experiment is self-contained, lives in `experiments/`, and produces a written outcome file (`experiments/{name}/RESULT.md`). The results directly influence whether any architectural choice needs to change before Phase 1 begins.

**Once Phase 0 is complete and results are reviewed, Bob should proceed with Phase 1 — Project Scaffold and Map Shell.**
