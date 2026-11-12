"use client";

import React, { useState } from "react";
import { X, Send, CheckCircle2, ShieldCheck, Building2, Mail, User } from "lucide-react";
import { EULogoSeal } from "@/components/icons/EOIcons";

interface EnterprisePilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnterprisePilotModal({ isOpen, onClose }: EnterprisePilotModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    commodity: "Cocoa",
    volume: "1,000 - 10,000 parcels",
    notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#C8CFD5] p-6 sm:p-8 shadow-panel-lg overflow-hidden font-mono text-xs">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#747F88] hover:text-[#1D2227] hover:bg-[#E3E7EA] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[rgba(49,95,80,0.08)] border border-[#315F50] flex items-center justify-center text-[#315F50] mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#1D2227]">Pilot Request Received</h3>
            <p className="text-[#747F88] leading-relaxed">
              Thank you, <strong>{formData.name || "partner"}</strong>. Our spatial-legal engineering team 
              will review your parcel volume and reach out to <strong>{formData.email}</strong> to schedule onboarding.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="px-6 py-2 rounded-lg bg-[#315F50] text-white hover:bg-[#25493D] transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-[#315F50] text-[11px] mb-1 font-semibold">
                <EULogoSeal className="w-4 h-4 text-[#315F50]" />
                <span>ENTERPRISE COHORT 2026-2027</span>
              </div>
              <h3 className="text-xl font-bold text-[#1D2227]">Request Enterprise Pilot</h3>
              <p className="text-[#747F88] mt-1 text-[11px] leading-relaxed">
                Connect your supplier GPS coordinates to our Copernicus Sentinel-1 radar verification pipeline.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[#1D2227] font-semibold mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-[#747F88]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Elena Rostova"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#F4F5F6] border border-[#C8CFD5] rounded-lg pl-9 pr-3 py-2 text-[#1D2227] placeholder-[#747F88] focus:border-[#315F50] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1D2227] font-semibold mb-1">Corporate Work Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#747F88]" />
                  <input
                    type="email"
                    required
                    placeholder="name@commodity-trader.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F4F5F6] border border-[#C8CFD5] rounded-lg pl-9 pr-3 py-2 text-[#1D2227] placeholder-[#747F88] focus:border-[#315F50] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1D2227] font-semibold mb-1">Organization / Trading House *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-[#747F88]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Continental Cocoa Trading B.V."
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-[#F4F5F6] border border-[#C8CFD5] rounded-lg pl-9 pr-3 py-2 text-[#1D2227] placeholder-[#747F88] focus:border-[#315F50] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1D2227] font-semibold mb-1">Target Commodity</label>
                  <select
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    className="w-full bg-[#F4F5F6] border border-[#C8CFD5] rounded-lg px-3 py-2 text-[#1D2227] focus:border-[#315F50] outline-none"
                  >
                    <option>Cocoa</option>
                    <option>Coffee</option>
                    <option>Palm Oil</option>
                    <option>Rubber</option>
                    <option>Soya</option>
                    <option>Timber</option>
                    <option>Cattle / Beef</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#1D2227] font-semibold mb-1">Parcel Volume</label>
                  <select
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="w-full bg-[#F4F5F6] border border-[#C8CFD5] rounded-lg px-3 py-2 text-[#1D2227] focus:border-[#315F50] outline-none"
                  >
                    <option>&lt; 1,000 parcels</option>
                    <option>1,000 - 10,000 parcels</option>
                    <option>10,000 - 100,000 parcels</option>
                    <option>&gt; 100,000 parcels</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#1D2227] font-semibold mb-1">Notes / Bottlenecks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Experiencing 30%+ false alarms in Ivory Coast cooperatives..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#F4F5F6] border border-[#C8CFD5] rounded-lg p-2 text-[#1D2227] placeholder-[#747F88] focus:border-[#315F50] outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#315F50] text-white font-bold tracking-wide hover:bg-[#25493D] flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Pilot Request</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
