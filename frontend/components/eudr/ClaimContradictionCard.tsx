"use client";

import { useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { EUDRAnalysisResponse } from "@oxeous/shared-types";
import { cn } from "@/lib/utils";
import { verifySupplierClaim, type ClaimVerificationResult } from "@/lib/suppliers";

export default function ClaimContradictionCard({ result }: { result: EUDRAnalysisResponse }) {
  const { plot, risk_assessment: ra } = result;
  const def = ra.deforestation;
  const leg = ra.legality;

  const [claimText, setClaimText] = useState(
    `Supplier Declaration (${plot.country_name || plot.country_code}): Traditional agroforestry farm established prior to 2018. Zero post-2020 forest clearing occurred. Valid private land tenure permits on file. Declared export shipment: 450 tonnes.`
  );
  const [filename, setFilename] = useState("supplier_origin_attestation.txt");
  const [checking, setChecking] = useState(false);
  const [verification, setVerification] = useState<ClaimVerificationResult | null>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      if (content.trim()) {
        setClaimText(content.slice(0, 2000));
      }
    };
    reader.readAsText(file);
  };

  const runCheck = async () => {
    if (!claimText.trim()) return;
    setChecking(true);
    try {
      const statLoss = Number((def as any).statutory_deforestation_ha ?? def.forest_loss_ha ?? 0);
      const compliantHa = Number((def as any).compliant_ha ?? plot.area_ha ?? 10);
      const res = await verifySupplierClaim({
        claim_text: claimText,
        filename,
        commodity: plot.commodity,
        area_ha: plot.area_ha ?? 10,
        compliant_ha: compliantHa,
        statutory_deforestation_ha: statLoss,
        forest_loss_ha: def.forest_loss_ha ?? 0,
        overlaps_protected_area: leg.overlaps_protected_area,
        protected_area_names: leg.protected_area_names || [],
      });
      setVerification(res);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-3 rounded-xl bg-white border border-[#C8CFD5] space-y-2.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <FileSearch className="w-3.5 h-3.5 text-[#315F50]" />
          <span className="font-semibold text-[#1D2227] text-[11px]">
            Supplier Claim vs. Satellite Truth
          </span>
        </div>
        <label className="inline-flex items-center gap-1 rounded-md border border-[#C8CFD5] bg-[#F8FAF9] hover:bg-[#E3E7EA] px-2 py-0.5 text-[9.5px] font-semibold text-[#343B42] cursor-pointer">
          <Upload className="w-2.5 h-2.5 text-[#315F50]" />
          <span>Upload PDF/TXT</span>
          <input type="file" accept=".txt,.csv,.json,.md,.pdf" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <p className="text-[10px] text-[#5B6773] leading-relaxed">
        Document-only tools trust supplier PDFs. Oxeous cross-checks written supplier attestations directly against
        satellite ground truth and physical yield limits.
      </p>

      <textarea
        rows={3}
        value={claimText}
        onChange={(e) => setClaimText(e.target.value)}
        className="w-full rounded-lg border border-[#C8CFD5] bg-[#F8FAF9] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#1D2227] focus:border-[#315F50] focus:bg-white focus:outline-none"
      />

      <button
        type="button"
        onClick={runCheck}
        disabled={checking}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#315F50] hover:bg-[#274d40] text-white text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-60"
      >
        {checking ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Cross-checking claim against orbit…
          </>
        ) : (
          <>
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            Verify Declaration Against Satellite Truth
          </>
        )}
      </button>

      {verification && (
        <div className="space-y-2 pt-1.5 border-t border-[#E3E7EA] animate-fadeIn">
          {/* Document-Only AI vs Oxeous Comparison Strip */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="rounded-lg border border-[#E3E7EA] bg-[#F8FAF9] p-2">
              <div className="text-[9px] font-mono uppercase text-[#747F88]">Document-Only AI</div>
              <div
                className={cn(
                  "mt-0.5 font-mono font-bold",
                  verification.naive_document_ai_verdict === "FALSE_PASS" ? "text-[#C58A3A]" : "text-[#315F50]"
                )}
              >
                {verification.naive_document_ai_verdict === "FALSE_PASS"
                  ? "FALSE PASS ⚠ (Fooled)"
                  : verification.naive_document_ai_verdict}
              </div>
            </div>
            <div
              className={cn(
                "rounded-lg border p-2",
                verification.contradictions_count > 0
                  ? "border-rose-200 bg-rose-50/70"
                  : "border-emerald-200 bg-emerald-50/70"
              )}
            >
              <div className="text-[9px] font-mono uppercase text-[#5B6773]">Oxeous Ground Truth</div>
              <div
                className={cn(
                  "mt-0.5 font-mono font-bold",
                  verification.contradictions_count > 0 ? "text-[#A64B45]" : "text-[#315F50]"
                )}
              >
                {verification.contradictions_count > 0
                  ? `${verification.contradictions_count} CONTRADICTION${verification.contradictions_count > 1 ? "S" : ""}`
                  : "CONSISTENT ✓"}
              </div>
            </div>
          </div>

          {/* Per-Dimension Contradiction Rows */}
          <div className="space-y-1.5">
            {verification.checks.map((chk, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border p-2 text-[10px] space-y-1",
                  chk.status === "contradiction"
                    ? "border-[rgba(166,75,69,0.28)] bg-[rgba(166,75,69,0.05)]"
                    : "border-emerald-200 bg-emerald-50/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#1D2227] flex items-center gap-1">
                    {chk.status === "contradiction" ? (
                      <ShieldAlert className="w-3 h-3 text-[#A64B45]" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-[#315F50]" />
                    )}
                    {chk.dimension}
                  </span>
                  <span className="font-mono text-[8.5px] uppercase text-[#5B6773]">{chk.article}</span>
                </div>
                <div className="text-[#5B6773]">
                  <strong className="text-[#343B42]">Claim:</strong> {chk.supplier_claim}
                </div>
                <div className={chk.status === "contradiction" ? "text-[#A64B45] font-medium" : "text-[#315F50] font-medium"}>
                  <strong>Satellite:</strong> {chk.satellite_truth}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between font-mono text-[9px] text-[#747F88] pt-0.5">
            <span className="truncate">Art. 12 Vault SHA-256: {verification.doc_sha256.slice(0, 14)}…</span>
            <span className="font-bold text-[#1D2227]">Trust: {verification.claim_trust_score}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}
