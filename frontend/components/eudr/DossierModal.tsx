"use client";

import { useState } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DossierMeta {
  id: "01_Colombia_Coffee" | "02_Ghana_Cocoa" | "03_Thailand_Rubber" | "04_Indonesia_Palm_Oil";
  title: string;
  commodity: string;
  country: string;
  verdict: "COMPLIANT" | "COMPLIANT (ART. 2(5) EXEMPT)" | "NON-COMPLIANT";
  riskScore: number;
  pdfFilename: string;
}

export const DOSSIERS: Record<string, DossierMeta> = {
  coffee: {
    id: "01_Colombia_Coffee",
    title: "Salamina Specialty Coffee Cooperative Holding",
    commodity: "Coffee (Coffea arabica)",
    country: "Colombia (Caldas / Andes)",
    verdict: "COMPLIANT",
    riskScore: 0,
    pdfFilename: "EUDR_Compliance_Audit_Report_Colombia_Coffee.pdf",
  },
  cocoa: {
    id: "02_Ghana_Cocoa",
    title: "Ashanti Smallholder Cocoa Sourcing Belt",
    commodity: "Cocoa (Theobroma cacao)",
    country: "Ghana (Western North / Juaboso)",
    verdict: "NON-COMPLIANT",
    riskScore: 100,
    pdfFilename: "EUDR_Compliance_Audit_Report_Ghana_Cocoa.pdf",
  },
  rubber: {
    id: "03_Thailand_Rubber",
    title: "Sadao Industrial Rubber Concession",
    commodity: "Rubber (Hevea brasiliensis)",
    country: "Thailand (Songkhla Province)",
    verdict: "COMPLIANT (ART. 2(5) EXEMPT)",
    riskScore: 18,
    pdfFilename: "EUDR_Compliance_Audit_Report_Thailand_Rubber.pdf",
  },
  palm_oil: {
    id: "04_Indonesia_Palm_Oil",
    title: "Pelalawan Peatland Oil Palm Concession",
    commodity: "Oil Palm (Elaeis guineensis)",
    country: "Indonesia (Riau / Sumatra)",
    verdict: "NON-COMPLIANT",
    riskScore: 100,
    pdfFilename: "EUDR_Compliance_Audit_Report_Indonesia_Palm_Oil.pdf",
  },
};

interface Props {
  dossierKey: string;
  onClose: () => void;
}

export default function DossierModal({ dossierKey, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"p1" | "p2" | "html">("p1");
  const dossier = DOSSIERS[dossierKey] ?? DOSSIERS.cocoa;

  const pdfUrl = `/dossiers/${dossier.id}/${dossier.pdfFilename}`;
  const p1Url = `/dossiers/${dossier.id}/full_pages/Page_1_Cartographic_Evidence.png`;
  const p2Url = `/dossiers/${dossier.id}/full_pages/Page_2_Statutory_Reasoning.png`;
  const htmlUrl = `/dossiers/${dossier.id}/${dossier.pdfFilename.replace(".pdf", ".html")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* -- Modal Header ---------------------------------------------- */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src="/oxeous-logo-tight.png"
              alt="Oxeous"
              className="h-7 w-auto object-contain filter brightness-95"
            />
            <div className="h-4 w-[1px] bg-slate-300" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm tracking-tight truncate">
                  {dossier.title}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase border",
                    dossier.verdict.startsWith("COMPLIANT")
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-red-50 text-red-800 border-red-300"
                  )}
                >
                  {dossier.verdict} ({dossier.riskScore}/100)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {dossier.commodity} · {dossier.country} · EU 2023/1115 Due Diligence Dossier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Download PDF button */}
            <a
              href={pdfUrl}
              download={dossier.pdfFilename}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#315F50] text-white hover:bg-[#274d40] transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official PDF</span>
            </a>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* -- Sub-navigation Tabs ---------------------------------------- */}
        <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("p1")}
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-all",
                activeTab === "p1"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Page 1: Cartographic Evidence
            </button>
            <button
              onClick={() => setActiveTab("p2")}
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-all",
                activeTab === "p2"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Page 2: Statutory Reasoning
            </button>
            <button
              onClick={() => setActiveTab("html")}
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-all",
                activeTab === "html"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Interactive HTML Source
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span>200 DPI Vector-Fidelity</span>
            <span>·</span>
            <span>A4 Portrait (210×297mm)</span>
          </div>
        </div>

        {/* -- Main Canvas Viewport -------------------------------------- */}
        <div className="flex-1 bg-slate-100 overflow-y-auto p-4 sm:p-6 flex justify-center">
          {activeTab === "p1" && (
            <div className="bg-white rounded shadow-xl border border-slate-300 max-w-[800px] w-full overflow-hidden animate-fade-in">
              <img
                src={p1Url}
                alt="Page 1: Cartographic Evidence"
                className="w-full h-auto block select-none"
              />
            </div>
          )}

          {activeTab === "p2" && (
            <div className="bg-white rounded shadow-xl border border-slate-300 max-w-[800px] w-full overflow-hidden animate-fade-in">
              <img
                src={p2Url}
                alt="Page 2: Statutory Reasoning"
                className="w-full h-auto block select-none"
              />
            </div>
          )}

          {activeTab === "html" && (
            <div className="w-full h-full bg-white rounded-xl shadow-inner border border-slate-300 overflow-hidden">
              <iframe
                src={htmlUrl}
                title="Interactive Dossier"
                className="w-full h-full border-0"
              />
            </div>
          )}
        </div>

        {/* -- Footer ---------------------------------------------------- */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-mono">
          <div>
            ISO 14065 / IEEE Multi-Sensor Verification Pipeline
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === "p2" ? "p1" : "p2")}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium font-sans"
            >
              {activeTab === "p1" ? (
                <>Next Page <ChevronRight className="w-3.5 h-3.5" /></>
              ) : (
                <><ChevronLeft className="w-3.5 h-3.5" /> Previous Page</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
