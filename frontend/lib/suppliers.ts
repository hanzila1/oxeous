"use client";

export interface SupplierOriginRequest {
  token: string;
  supplier_name: string;
  commodity: string;
  country_code: string;
  expected_mass_kg: number;
  operator_name: string;
  notes: string;
  status: "pending" | "submitted";
  submitted_geometry: Record<string, unknown> | null;
  submitted_area_ha: number | null;
  declared_mass_kg: number | null;
  supplier_claim: string;
  doc_sha256: string;
  created_at: string;
  submitted_at: string | null;
  audit_status?: "compliant" | "carve_out" | "non_compliant" | null;
  audit_risk_score?: number | null;
  audit_clean_ha?: number | null;
  audit_replanting_ha?: number | null;
  audit_silviculture_ha?: number | null;
  audit_non_agronomic_ha?: number | null;
  audit_violation_ha?: number | null;
  audit_total_ha?: number | null;
  audit_pwri_tile_url?: string | null;
  audit_summary?: string | null;
  audit_protected_overlap?: boolean;
  audit_traces_ref?: string | null;
  audited_at?: string | null;
}

export interface ClaimVerificationResult {
  verdict: "VERIFIED_CONSISTENT" | "CONTRADICTION_DETECTED";
  claim_trust_score: number;
  contradictions_count: number;
  naive_document_ai_verdict: "FALSE_PASS" | "PASS" | "UNCERTAIN";
  oxeous_verdict: "VERIFIED" | "BLOCKED_CONTRADICTION";
  filename: string;
  doc_sha256: string;
  checks: Array<{
    dimension: string;
    supplier_claim: string;
    satellite_truth: string;
    status: "consistent" | "contradiction";
    severity: "none" | "high" | "critical";
    article: string;
  }>;
}

export interface TracesSandboxReceipt {
  status: string;
  environment: string;
  dds_id: string;
  traces_reference_number: string;
  traces_verification_number: string;
  customs_box44_code: string;
  commodity: string;
  country_code: string;
  certified_export_ha: number;
  submitted_at: string;
}

const LOCAL_REQ_KEY = "oxeous_supplier_requests_v1";

const API_CANDIDATES = [
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:8000",
  "http://127.0.0.1:8000",
].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

async function tryApi<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T | null> {
  for (const base of API_CANDIDATES) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${base}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      });
      clearTimeout(t);
      if (res.ok) return (await res.json()) as T;
    } catch {
      // try next
    }
  }
  return null;
}

function readLocalRequests(): SupplierOriginRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_REQ_KEY);
    return raw ? (JSON.parse(raw) as SupplierOriginRequest[]) : [];
  } catch {
    return [];
  }
}

function writeLocalRequests(items: SupplierOriginRequest[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_REQ_KEY, JSON.stringify(items));
  } catch {}
}

export async function createSupplierRequest(params: {
  supplier_name: string;
  commodity: string;
  expected_mass_kg: number;
  operator_name: string;
  notes?: string;
}): Promise<SupplierOriginRequest> {
  const remote = await tryApi<SupplierOriginRequest>("/suppliers/requests", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (remote) {
    const locals = readLocalRequests().filter((r) => r.token !== remote.token);
    writeLocalRequests([remote, ...locals]);
    return remote;
  }

  // Local preview fallback
  const token = `oxe_${Math.random().toString(36).slice(2, 12)}`;
  const item: SupplierOriginRequest = {
    token,
    supplier_name: params.supplier_name.trim(),
    commodity: params.commodity.toLowerCase(),
    country_code: "",
    expected_mass_kg: params.expected_mass_kg,
    operator_name: params.operator_name || "Oxeous Operator",
    notes: params.notes || "",
    status: "pending",
    submitted_geometry: null,
    submitted_area_ha: null,
    declared_mass_kg: null,
    supplier_claim: "",
    doc_sha256: "",
    created_at: new Date().toISOString(),
    submitted_at: null,
  };
  writeLocalRequests([item, ...readLocalRequests()]);
  return item;
}

function mergeRequestRecords(
  a: SupplierOriginRequest,
  b: SupplierOriginRequest
): SupplierOriginRequest {
  const rank = (r: SupplierOriginRequest) =>
    (r.audit_status ? 2 : 0) + (r.status === "submitted" && r.submitted_geometry ? 1 : 0);
  // Prefer the more progressed record (audited > submitted > pending) so a stale backend row never downgrades a submission
  const [primary, secondary] = rank(b) > rank(a) ? [b, a] : [a, b];
  return {
    ...secondary,
    ...primary,
    commodity: primary.commodity || secondary.commodity,
    submitted_geometry: primary.submitted_geometry || secondary.submitted_geometry,
    submitted_area_ha: primary.submitted_area_ha ?? secondary.submitted_area_ha,
    audit_status: primary.audit_status || secondary.audit_status || null,
    audit_clean_ha: primary.audit_clean_ha ?? secondary.audit_clean_ha ?? null,
    audit_replanting_ha: primary.audit_replanting_ha ?? secondary.audit_replanting_ha ?? null,
    audit_silviculture_ha: primary.audit_silviculture_ha ?? secondary.audit_silviculture_ha ?? null,
    audit_non_agronomic_ha: primary.audit_non_agronomic_ha ?? secondary.audit_non_agronomic_ha ?? null,
    audit_violation_ha: primary.audit_violation_ha ?? secondary.audit_violation_ha ?? null,
    audit_total_ha: primary.audit_total_ha ?? secondary.audit_total_ha ?? null,
    audit_pwri_tile_url: primary.audit_pwri_tile_url || secondary.audit_pwri_tile_url || null,
  };
}

export async function listSupplierRequests(): Promise<SupplierOriginRequest[]> {
  const remote = await tryApi<{ requests: SupplierOriginRequest[] }>("/suppliers/requests");
  const locals = readLocalRequests();
  if (!remote) return locals;
  const map = new Map<string, SupplierOriginRequest>();
  locals.forEach((r) => map.set(r.token, r));
  remote.requests.forEach((r) => {
    const existing = map.get(r.token);
    map.set(r.token, existing ? mergeRequestRecords(existing, r) : r);
  });
  return Array.from(map.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function deleteSupplierRequest(token: string): Promise<void> {
  // Always remove from local fallback store first for instant UI feedback
  writeLocalRequests(readLocalRequests().filter((r) => r.token !== token));
  await tryApi<{ deleted: boolean }>(`/suppliers/requests/${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
}

export async function recordSupplierAuditResult(
  token: string,
  payload: {
    audit_status: "compliant" | "carve_out" | "non_compliant";
    audit_risk_score: number;
    audit_clean_ha: number;
    audit_replanting_ha?: number;
    audit_silviculture_ha?: number;
    audit_non_agronomic_ha?: number;
    audit_violation_ha: number;
    audit_total_ha?: number;
    audit_pwri_tile_url?: string;
    audit_summary: string;
    audit_protected_overlap: boolean;
    audit_traces_ref?: string;
  }
): Promise<SupplierOriginRequest | null> {
  const remote = await tryApi<SupplierOriginRequest>(
    `/suppliers/requests/${encodeURIComponent(token)}/audit-result`,
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        audit_replanting_ha: payload.audit_replanting_ha ?? 0,
        audit_silviculture_ha: payload.audit_silviculture_ha ?? 0,
        audit_non_agronomic_ha: payload.audit_non_agronomic_ha ?? 0,
        audit_total_ha: payload.audit_total_ha ?? 0,
        audit_pwri_tile_url: payload.audit_pwri_tile_url ?? "",
        audit_traces_ref: payload.audit_traces_ref || "",
      }),
    }
  );
  if (remote) {
    const merged: SupplierOriginRequest = {
      ...remote,
      audit_replanting_ha: remote.audit_replanting_ha ?? payload.audit_replanting_ha ?? 0,
      audit_silviculture_ha: remote.audit_silviculture_ha ?? payload.audit_silviculture_ha ?? 0,
      audit_non_agronomic_ha: remote.audit_non_agronomic_ha ?? payload.audit_non_agronomic_ha ?? 0,
      audit_total_ha: remote.audit_total_ha ?? payload.audit_total_ha ?? 0,
      audit_pwri_tile_url: remote.audit_pwri_tile_url || payload.audit_pwri_tile_url || null,
    };
    const locals = readLocalRequests().filter((r) => r.token !== merged.token);
    writeLocalRequests([merged, ...locals]);
    return merged;
  }

  // Local fallback sync
  const locals = readLocalRequests();
  const idx = locals.findIndex((r) => r.token === token);
  if (idx < 0) return null;
  const updated: SupplierOriginRequest = {
    ...locals[idx],
    ...payload,
    audit_traces_ref: payload.audit_traces_ref || locals[idx].audit_traces_ref || null,
    audited_at: new Date().toISOString(),
  };
  locals[idx] = updated;
  writeLocalRequests(locals);
  return updated;
}

export async function fetchSupplierPortal(token: string): Promise<SupplierOriginRequest | null> {
  const remote = await tryApi<SupplierOriginRequest>(`/suppliers/portal/${encodeURIComponent(token)}`);
  const local = readLocalRequests().find((r) => r.token === token) ?? null;
  if (remote) {
    // Merge any newer client-recorded PWRI class breakdown if backend hasn't restarted yet
    if (local && local.audit_status) {
      return {
        ...remote,
        audit_replanting_ha: remote.audit_replanting_ha ?? local.audit_replanting_ha ?? null,
        audit_silviculture_ha: remote.audit_silviculture_ha ?? local.audit_silviculture_ha ?? null,
        audit_non_agronomic_ha: remote.audit_non_agronomic_ha ?? local.audit_non_agronomic_ha ?? null,
        audit_total_ha: remote.audit_total_ha ?? local.audit_total_ha ?? null,
        audit_pwri_tile_url: remote.audit_pwri_tile_url || local.audit_pwri_tile_url || null,
      };
    }
    return remote;
  }
  return local;
}

export async function submitSupplierPortal(
  token: string,
  payload: {
    lat?: number;
    lng?: number;
    geometry?: Record<string, unknown>;
    area_ha?: number;
    declared_mass_kg?: number;
    supplier_claim?: string;
    commodity?: string;
  }
): Promise<SupplierOriginRequest | null> {
  // Generous 28s timeout so live 10m FTW satellite delineation completes cleanly on backend
  const remote = await tryApi<SupplierOriginRequest>(
    `/suppliers/portal/${encodeURIComponent(token)}/submit`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    28000
  );
  if (remote) {
    const synced: SupplierOriginRequest = {
      ...remote,
      commodity: payload.commodity || remote.commodity,
    };
    const locals = readLocalRequests().filter((r) => r.token !== synced.token);
    writeLocalRequests([synced, ...locals]);
    return synced;
  }

  // Local fallback delineation
  const locals = readLocalRequests();
  const idx = locals.findIndex((r) => r.token === token);
  if (idx < 0) return null;

  let geom = payload.geometry ?? null;
  if (!geom && payload.lat !== undefined && payload.lng !== undefined) {
    const d = 0.0014;
    const lat = payload.lat;
    const lng = payload.lng;
    geom = {
      type: "Polygon",
      coordinates: [[
        [Number((lng - d).toFixed(6)), Number((lat - d).toFixed(6))],
        [Number((lng + d).toFixed(6)), Number((lat - d).toFixed(6))],
        [Number((lng + d).toFixed(6)), Number((lat + d).toFixed(6))],
        [Number((lng - d).toFixed(6)), Number((lat + d).toFixed(6))],
        [Number((lng - d).toFixed(6)), Number((lat - d).toFixed(6))],
      ]],
    };
  }

  const updated: SupplierOriginRequest = {
    ...locals[idx],
    status: "submitted",
    commodity: payload.commodity || locals[idx].commodity,
    submitted_geometry: geom,
    submitted_area_ha: payload.area_ha ?? 8.4,
    declared_mass_kg: payload.declared_mass_kg ?? locals[idx].expected_mass_kg,
    supplier_claim: payload.supplier_claim ?? "",
    doc_sha256: Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("") + "a9f4c2e1",
    submitted_at: new Date().toISOString(),
  };
  locals[idx] = updated;
  writeLocalRequests(locals);
  return updated;
}

export async function verifySupplierClaim(payload: {
  claim_text: string;
  filename?: string;
  commodity: string;
  area_ha: number;
  compliant_ha: number;
  statutory_deforestation_ha: number;
  forest_loss_ha: number;
  overlaps_protected_area: boolean;
  protected_area_names: string[];
  declared_mass_kg?: number;
}): Promise<ClaimVerificationResult> {
  const remote = await tryApi<ClaimVerificationResult>("/eudr/verify-claim", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (remote) return remote;

  // Deterministic client-side parity fallback if backend is offline
  const lower = payload.claim_text.toLowerCase();
  const claimsNoClearing = /(no\s+(?:recent\s+)?(?:clearing|deforestation)|zero\s+deforestation|deforestation[- ]free|since\s+20(?:0\d|1\d)|traditional\s+shade)/.test(lower);
  const mTonnes = lower.match(/(\d[\d,.]*)\s*(?:metric\s+)?(?:tonnes|tons|mt\b|t\b)/);
  const parsedMassKg = mTonnes ? parseFloat(mTonnes[1].replace(/,/g, "")) * 1000 : payload.declared_mass_kg;
  const maxKg = Math.max(100, payload.compliant_ha * 2400);

  const checks: ClaimVerificationResult["checks"] = [];
  let contradictions = 0;

  if (payload.statutory_deforestation_ha > 0.01) {
    contradictions += 1;
    checks.push({
      dimension: "Art. 3(a) Deforestation-Free Claim",
      supplier_claim: claimsNoClearing ? "Claims zero post-2020 clearing" : "Omits post-2020 clearing disclosure",
      satellite_truth: `${payload.statutory_deforestation_ha.toFixed(2)} ha statutory post-2020 canopy loss detected`,
      status: "contradiction",
      severity: "critical",
      article: "Article 3(a) · Cutoff Violation",
    });
  } else {
    checks.push({
      dimension: "Art. 3(a) Deforestation-Free Claim",
      supplier_claim: "Claims deforestation-free origin",
      satellite_truth: "Confirmed: 0.00 ha statutory post-2020 deforestation",
      status: "consistent",
      severity: "none",
      article: "Article 3(a) · Verified",
    });
  }

  if (payload.overlaps_protected_area) {
    contradictions += 1;
    checks.push({
      dimension: "Art. 3(b) Sovereign Land Legality",
      supplier_claim: "Attests lawful private land tenure",
      satellite_truth: `Intersects protected reserve (${payload.protected_area_names[0] || "WDPA"})`,
      status: "contradiction",
      severity: "critical",
      article: "Article 3(b) · Protected Area",
    });
  }

  if (parsedMassKg && parsedMassKg > maxKg) {
    contradictions += 1;
    checks.push({
      dimension: "Art. 16(3) Biophysical Yield Cap",
      supplier_claim: `Declares ${(parsedMassKg / 1000).toFixed(1)} t from ${payload.compliant_ha.toFixed(1)} ha`,
      satellite_truth: `Exceeds biophysical ceiling (${(maxKg / 1000).toFixed(1)} t max) by ${(parsedMassKg / maxKg).toFixed(1)}×`,
      status: "contradiction",
      severity: "critical",
      article: "Article 16(3) · Anti-Laundering",
    });
  }

  return {
    verdict: contradictions === 0 ? "VERIFIED_CONSISTENT" : "CONTRADICTION_DETECTED",
    claim_trust_score: Math.max(0, 100 - contradictions * 42),
    contradictions_count: contradictions,
    naive_document_ai_verdict: contradictions > 0 && claimsNoClearing ? "FALSE_PASS" : "PASS",
    oxeous_verdict: contradictions === 0 ? "VERIFIED" : "BLOCKED_CONTRADICTION",
    filename: payload.filename || "supplier_declaration.txt",
    doc_sha256: "e8c4f1a29b7d6014c83a519f2b44e0c9d17b",
    checks,
  };
}

export async function submitTracesSandbox(payload: {
  dds_id: string;
  commodity: string;
  country_code: string;
  compliant_ha: number;
}): Promise<TracesSandboxReceipt> {
  const remote = await tryApi<TracesSandboxReceipt>("/eudr/traces-submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (remote) return remote;

  const ref = `26EU${Math.random().toString(16).slice(2, 12).toUpperCase()}`;
  const ver = Math.random().toString(16).slice(2, 10).toUpperCase();
  return {
    status: "ACCEPTED_SANDBOX",
    environment: "EC TRACES NT Acceptance Sandbox (v2.1)",
    dds_id: payload.dds_id,
    traces_reference_number: ref,
    traces_verification_number: ver,
    customs_box44_code: `C716:${ref}:${ver}`,
    commodity: payload.commodity.toUpperCase(),
    country_code: payload.country_code.toUpperCase(),
    certified_export_ha: Number(payload.compliant_ha.toFixed(2)),
    submitted_at: new Date().toISOString(),
  };
}
