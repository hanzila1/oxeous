# Agent Trajectories — Oxeous Earth Agent
**Frontier Engineering Challenge 2026 — Deliverable 04: Representative Agent Trajectories**

---

## 📋 Overview

Under **Article 9 and Article 10 of EU Regulation 2023/1115 (EUDR)**, supply chain operators must maintain an auditable, tamper-evident record of all due diligence assessments for **5 years**, ready for inspection by European Union competent authorities.

Oxeous automatically generates machine-verifiable JSON audit logs for every assessment. These trajectories capture the full execution lifecycle from the initial polygon prompt to the physical satellite pixel reductions, Gemini AI reasoning, and mandatory human checkpoints.

---

## 🧬 Standard Trajectory Schema (6-Step Lifecycle)

Every trajectory in this directory follows a strict, sequential 6-step lifecycle:

```
[Step 1: Instruction]      → System instructions + user plot coordinates + commodity type
       ↓
[Step 2: Tool Call]        → gee_full_assessment with bounding box & 6 planetary GEE datasets
       ↓
[Step 3: Tool Result]      → Quantitative satellite metrics (ha loss, driver, WDPA overlap, tile URLs)
       ↓
[Step 4: LLM Decision]     → Gemini AI spatial synthesis and EUDR Article 3 legal deduction
       ↓
[Step 5: Human Checkpoint] → Triggers human review gate if risk >= 40 (Rule 04 & 05 compliance)
       ↓
[Step 6: Final Output]     → Compliance verdict (COMPLIANT / NON-COMPLIANT), risk score, and DDS state
```

### Step-by-Step Breakdown:
| Step | Type | What is Captured |
| :---: | :--- | :--- |
| **1** | `instruction` | Timestamp, user input prompt, commodity type, plot area in hectares, and system prompt excerpt. |
| **2** | `tool_call` | Tool identifier (`gee_full_assessment`), exact bounding box coordinates `[min_lon, min_lat, max_lon, max_lat]`, and the 6 planetary datasets queried. |
| **3** | `tool_result` | Planetary computation duration (ms), post-2020 loss (ha and %), forest cover 2000 vs 2020, natural forest probability, dominant loss driver, WDPA reserve names, and live GEE visual map tile URLs. |
| **4** | `llm_decision` | Gemini spatial reasoning synthesizing the satellite evidence into a legal compliance finding. |
| **5** | `human_checkpoint` | **Hackathon Rule 04 & 05**: Whenever risk score $\ge 40$ or protected areas overlap, `human_review_required: true` is permanently logged. Consequential actions cannot proceed without human sign-off. |
| **6** | `final_output` | Final categorical risk level (`compliant` / `non_compliant`), risk score (`0.0` to `100.0`), and Due Diligence Statement export status. |

---

## 📁 Key Representative Trajectories to Inspect

This directory contains **17 verified execution trajectories** from real-world runs. Here are the 3 most representative cases:

### 1. `req_75cc9287bca6.json` — Mega-Concession Deforestation & Legal Reserve Overlap
- **Plot Area**: 986,079.0 hectares (Mato Grosso, Brazil)
- **Commodity**: Palm Oil (`palm_oil`)
- **Execution Time**: 32,172 ms (computed over nearly 1 million hectares)
- **Satellite Evidence**:
  - Post-2020 Forest Loss: **34,160.12 ha (22.96% destruction)**
  - Dominant Loss Driver: Permanent Commercial Agriculture
  - Protected Area Overlap: **YES** (Overlaps *Estação Parecis* and *Parque Natural Municipal "O Semeador"*)
- **Human Checkpoint**: `human_review_required: true` (Triggered by risk score 100/100 and national park encroachment).
- **Verdict**: `non_compliant` (Severe Violation).

### 2. `req_a965b6c983d2.json` — Mato Grosso Soya Frontier Clearing
- **Plot Area**: 59,368.0 hectares (Brazil)
- **Commodity**: Soya (`soya`)
- **Satellite Evidence**:
  - Post-2020 Forest Loss: **1,774.72 ha (17.89% destruction)**
  - Typology: Naturally Regenerating Primary Forest
  - Loss Driver: Commercial Agriculture expansion
- **Verdict**: `non_compliant` (High Risk post-cutoff deforestation).

### 3. `req_386b3716f9ed.json` — Certified Sustainable Timber (Pass Benchmark)
- **Plot Area**: 11,800.0 hectares (Bavaria, Germany)
- **Commodity**: Wood (`wood`)
- **Satellite Evidence**:
  - Post-2020 Forest Loss: **0.00 ha (0.0% loss)**
  - Protected Area Overlap: **None** (Clear of prohibited zones)
- **Human Checkpoint**: `human_review_required: false` (Zero risk detected).
- **Verdict**: `compliant` (100% Deforestation-Free; Due Diligence Statement generated).

---

## 🔍 How to Inspect Any Trajectory (1-Line Command)

Judges can quickly view the full formatted JSON of any trajectory from their terminal:

```bash
# View the 986,000-hectare dual-violation trajectory:
python -c "import json; print(json.dumps(json.load(open('trajectories/req_75cc9287bca6.json')), indent=2))"

# Or on Linux / macOS using jq:
cat trajectories/req_75cc9287bca6.json | jq .
```
