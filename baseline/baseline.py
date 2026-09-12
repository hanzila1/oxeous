"""
EUDR Baseline Model - V1
========================
Single-prompt LLM assessment. No satellite data, no agents, no tools.
Trusts supplier text claims entirely.

Usage:
    python baseline/baseline.py --api-key YOUR_GEMINI_KEY
    python baseline/baseline.py --api-key YOUR_GEMINI_KEY --case 3
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path
import sys
import time
import httpx
from dotenv import load_dotenv

# Automatically load .env from current directory or project root
load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Fix Windows console encoding
if sys.stdout.encoding != "utf-8":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

GEMINI_MODEL = "gemini-3.1-flash-lite"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

BASELINE_PROMPT = """You are an EUDR compliance officer. EU Regulation 2023/1115 bans commodities linked to deforestation after December 31, 2020.
Evaluate whether this sourcing plot complies with EUDR regulations based on the supplier's declaration and provided plot details.

Supplier Declaration: {supplier_claim}
Commodity: {commodity}
Country: {country}
Plot GeoJSON: {geojson}

Reply using ONLY these three lines, no other text:
DECISION: PASS or FAIL or UNCERTAIN
REASON: one sentence explaining why
CONFIDENCE: HIGH or MEDIUM or LOW
"""

# ── 10 test cases (same cases used in evaluate.py) ───────────────────────────

TEST_CASES = [
    {
        "id": "TC-01",
        "name": "Amazon soya — deforestation in 2022 (should FAIL)",
        "commodity": "soya",
        "country": "Brazil",
        "supplier_claim": "This soya farm has been in operation since 2015. No clearing has occurred. The land is fully certified.",
        "geojson": '{"type":"Polygon","coordinates":[[[-55.2,-12.8],[-55.1,-12.8],[-55.1,-12.7],[-55.2,-12.7],[-55.2,-12.8]]]}',
        "expected": "FAIL",
    },
    {
        "id": "TC-02",
        "name": "Ghana cocoa — high risk country (should FAIL)",
        "commodity": "cocoa",
        "country": "Ghana",
        "supplier_claim": "Our cocoa farm is sustainably managed. No deforestation has occurred.",
        "geojson": '{"type":"Polygon","coordinates":[[[-1.7,6.65],[-1.6,6.65],[-1.6,6.75],[-1.7,6.75],[-1.7,6.65]]]}',
        "expected": "FAIL",
    },
    {
        "id": "TC-03",
        "name": "Kalimantan palm oil — peatland (should FAIL)",
        "commodity": "palm_oil",
        "country": "Indonesia",
        "supplier_claim": "Palm oil concession established before 2020. All land use is legal.",
        "geojson": '{"type":"Polygon","coordinates":[[[112.5,0.8],[112.6,0.8],[112.6,0.9],[112.5,0.9],[112.5,0.8]]]}',
        "expected": "FAIL",
    },
    {
        "id": "TC-04",
        "name": "Germany timber — low risk (should PASS)",
        "commodity": "wood",
        "country": "Germany",
        "supplier_claim": "FSC certified forest in Bavaria. Under continuous management since 1990.",
        "geojson": '{"type":"Polygon","coordinates":[[[11.5,48.1],[11.6,48.1],[11.6,48.2],[11.5,48.2],[11.5,48.1]]]}',
        "expected": "PASS",
    },
    {
        "id": "TC-05",
        "name": "Colombia coffee — deceptive claim (should FAIL)",
        "commodity": "coffee",
        "country": "Colombia",
        "supplier_claim": "Small family coffee farm. Land cleared in 2019 for agricultural use, no recent clearing.",
        "geojson": '{"type":"Polygon","coordinates":[[[-75.6,2.4],[-75.5,2.4],[-75.5,2.5],[-75.6,2.5],[-75.6,2.4]]]}',
        "expected": "FAIL",
    },
    {
        "id": "TC-06",
        "name": "Cerrado Brazil cocoa — edge case small clearing (should FAIL)",
        "commodity": "cocoa",
        "country": "Brazil",
        "supplier_claim": "Cocoa agroforestry system. Minor land preparation in 2022 on 0.6ha corner only.",
        "geojson": '{"type":"Polygon","coordinates":[[[-39.1,-14.9],[-39.0,-14.9],[-39.0,-14.8],[-39.1,-14.8],[-39.1,-14.9]]]}',
        "expected": "FAIL",
    },
    {
        "id": "TC-07",
        "name": "Finland wood — certified (should PASS)",
        "commodity": "wood",
        "country": "Finland",
        "supplier_claim": "PEFC certified boreal forest. Continuous cover forestry since 1985.",
        "geojson": '{"type":"Polygon","coordinates":[[[25.1,60.2],[25.2,60.2],[25.2,60.3],[25.1,60.3],[25.1,60.2]]]}',
        "expected": "PASS",
    },
    {
        "id": "TC-08",
        "name": "Peru coffee — protected area overlap (should FAIL)",
        "commodity": "coffee",
        "country": "Peru",
        "supplier_claim": "Coffee grown in highland region. Traditional farming methods used.",
        "geojson": '{"type":"Polygon","coordinates":[[[-75.2,-4.1],[-75.1,-4.1],[-75.1,-4.0],[-75.2,-4.0],[-75.2,-4.1]]]}',
        "expected": "FAIL",
    },
    {
        "id": "TC-09",
        "name": "Brazil cattle — Amazon frontier (should FAIL)",
        "commodity": "cattle",
        "country": "Brazil",
        "supplier_claim": "Cattle ranch established 2018. Pasture expansion completed before 2021.",
        "geojson": '{"type":"Polygon","coordinates":[[[-52.3,-3.8],[-52.2,-3.8],[-52.2,-3.7],[-52.3,-3.7],[-52.3,-3.8]]]}',
        "expected": "FAIL",
    },
    {
        "id": "TC-10",
        "name": "Austria wood — low risk (should PASS)",
        "commodity": "wood",
        "country": "Austria",
        "supplier_claim": "Sustainably managed alpine forest. FSC and PEFC certified since 2001.",
        "geojson": '{"type":"Polygon","coordinates":[[[14.5,47.8],[14.6,47.8],[14.6,47.9],[14.5,47.9],[14.5,47.8]]]}',
        "expected": "PASS",
    },
]


async def assess_single(case: dict, api_key: str) -> dict:
    prompt = BASELINE_PROMPT.format(
        supplier_claim=case["supplier_claim"],
        commodity=case["commodity"],
        country=case["country"],
        geojson=case["geojson"],
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 200},
    }
    # Retry up to 3 times on network hiccups or 429 rate limits
    data = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{GEMINI_URL}?key={api_key}", json=payload)
            if resp.status_code in (429, 500, 502, 503, 504):
                wait = 4 * (attempt + 1)
                print(f"  [server {resp.status_code}] retrying in {wait}s...")
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            break
        except (httpx.TransportError, httpx.TimeoutException) as exc:
            if attempt < 2:
                await asyncio.sleep(3)
                continue
            raise exc
    candidate = data["candidates"][0]
    parts = candidate.get("content", {}).get("parts", [])
    raw_text = parts[0]["text"].strip() if parts else ""

    # Parse decision
    decision = "UNCERTAIN"
    reason = ""
    confidence = "LOW"
    for line in raw_text.splitlines():
        if line.startswith("DECISION:"):
            decision = line.split(":", 1)[1].strip()
        elif line.startswith("REASON:"):
            reason = line.split(":", 1)[1].strip()
        elif line.startswith("CONFIDENCE:"):
            confidence = line.split(":", 1)[1].strip()

    correct = decision == case["expected"]
    return {
        "id": case["id"],
        "name": case["name"],
        "expected": case["expected"],
        "decision": decision,
        "reason": reason,
        "confidence": confidence,
        "correct": correct,
        "raw": raw_text,
    }


async def run_all(api_key: str, case_index: int | None = None, limit: int | None = None) -> None:
    if case_index is not None:
        cases = [TEST_CASES[case_index]]
    elif limit is not None:
        cases = TEST_CASES[:limit]
    else:
        cases = TEST_CASES

    print(f"\nEUDR Baseline Model (V1) — {GEMINI_MODEL}, no tools\n{'='*60}")

    results = []
    for i, case in enumerate(cases):
        if i > 0:
            await asyncio.sleep(4)  # avoid rate limit between calls
        print(f"\n[{case['id']}] {case['name']}")
        result = await assess_single(case, api_key)
        results.append(result)
        status = "CORRECT" if result["correct"] else "WRONG"
        print(f"  Expected : {result['expected']}")
        print(f"  Got      : {result['decision']} ({result['confidence']}) — {status}")
        print(f"  Reason   : {result['reason']}")

    # Summary
    correct = sum(1 for r in results if r["correct"])
    total = len(results)
    accuracy = correct / total * 100
    print(f"\n{'='*60}")
    print(f"BASELINE ACCURACY: {correct}/{total} = {accuracy:.0f}%")
    print(f"  Correct  : {correct}")
    print(f"  Wrong    : {total - correct}")
    print(f"\nKey weakness: LLM trusts supplier text with no satellite verification.")

    # Save results
    out_dir = Path(__file__).resolve().parent
    out_path = out_dir / "baseline_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "model": GEMINI_MODEL,
            "mode": "single_prompt_no_tools",
            "accuracy_pct": round(accuracy, 1),
            "correct": correct,
            "total": total,
            "results": results,
        }, f, indent=2)
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EUDR Baseline Model")
    parser.add_argument("--api-key", default=os.getenv("GEMINI_API_KEY"), help="Gemini API key (defaults to GEMINI_API_KEY in .env)")
    parser.add_argument("--case", type=int, default=None, help="Run single test case (0-9)")
    parser.add_argument("--limit", type=int, default=None, help="Run first N test cases (e.g. --limit 2)")
    args = parser.parse_args()

    api_key = args.api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment or .env file.")
        print("Please set GEMINI_API_KEY in your .env or pass --api-key.")
        sys.exit(1)

    asyncio.run(run_all(api_key, args.case, args.limit))
