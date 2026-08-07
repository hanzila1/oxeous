"""Tests for date_resolver utility."""
import pytest
from datetime import date
from app.utils.date_resolver import resolve


REF = date(2025, 6, 25)


@pytest.mark.parametrize("expression,expected_start,expected_end", [
    ("this month",       "2025-06-01", "2025-06-25"),
    ("last month",       "2025-05-01", "2025-05-31"),
    ("past 30 days",     "2025-05-26", "2025-06-25"),
    ("last 7 days",      "2025-06-18", "2025-06-25"),
    ("past 3 months",    "2025-03-27", "2025-06-25"),
    ("this year",        "2025-01-01", "2025-06-25"),
    ("last year",        "2024-01-01", "2024-12-31"),
    ("June 2025",        "2025-06-01", "2025-06-30"),
    ("May",              "2025-05-01", "2025-05-31"),
])
def test_date_resolver(expression, expected_start, expected_end):
    start, end = resolve(expression, reference=REF)
    assert start == expected_start, f"Start mismatch for '{expression}'"
    assert end == expected_end, f"End mismatch for '{expression}'"


def test_iso_range():
    start, end = resolve("2025-04-01/2025-05-15", reference=REF)
    assert start == "2025-04-01"
    assert end == "2025-05-15"


def test_single_iso_date():
    start, end = resolve("2025-06-10", reference=REF)
    assert end == "2025-06-10"
    end_d = date.fromisoformat(end)
    start_d = date.fromisoformat(start)
    assert (end_d - start_d).days == 30
