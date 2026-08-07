import sys
import os
import pytest

# Ensure backend app is importable in tests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
