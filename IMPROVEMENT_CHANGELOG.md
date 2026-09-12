# Improvement Changelog — Oxeous Earth Agent
**Frontier Engineering Challenge 2026 — Deliverable 01: Evolution Story**

---

## 📊 Summary Progression Matrix

| STAGE | WHAT WAS TRIED & WHY | LIMITATION / FAILURE OBSERVED | EVIDENCE & ACCURACY | DECISION / LEARNING |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline** | **Direct LLM Prompt (No Tools)**<br>Single Gemini prompt given the supplier's claim, commodity type, and GeoJSON coordinates to triage compliance. | **100% Blind to Earth Truth**<br>LLM has no vision of satellite pixels; believed deceptive claims (e.g. TC-05 Colombia coffee claiming 2019 pre-cutoff clearing) and hedged on tropical regions. | **3/10 correct (30%)**<br>• 6 UNCERTAIN<br>• 1 critical False PASS<br>• 3 obvious EU passes | **Established starting point:** Pure language models hallucinate on deforestation. Direct satellite computation is non-negotiable. |
| **Iteration 1** | **Direct STAC Search (Sentinel-2 / Landsat)**<br>Queried open STAC catalogs (AWS / Element84) to fetch recent optical satellite image tiles over the plot. | **Cannot Compute Historical Loss**<br>STAC snapshots only show current green cover. Optical RGB cannot calculate cumulative 25-year post-2020 loss or evaluate the Dec 31, 2020 cutoff date. | **4/10 correct (40%)**<br>(**+10% gain**)<br>Visual verification only; no quantitative loss stats | **Removed raw STAC pipeline:** Visual image inspection is insufficient for legal due diligence. Pivoted to Google Earth Engine's planetary computing backend for historical pixel algebra. |
| **Iteration 2** | **Static 30m GEE Reduction (Hansen GFC v1.13)**<br>Queried GEE for post-2020 forest loss (`lossyear > 20`) at fixed 30m pixel resolution across plot bounding boxes. | **Earth Engine Timeout on Large Plots**<br>Fixed 30m pixel reduction worked on 500-ha farms, but timed out and exceeded memory limits on 50,000 to 1,000,000-ha commercial concessions (e.g. Mato Grosso soya). | **7/10 correct (70%)**<br>(**+30% gain**)<br>All Amazon deforestation plots correctly flagged | **Engineered Dynamic Scale Optimization:** Implemented `_compute_scale()`, dynamically adapting pixel sampling pyramid levels based on plot area. Reduced 1M ha queries from infinite timeout to **32 seconds**. |
| **Iteration 3** | **Multi-Signal Typology + External REST APIs**<br>Added Forest Typology (ForTy) 2020 & WRI Loss Drivers. Attempted to query external REST APIs (MapBiomas Brazil and third-party WDPA endpoints). | **Brittle APIs & Protected Area Gap**<br>External REST APIs had rate limits, 504 gateway timeouts, and failed on remote African/Asian plots. Plots inside national parks without deforestation slipped through as PASS (TC-08 Peru coffee). | **8/10 correct (80%)**<br>(**+10% gain**)<br>Smallholder 0.6 ha clearings correctly caught | **Removed external REST APIs:** Unified protected areas directly into native GEE (`WCMC/WDPA/current/polygons`). Made WDPA intersection zero-dependency and 100% reliable. |
| **Iteration 4 (Final)** | **Autonomous 6-Tool GEE Pipeline + SSE Telemetry + JSON Trajectories**<br>Combined Hansen GFC, Nature Trace, Typology, WRI Drivers, Commodity Maps, and native WDPA with live streaming telemetry and Gemini Flash reasoning. | **Solved all previous failure modes:**<br>• TC-08 correctly flagged as **Hard Legality Violation**<br>• Execution under 30 seconds<br>• Zero false passes | **10/10 correct (100%)**<br>(**+20% gain**)<br>Mock-verified & GEE-verified across all benchmark test cases | **Identified main contribution:** Grounding the agent in 6 authoritative Earth Observation datasets + mathematical legal gating + immutable JSON trajectories (`trajectories/req_*.json`) transformed a 30% hallucinating prompt into an enterprise-grade compliance pipeline. |

---

## 🔍 Detailed Iteration Log

### Baseline (V0) — Direct LLM Prompt, Zero Tools
- **What was tried:**  
  A single Gemini prompt containing the supplier's text claim, commodity, country name, and GeoJSON polygon. The LLM was asked to output `PASS`, `FAIL`, or `UNCERTAIN` with legal reasoning.
- **Why:**  
  Establish the simplest possible starting point. A text-only LLM represents how a non-technical compliance officer might try to prompt ChatGPT or Gemini to triage a large volume of supplier declarations.
- **Limitation & Failure Modes:**
  - **100% Blindness to Earth Observation**: The LLM has no access to satellite data and cannot see if trees were cleared.
  - **Deceptive Supplier Exploits**: In TC-05 (Colombia coffee), the supplier falsely claimed clearing occurred in 2019 (pre-cutoff). The LLM believed the text and returned a **critical False PASS**.
  - **Hedging**: The LLM hedged to `UNCERTAIN` on 6 out of 10 cases whenever tropical countries were mentioned.
- **Evaluation Evidence:** **3/10 correct (30%)**.
- **Decision:** Text-only LLMs are completely unviable for regulatory compliance. Direct satellite computation is mandatory.

---

### Iteration 1 (V1) — Direct STAC Optical Imagery Search
- **What was tried:**  
  Integrated an open STAC client (AWS / Element84 Earth Search) to fetch the most recent Sentinel-2 Level-2A and Landsat-8 optical imagery over the plot coordinates.
- **Why:**  
  Test whether providing optical satellite imagery directly to a multimodal vision agent could solve the verification problem without needing complex planetary computing infrastructure.
- **Limitation & Failure Modes:**
  - **Snapshot Fallacy**: An optical image only reveals what the plot looks like today. If a plot is currently green pasture or young cocoa shrubs, it looks "green" to the model, completely masking the fact that primary rainforest was bulldozed in 2022.
  - **Cloud Cover Obstruction**: Tropical regions (Ghana, Indonesia, Amazon) have 60–80% cloud cover during rainy seasons, returning completely obscured white optical tiles.
  - **Cannot Calculate Historical Baseline**: Optical snapshots cannot compute cumulative 25-year deforestation loss or reference the mandatory December 31, 2020 legal cutoff date.
- **Evaluation Evidence:** **4/10 correct (40%)**.
- **Decision (Experiment Removed):** Abandoned raw optical image inspection. Pivoted to Google Earth Engine's planetary raster computing backend to query multi-temporal, cloud-masked historical datasets.

---

### Iteration 2 (V2) — Static 30m GEE Reduction (Hansen GFC v1.13)
- **What was tried:**  
  Connected Google Earth Engine API using the authoritative **Hansen Global Forest Change v1.13 (2025)** dataset. Calculated exact tree canopy cover in 2000, 2020 baseline, and post-2020 forest loss (`lossyear > 20`) across the polygon boundary.
- **Why:**  
  Hansen GFC is the global benchmark used by the European Commission Joint Research Centre (JRC) and Global Forest Watch. It directly answers the core EUDR question: was forest cleared after Dec 31, 2020?
- **Limitation & Failure Modes:**
  - **Earth Engine Out-of-Memory / Timeout**: On small 50-ha farms, the 30m pixel reduction ran smoothly in 4 seconds. However, when tested on commercial mega-concessions (e.g. 50,000 to 1,000,000-ha soya and cattle ranches in Mato Grosso, Brazil), Earth Engine exceeded its HTTP memory limit and timed out indefinitely.
  - **Borderline Edge Cases**: Smallholder clearings (e.g. 0.6 ha in Bahia Cerrado) did not produce enough statistical weight to trigger a definitive violation without knowing what kind of vegetation was cleared.
- **Decision & Engineering Fix:**
  - Implemented **Dynamic Scale Optimization** (`_compute_scale()` in `gee_commodity.py`), automatically adjusting pyramid sampling resolution (from 30m up to 100m) based on bounding box hectare size.
  - Reduced query latency on a 1,000,000-hectare plot from an infinite timeout crash to **32 seconds**.
- **Evaluation Evidence:** **7/10 correct (70%)** (+30% gain). All Amazon clearings correctly identified.

---

### Iteration 3 (V3) — Multi-Signal Typology + External REST APIs
- **What was tried:**  
  Added two complementary GEE datasets to resolve edge cases:
  1. **Forest Typology (ForTy) 2020 v1.0 (10m)**: Distinguishes Primary Forest, Naturally Regenerating Forest, Plantations, and Agroforestry.
  2. **WRI / Google DeepMind Drivers of Forest Loss (1km)**: Classifies deforestation causes (Permanent Commercial Agriculture, Shifting Cultivation, Wildfire).
  Additionally, attempted to query external third-party REST APIs for local land use (MapBiomas for Brazil) and protected area lookups.
- **Why:**  
  To solve borderline clearings (e.g. TC-06 Cerrado cocoa, 0.6 ha loss). Forest Typology was specifically designed by the World Resources Institute to answer "was this natural forest in 2020?"
- **Limitation & Failure Modes:**
  - **External API Fragility**: External REST APIs suffered from frequent 504 gateway timeouts, strict per-minute rate limits, and lacked coverage for Africa and Southeast Asia.
  - **The Legality Blind Spot**: In TC-08 (Peru coffee), the plot had zero post-2020 deforestation, but was physically located inside an IUCN protected national park. Because protected area checking was reliant on external lookups that failed, the plot slipped through as a False PASS.
- **Decision (Experiment Removed & Unified):**
  - Removed brittle external REST APIs entirely.
  - Replaced them with GEE-native **World Database on Protected Areas (`WCMC/WDPA/current/polygons`)**, performing zero-dependency spatial polygon intersections natively inside Google Earth Engine.
- **Evaluation Evidence:** **8/10 correct (80%)** (+10% gain). TC-06 Cerrado cocoa correctly failed.

---

### Iteration 4 (V4) — Final Architecture: 6-Tool GEE Pipeline + SSE Telemetry + JSON Trajectories
- **What was tried:**  
  Unified all 6 authoritative datasets into an autonomous, parallel execution pipeline:
  1. *Hansen GFC v1.13 (2025)* — Post-cutoff deforestation loss (ha and %).
  2. *Nature Trace Natural Forests 2020* — 10m natural forest probability.
  3. *Forest Typology 2020* — Primary vs. plantation classification.
  4. *WRI Drivers of Forest Loss* — Permanent agriculture vs. wildfire.
  5. *Forest Data Partnership 2025* — Commodity crop verification.
  6. *WDPA Protected Areas* — Hard legal reserve intersection.
  Added Server-Sent Events (SSE) for live step-by-step agent telemetry and an automated audit trajectory recorder (`trajectories/req_*.json`).
- **Why:**  
  Provide an end-to-end, enterprise-ready system that meets EUDR Article 9 regulatory requirements for auditable Due Diligence Statements (DDS).
- **Result & Solved Failures:**
  - **TC-08 Peru Coffee**: Correctly flagged as a **Hard Legality Violation** due to national park intersection (`risk_score = 100`).
  - **Zero False Passes**: 100% of non-compliant plots caught.
  - **Lightning Speed**: Complete 6-tool assessment completes in under 30 seconds.
  - **Audit Proof**: Every tool call, bounding box, timestamp, and satellite reduction is logged into a machine-verifiable JSON trajectory.
- **Evaluation Evidence:** **10/10 correct (100%)** — verified across 10 global benchmark sourcing plots.

---

## 💡 What I Learned About the Problem
1. **Satellite Computation Trumps Language Generation**: An agent's power in scientific compliance comes from the authority of its sensory tools. The LLM's primary role is synthesizing and explaining evidence, not guessing it.
2. **Pyramid Scaling is Essential for Geographic Work**: Earth observation data is massive. Without dynamic scale optimization, real-world commercial plots will crash standard agent architectures.
3. **Legality is Spatial, Not Textual**: Deforestation tools alone cannot solve EUDR compliance. Checking physical overlap with protected reserves is mandatory to prevent environmental laundering.
