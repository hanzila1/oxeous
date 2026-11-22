"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Mail, Send, X } from "lucide-react";
import { COMMODITIES, CONTACT_EMAIL } from "@/lib/site";

export default function PilotModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [commodity, setCommodity] = useState<string>("coffee");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Oxeous Pilot Request - ${company || name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nCompany: ${company}\nEmail: ${email}\nCommodity: ${commodity}\n\nProject details:\n${notes}`
    );
    // Trigger user mail client fallback
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(CONTACT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-line bg-paper p-6 sm:p-8 shadow-2xl text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 rounded-full p-2 text-ink-2 hover:bg-mist hover:text-ink transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="font-data text-[11px] uppercase tracking-wider text-canopy font-semibold">
              Deployment Inquiry
            </div>
            <h3 className="mt-1 font-display text-[24px] font-semibold text-ink">
              Request an Enterprise Pilot
            </h3>
            <p className="mt-2 text-[14px] text-ink-2">
              Run automated EUDR audits against your supply chain polygons. Direct inquiries are handled by our engineering team.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block font-data text-[11px] uppercase tracking-wider text-ink-2 mb-1.5">
                  Your Name *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-canopy focus:outline-none focus:ring-1 focus:ring-canopy"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-data text-[11px] uppercase tracking-wider text-ink-2 mb-1.5">
                    Organization / Company *
                  </label>
                  <input
                    required
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. AgriTrade Global"
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-canopy focus:outline-none focus:ring-1 focus:ring-canopy"
                  />
                </div>

                <div>
                  <label className="block font-data text-[11px] uppercase tracking-wider text-ink-2 mb-1.5">
                    Work Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-canopy focus:outline-none focus:ring-1 focus:ring-canopy"
                  />
                </div>
              </div>

              <div>
                <label className="block font-data text-[11px] uppercase tracking-wider text-ink-2 mb-1.5">
                  Primary Regulated Commodity
                </label>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-canopy focus:outline-none focus:ring-1 focus:ring-canopy"
                >
                  {COMMODITIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                  <option value="multi">Multiple Commodities</option>
                </select>
              </div>

              <div>
                <label className="block font-data text-[11px] uppercase tracking-wider text-ink-2 mb-1.5">
                  Supply Chain Scale &amp; Scope (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Estimated number of sourcing plots, countries of origin, or ERP/GIS integration requirements..."
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-canopy focus:outline-none focus:ring-1 focus:ring-canopy"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-display text-[14px] font-semibold text-paper hover:bg-canopy transition-colors shadow-sm"
                >
                  <Send className="h-4 w-4" />
                  Send Pilot Request
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h3 className="mt-4 font-display text-[22px] font-semibold text-ink">
              Inquiry Prepared
            </h3>
            <p className="mt-2 text-[14px] text-ink-2 max-w-sm mx-auto">
              Your email client has been dispatched. If it did not open automatically, send your requirements directly to:
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 font-data text-[13px] text-ink">
              <Mail className="h-4 w-4 text-canopy" />
              <span>{CONTACT_EMAIL}</span>
              <button
                type="button"
                onClick={copyEmail}
                className="ml-2 rounded p-1 text-ink-2 hover:bg-mist hover:text-ink transition-colors"
                title="Copy email address"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-paper hover:bg-canopy transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

