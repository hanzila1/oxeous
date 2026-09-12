"""
Oxeous — Root Evaluation Script Wrapper
Redirects directly to evaluation/evaluate.py so judges can run:
    python evaluate.py --mode agent --mock-gee
from the repository root.
"""
import subprocess
import sys
from pathlib import Path

if __name__ == "__main__":
    eval_script = Path(__file__).parent / "evaluation" / "evaluate.py"
    sys.exit(subprocess.call([sys.executable, str(eval_script)] + sys.argv[1:]))
