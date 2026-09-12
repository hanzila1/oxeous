import asyncio
import httpx
import json
import time

AGENT_URL = "http://localhost:8000/eudr/plots"

# This is the exact same Colombia Coffee plot we just used for the Baseline test!
TEST_PLOT = {
    "name": "Colombia coffee — deceptive claim, false PASS risk",
    "commodity": "coffee",
    "country_code": "CO",
    "country_name": "Colombia",
    "supplier_name": "Test Supplier",
    "reference_date": "2025-08-01",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-75.5, 4.5], [-75.4, 4.5], [-75.4, 4.6], [-75.5, 4.6], [-75.5, 4.5]
        ]]
    }
}

async def run_single_test():
    print("======================================================================")
    print(" OXEOUS AGENT - DEEP DIVE SINGLE TEST")
    print("======================================================================")
    print(f"Sending Plot: {TEST_PLOT['name']}")
    print(f"Location: {TEST_PLOT['country_name']} | Commodity: {TEST_PLOT['commodity']}")
    print("Waiting for Agent to run Google Earth Engine queries...")
    print("(Check the backend terminal to see the live step-by-step logs!)\n")

    t0 = time.monotonic()
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(AGENT_URL, json=TEST_PLOT)
    
    elapsed = int((time.monotonic() - t0) * 1000)
    
    if resp.status_code != 200:
        print(f"Error: {resp.status_code}")
        print(resp.text)
        return

    data = resp.json()
    risk_assessment = data["risk_assessment"]
    dds = data["dds"]
    
    print("\n======================================================================")
    print(" AGENT RESPONSE RECEIVED")
    print("======================================================================")
    print(f"Time Taken  : {elapsed} ms")
    print(f"Risk Score  : {risk_assessment['risk_score']} / 100")
    print(f"Risk Level  : {risk_assessment['overall_risk'].upper()}")
    print("\n--- SATELLITE EVIDENCE (Google Earth Engine) ---")
    print(f"Deforestation Detected : {risk_assessment['deforestation']['has_deforestation']}")
    print(f"Forest Loss Area (ha)  : {risk_assessment['deforestation']['forest_loss_ha']} ha")
    print(f"Forest Cover (2020)    : {risk_assessment['deforestation']['forest_cover_2020_pct']}%")
    print(f"Protected Area Overlap : {risk_assessment['legality']['overlaps_protected_area']}")
    print(f"Country Risk Level     : {risk_assessment['legality']['country_risk_level'].upper()}")
    print("\n--- DATA SOURCES USED ---")
    for source in risk_assessment['deforestation']['data_sources']:
        print(f" - {source}")
    
    print("\n--- GEMINI AI NARRATIVE ---")
    print(data.get("explanation", "No explanation provided."))

    print("\n--- DUE DILIGENCE STATEMENT (DDS) ---")
    print(f"DDS ID: {dds['dds_id']}")
    print(f"Compliance: {'COMPLIANT' if dds.get('is_compliant') else 'NON-COMPLIANT'}")
    
    print("\n======================================================================")
    print(" 🛠️  RAW AGENT TRAJECTORY (THE 'AGENTIC' PROOF) ")
    print("======================================================================")
    print("The backend saves a full audit log of every tool the agent called.")
    print(f"Check the backend folder: trajectories/req_{data['request_id'][:12]}.json")
    print("======================================================================")

if __name__ == "__main__":
    asyncio.run(run_single_test())
