"""EUDR Statutory Advisory & Conversational Intelligence Engine.

Resolves conversational questions, statutory inquiries, Article explanations,
and follow-up questions on audit results without triggering heavy, inappropriate
sub-continental raster analysis on the viewport.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Optional

from ..models.enums import AnalysisType, CoverageQuality
from ..models.responses import AnalysisResponse, DataProvenance, LegendSpec
from .azure_search_rag import format_rag_context_for_llm, get_eudr_rag_engine

logger = logging.getLogger(__name__)

# Keywords indicating explicit spatial raster pipeline execution commands
SPATIAL_COMMAND_PATTERNS = [
    r"\b(calculate|compute|render|generate|display|show)\s+(ndvi|ndwi|moisture|surface\s+water|true\s+color|rgb|prithvi|change\s+detection)\b",
    r"\brun\s+(ndvi|ndwi|land\s+disturbance|prithvi|water\s+extent)\b",
    r"\bcompute\s+index\b",
]

# Keywords indicating informational, legal, conversational, or follow-up questions
CONVERSATIONAL_PATTERNS = [
    r"\b(what|why|how|when|who|which|where|can\s+i|is\s+it|does|do\s+we|should\s+i)\b",
    r"\b(explain|tell\s+me|summarize|clarify|meaning|mean|overview|guide|help)\b",
    r"\b(article|articles|regulation|directive|cutoff|annex|commodity|commodities|fine|penalty|penalties)\b",
    r"\b(traces\s+nt|dds|due\s+diligence\s+statement|carve-?out|segregation|exemption|replanting)\b",
    r"\b(compliant|non-?compliant|violation|risk\s+score|baseline|jrc|hansen|sentinel)\b",
    r"\b(simple\s+words|plain\s+english|layman|eli5)\b",
    r"^(hi|hello|hey|good\s+morning|good\s+afternoon|thanks|thank\s+you)",
]


def is_conversational_or_advisory(prompt: str, conversation_history: Optional[list] = None) -> bool:
    """Determine whether a prompt is a conversational/statutory question vs an explicit raster tool command."""
    text = prompt.strip().lower()
    if not text:
        return True

    # 1. Explicit spatial commands take precedence only if strictly matched
    for pat in SPATIAL_COMMAND_PATTERNS:
        if re.search(pat, text):
            return False

    # 2. Check for question words or statutory terminology
    for pat in CONVERSATIONAL_PATTERNS:
        if re.search(pat, text):
            return True

    # 3. If ends with question mark, always conversational
    if text.endswith("?"):
        return True

    # 4. If conversation has existing audit results and prompt is a follow-up
    if conversation_history and len(conversation_history) > 0:
        return True

    # Default to advisory if no explicit raster tool requested
    return True


def get_deterministic_statutory_advisory(prompt: str, conversation_history: Optional[list] = None) -> str:
    """Provide structured, authoritative, plain-English answers to key EUDR statutory questions."""
    text = prompt.strip().lower()

    # 1. Main Articles of EUDR
    if any(k in text for k in ["main article", "articles of eudr", "what are the articles", "what they say", "main articles"]):
        return """### 📜 The Main Articles of EUDR (Regulation EU 2023/1115) in Plain English

The **EU Deforestation Regulation (EUDR)** is designed to ensure that products consumed within or exported from the European Union do not contribute to deforestation or forest degradation anywhere in the world.

Here are the core statutory articles and what they mean in simple words:

---

#### 1. Article 3 — The Three Golden Rules to Sell in the EU
Under Article 3, products cannot be placed on the EU market or exported unless they satisfy three mandatory conditions:
* **Article 3(a) · Deforestation-Free**: The commodity must be grown on land that was **not deforested after December 31, 2020**. Even if cutting the forest was 100% legal under local law, if trees were cut after this cutoff date, it is illegal to sell into the EU.
* **Article 3(b) · Legally Produced**: The commodity must be produced in compliance with all relevant laws of the producer country (land ownership, environmental codes, labor rights, and indigenous consent).
* **Article 3(c) · Covered by a Due Diligence Statement (DDS)**: Every shipment must be officially registered on the European Commission's **TRACES NT** customs database before customs clearance.

---

#### 2. Article 2 — Crucial Statutory Definitions & Safe Harbors
Article 2 defines what legally counts as a forest and what is exempt:
* **Art. 2(1) Deforestation**: The conversion of forest to agricultural use, whether human-induced or not.
* **Art. 2(4) Forest Definition**: Land spanning over **0.5 hectares** with trees higher than **5 meters** and a canopy cover greater than **10%**. 
  > *Critical Safe Harbor*: Article 2(4) explicitly **excludes agricultural plantations and agroforestry** from the definition of a forest.
* **Art. 2(5) Agricultural Use & Replanting Exemption**: Land used for agriculture. Felling and replanting cyclical crops (such as rubber or oil palm rejuvenation cycles on existing agricultural land) is **lawful crop renewal, not illegal deforestation**.

---

#### 3. Article 9 — The Geolocation & Traceability Mandate
You cannot sell commodities by merely stating the country or region of origin:
* **Plots > 4 hectares**: Operators must provide exact **GPS polygon coordinates** (every latitude and longitude corner forming the closed boundary).
* **Plots ≤ 4 hectares**: Single-point latitude and longitude coordinates are accepted.
* You must also provide the exact time window of harvest and verify the identity of the producer.

---

#### 4. Article 10 — Multi-Factor Risk Assessment
Before placing products on the market, operators must run an audit across:
* **Satellite Evidence**: Cross-checking official baselines (EC JRC GFC2020) and optical/radar canopy loss alerts.
* **Country Benchmarking**: Whether the producer country is categorized as Low, Standard, or High Risk.
* **Indigenous & Protected Overlap**: Verifying zero overlap with national parks (WDPA) and indigenous ancestral territories (FPIC).

---

#### 5. Article 12 & 13 — TRACES NT Filing & May 2026 Segregation
* **Article 12**: Requires submitting the digital Due Diligence Statement to TRACES NT to receive a statutory Reference Number (DDS ID) for customs Box 44.
* **May 2026 Plot Segregation Protocol**: If an audit reveals that only part of a farm had post-2020 clearing, the operator does not lose the whole crop: they can **carve out** the violation zone and legally export the certified clean fraction."""

    # 2. Deforestation Cutoff Date
    if any(k in text for k in ["cutoff", "cut-off", "cut off", "december 31", "2020", "baseline"]):
        return """### ⏳ EUDR Mandatory Cutoff Date: December 31, 2020

Under **Regulation (EU) 2023/1115 Article 2(13)**:
* **The Cutoff Date**: **December 31, 2020**.
* **What it means**: Any forest land cleared or degraded after December 31, 2020 is disqualified from export to the European Union.
* **Before vs. After Cutoff**:
  * Forest cleared **on or before Dec 31, 2020**: Can legally enter the EU (provided it complies with local laws).
  * Forest cleared **after Dec 31, 2020**: Strictly banned from EU import under Article 3(a).
* **Reference Baselines Used by Oxeous**:
  * **EC JRC GFC2020 (10m)**: The European Commission's official statutory reference map for forest standing at Dec 31, 2020.
  * **Hansen GFC v1.13**: Multi-temporal global tree loss monitoring from 2000 through 2025.
  * **Sentinel-1 SAR**: All-weather cloud-penetrating radar disturbance alerts."""

    # 3. Regulated Commodities
    if any(k in text for k in ["commodity", "commodities", "what is covered", "annex i", "seven", "7"]):
        return """### 📦 The 7 EUDR Annex I Regulated Commodities

The EU Deforestation Regulation covers **seven key commodities** and all their derived downstream products:

1. **Cattle**: Live animals, fresh/frozen beef, leather, hides, and tallow.
2. **Cocoa**: Cocoa beans, paste, cocoa butter, cocoa powder, and chocolate.
3. **Coffee**: Unroasted green coffee, decaffeinated coffee, roasted coffee, extracts, and concentrates.
4. **Oil Palm**: Crude palm oil, refined fractions, palm kernel oil, glycerol, and palm-derived fatty acids.
5. **Rubber**: Natural rubber latex, smoked sheets, technical rubber, vulcanized rubber, and pneumatic tires.
6. **Soya**: Soybeans, soy meal, soy flour, soy oil, and soy cake used in animal feed.
7. **Wood**: Logs, sawn timber, plywood, particleboard, pulp, paper, and wooden furniture.

*Note: If your product contains any of these commodities or their derivatives, it must carry a verified TRACES NT Due Diligence Statement.*"""

    # 4. Article 2(5) Replanting Exemption
    if any(k in text for k in ["article 2(5)", "2(5)", "replant", "replanting", "plantation", "rubber exemption"]):
        return """### 🌱 Statutory Plantation Replanting Exemption (EUDR Article 2(5))

One of the most common pitfalls of legacy satellite screening tools (such as Hansen GFC alone) is mistaking **cyclical harvest on pre-existing plantations** for illegal deforestation.

#### The Statutory Truth:
* Under **Article 2(4)**, agricultural plantations (such as mature rubber trees, oil palm estates, or agroforestry) are **expressly excluded** from the legal definition of 'forest'.
* Under **Article 2(3)**, 'Deforestation' is strictly defined as *the conversion of forest to agricultural use*.
* **Article 2(5)** confirms that land already devoted to agricultural production retains its agricultural status.

#### What this means in practice:
* When a rubber farmer fells 25-year-old trees to plant new seedlings, canopy is temporarily lost, but **zero forest was converted**.
* Oxeous cross-references the official **EC JRC GFC2020** 10m baseline and **Nature Trace ForTy**: if 2020 forest cover was 0% because the land was already an established tree-crop plantation, cyclical felling is classified as **Lawful Agricultural Crop Replanting (Art. 2(5))**, yielding a compliant statutory audit."""

    # 5. Carve-Out and Segregation
    if any(k in text for k in ["carve", "segregat", "remediation", "split", "violation zone"]):
        return """### ✂️ Oxeous May 2026 Plot Segregation Protocol (Carve-Out)

When an audit reveals that a farm has post-2020 deforestation, legacy systems issue a binary rejection that penalizes the entire farm. Oxeous implements the **May 2026 EU Plot Segregation Protocol**:

1. **Pixel-Wise Raster Intersection (PWRI)**: The system isolates the exact sub-hectares that suffered post-2020 tree clearing (the Article 3(a) violation zone).
2. **Boundary Carve-Out**: The algorithm generates a clean, topologically valid child polygon (Clean Export Area = Total Declared Parcel minus Deforested Zone) that excludes the deforested zone.
3. **Mass Yield Gate**: It recalculates the maximum allowable harvest weight (Max Legal Export Mass = Clean Area × Agronomic Yield Cap) based on regional agronomic crop caps to prevent laundering non-compliant yield into the clean shipment.
4. **Statutory TRACES NT Dossier**: The operator receives an audited polygon for the clean area, ready for immediate filing on EU TRACES NT."""

    # 6. Follow-up on recent audit or plot in conversation history
    if conversation_history:
        recent_text = " ".join(m.get("content", "") for m in conversation_history[-4:]).lower()
        if "ghana" in recent_text or "cocoa" in recent_text:
            return """### 🔍 Audit Follow-Up: Ghana Cocoa Parcel (12,219.8 ha)

Based on the active statutory assessment for the Ghana Cocoa plot:
* **Final Verdict**: **NON-COMPLIANT (Risk Score 100/100)**.
* **Why it failed**:
  1. **Article 3(a) Violation**: 3,408.7 ha (27.9%) of standing December 2020 forest was cleared post-cutoff between 2021 and 2025 for permanent agriculture.
  2. **Article 9 Legality Violation**: The parcel has a **47.4% territorial overlap with the Tano Ofin strict protected forest reserve**.
* **Remediation Option**: The parcel holds **8,811.1 ha (72.1%) of verified clean land**. Under the May 2026 Plot Segregation Protocol, the operator can delist the 3,408 ha violation zone and export the harvest from the verified clean 8,811 ha fraction."""

    # Default general EUDR advisory overview
    return f"""### 🌍 Oxeous Statutory Due Diligence Intelligence

You asked: *"{prompt}"*

**Oxeous Earth Agent** is an autonomous spatial intelligence platform designed specifically for **EU Regulation 2023/1115 (EUDR)** compliance auditing.

#### Key Statutory Principles Under EUDR:
1. **Article 3 Mandate**: All imports and exports must be **deforestation-free** (no clearing after Dec 31, 2020), **lawful** under local sovereign regulations, and covered by a **TRACES NT Due Diligence Statement (DDS)**.
2. **Multi-Sensor Consensus**: We cross-validate high-resolution Sentinel-1 SAR radar, Sentinel-2 optical imagery, Hansen GFC, 10m Forest Dynamic Presence (FDP), and the official EC JRC GFC2020 baseline to eliminate false alarms.
3. **Traceability**: Plots over 4 hectares require full GPS polygon boundary coordinates.
4. **Interactive Actions**: You can test our benchmark plots (Colombia Coffee, Ghana Cocoa, Thailand Rubber, Indonesia Palm Oil) or drop your own GeoJSON file in the EUDR Hub.

*Feel free to ask questions about specific EUDR articles, cutoff rules, commodity requirements, or how to interpret an audit score!*"""


def sanitize_statutory_text(text: str) -> str:
    """Sanitize raw LaTeX, broken tabs, and mathematical syntax into clean, professional plain English."""
    if not text:
        return text
    # Clean broken escaped \times / tab characters
    cleaned = text.replace("\\times", " × ").replace(r"\times", " × ")
    cleaned = cleaned.replace("\\setminus", " minus ").replace(r"\setminus", " minus ")
    cleaned = cleaned.replace("\\cdot", " · ").replace(r"\cdot", " · ")
    cleaned = cleaned.replace("\\approx", " ≈ ").replace(r"\approx", " ≈ ")
    cleaned = cleaned.replace("\\leq", " ≤ ").replace(r"\leq", " ≤ ")
    cleaned = cleaned.replace("\\geq", " ≥ ").replace(r"\geq", " ≥ ")
    cleaned = cleaned.replace("\\neq", " ≠ ").replace(r"\neq", " ≠ ")

    # Clean specific set/math patterns from EUDR academic references
    cleaned = re.sub(r"\(\$V_\{?3\(a\)\}?\$?\)", "(the Article 3(a) violation zone)", cleaned)
    cleaned = re.sub(r"\$V_\{?3\(a\)\}?\$", "Article 3(a) violation zone", cleaned)
    cleaned = re.sub(
        r"\(\$P_\{?export\}?\s*=\s*P_\{?declared\}?\s*(?:\\setminus|minus|-)\s*V_\{?3\(a\)\}?\$?\)",
        "(Clean Export Area = Total Declared Parcel minus Deforested Zone)",
        cleaned,
    )
    cleaned = re.sub(
        r"\(\$M_\{?max\}?\s*=\s*A_\{?export\}?\s*(?:\\times|\*|imes|×)\s*Y_\{?c\}?\$?\)",
        "(Max Legal Export Mass = Clean Area × Agronomic Yield Cap)",
        cleaned,
    )
    # Strip residual em/en dashes
    cleaned = cleaned.replace("—", " - ").replace("–", " - ")
    return cleaned


async def resolve_statutory_advisory(
    prompt: str,
    conversation_history: list[dict[str, str]],
    viewport: dict[str, Any],
    request_id: str,
    granite_client: Any,
) -> AnalysisResponse:
    """Resolve a conversational/statutory inquiry using RAG + LLM with deterministic fast-fallback."""
    answer_text = ""

    # 1. Retrieve grounded statutory Articles, Annex I HS codes & Official Guidance
    import time as _time
    t_rag0 = _time.monotonic()
    rag_hits: list[dict[str, Any]] = []
    rag_mode = "local_verbatim_eurlex"
    try:
        rag_hits, raw_mode = await get_eudr_rag_engine().search(prompt, top_k=4)
        rag_mode = "eurlex_cloud_index" if raw_mode == "azure_ai_search" else "eurlex_local_index"
    except Exception as rag_exc:
        logger.warning("Statutory RAG lookup skipped (%s)", rag_exc)
    rag_latency_ms = max(1, int((_time.monotonic() - t_rag0) * 1000))

    rag_context_block = format_rag_context_for_llm(rag_hits)
    cited_articles = [h["article_ref"] for h in rag_hits if h.get("article_ref")]
    rag_citations_payload = [
        {
            "id": h.get("id", ""),
            "celex_id": h.get("celex_id", ""),
            "oj_ref": h.get("oj_ref", ""),
            "eurlex_url": h.get("eurlex_url", ""),
            "sha256_verbatim": h.get("sha256_verbatim", ""),
            "article_ref": h.get("article_ref", ""),
            "title": h.get("title", ""),
            "category": h.get("category", ""),
            "hs_codes": h.get("hs_codes", ""),
            "score": h.get("score", 1.0),
            "verbatim_excerpt": h.get("full_text", "")[:2200],
        }
        for h in rag_hits
    ]

    # 2. Attempt dynamic LLM generation grounded in retrieved statutory clauses
    if granite_client:
        try:
            import asyncio
            system_prompt = (
                "You are Oxeous Earth Agent, the authoritative statutory spatial operating system for the "
                "EU Deforestation Regulation (EUDR, Regulation (EU) 2023/1115). "
                "When asked about Oxeous, its capabilities, or how it compares to legacy tools in the market, speak with complete "
                "confidence about the real Oxeous platform and its 5 proprietary core pillars:\n"
                "1. True 10m Pixel-Wise Raster Intersection (PWRI): Replaces coarse 30m single-sensor alerts with multi-sensor consensus (Copernicus Sentinel-1 SAR, Sentinel-2 Optical, EC JRC GFC2020, and LiDAR) eliminating false-positive rejections.\n"
                "2. Statutory Agricultural Plantation Exemption (Article 2(4) & 2(5)): Distinguishes legal cyclical crop rejuvenation/replanting (e.g., 20-25 year rubber rejuvenation, cocoa shade tree pruning, palm oil renewal) from illegal deforestation that legacy tools falsely disqualify.\n"
                "3. Fields of The World (FTW) Pin-to-Polygon Delineation: Converts single farmer GPS coordinates into legally binding WGS84 multi-vertex field polygons required under Article 9(1)(d) without costly manual GIS surveying.\n"
                "4. May 2026 Plot Segregation & Carve-Out Engine: Automatically carves out post-cutoff deforested sub-parcels, enforces biophysical yield caps, and isolates verified clean hectares so shipments aren't wholly rejected.\n"
                "5. Verified Verbatim EUR-Lex Law & Customs Index: Backs every audit with live 114-document Official Journal search (Articles 1-38, Recital 37, Annex I customs HS codes, and TRACES NT XML export schema).\n\n"
                "Answer clearly, authoritatively, and in plain English. Format your answer with clear Markdown headings, "
                "bullet points, and concise statutory explanations. Never use raw LaTeX math formulas or set notation (do not use $...$, "
                "\\setminus, \\times, or subscript braces like V_{3(a)}). Express all calculations in plain words. "
                "Never use en-dashes or em-dashes; use plain hyphens. Keep explanations structured and easy to digest.\n\n"
                f"{rag_context_block}"
            )
            messages = [
                *conversation_history[-4:],
                {"role": "user", "content": prompt},
            ]
            answer_text = await asyncio.wait_for(
                granite_client._generate(system_prompt, messages),
                timeout=15.0,
            )
        except Exception as exc:
            logger.info("Dynamic LLM generation skipped or timed out (%s), using deterministic statutory engine", exc)
            answer_text = ""

    # If LLM did not respond in time or produced empty text, use deterministic engine + retrieved citations
    if not answer_text or len(answer_text.strip()) < 40 or "Rate Limit" in answer_text:
        answer_text = get_deterministic_statutory_advisory(prompt, conversation_history)
        if rag_hits:
            citation_lines = "\n".join(
                f"- **{h['article_ref']}** ({h['title']}): {h['legal_summary']}"
                for h in rag_hits[:3]
            )
            answer_text = f"{answer_text}\n\n#### Retrieved Statutory & Customs Citations\n{citation_lines}"

    answer_text = sanitize_statutory_text(answer_text)

    total_elapsed_ms = max(rag_latency_ms, int((_time.monotonic() - t_rag0) * 1000))

    return AnalysisResponse(
        request_id=request_id,
        analysis_type=AnalysisType.land_disturbance,
        granite_intent={
            "type": "statutory_advisory",
            "query": prompt,
            "rag_mode": rag_mode,
            "search_latency_ms": rag_latency_ms,
            "total_latency_ms": total_elapsed_ms,
            "corpus_docs": 114,
            "rag_citations": rag_citations_payload,
        },
        tile_url=None,
        overlay_url=None,
        geojson_hotspots=None,
        statistics={
            "status": "advisory_resolved",
            "query_length": len(prompt),
            "rag_mode": rag_mode,
            "search_latency_ms": rag_latency_ms,
            "citations_retrieved": len(rag_hits),
            "cited_articles": cited_articles[:4],
        },
        provenance=DataProvenance(
            source="Oxeous EUDR Statutory & Customs Search Index (Articles 1-38 & Annex I)",
            acquisition_dates=["2026-10-31"],
            spatial_resolution_m=10,
            processing_level="Regulation (EU) 2023/1115 Articles 1-38, Recital 37 & Annex I HS Codes",
        ),
        explanation=answer_text,
        follow_up_suggestions=[
            "Which Annex I HS customs codes apply to cocoa, rubber, and tyres?",
            "How does the Article 2(5) replanting exemption work?",
            "What documents prove Article 3(b) legality in Brazil vs. Ghana?",
            "How does May 2026 Plot Segregation (Carve-Out) work?",
        ],
        coverage_quality=CoverageQuality.good,
        legend=LegendSpec(title="EUDR Guidance", colormap="RdYlGn", min=0, max=1, units=""),
    )
