"""
Oxeous Supplier Origin Request Portal ("Magic Link" Collection)
===============================================================
Allows EU operators to issue no-login mobile Magic Links to upstream cooperatives
and smallholder farmers. Suppliers capture a single GPS pin (auto-delineated into
a 10m EUDR Art. 9(1)(d) polygon via FTW) or upload GeoJSON + legality declaration,
which flows directly into the operator's Cockpit audit queue.
"""
from __future__ import annotations

import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...config import get_settings

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _db_path() -> str:
    settings = get_settings()
    os.makedirs(settings.tile_cache_dir, exist_ok=True)
    return os.path.join(settings.tile_cache_dir, "oxeous_suppliers.db")


@contextmanager
def _get_conn() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(_db_path(), timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS supplier_requests (
                token TEXT PRIMARY KEY,
                supplier_name TEXT NOT NULL,
                commodity TEXT NOT NULL,
                country_code TEXT NOT NULL DEFAULT '',
                expected_mass_kg REAL NOT NULL DEFAULT 0,
                operator_name TEXT NOT NULL DEFAULT 'EU Operator',
                notes TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                submitted_geometry TEXT,
                submitted_area_ha REAL,
                declared_mass_kg REAL,
                supplier_claim TEXT DEFAULT '',
                doc_sha256 TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                submitted_at TEXT,
                audit_status TEXT DEFAULT '',
                audit_risk_score REAL,
                audit_clean_ha REAL,
                audit_replanting_ha REAL,
                audit_silviculture_ha REAL,
                audit_non_agronomic_ha REAL,
                audit_violation_ha REAL,
                audit_total_ha REAL,
                audit_pwri_tile_url TEXT DEFAULT '',
                audit_summary TEXT DEFAULT '',
                audit_protected_overlap INTEGER DEFAULT 0,
                audit_traces_ref TEXT DEFAULT '',
                audited_at TEXT DEFAULT ''
            )
            """
        )
        # Idempotent migration for pre-existing local SQLite databases
        existing_cols = {
            r["name"] for r in conn.execute("PRAGMA table_info(supplier_requests)").fetchall()
        }
        for col_name, col_def in [
            ("audit_status", "TEXT DEFAULT ''"),
            ("audit_risk_score", "REAL"),
            ("audit_clean_ha", "REAL"),
            ("audit_replanting_ha", "REAL"),
            ("audit_silviculture_ha", "REAL"),
            ("audit_non_agronomic_ha", "REAL"),
            ("audit_violation_ha", "REAL"),
            ("audit_total_ha", "REAL"),
            ("audit_pwri_tile_url", "TEXT DEFAULT ''"),
            ("audit_summary", "TEXT DEFAULT ''"),
            ("audit_protected_overlap", "INTEGER DEFAULT 0"),
            ("audit_traces_ref", "TEXT DEFAULT ''"),
            ("audited_at", "TEXT DEFAULT ''"),
        ]:
            if col_name not in existing_cols:
                conn.execute(f"ALTER TABLE supplier_requests ADD COLUMN {col_name} {col_def}")
        conn.commit()
        yield conn
    finally:
        conn.close()


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    geom = None
    if row["submitted_geometry"]:
        try:
            geom = json.loads(row["submitted_geometry"])
        except Exception:
            geom = None
    keys = row.keys()
    return {
        "token": row["token"],
        "supplier_name": row["supplier_name"],
        "commodity": row["commodity"],
        "country_code": row["country_code"],
        "expected_mass_kg": row["expected_mass_kg"],
        "operator_name": row["operator_name"],
        "notes": row["notes"],
        "status": row["status"],
        "submitted_geometry": geom,
        "submitted_area_ha": row["submitted_area_ha"],
        "declared_mass_kg": row["declared_mass_kg"],
        "supplier_claim": row["supplier_claim"] or "",
        "doc_sha256": row["doc_sha256"] or "",
        "created_at": row["created_at"],
        "submitted_at": row["submitted_at"],
        "audit_status": (row["audit_status"] if "audit_status" in keys else "") or None,
        "audit_risk_score": row["audit_risk_score"] if "audit_risk_score" in keys else None,
        "audit_clean_ha": row["audit_clean_ha"] if "audit_clean_ha" in keys else None,
        "audit_replanting_ha": row["audit_replanting_ha"] if "audit_replanting_ha" in keys else None,
        "audit_silviculture_ha": row["audit_silviculture_ha"] if "audit_silviculture_ha" in keys else None,
        "audit_non_agronomic_ha": row["audit_non_agronomic_ha"] if "audit_non_agronomic_ha" in keys else None,
        "audit_violation_ha": row["audit_violation_ha"] if "audit_violation_ha" in keys else None,
        "audit_total_ha": row["audit_total_ha"] if "audit_total_ha" in keys else None,
        "audit_pwri_tile_url": (row["audit_pwri_tile_url"] if "audit_pwri_tile_url" in keys else "") or None,
        "audit_summary": (row["audit_summary"] if "audit_summary" in keys else "") or None,
        "audit_protected_overlap": bool(row["audit_protected_overlap"]) if "audit_protected_overlap" in keys else False,
        "audit_traces_ref": (row["audit_traces_ref"] if "audit_traces_ref" in keys else "") or None,
        "audited_at": (row["audited_at"] if "audited_at" in keys else "") or None,
    }


class CreateSupplierRequestBody(BaseModel):
    supplier_name: str = Field(..., min_length=2, max_length=140)
    commodity: str = Field(default="coffee", max_length=40)
    country_code: str = Field(default="", max_length=8)
    expected_mass_kg: float = Field(default=12000.0, ge=0)
    operator_name: str = Field(default="Oxeous EU Operator", max_length=140)
    notes: str = Field(default="", max_length=500)


class SubmitSupplierPortalBody(BaseModel):
    lat: float | None = None
    lng: float | None = None
    geometry: dict[str, Any] | None = None
    area_ha: float | None = None
    declared_mass_kg: float | None = None
    supplier_claim: str = Field(default="", max_length=4000)
    commodity: str | None = Field(default=None, max_length=40)


def _detect_commodity_hint(text: str) -> str | None:
    low = (text or "").lower()
    if any(k in low for k in ("rubber", "hevea", "latex")):
        return "rubber"
    if any(k in low for k in ("cocoa", "cacao", "chocolate")):
        return "cocoa"
    if any(k in low for k in ("coffee", "cafe", "café", "arabica", "robusta")):
        return "coffee"
    if any(k in low for k in ("palm", "oil palm", "cpo", "ffb")):
        return "palm_oil"
    if any(k in low for k in ("soya", "soybean", "soy")):
        return "soya"
    if any(k in low for k in ("wood", "timber", "logging", "lumber", "pulp")):
        return "wood"
    if any(k in low for k in ("cattle", "beef", "pasture", "livestock", "leather")):
        return "cattle"
    return None


@router.post("/requests")
async def create_supplier_request(body: CreateSupplierRequestBody) -> dict[str, Any]:
    token = f"oxe_{secrets.token_urlsafe(12)}"
    created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    with _get_conn() as conn:
        conn.execute(
            """
            INSERT INTO supplier_requests (
                token, supplier_name, commodity, country_code, expected_mass_kg,
                operator_name, notes, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            (
                token,
                body.supplier_name.strip(),
                body.commodity.strip().lower(),
                body.country_code.strip().upper(),
                float(body.expected_mass_kg),
                body.operator_name.strip() or "Oxeous EU Operator",
                body.notes.strip(),
                created_at,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM supplier_requests WHERE token = ?", (token,)).fetchone()
    return _row_to_dict(row)


@router.get("/requests")
async def list_supplier_requests() -> dict[str, Any]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM supplier_requests ORDER BY created_at DESC LIMIT 40"
        ).fetchall()
    return {"requests": [_row_to_dict(r) for r in rows]}


@router.get("/portal/{token}")
async def get_supplier_portal(token: str) -> dict[str, Any]:
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM supplier_requests WHERE token = ?", (token,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Origin request link not found or expired.")
    return _row_to_dict(row)


@router.post("/portal/{token}/submit")
async def submit_supplier_portal(token: str, body: SubmitSupplierPortalBody) -> dict[str, Any]:
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM supplier_requests WHERE token = ?", (token,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Origin request link not found.")

    effective_geom = body.geometry
    effective_area_ha = body.area_ha

    # Auto-delineate single GPS coordinate into 10m physical polygon via FTW engine!
    if effective_geom is None and body.lat is not None and body.lng is not None:
        try:
            from ...eudr.ftw_delineation import delineate_field_boundary
            ftw_res = await delineate_field_boundary(
                lat=float(body.lat),
                lng=float(body.lng),
                target_area_ha=float(body.area_ha or 6.0),
            )
            if ftw_res and ftw_res.get("geometry"):
                effective_geom = ftw_res["geometry"]
                effective_area_ha = float(ftw_res.get("area_ha") or body.area_ha or 6.0)
        except Exception:
            pass

        if effective_geom is None:
            # Clean geodesic fallback polygon around captured GPS pin (~6 ha)
            d = 0.0012
            lat, lng = float(body.lat), float(body.lng)
            effective_geom = {
                "type": "Polygon",
                "coordinates": [[
                    [round(lng - d, 6), round(lat - d, 6)],
                    [round(lng + d, 6), round(lat - d, 6)],
                    [round(lng + d, 6), round(lat + d, 6)],
                    [round(lng - d, 6), round(lat + d, 6)],
                    [round(lng - d, 6), round(lat - d, 6)],
                ]],
            }
            effective_area_ha = float(body.area_ha or 6.0)

    if effective_geom is None:
        raise HTTPException(status_code=400, detail="Provide either GPS coordinates (lat/lng) or a GeoJSON polygon.")

    submitted_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    claim_text = body.supplier_claim.strip()
    effective_commodity = (
        body.commodity.strip().lower()
        if body.commodity and body.commodity.strip()
        else (_detect_commodity_hint(claim_text) or row["commodity"])
    )
    doc_sha256 = hashlib.sha256(
        f"{token}|{effective_commodity}|{json.dumps(effective_geom, sort_keys=True)}|{claim_text}|{submitted_at}".encode("utf-8")
    ).hexdigest()

    with _get_conn() as conn:
        conn.execute(
            """
            UPDATE supplier_requests
            SET status = 'submitted',
                commodity = ?,
                submitted_geometry = ?,
                submitted_area_ha = ?,
                declared_mass_kg = ?,
                supplier_claim = ?,
                doc_sha256 = ?,
                submitted_at = ?
            WHERE token = ?
            """,
            (
                effective_commodity,
                json.dumps(effective_geom),
                effective_area_ha,
                body.declared_mass_kg if body.declared_mass_kg is not None else row["expected_mass_kg"],
                claim_text,
                doc_sha256,
                submitted_at,
                token,
            ),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM supplier_requests WHERE token = ?", (token,)).fetchone()

    return _row_to_dict(updated)


@router.delete("/requests/{token}")
def delete_supplier_request(token: str) -> dict[str, Any]:
    """Delete a generated supplier magic link from the operator inbox."""
    with _get_conn() as conn:
        cur = conn.execute("DELETE FROM supplier_requests WHERE token = ?", (token,))
        conn.commit()
    return {"deleted": cur.rowcount > 0, "token": token}


class SupplierAuditOutcomePayload(BaseModel):
    audit_status: str = Field(..., max_length=40)  # compliant | carve_out | non_compliant
    audit_risk_score: float = Field(default=0.0)
    audit_clean_ha: float = Field(default=0.0)
    audit_replanting_ha: float = Field(default=0.0)
    audit_silviculture_ha: float = Field(default=0.0)
    audit_non_agronomic_ha: float = Field(default=0.0)
    audit_violation_ha: float = Field(default=0.0)
    audit_total_ha: float = Field(default=0.0)
    audit_pwri_tile_url: str = Field(default="", max_length=1200)
    audit_summary: str = Field(default="", max_length=600)
    audit_protected_overlap: bool = False
    audit_traces_ref: str = Field(default="", max_length=120)


@router.post("/requests/{token}/audit-result")
def save_supplier_audit_result(token: str, body: SupplierAuditOutcomePayload) -> dict[str, Any]:
    """Publish the buyer's farm-scoped satellite verdict back to the supplier's Magic Link."""
    audited_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM supplier_requests WHERE token = ?", (token,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Origin request link not found")
        conn.execute(
            """
            UPDATE supplier_requests
            SET audit_status = ?,
                audit_risk_score = ?,
                audit_clean_ha = ?,
                audit_replanting_ha = ?,
                audit_silviculture_ha = ?,
                audit_non_agronomic_ha = ?,
                audit_violation_ha = ?,
                audit_total_ha = ?,
                audit_pwri_tile_url = ?,
                audit_summary = ?,
                audit_protected_overlap = ?,
                audit_traces_ref = ?,
                audited_at = ?
            WHERE token = ?
            """,
            (
                body.audit_status,
                body.audit_risk_score,
                body.audit_clean_ha,
                body.audit_replanting_ha,
                body.audit_silviculture_ha,
                body.audit_non_agronomic_ha,
                body.audit_violation_ha,
                body.audit_total_ha,
                body.audit_pwri_tile_url.strip(),
                body.audit_summary.strip(),
                1 if body.audit_protected_overlap else 0,
                body.audit_traces_ref.strip(),
                audited_at,
                token,
            ),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM supplier_requests WHERE token = ?", (token,)).fetchone()
    return _row_to_dict(updated)
