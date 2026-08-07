"""
DateResolver — converts natural-language temporal references to ISO date ranges.
"""
from __future__ import annotations

import re
from datetime import date, timedelta, datetime
from calendar import monthrange


def resolve(expression: str, reference: date | None = None) -> tuple[str, str]:
    """
    Resolve a natural-language date expression to (start_iso, end_iso).
    Returns ISO strings ("YYYY-MM-DD").
    """
    ref = reference or date.today()
    expr = expression.lower().strip()

    # "this month"
    if re.match(r"this\s+month", expr):
        start = ref.replace(day=1)
        end = ref
        return _fmt(start), _fmt(end)

    # "last month"
    if re.match(r"last\s+month", expr):
        first_this = ref.replace(day=1)
        last_month_end = first_this - timedelta(days=1)
        start = last_month_end.replace(day=1)
        return _fmt(start), _fmt(last_month_end)

    # "past N days" / "last N days"
    m = re.match(r"(?:past|last)\s+(\d+)\s+days?", expr)
    if m:
        n = int(m.group(1))
        return _fmt(ref - timedelta(days=n)), _fmt(ref)

    # "past N weeks" / "last N weeks"
    m = re.match(r"(?:past|last)\s+(\d+)\s+weeks?", expr)
    if m:
        n = int(m.group(1))
        return _fmt(ref - timedelta(weeks=n)), _fmt(ref)

    # "past N months" / "last N months"
    m = re.match(r"(?:past|last)\s+(\d+)\s+months?", expr)
    if m:
        n = int(m.group(1))
        # approx: subtract n*30 days
        return _fmt(ref - timedelta(days=n * 30)), _fmt(ref)

    # "this year"
    if re.match(r"this\s+year", expr):
        return _fmt(ref.replace(month=1, day=1)), _fmt(ref)

    # "last year"
    if re.match(r"last\s+year", expr):
        y = ref.year - 1
        return _fmt(date(y, 1, 1)), _fmt(date(y, 12, 31))

    # ISO date range "YYYY-MM-DD/YYYY-MM-DD"
    m = re.match(r"(\d{4}-\d{2}-\d{2})\s*/\s*(\d{4}-\d{2}-\d{2})", expr)
    if m:
        return m.group(1), m.group(2)

    # Single ISO date "YYYY-MM-DD" — treat as a 1-month window ending that date
    m = re.match(r"(\d{4}-\d{2}-\d{2})", expr)
    if m:
        end = date.fromisoformat(m.group(1))
        start = end - timedelta(days=30)
        return _fmt(start), _fmt(end)

    # Month name "June 2025" or "June"
    months = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
    }
    for month_name, month_num in months.items():
        if month_name in expr:
            year_match = re.search(r"\b(\d{4})\b", expr)
            year = int(year_match.group(1)) if year_match else ref.year
            _, last_day = monthrange(year, month_num)
            return _fmt(date(year, month_num, 1)), _fmt(date(year, month_num, last_day))

    # Default: past 30 days
    return _fmt(ref - timedelta(days=30)), _fmt(ref)


def _fmt(d: date) -> str:
    return d.isoformat()
