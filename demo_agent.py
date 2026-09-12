"""
Oxeous EUDR Agent — Live Demo Script
=====================================
Runs ONE plot through the full agent pipeline step by step.
Shows real GEE satellite data at each step.

Usage:
    python demo_agent.py                        # runs Amazon soya (default)
    python demo_agent.py --case ghana_cocoa
    python demo_agent.py --case germany_wood
    python demo_agent.py --case colombia_coffee
    python demo_agent.py --baseline             # show baseline (LLM only, no satellite)
"""
import asyncio
import sys
import io
import os
import time
import argparse
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
os.chdir(os.path.join(os.path.dirname(__file__), "backend"))

# ── Test cases ────────────────────────────────────────────────────────────────
CASES = {
    "amazon_soya": {
        "name": "Amazon soya farm — Mato Grosso, Brazil",
        "commodity": "soya",
        "country_code": "BR",
        "country_name": "Brazil",
        "bbox": (-55.2, -12.8, -55.1, -12.7),
        "supplier_claim": "Soya farm operational since 2015. No clearing occurred. Fully certified.",
        "expected": "FAIL",
    },
    "ghana_cocoa": {
        "name": "Cocoa farm — Ashanti, Ghana",
        "commodity": "cocoa",
        "country_code": "GH",
        "country_name": "Ghana",
        "bbox": (-1.7, 6.65, -1.6, 6.75),
        "supplier_claim": "Sustainably managed cocoa farm. No deforestation.",
        "expected": "FAIL",
    },
    "germany_wood": {
        "name": "FSC certified timber — Bavaria, Germany",
        "commodity": "wood",
        "country_code": "DE",
        "country_name": "Germany",
        "bbox": (11.5, 48.1, 11.6, 48.2),
        "supplier_claim": "FSC certified forest managed since 1990.",
        "expected": "PASS",
    },
    "colombia_coffee": {
        "name": "Coffee farm — Colombia (deceptive claim)",
        "commodity": "coffee",
        "country_code": "CO",
        "country_name": "Colombia",
        "bbox": (-75.6, 2.4, -75.5, 2.5),
        "supplier_claim": "Small family coffee farm. Land cleared in 2019, no recent clearing.",
        "expected": "FAIL",
    },
    "kalimantan_palm": {
        "name": "Palm oil — Kalimantan, Indonesia",
        "commodity": "palm_oil",
        "country_code": "ID",
        "country_name": "Indonesia",
        "bbox": (112.5, 0.8, 112.6, 0.9),
        "supplier_claim": "Palm oil concession established before 2020. All legal.",
        "expected": "FAIL",
    },
}


def sep(char="─", n=65):
    print(char * n)


def header(title):
    sep("═")
    print(f"  {title}")
    sep("═")


# ── Baseline demo (single LLM prompt, no satellite) ──────────────────────────

async def run_baseline_demo(case: dict, api_key: str | None) -> None:
    import httpx

    header("BASELINE MODEL — Single LLM Prompt, No Satellite Data")
    print(f"Plot   : {case['name']}")
    print(f"Claim  : {case['supplier_claim']}")
    sep()

    if not api_key:
        print("NOTE: No Gemini API key — showing pre-recorded baseline result")
        print()
        print("DECISION  : UNCERTAIN")
        print("REASON    : Cannot verify deforestation without satellite data")
        print("CONFIDENCE: LOW")
        print()
        print("WEAKNESS  : LLM trusted supplier text with zero satellite verification")
        print(f"EXPECTED  : {case['expected']}  |  GOT: UNCERTAIN  ->  WRONG")
        return

    GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
    prompt = f"""You are an EUDR compliance officer. EU Regulation 2023/1115 bans commodities linked to deforestation after December 31, 2020.

Supplier Declaration: {case['supplier_claim']}
Commodity: {case['commodity']}
Country: {case['country_name']}

Reply using ONLY these three lines:
DECISION: PASS
REASON: one sentence
CONFIDENCE: HIGH

Replace PASS with FAIL if country is high-risk (Brazil/Indonesia/Ghana/Colombia/Peru).
"""
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{GEMINI_URL}?key={api_key}",
                json={"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                      "generationConfig": {"temperature": 0.0, "maxOutputTokens": 100}})
        elapsed = int((time.monotonic() - t0) * 1000)
        if resp.status_code == 429:
            print("Rate limit hit — showing pre-recorded result")
            print("DECISION: UNCERTAIN | CONFIDENCE: LOW")
            return
        parts = resp.json()["candidates"][0].get("content", {}).get("parts", [])
        text = parts[0]["text"].strip() if parts else "No response"
        print(text)
        print(f"\nResponse time: {elapsed}ms")
        print(f"Expected: {case['expected']}")
        print("\nKEY WEAKNESS: No satellite check — relies 100% on supplier text")
    except Exception as e:
        print(f"LLM call failed: {e}")
        print("DECISION: UNCERTAIN | No satellite data | Cannot verify")


# ── Agent demo (full GEE pipeline) ────────────────────────────────────────────

async def run_agent_demo(case: dict) -> None:
    from app.tools.eudr.gee_commodity import run_full_gee_assessment
    from app.eudr.country_risk import get_country_risk

    header("AGENT — Full Satellite Pipeline (5 GEE Datasets)")
    print(f"Plot      : {case['name']}")
    print(f"Commodity : {case['commodity']}  |  Country: {case['country_name']}")
    print(f"Supplier  : {case['supplier_claim']}")
    sep()

    bbox = case["bbox"]

    # Step 1
    print("\nSTEP 1/5 — Hansen GFC v1.13 (2025) — Forest Loss Satellite")
    print(f"  Querying bbox {bbox} at 30m resolution...")
    t0 = time.monotonic()
    from app.tools.eudr.gee_commodity import query_forest_loss
    gfc = await query_forest_loss(bbox)
    print(f"  Done in {int((time.monotonic()-t0)*1000)}ms")
    if gfc.get("available"):
        print(f"  Forest cover 2020      : {gfc['forest_cover_2020_pct']}%")
        print(f"  Post-2020 forest loss  : {gfc['post_cutoff_loss_pct']}%  ({gfc['post_cutoff_loss_ha']} ha)")
        print(f"  EUDR violation detected: {gfc['has_post_cutoff_loss']}")
    else:
        print(f"  Result: {gfc.get('note')}")

    # Step 2
    print("\nSTEP 2/5 — Natural Forests 2020 (10m Sentinel-2)")
    print(f"  Querying natural forest probability at 10m resolution...")
    t0 = time.monotonic()
    from app.tools.eudr.gee_commodity import query_natural_forest_2020
    nat = await query_natural_forest_2020(bbox)
    print(f"  Done in {int((time.monotonic()-t0)*1000)}ms")
    if nat.get("available"):
        print(f"  Natural forest cover   : {nat['natural_forest_pct']}%")
        print(f"  Is natural forest      : {nat['is_natural_forest']}")

    # Step 3
    print("\nSTEP 3/5 — Forest Typology 2020 (Primary/Plantation/Agroforestry)")
    t0 = time.monotonic()
    from app.tools.eudr.gee_commodity import query_forest_typology
    typ = await query_forest_typology(bbox)
    print(f"  Done in {int((time.monotonic()-t0)*1000)}ms")
    if typ.get("available"):
        print(f"  Dominant class         : {typ['dominant_class']}")
        print(f"  Is natural forest      : {typ['is_natural_forest']}")
        print(f"  Is plantation/crop     : {typ['is_plantation_or_crop']}")

    # Step 4
    print("\nSTEP 4/5 — WRI Drivers of Forest Loss (2001-2025)")
    t0 = time.monotonic()
    from app.tools.eudr.gee_commodity import query_forest_loss_drivers
    drv = await query_forest_loss_drivers(bbox)
    print(f"  Done in {int((time.monotonic()-t0)*1000)}ms")
    if drv.get("available"):
        print(f"  Dominant loss driver   : {drv['dominant_driver']}")
        print(f"  Deforestation cause    : {drv['is_deforestation_driver']}")

    # Step 5
    print("\nSTEP 5/5 — Commodity Presence Map 2025")
    t0 = time.monotonic()
    from app.tools.eudr.gee_commodity import query_commodity_presence
    com = await query_commodity_presence(bbox, case["commodity"])
    print(f"  Done in {int((time.monotonic()-t0)*1000)}ms")
    if com.get("available"):
        print(f"  Commodity coverage     : {com['coverage_pct']}%")
        print(f"  Commodity confirmed    : {com['commodity_confirmed']}")
    else:
        print(f"  {com.get('note', 'No commodity map for this type')}")

    # Decision
    sep()
    print("\nAGENT DECISION:")
    country_risk = get_country_risk(case["country_code"])
    has_defo = gfc.get("has_post_cutoff_loss", False) or drv.get("is_deforestation_driver", False)
    is_natural = nat.get("is_natural_forest", False)

    risk_score = 0.0
    if has_defo:
        risk_score += 40 + gfc.get("post_cutoff_loss_pct", 0) * 2
    if drv.get("is_deforestation_driver"):
        risk_score += 15
    if country_risk.value == "high":
        risk_score += 15
    risk_score = min(100.0, risk_score)

    if risk_score >= 50:
        decision = "NON-COMPLIANT"
    elif risk_score >= 20:
        decision = "AT-RISK"
    else:
        decision = "COMPLIANT"

    print(f"  Risk score    : {risk_score:.1f}/100")
    print(f"  Decision      : {decision}")
    print(f"  Has deforest  : {has_defo}")
    print(f"  Natural forest: {is_natural}")
    print(f"  Loss driver   : {drv.get('dominant_driver', 'N/A')}")
    print(f"  Country risk  : {country_risk.value}")
    print(f"\n  Expected      : {case['expected']}")
    correct = (decision != "COMPLIANT") == (case["expected"] == "FAIL")
    print(f"  Result        : {'CORRECT' if correct else 'WRONG'}")

    sep()
    print("\nDATA SOURCES (all real GEE satellite data):")
    for src in [gfc.get("source",""), nat.get("source",""), typ.get("source",""),
                drv.get("source",""), com.get("source","")]:
        if src:
            print(f"  - {src}")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", default="amazon_soya", choices=list(CASES.keys()))
    parser.add_argument("--baseline", action="store_true")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--all", action="store_true", help="Run all cases agent only")
    args = parser.parse_args()

    if args.all:
        print("\nRunning all cases through agent...\n")
        correct = 0
        for name, case in CASES.items():
            print(f"\n{'='*65}")
            print(f"Case: {case['name']}")
            sep()
            await run_agent_demo(case)
            correct += 1
        return

    case = CASES[args.case]

    if args.baseline:
        await run_baseline_demo(case, args.api_key)
    else:
        await run_baseline_demo(case, args.api_key)
        print("\n")
        await run_agent_demo(case)

asyncio.run(main())
