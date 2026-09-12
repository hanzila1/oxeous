#!/usr/bin/env python3
"""
Oxeous — Hackathon Submission Packaging Script
==============================================
Creates a clean, audit-ready submission ZIP for the Frontier Engineering Challenge 2026.
Automatically excludes:
  - Private credentials (.env, .env.local)
  - Heavy build artifacts (node_modules, .next, __pycache__, .pytest_cache)
  - Git internals (.git)
  - Temporary logs and cache files

Usage:
    python package_submission.py
    python package_submission.py --output my_oxeous_submission.zip
"""

import os
import sys
import zipfile
import argparse
from pathlib import Path

# Directories to exclude completely
EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    "env",
    "dist",
    "build",
    ".eggs",
    ".idea",
    ".vscode",
    ".gemini",
    "coverage",
}

# Specific files or patterns to exclude
EXCLUDE_FILES = {
    ".env",
    ".env.local",
    "oxeous_submission.zip",
    "package_submission.py",
}

EXCLUDE_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".tsbuildinfo",
    ".log",
    ".swp",
    ".swo",
    ".DS_Store",
    ".zip",
}


def should_exclude(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    # Check if any parent part is in EXCLUDE_DIRS
    for part in rel.parts:
        if part in EXCLUDE_DIRS:
            return True
        if part.endswith(".egg-info"):
            return True

    # Check filename
    if path.name in EXCLUDE_FILES:
        return True

    # Check extension
    if path.suffix.lower() in EXCLUDE_EXTENSIONS:
        return True

    return False


def create_submission_zip(output_path: str = "oxeous_submission.zip"):
    root_dir = Path(__file__).resolve().parent
    zip_out = root_dir / output_path

    print("=" * 70)
    print("  OXEOUS — PACKAGING HACKATHON SUBMISSION ZIP")
    print("=" * 70)
    print(f"Source root: {root_dir}")
    print(f"Destination: {zip_out.name}\n")

    files_added = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(zip_out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for root, dirs, files in os.walk(root_dir):
            # Modify dirs in place to skip excluded directories early
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.endswith(".egg-info")]

            for file in sorted(files):
                file_path = Path(root) / file
                if should_exclude(file_path, root_dir):
                    continue

                arcname = file_path.relative_to(root_dir).as_posix()
                zipf.write(file_path, arcname)
                files_added += 1
                total_uncompressed_bytes += file_path.stat().st_size

    zip_size_mb = zip_out.stat().st_size / (1024 * 1024)
    raw_size_mb = total_uncompressed_bytes / (1024 * 1024)

    print(f"[OK] Submission packaged successfully!")
    print(f"     Total files included: {files_added:,}")
    print(f"     Raw content size    : {raw_size_mb:.2f} MB")
    print(f"     Compressed ZIP size : {zip_size_mb:.2f} MB")
    print(f"     ZIP location        : {zip_out}")
    print("=" * 70)

    # Verification: check that .env and node_modules are definitely NOT inside
    with zipfile.ZipFile(zip_out, "r") as check_zip:
        namelist = check_zip.namelist()
        leaked = [n for n in namelist if n == ".env" or n == ".env.local" or "node_modules" in n]
        if leaked:
            print(f"[ERROR] Found restricted files in zip: {leaked}")
            sys.exit(1)
        print("[VERIFIED] Zero credentials or node_modules detected in archive.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Package Oxeous submission zip")
    parser.add_argument("--output", default="oxeous_submission.zip", help="Output zip filename")
    args = parser.parse_args()
    create_submission_zip(args.output)
