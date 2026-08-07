"""
Experiment A — Granite Tool-Calling Reliability Test.
Run: cd experiments/granite_tool_calling && python run.py
Requires: ollama running with granite3-8b pulled.
"""
import asyncio
import json
import re
import sys
from pathlib import Path

OLLAMA_URL = "http://localhost:11434"
MODEL = "granite3-8b"

PROMPTS = [
    "Show vegetation moisture decline around Lahore this month",
    "Where did surface water expand after recent rainfall in Bangladesh?",
    "Show recent land disturbance hotspots in the Amazon basin this year",
    "What does true color satellite imagery show for central Tokyo today?",
    "Run AI change detection analysis on agricultural areas near Islamabad",
]

SYSTEM_PROMPT = """You are Oxeous, an Earth observation AI assistant.
Return a JSON object inside <tool_call>...</tool_call> tags with:
- tool_name: one of [analyze_vegetation_moisture_change, analyze_surface_water_extent, analyze_land_disturbance, fetch_true_color_imagery, analyze_prithvi_change_detection]
- parameters: {location, bbox [minLng,minLat,maxLng,maxLat], current_period {start, end}, preferred_product}

Example:
<tool_call>
{
  "tool_name": "analyze_vegetation_moisture_change",
  "parameters": {
    "location": "Lahore, Pakistan",
    "bbox": [73.8, 31.1, 74.9, 31.9],
    "current_period": {"start": "2025-06-01", "end": "2025-06-25"},
    "preferred_product": "HLS_VI_NDMI"
  }
}
</tool_call>
"""


async def test_prompt(prompt: str, run: int) -> bool:
    import httpx
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "options": {"temperature": 0.0},
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        resp.raise_for_status()
    raw = resp.json()["message"]["content"]
    match = re.search(r"<tool_call>\s*(\{.*?})\s*</tool_call>", raw, re.DOTALL)
    if not match:
        print(f"  ✗ run {run}: no tool_call tag found")
        return False
    try:
        parsed = json.loads(match.group(1))
        if "tool_name" in parsed and "parameters" in parsed:
            print(f"  ✓ run {run}: {parsed['tool_name']}")
            return True
        print(f"  ✗ run {run}: missing required keys")
        return False
    except json.JSONDecodeError as e:
        print(f"  ✗ run {run}: JSON parse error: {e}")
        return False


async def main() -> None:
    results: dict[str, list[bool]] = {}
    RUNS_PER_PROMPT = 5

    for prompt in PROMPTS:
        print(f"\nPrompt: {prompt[:60]}…")
        prompt_results = []
        for run in range(1, RUNS_PER_PROMPT + 1):
            ok = await test_prompt(prompt, run)
            prompt_results.append(ok)
        results[prompt] = prompt_results

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    total_pass = 0
    total = 0
    for prompt, runs in results.items():
        n_pass = sum(runs)
        total_pass += n_pass
        total += len(runs)
        status = "✓ PASS" if n_pass >= 4 else "✗ FAIL"
        print(f"{status} {n_pass}/{len(runs)}  {prompt[:50]}…")

    print(f"\nOverall: {total_pass}/{total} ({100*total_pass/total:.0f}%)")
    overall_pass = total_pass / total >= 0.8

    result_text = f"""# Experiment A — Granite Tool-Calling Reliability

## Result: {"PASS" if overall_pass else "FAIL"}
Overall success rate: {total_pass}/{total} ({100*total_pass/total:.0f}%)

## Per-prompt results
{chr(10).join(f"- {p[:60]}: {sum(r)}/{len(r)}" for p, r in results.items())}

## Conclusion
{"Granite 3.x 8B reliably produces valid tool_call JSON. Architecture is sound." if overall_pass else "Reliability below threshold. Consider: (a) richer JSON example in system prompt, (b) format=json Ollama option, (c) constrained grammar decode."}
"""
    Path("RESULT.md").write_text(result_text)
    print(f"\nResult written to RESULT.md")
    sys.exit(0 if overall_pass else 1)


if __name__ == "__main__":
    asyncio.run(main())
