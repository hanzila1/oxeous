"""
Experiment B — COG Windowed Read Performance Test.
Run: cd experiments/cog_read_perf && python run.py
Requires: NASA_EARTHDATA_TOKEN env var set.
"""
import asyncio
import os
import time
from pathlib import Path

BBOX = (73.8, 31.1, 74.9, 31.9)  # ~1° × 1° around Lahore
TARGET_SEC = 8.0


def test_cog_read() -> dict:
    token = os.environ.get("NASA_EARTHDATA_TOKEN", "")
    import pystac_client
    import rasterio
    from rasterio.windows import from_bounds

    print("Searching STAC for HLS S30 scene over Lahore…")
    client = pystac_client.Client.open(
        "https://cmr.earthdata.nasa.gov/stac/LPCLOUD",
        headers={"Authorization": f"Bearer {token}"} if token else {},
    )
    search = client.search(
        collections=["HLSS30.v2.0"],
        bbox=list(BBOX),
        datetime="2024-06-01/2024-06-30",
        max_items=1,
    )
    items = list(search.items())
    if not items:
        return {"status": "SKIP", "reason": "No STAC items found — check credentials or try different date range"}

    item = items[0]
    print(f"Found scene: {item.id}")
    assets = item.to_dict()["assets"]
    href = None
    for key in ["B8A", "B11", "B04"]:
        if key in assets:
            href = assets[key]["href"]
            break

    if not href:
        return {"status": "SKIP", "reason": "No supported band asset found"}

    vsicurl_href = f"/vsicurl/{href}"
    env_opts = {"GDAL_HTTP_HEADERS": f"Authorization: Bearer {token}"} if token else {}

    print(f"Reading COG window from: {href[:60]}…")
    t0 = time.perf_counter()
    with rasterio.Env(**env_opts):
        with rasterio.open(vsicurl_href) as ds:
            window = from_bounds(*BBOX, ds.transform)
            data = ds.read(1, window=window, boundless=True, fill_value=0)
    elapsed = time.perf_counter() - t0

    return {
        "status": "PASS" if elapsed < TARGET_SEC else "SLOW",
        "elapsed_sec": round(elapsed, 2),
        "array_shape": list(data.shape),
        "dtype": str(data.dtype),
        "target_sec": TARGET_SEC,
        "scene_id": item.id,
    }


def main():
    result = test_cog_read()
    status = result["status"]
    print(f"\nStatus: {status}")
    for k, v in result.items():
        print(f"  {k}: {v}")

    result_text = f"""# Experiment B — COG Windowed Read Performance

## Result: {status}
Elapsed: {result.get("elapsed_sec", "N/A")} s (target: < {TARGET_SEC} s)
Array shape: {result.get("array_shape", "N/A")}
Scene: {result.get("scene_id", "N/A")}

## Conclusion
{"COG windowed read is fast enough for the interactive path." if status == "PASS" else "Read is slow — consider smaller bbox, lower-resolution fallback, or regional mirror."}

Reason (if skipped): {result.get("reason", "N/A")}
"""
    Path("RESULT.md").write_text(result_text)
    print("\nResult written to RESULT.md")


if __name__ == "__main__":
    main()
