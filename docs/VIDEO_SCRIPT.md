# Oxeous Earth Agent — 5-Minute Solution Video Script & Sequence
**Frontier Engineering Challenge 2026 — Deliverable 03 Guide**

> **Target Duration:** Exactly 4 to 5 minutes  
> **Key Rubric Requirements:**
> 1. Begin with the problem and simple baseline.
> 2. Walk through one realistic execution from start to finish.
> 3. Show the final comparison and explain the changelog.
> 4. Highlight the change that contributed most.
> 5. Highlight one experiment you removed.

---

## ⏱️ Video Timeline Overview

| Section | Timecode | Focus Screen | What to Say / Show |
| :--- | :---: | :--- | :--- |
| **1. The Problem & Baseline** | 0:00 – 1:00 | Slides / Hero Banner | The EUDR cutoff mandate, the target user, and why manual GIS & text LLMs fail (30% baseline). |
| **2. Live Realistic Execution** | 1:00 – 2:45 | Oxeous Web Dashboard (`localhost:3000`) | 1-click execution of Mato Grosso Soya: live SSE telemetry, map layers, Gemini reasoning, and audit trajectory. |
| **3. Final Comparison & Changelog** | 2:45 – 3:45 | `evaluate.py` CLI & Changelog Table | 30% → 100% gain across 10 cases, 0 false passes, +70pp accuracy leap. |
| **4. Key Contributor & Removed Experiment** | 3:45 – 4:30 | Architecture Diagram / Code | Most impactful change (Dynamic Scale GEE) vs. Removed experiment (Raw STAC optical snapshots & external REST APIs). |
| **5. Hot Take & Conclusion** | 4:30 – 5:00 | Hero Banner & GitHub Repo | "Satellite truth beats model size" — court-ready Due Diligence in 30 seconds. |

---

## 🎬 Minute-by-Minute Narration Script

### 0:00 – 1:00 | Part 1: The Problem & The Simple Baseline
*(Show `docs/hero-banner.png` or slide showing EUDR Regulation 2023/1115)*

> **Speaker:**  
> "Under the European Union Deforestation Regulation, any company importing cocoa, coffee, palm oil, soya, or timber into the EU must legally prove that their sourcing plots were **not deforested after December 31, 2020**, and do not violate protected areas. Non-compliance carries fines of up to **4% of annual EU turnover**.
> 
> Global commodity traders like Cargill or Unilever manage over 50,000 farm plots. Today, their baseline process is **manual GIS analysis** using desktop software like QGIS. It takes 3 to 5 business days per plot and costs hundreds of dollars in consultant fees. 
> 
> When teams attempt to automate this with **generic, text-only LLMs**—the simple baseline—it achieves only **30% accuracy**. An LLM on its own cannot see satellite pixels. In test case 5, a Colombian supplier claimed their land was cleared in 2019; the baseline LLM trusted the text and gave a **critical False PASS**, missing 2.1 hectares of actual primary forest clearing.
> 
> That’s why I built **Oxeous**—an autonomous spatial agent powered by Google Gemini and 6 Google Earth Engine planetary satellite datasets."

---

### 1:00 – 2:45 | Part 2: One Realistic Execution from Start to Finish
*(Screen recording of Oxeous Web UI at `http://localhost:3000`)*

> **Speaker:**  
> "Let’s watch one realistic execution from start to finish.
> 
> Here is the Oxeous dashboard. I'll load an active sourcing plot: **Mato Grosso Soya Frontier in Brazil**, spanning over 59,000 hectares.
> 
> In 1 click, I dispatch the audit.
> *(Click the benchmark case button or run the query)*
> 
> Look at the real-time agent trace streaming via Server-Sent Events:
> 1. **Tool 1: Hansen Global Forest Change v1.13** queries 25 years of tree canopy history and post-2020 loss.
> 2. **Tool 2: Nature Trace Natural Forests** certifies whether this was undisturbed natural forest at the 2020 cutoff.
> 3. **Tool 3: Forest Typology 2020** confirms this was primary regenerating forest, not an existing tree plantation.
> 4. **Tool 4: WRI Drivers of Loss** identifies the physical driver: Permanent Commercial Agriculture.
> 5. **Tool 5: Commodity Maps** confirms soya presence.
> 6. **Tool 6: WDPA Protected Areas** intersects the polygon against global national park databases.
> 
> In **32 seconds**, the agent completes all 6 planetary queries. 
> 
> Notice the result:
> - Post-2020 loss detected: **1,774.72 hectares (17.89% canopy destruction)**.
> - Gemini AI synthesizes this into an executive, formatted compliance report citing exact EUDR Article 3 clauses.
> - The map canvas instantly highlights the deforestation overlay.
> - And crucially, the agent generates an **immutable, cryptographically stamped JSON audit trajectory** that compliance officers can submit directly to EU authorities."

---

### 2:45 – 3:45 | Part 3: Final Comparison & The Changelog Journey
*(Show the terminal running `python evaluate.py` or display the 10-case evaluation table)*

> **Speaker:**  
> "Now let’s look at the evaluation. I tested the baseline and Oxeous across **10 standardized global cases** spanning 6 commodities and 8 countries.
> 
> When running `python evaluate.py`:
> - The **Baseline (text LLM)** achieved only **30% accuracy** with dangerous false passes.
> - **Oxeous achieved 100% accuracy (10/10 correct)** with zero false passes and zero compliance blindspots.
> - This cuts human turnaround time by **over 99%** (from days down to 30 seconds) and cost from **$500 down to $0.02** per plot.
> 
> This improvement came from a deliberate 4-stage engineering changelog:
> - **Iteration 1** introduced satellite data.
> - **Iteration 2** resolved scale limitations.
> - **Iteration 3** added forest typology to separate tree crops from natural canopy.
> - **Iteration 4** added WDPA protected area intersection to catch illegal farm boundaries."

---

### 3:45 – 4:30 | Part 4: Key Contributor & One Experiment Removed
*(Show `docs/architecture-diagram.png`)*

> **Speaker:**  
> "Per the hackathon rubric, what change contributed most, and what did I remove?
> 
> **The change that contributed most** was **Dynamic Scale Optimization (`_compute_scale`)** on Google Earth Engine. When analyzing 50,000 to 1,000,000-hectare commercial plots, fixed 30m pixel counting exceeded Earth Engine's memory limit and crashed with infinite timeouts. By dynamically adapting the pyramid sampling scale based on plot area, I reduced query time on million-hectare plots from an infinite timeout to **just 32 seconds**.
> 
> **The experiment I removed** was **raw STAC optical imagery snapshots (Sentinel-2 / Landsat)**. I initially tried feeding optical RGB images to a vision model. But an optical snapshot only shows current green cover—it cannot calculate cumulative 25-year post-2020 loss, cannot see through tropical cloud cover, and cannot prove the Dec 31, 2020 cutoff date. I removed visual STAC inspection and pivoted entirely to planetary raster algebra."

---

### 4:30 – 5:00 | Part 5: Hot Take & Conclusion
*(Show `README.md` and repository link)*

> **Speaker:**  
> "My core hot take from building Oxeous:
> **'Ground truth beats model size. An agent's intelligence in physical-world compliance is bounded by the authority of its sensory tools, not the parameter count of its language model.'**
> 
> By anchoring Google Gemini in authoritative Google Earth Engine satellite tools, Oxeous transforms weeks of manual GIS paperwork into single-click, court-ready due diligence.
> 
> All code, evaluation scripts, and trajectories are open and 100% reproducible with zero credentials. Thank you."

---

## 🎯 Recording Checklist Before You Hit Record
- [ ] Backend running: `uvicorn app.main:app --port 8000`
- [ ] Frontend running: `npm run dev` at `http://localhost:3000`
- [ ] Browser zoom set to 90% or 100% for crisp display
- [ ] Terminal open in root folder ready to run `python evaluate.py`
- [ ] Target time: Between 4:00 and 4:50 (Do not exceed 5:00)
