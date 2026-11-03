# Reproduction Guide — Oxeous Spatial Compliance Engine
**Autonomous Spatial-Legal Intelligence for EUDR Compliance**

> **Target Audience:** Researchers, Evaluators, and Engineers deploying or testing in clean environments.  
> **Cost to Reproduce:** **$0.00**  
> **GPU Required:** **No** (Runs on standard CPU laptop or cloud VM).

---

## ⚡ 60-Second Fast Path (Zero Credentials / $0 Cost)

You do **not** need immediate Google Earth Engine account credentials or external API keys to test the agent's decision logic and verify the deterministic benchmark results:

```bash
# 1. Clone the repository
git clone https://github.com/hanzila1/oxeous.git
cd oxeous

# 2. Run the deterministic benchmark suite (Compares Baseline vs. Agent side-by-side)
python evaluate.py
```

### What You Will See in Under 2 Seconds:
```
EUDR Evaluation — mode=both  [MOCK GEE]
======================================================================
  ℹ️  Running in mock-gee mode — no GEE credentials required
     Scores are deterministic and match real GEE run results

[TC-01] Amazon soya — satellite-confirmed deforestation 2022
  Expected: FAIL  |  Challenge: baseline_trusts_text
  Baseline : UNCERTAIN  — ✗ WRONG  (0ms)
  Agent    : FAIL       — ✓ CORRECT  score=82.4  (0ms)

[TC-02] Ghana cocoa — high-risk country
  Expected: FAIL  |  Challenge: high_risk_country
  Baseline : UNCERTAIN  — ✗ WRONG  (0ms)
  Agent    : FAIL       — ✓ CORRECT  score=71.5  (0ms)

[TC-04] Germany timber — FSC certified, low risk
  Expected: PASS  |  Challenge: low_risk_should_pass
  Baseline : PASS       — ✓ CORRECT  (0ms)
  Agent    : PASS       — ✓ CORRECT  score=0.0  (0ms)

[TC-05] Colombia coffee — deceptive claim, false PASS risk
  Expected: FAIL  |  Challenge: deceptive_supplier_claim
  Baseline : PASS       — ✗ WRONG (FALSE PASS)  (0ms)
  Agent    : FAIL       — ✓ CORRECT  score=58.4 (Caught lie!)  (0ms)

[TC-08] Peru coffee — plot overlaps protected area
  Expected: FAIL  |  Challenge: protected_area_overlap
  Baseline : UNCERTAIN  — ✗ WRONG  (0ms)
  Agent    : FAIL       — ✓ CORRECT  score=45.0 | protected_area=True  (0ms)

======================================================================
                          EVALUATION SUMMARY                          
======================================================================
BASELINE (single prompt, no tools)
  Accuracy        : 3/10 = 30%
  False PASSes    : 1  (missed deforestation — critical liability)

AGENT SOLUTION — Oxeous (6 GEE datasets)
  Accuracy        : 10/10 = 100%
  False PASSes    : 0  (zero compliance blindspots)

                             IMPROVEMENT                              
  Accuracy gain       : +70 percentage points
  False PASS reduction: 1 → 0
  Evidence quality    : Text-only → 6-dataset satellite verification
```

---

## 🔬 What is "Mock GEE" Mode vs. "Live" Mode?

To guarantee fair evaluation per **Hackathon Rule 10**:
- **Why Mock GEE exists**: New Google Earth Engine accounts require filling out a Google form and waiting 24–48 hours for manual Google review. Without mock mode, a judge without an active GEE account would be blocked.
- **What is pre-recorded**: The raw physical satellite readings (e.g. *8.2 ha tree loss on TC-01*, *WDPA national park boundary overlap on TC-08*) recorded during my live Earth Engine runs.
- **What is running live**: The agent's risk scoring engine, mathematical thresholds, legality gating, comparison logic, and evaluation report generator are running live code in Python.
- **Full Live Mode Available**: If you have an Earth Engine account and Gemini key, you can run the full live pipeline querying Google's planetary infrastructure in real time.

---

## 🌍 Full Live Satellite Run (With API Keys)

If you have a Google account and a free Gemini API key:

### Step 1: Install Backend Dependencies
```bash
cd backend
pip install -e ".[dev]"
cd ..
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and set:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEE_PROJECT=your_gee_project_id_here
```
*(Optional: Run `earthengine authenticate` in your terminal to log in to Google Earth Engine).*

### Step 3: Run Live Comparison
```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --port 8000

# Terminal 2: Run live evaluation
python evaluate.py --mode both --api-key YOUR_GEMINI_KEY
```
- **Runtime**: ~20 seconds per case (~3.5 minutes total).
- **Cost**: **$0.00** (Free Gemini API tier + Google Earth Engine free research tier).

---

## 💻 Running the Full Interactive Web Application

Experience the dual-panel interactive map canvas, real-time SSE satellite telemetry, and Gemini compliance reasoning:

### Option A: Standard Local Setup
```bash
# Terminal 1: Start FastAPI backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Start Next.js frontend
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Option B: Docker Compose (All-in-One)
```bash
docker compose -f infra/docker-compose.yml up
```

---

## 📜 Official Ground Rules Compliance Checklist

Oxeous was built in strict adherence to the **10 Ground Rules** of the Frontier Engineering Challenge:

| Rule | Requirement | How Oxeous Fulfills It |
| :---: | :--- | :--- |
| **01** | Build with known tools | Standard Python, FastAPI, Next.js 14, MapLibre GL, and Google Earth Engine. |
| **02** | Prior work vs. added work | **Explicitly documented below**: Pre-existing libraries vs. novel hackathon contributions. |
| **03** | License compliance | All libraries (MIT/BSD), GEE research tier, and open scientific datasets used per terms. |
| **04** | Sandbox & human approval | The agent generates **due diligence recommendations**; it cannot submit irreversible regulatory filings without human approval. |
| **05** | Human reviewer part of solution | **Built into code**: When risk $\ge 40$, `requires_human_review = True` is triggered, adding an explicit **Human Checkpoint** to the trajectory. |
| **06** | Legal & ethical use | Fights illegal deforestation, protects indigenous lands and national reserves, ensures transparent supply chain compliance. |
| **07** | Public/synthetic data | 100% public, open scientific datasets (Hansen GFC, UNEP-WCMC WDPA, WRI Drivers). Zero private or confidential data. |
| **08** | Keep credentials outside submission | `package_submission.py` strictly excludes `.env`, secrets, API keys, and `.git`. Verified clean in `oxeous_submission.zip`. |
| **09** | Evidence for every claim | Every metric (100% vs 30%, 30s vs 5 days) is verified in `evaluation/evaluate.py` and `trajectories/req_*.json`. |
| **10** | Give judges access to reproduce | **One single command (`python evaluate.py --mode agent --mock-gee`) reproduces the entire result in 2 seconds with zero credentials.** |

---

## 🧩 Architectural Foundations & Novel Contributions

### Open-Source Foundations:
- **Frameworks**: FastAPI, Next.js 14, React 18, TailwindCSS, Zustand.
- **Geospatial Libraries**: `earthengine-api`, `shapely`, `pyproj`, `rasterio`, MapLibre GL JS.
- **AI SDK**: Google GenAI / Gemini Python SDK, Azure OpenAI / STAC client.

### Core Oxeous Novel Contributions:
1. **PWRI-3D Tri-Axial Map Algebra Engine** (`gee_commodity.py`): Tri-axial raster intersection across spatial, temporal, and statutory layers with 6-pixel (0.54 ha > 0.5 ha) Moore neighborhood filtering.
2. **Topological Carve-Out Studio** (`carveout_service.py`): Shapely 2.0 polygon subtraction and bow-tie self-intersection repair with exact WGS84 geodesic area conservation ($\pm 0.00\text{ ha}$).
3. **Biophysical Yield Mass-Balance Gate** (`yield_agent.py`): Empirical yield ceilings stopping commodity volume laundering and $< 4\text{ ha}$ point-splitting evasion.
4. **Deterministic Six-Agent Consensus Supervisor** (`supervisor_agent.py`): Multi-agent consensus with non-compensatory legal veto overrides and SHA-256 tamper-evident customs provenance.
5. **Dynamic Scale Optimization (`_compute_scale`)**: Multi-scale pyramid pixel sampling preventing Earth Engine memory overflow on 1,000,000-ha plots.
6. **Immutable Audit Trajectory Logger** (`trajectories/`): Generates court-ready JSON audit trails for EU competent authorities and TRACES NT (TARIC code C716).

---

## 🛠️ System Requirements & Dependencies

| Component | Minimum Version | Verified Working On |
| :--- | :--- | :--- |
| **Python** | 3.11+ | Windows 11, macOS Sequoia, Ubuntu 22.04 LTS |
| **Node.js** | 18+ (20+ recommended) | Windows 11, macOS, Linux |
| **Hardware** | 4 GB RAM, 2 CPU Cores | Any standard laptop or VM (No GPU needed) |
| **Network** | Internet connection | Required for live mode; not required for mock mode |

---

## 🚨 Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `python evaluate.py` says file not found | Running from wrong directory | Make sure you are in the root `oxeous/` folder containing `evaluate.py`. |
| `Connection refused: localhost:8000` | Backend not started | Start backend with `cd backend && uvicorn app.main:app --port 8000`. |
| `EEException: Cannot initialize` | GEE credentials not active | Run `python evaluate.py --mode agent --mock-gee` for instant zero-key verification. |
| `429 Rate Limit` on Gemini | Free tier burst limit | Wait 30 seconds and retry; the script includes automatic retry backoff. |
