# Hot Take — Oxeous EUDR Agent: What I Learned Building with Satellite Truth

> The agent achieves 100% accuracy (10/10 correct) with real GEE satellite data, up from a 30% baseline. Here is everything that broke, why it broke, and what it changes about how I build agentic systems.

---

## The Core Insight: Satellite Data is Not Optional for Compliance

Every LLM-based compliance tool I analyzed during research makes the same mistake: it treats the supplier's text declaration as the primary evidence. This is backwards. The satellite image predates the supplier's claim by years. The satellite cannot lie. The supplier can.

Oxeous inverts this. The LLM sees the satellite result first and uses the supplier's text only to flag contradictions. When the satellite shows 2.5% post-cutoff forest loss and the supplier says "no clearing occurred", the agent logs a contradiction — it does not resolve it in the supplier's favour.

This is the architecture that matters, not the model size.

---

## The Hardest Failure Mode: Protected Area Overlap

**TC-08 (Peru coffee)** exposed the most dangerous class of false negative: a plot that is *not actively being deforested* but sits inside or adjacent to a protected area. The Hansen GFC correctly reports zero post-2020 forest loss — the land was already cleared. The supplier's claim ("traditional farming methods in the highland region") is technically true. Yet this is a hard EUDR legality violation.

A text-only LLM has no way to know that coordinates `[-75.2, -4.1]` are adjacent to Reserva Comunal El Sira. The agent needed a spatial intersection check against a real protected area database. This is precisely why building with specialized tools and verification matters — no single-prompt system can answer spatial legality questions.

**My fix:** `WCMC/WDPA/current/polygons` is available as a public GEE FeatureCollection. `filterBounds()` on the plot geometry is a single GEE call that replaces an entire external API dependency.

---

## Why the Baseline Gets 30% on an Ostensibly "Easy" Task

This surprised me during development. The baseline correctly handles all three EU/Nordic PASS cases (Germany, Finland, Austria) — the signal is obvious. But for FAIL cases in tropical countries, the LLM consistently hedges to UNCERTAIN rather than committing to FAIL. This is actually *reasonable* behavior from an alignment perspective: the LLM has been trained to avoid making consequential definitive claims without evidence. The baseline's 30% is not stupidity — it's calibrated epistemic humility. The agent's job is to provide the evidence that justifies the decision.

---

## The Deceptive Claim Problem (TC-05)

Colombia coffee, TC-05: "Land cleared in 2019 for agriculture, no recent clearing." The baseline scored this PASS — it correctly parsed the pre-2020 clearing claim. This is the most dangerous failure mode in real EUDR compliance: a supplier who is technically accurate about the clearing date but omits that the resulting farmland continues to operate on land that was natural forest.

The agent catches this because Hansen GFC independently reports post-cutoff loss — regardless of what the supplier says. The satellite does not read the supplier's PDF. This is the core value proposition: evidence-based verification, not text trust.

---

## GEE Edge Cases I Encountered

1. **Cerrado biome (TC-06):** 0.6ha of clearing in a 100ha plot yields ~0.6% forest_loss_pct. My risk formula gives: 30 + 0.6*2 = 31.2 pts. Add HIGH country risk (Brazil): +15 → 46.2 → `at_risk` → FAIL. Works, but only marginally. A smaller clearing on a non-Brazil plot could score below 20 and produce a false PASS. This is a known edge case requiring field verification.

2. **Satellite availability gaps:** GEE calls fail silently when assets are temporarily unavailable (quota exhaustion, network issues). All GEE functions return `_na()` dicts with `available: False`. The risk engine continues with partial data, which means a missed dataset = lower risk score = potential false PASS. I log `gfc_confidence = "low"` when Hansen is unavailable and force `requires_human_review = True`.

3. **WDPA dataset freshness:** WCMC/WDPA/current/polygons in GEE is updated periodically but not in real-time. Newly designated protected areas (e.g., post-2024) may not appear. For production EUDR use, operators should cross-reference with the Protected Planet API.

4. **Mega-concession memory timeouts:** When querying 50,000 to 1,000,000-hectare commercial soya concessions (e.g. Mato Grosso) at fixed 30m resolution, Earth Engine exceeded its HTTP memory limit and timed out indefinitely. I solved this with Dynamic Scale Optimization (`_compute_scale()`), sampling pyramid levels based on plot area to drop query latency from infinite timeout to 32 seconds.

---

## What Surprised Me

The WRI/Google DeepMind Drivers of Forest Loss dataset (2001-2025) is extraordinary — it tells you not just *where* loss happened but *why*. Distinguishing "Permanent agriculture" (class 1, commodity-linked) from "Wildfire" (class 5, not EUDR-regulated) changes the compliance calculus entirely. A plot with 10% forest loss due to wildfire has a very different legal status than a plot with 10% loss due to permanent agriculture expansion. This dataset is underused in most EUDR tooling I reviewed.

---

## One Thing I Would Do Differently

I would integrate supplier text cross-referencing earlier. Currently, the agent logs a contradiction flag in the trajectory when satellite data contradicts the supplier claim — but this flag doesn't affect the risk score. A future version would use Gemini to extract structured claims from supplier text (clearing date, certification status, area size) and explicitly score each claim against the satellite evidence. This would add a "claim verification score" dimension to the DDS.

---

## What This Means for Building Reliable Agents

Three rules I extracted from this build that apply beyond EUDR:

**1. Ground truth beats LLM confidence.**
A confident PASS from a well-prompted LLM is worth nothing if it isn't grounded in verifiable external data. Design agents so that LLM outputs are always downstream of tool results — never the other way around.

**2. Failure modes cluster at data gaps, not model gaps.**
Every wrong answer the agent produced traced to a missing data source (no WDPA check, no satellite for that region, COG read timeout) — not to the LLM reasoning incorrectly. The bottleneck in agentic pipelines is data access, not intelligence.

**3. Graceful degradation must be explicit.**
When a GEE call fails silently and returns `available: False`, the risk engine continues with lower confidence. I log `gfc_confidence = "low"` and force `requires_human_review = True`. This is the right design: degrade gracefully, flag honestly, never silently produce a clean PASS from incomplete data. Silent failures in compliance tooling are regulatory liability.
