import asyncio
import httpx
import json
import time

import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)

API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

BASELINE_PROMPT = """You are an EUDR compliance officer. EU Regulation 2023/1115 bans commodities linked to deforestation after December 31, 2020.

Supplier Declaration: {supplier_claim}
Commodity: {commodity}
Country: {country}
Plot GeoJSON: {geojson}

Reply using ONLY these three lines, no other text:
DECISION: PASS
REASON: one sentence here
CONFIDENCE: HIGH

Rules:
- Replace PASS with FAIL if: country is Brazil/Indonesia/Ghana/Colombia/Peru/DRC/Malaysia OR supplier mentions clearing after 2020.
- Replace PASS with UNCERTAIN if you truly cannot determine.
- Use PASS only for FSC/PEFC certified plots in low-risk EU/Nordic countries.
- CONFIDENCE is always HIGH when you apply the rules above.
"""

# Let's test the Colombia Coffee plot (TC-05 in the benchmark).
# This farm actually has 2.1 hectares of deforestation, but the supplier is lying!
TEST_CASE = {
    "name": "Colombia coffee — deceptive claim, false PASS risk",
    "commodity": "coffee",
    "country_name": "Colombia",
    "supplier_claim": "100% sustainable shade-grown coffee. No deforestation since 2018.",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[-75.5, 4.5], [-75.4, 4.5], [-75.4, 4.6], [-75.5, 4.6], [-75.5, 4.5]]]
    }
}

async def run_baseline_test():
    print("======================================================================")
    print(" OXEOUS BASELINE (TEXT-ONLY LLM) - SINGLE TEST")
    print("======================================================================")
    print(f"Plot: {TEST_CASE['name']}")
    print(f"Supplier Claim: '{TEST_CASE['supplier_claim']}'")
    print("\nSending prompt to standard Gemini (NO Google Earth Engine allowed)...")

    prompt = BASELINE_PROMPT.format(
        supplier_claim=TEST_CASE["supplier_claim"],
        commodity=TEST_CASE["commodity"],
        country=TEST_CASE["country_name"],
        geojson=json.dumps(TEST_CASE["geometry"]),
    )

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 200},
    }

    t0 = time.monotonic()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(4):
            resp = await client.post(f"{GEMINI_URL}?key={API_KEY}", json=payload)
            if resp.status_code == 429:
                print(f"  [429 Rate Limit] Retrying in 15s... (Attempt {attempt+1}/4)")
                await asyncio.sleep(15)
                continue
            break
            
    elapsed = int((time.monotonic() - t0) * 1000)
    
    if resp.status_code != 200:
        print(f"Error: {resp.status_code}\n{resp.text}")
        return

    data = resp.json()
    candidate = data["candidates"][0]
    parts = candidate.get("content", {}).get("parts", [])
    raw_response = parts[0]["text"].strip() if parts else "No response"

    print("\n======================================================================")
    print(" BASELINE RESPONSE RECEIVED")
    print("======================================================================")
    print(f"Time Taken: {elapsed} ms")
    print(f"\n{raw_response}")
    print("\n----------------------------------------------------------------------")
    print("Notice how the Baseline completely trusts the supplier's text claim!")
    print("If you run this same geometry through the Agent, it will hit GEE")
    print("and instantly discover 2.1 hectares of illegal deforestation!")
    print("======================================================================")

if __name__ == "__main__":
    asyncio.run(run_baseline_test())
