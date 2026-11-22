"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type { EUDRCommodity } from "@oxeous/shared-types";
import { SupplierLinkIcon } from "@/components/icons/EOIcons";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";
import { useStore } from "@/lib/store";
import {
  createSupplierRequest,
  deleteSupplierRequest,
  listSupplierRequests,
  type SupplierOriginRequest,
} from "@/lib/suppliers";

export default function SuppliersSidebar({ onClose }: { onClose?: () => void }) {
  const { user } = useAuthStore();
  const { rightPanel, setLeftPanel, setPendingSupplierAudit } = useStore();

  const [requests, setRequests] = useState<SupplierOriginRequest[]>([]);
  const [supplierName, setSupplierName] = useState("Cooperativa Cafetera Salamina");
  const [commodity, setCommodity] = useState<EUDRCommodity>("coffee");
  const [expectedMassKg, setExpectedMassKg] = useState("14000");
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [notifiedToken, setNotifiedToken] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await listSupplierRequests();
      setRequests(list);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (rightPanel === "suppliers") {
      loadRequests();
    }
  }, [rightPanel, loadRequests]);

  // Auto-refresh immediately on cross-tab localStorage write, tab focus, or visibility return
  useEffect(() => {
    const onSync = () => {
      if (rightPanel === "suppliers") loadRequests();
    };
    const onVis = () => {
      if (document.visibilityState === "visible" && rightPanel === "suppliers") loadRequests();
    };
    window.addEventListener("focus", onSync);
    window.addEventListener("storage", onSync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onSync);
      window.removeEventListener("storage", onSync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [rightPanel, loadRequests]);

  const handleCreate = async () => {
    if (!supplierName.trim()) return;
    setCreating(true);
    try {
      const created = await createSupplierRequest({
        supplier_name: supplierName.trim(),
        commodity,
        expected_mass_kg: Number(expectedMassKg) || 10000,
        operator_name: user?.organization || user?.full_name || "Oxeous EU Operator",
      });
      setRequests((prev) => [created, ...prev.filter((p) => p.token !== created.token)]);
    } finally {
      setCreating(false);
    }
  };

  const getMagicUrl = (token: string) => {
    if (typeof window === "undefined") return `/supplier/?token=${token}`;
    return `${window.location.origin}/supplier/?token=${token}`;
  };

  const copyLink = (token: string) => {
    navigator.clipboard?.writeText(getMagicUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1600);
  };

  const handleDelete = async (token: string) => {
    setRequests((prev) => prev.filter((r) => r.token !== token));
    await deleteSupplierRequest(token);
  };

  const copyStatusUpdate = (req: SupplierOriginRequest) => {
    const url = getMagicUrl(req.token);
    const label =
      req.audit_status === "compliant"
        ? "CLEARED FOR EXPORT"
        : req.audit_status === "carve_out"
        ? "CARVE-OUT APPLIED (ACTION REQUIRED)"
        : "SHIPMENT ON HOLD";
    const msg = `Oxeous EUDR Update for ${req.supplier_name} (${req.commodity.toUpperCase()}): Status = ${label}. ${req.audit_summary || ""} View your farm's live status & download summary: ${url}`;
    navigator.clipboard?.writeText(msg);
    setNotifiedToken(req.token);
    setTimeout(() => setNotifiedToken(null), 1800);
  };

  const handleAudit = (req: SupplierOriginRequest) => {
    if (!req.submitted_geometry) return;
    setLeftPanel("eudr");
    setPendingSupplierAudit({
      geometry: req.submitted_geometry,
      commodity: (req.commodity as EUDRCommodity) || "coffee",
      countryCode: "",
      countryName: req.supplier_name,
      areaHa: req.submitted_area_ha ?? undefined,
      supplierName: req.supplier_name,
      supplierToken: req.token,
      ts: Date.now(),
    });
  };

  const submittedCount = requests.filter((r) => r.status === "submitted").length;

  return (
    <div className="flex flex-col h-full bg-[#F4F5F6] text-[#1D2227] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#C8CFD5] flex-shrink-0 glass-header shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[rgba(49,95,80,0.1)] border border-[rgba(49,95,80,0.22)] flex items-center justify-center flex-shrink-0">
            <SupplierLinkIcon className="w-4 h-4 text-[#315F50]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-[#1D2227] truncate">Supplier Magic Links</h2>
              {submittedCount > 0 && (
                <span className="text-[9.5px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  {submittedCount} ready
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#5B6773] truncate">Zero-login farm GPS collection → direct map audit</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={loadRequests}
            title="Refresh supplier submissions"
            className="p-1.5 rounded-lg text-[#5B6773] hover:text-[#1D2227] hover:bg-white/80 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-[#315F50]")} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#747F88] hover:text-[#1D2227] hover:bg-white/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 3-Step Flow Strip */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#C8CFD5] bg-white p-2.5 shadow-2xs">
          {[
            { n: "1", title: "Share link", sub: "WhatsApp / Email" },
            { n: "2", title: "GPS pin", sub: "Auto-traces 10 m" },
            { n: "3", title: "Direct audit", sub: "1-click on map" },
          ].map((s) => (
            <div key={s.n} className="rounded-lg bg-[#F8FAF9] border border-[#E3E7EA] px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#315F50] text-[9px] font-mono font-bold text-white">
                  {s.n}
                </span>
                <span className="text-[10.5px] font-bold text-[#1D2227]">{s.title}</span>
              </div>
              <p className="mt-0.5 text-[9.5px] text-[#5B6773] pl-5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Create Magic Link Card */}
        <div className="rounded-xl border border-[#C8CFD5] bg-white p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D2227]">
              Create Origin Request Link
            </span>
            <span className="text-[9.5px] font-mono text-[#315F50] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              No login required
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-[#5B6773]">
                Supplier / Cooperative Name
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Cooperativa Cafetera Salamina"
                className="w-full rounded-lg border border-[#C8CFD5] bg-[#F8FAF9] px-2.5 py-2 text-[11.5px] text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-[#5B6773]">Commodity</label>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value as EUDRCommodity)}
                  className="w-full rounded-lg border border-[#C8CFD5] bg-[#F8FAF9] px-2.5 py-2 text-[11.5px] text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
                >
                  <option value="coffee">Coffee</option>
                  <option value="cocoa">Cocoa</option>
                  <option value="palm_oil">Palm Oil</option>
                  <option value="rubber">Rubber</option>
                  <option value="soya">Soy</option>
                  <option value="wood">Wood</option>
                  <option value="cattle">Cattle</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-[#5B6773]">Expected Mass (kg)</label>
                <input
                  type="number"
                  value={expectedMassKg}
                  onChange={(e) => setExpectedMassKg(e.target.value)}
                  placeholder="14000"
                  className="w-full rounded-lg border border-[#C8CFD5] bg-[#F8FAF9] px-2.5 py-2 font-mono text-[11.5px] text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#315F50] hover:bg-[#274d40] py-2.5 text-[11.5px] font-semibold text-white transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Generate Supplier Magic Link</span>
          </button>
        </div>

        {/* Supplier Inbox */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5B6773]">
              Active Requests & Received Plots ({requests.length})
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#C8CFD5] bg-white/70 p-6 text-center space-y-1.5">
              <MapPin className="w-5 h-5 text-[#7A8791] mx-auto" />
              <p className="text-[11.5px] font-semibold text-[#1D2227]">No supplier links created yet</p>
              <p className="text-[10.5px] text-[#5B6773] leading-relaxed">
                Generate a link above, open it to simulate a farmer dropping a GPS pin, and the farm polygon will appear here ready to audit.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {requests.map((req) => {
                const isSubmitted = req.status === "submitted" && Boolean(req.submitted_geometry);
                const url = getMagicUrl(req.token);
                return (
                  <div
                    key={req.token}
                    className={cn(
                      "rounded-xl border bg-white p-3 space-y-2 shadow-2xs transition-colors",
                      isSubmitted ? "border-emerald-300" : "border-[#C8CFD5]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[#1D2227] truncate">{req.supplier_name}</p>
                        <p className="text-[10px] font-mono text-[#5B6773] mt-0.5">
                          {req.commodity.toUpperCase()} · {Math.round(req.declared_mass_kg ?? req.expected_mass_kg).toLocaleString()} kg
                          {req.submitted_area_ha ? ` · ${req.submitted_area_ha.toFixed(1)} ha traced` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase flex-shrink-0 border",
                          req.audit_status === "compliant"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : req.audit_status === "carve_out"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : req.audit_status === "non_compliant"
                            ? "bg-rose-50 text-[#A64B45] border-rose-200"
                            : isSubmitted
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        )}
                      >
                        {req.audit_status === "compliant"
                          ? "Cleared"
                          : req.audit_status === "carve_out"
                          ? "Carve-Out"
                          : req.audit_status === "non_compliant"
                          ? "On Hold"
                          : isSubmitted
                          ? "Submitted"
                          : "Awaiting GPS"}
                      </span>
                    </div>

                    {req.audit_status && req.audit_summary && (
                      <div className="rounded-lg border border-[#E3E7EA] bg-[#F8FAF9] px-2.5 py-1.5 text-[10px] text-[#343B42] space-y-1">
                        <div className="flex items-center justify-between font-mono text-[9.5px]">
                          <span className="font-bold text-[#315F50]">
                            Clean: {(req.audit_clean_ha ?? 0).toFixed(1)} ha
                          </span>
                          {(req.audit_violation_ha ?? 0) > 0 && (
                            <span className="font-bold text-[#A64B45]">
                              Flagged: {(req.audit_violation_ha ?? 0).toFixed(1)} ha
                            </span>
                          )}
                        </div>
                        <p className="leading-snug line-clamp-2 text-[#5B6773]">{req.audit_summary}</p>
                      </div>
                    )}

                    {isSubmitted && req.supplier_claim && (
                      <p className="text-[10.5px] text-[#343B42] bg-[#F8FAF9] border border-[#E3E7EA] rounded-lg px-2.5 py-1.5 line-clamp-2 italic">
                        “{req.supplier_claim}”
                      </p>
                    )}

                    {!isSubmitted && (
                      <div className="rounded-lg bg-[#F8FAF9] border border-[#E3E7EA] px-2.5 py-1.5 font-mono text-[9.5px] text-[#5B6773] truncate">
                        {url}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => copyLink(req.token)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-[#C8CFD5] bg-white hover:bg-[#F4F5F6] py-1.5 px-2 text-[10.5px] font-semibold text-[#1D2227] cursor-pointer"
                      >
                        {copiedToken === req.token ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#5B6773]" />
                        )}
                        <span>{copiedToken === req.token ? "Copied" : "Copy Link"}</span>
                      </button>

                      <a
                        href={`/supplier/?token=${req.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#C8CFD5] bg-white hover:bg-[#F4F5F6] py-1.5 px-2.5 text-[10.5px] font-semibold text-[#315F50]"
                        title="Open mobile supplier portal in a new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </a>

                      {isSubmitted && (
                        <button
                          type="button"
                          onClick={() => handleAudit(req)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#315F50] hover:bg-[#274d40] py-1.5 px-3 text-[10.5px] font-semibold text-white cursor-pointer shadow-2xs"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{req.audit_status ? "Re-Audit" : "Audit Plot"}</span>
                        </button>
                      )}

                      {req.audit_status && (
                        <button
                          type="button"
                          onClick={() => copyStatusUpdate(req)}
                          title="Copy ready-to-send WhatsApp / email status update for supplier"
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#315F50]/30 bg-[rgba(49,95,80,0.08)] hover:bg-[rgba(49,95,80,0.14)] py-1.5 px-2 text-[10px] font-semibold text-[#315F50] cursor-pointer flex-shrink-0"
                        >
                          {notifiedToken === req.token ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>{notifiedToken === req.token ? "Copied" : "Notify"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(req.token)}
                        title="Delete magic link"
                        aria-label={`Delete link for ${req.supplier_name}`}
                        className="inline-flex items-center justify-center rounded-lg border border-[#C8CFD5] bg-white p-1.5 text-[#747F88] hover:border-rose-200 hover:bg-rose-50 hover:text-[#A64B45] transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isSubmitted && req.doc_sha256 && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#E3E7EA] text-[9.5px] font-mono text-[#747F88]">
                        <span className="inline-flex items-center gap-1 text-[#315F50]">
                          <ShieldCheck className="w-3 h-3" /> Art. 12 SHA-256
                        </span>
                        <span>{req.doc_sha256.slice(0, 16)}…</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
