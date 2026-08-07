"""
Experiment C — Prithvi / TerraTorch Smoke Test.
Run: cd experiments/prithvi_inference && python run.py
Requires: pip install terratorch torch transformers
"""
import time
import traceback
from pathlib import Path
import numpy as np


def test_terratorch() -> dict:
    """Try loading Prithvi-EO 2.0 100M via TerraTorch."""
    try:
        import torch
        from terratorch.models import PrithviModelFactory  # type: ignore

        print("Loading Prithvi-EO-2.0-100M via TerraTorch…")
        t0 = time.perf_counter()
        model = PrithviModelFactory.build("Prithvi-EO-2.0-100M", task="change_detection")
        load_time = time.perf_counter() - t0
        print(f"Model loaded in {load_time:.1f} s")

        # Synthetic input: (1, 2, 6, 224, 224)
        rng = np.random.default_rng(42)
        data = rng.uniform(0, 0.3, (1, 2, 6, 224, 224)).astype(np.float32)
        tensor = torch.from_numpy(data)

        model.eval()
        print("Running forward pass on CPU…")
        t0 = time.perf_counter()
        with torch.no_grad():
            output = model(tensor)
        infer_time = time.perf_counter() - t0

        return {
            "status": "PASS" if infer_time < 120 else "SLOW",
            "backend": "terratorch",
            "model_load_sec": round(load_time, 1),
            "inference_sec": round(infer_time, 1),
            "output_shape": list(output.shape),
        }
    except ImportError:
        return {"status": "SKIP", "backend": "terratorch", "reason": "TerraTorch not installed"}
    except Exception as e:
        return {"status": "FAIL", "backend": "terratorch", "error": traceback.format_exc(limit=5)}


def test_huggingface_fallback() -> dict:
    """Try loading Prithvi-EO 2.0 directly from HuggingFace."""
    try:
        import torch
        from transformers import AutoModel  # type: ignore

        print("Loading Prithvi-EO-2.0-100M via HuggingFace transformers…")
        t0 = time.perf_counter()
        model = AutoModel.from_pretrained(
            "ibm-nasa-geospatial/Prithvi-EO-2.0-100M",
            trust_remote_code=True,
        )
        load_time = time.perf_counter() - t0
        print(f"Model loaded in {load_time:.1f} s")

        rng = np.random.default_rng(42)
        data = rng.uniform(0, 0.3, (1, 2, 6, 224, 224)).astype(np.float32)
        tensor = torch.from_numpy(data)

        model.eval()
        print("Running forward pass…")
        t0 = time.perf_counter()
        with torch.no_grad():
            output = model(tensor)
        infer_time = time.perf_counter() - t0

        return {
            "status": "PASS" if infer_time < 120 else "SLOW",
            "backend": "huggingface",
            "model_load_sec": round(load_time, 1),
            "inference_sec": round(infer_time, 1),
        }
    except ImportError:
        return {"status": "SKIP", "backend": "huggingface", "reason": "transformers not installed"}
    except Exception as e:
        return {"status": "FAIL", "backend": "huggingface", "error": traceback.format_exc(limit=5)}


def main():
    print("=" * 60)
    print("Experiment C — Prithvi/TerraTorch Smoke Test")
    print("=" * 60)

    result_tt = test_terratorch()
    result_hf = None
    if result_tt["status"] in ("FAIL", "SKIP"):
        print("\nTerraTorch failed, trying HuggingFace fallback…")
        result_hf = test_huggingface_fallback()

    overall = result_tt if result_tt["status"] == "PASS" else (result_hf or result_tt)
    print(f"\nFinal status: {overall['status']}")

    result_text = f"""# Experiment C — Prithvi/TerraTorch Smoke Test

## Result: {overall["status"]}

### TerraTorch attempt
{"\n".join(f"  {k}: {v}" for k, v in result_tt.items())}

### HuggingFace fallback
{"\n".join(f"  {k}: {v}" for k, v in (result_hf or {}).items()) if result_hf else "  Not attempted"}

## Conclusion
{"TerraTorch + Prithvi work. Proceed with Phase 6." if overall["status"] == "PASS" else "Use HuggingFace transformers fallback path. Pin exact TerraTorch version if available."}
"""
    Path("RESULT.md").write_text(result_text)
    print("\nResult written to RESULT.md")


if __name__ == "__main__":
    main()
