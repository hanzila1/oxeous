"use client";

import React, { useState } from "react";
import { X, Send, CheckCircle2, ShieldCheck, Building2, Mail, User, Layers } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0A101A] border border-[#1B283D] p-6 sm:p-8 shadow-2xl overflow-hidden font-mono text-xs">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#00F2FE]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#747F88] hover:text-white hover:bg-[#1B283D] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/20 border border-[#10B981] flex items-center justify-center text-[#10B981] mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Pilot Application Received</h3>
            <p className="text-[#AAB3BB] leading-relaxed">
              Thank you, <strong>{formData.name || "partner"}</strong>. Our spatial-legal engineering team 
              will review your parcel volume and reach out to <strong>{formData.email}</strong> within 24 hours to schedule your onboarding.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="px-6 py-2 rounded-lg bg-[#0F1724] border border-[#1B283D] text-white hover:border-[#00F2FE]"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-[#00F2FE] text-[11px] mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>ENTERPRISE COHORT 2026-2027</span>
              </div>
              <h3 className="text-xl font-bold text-white">Request Oxeous Enterprise Pilot</h3>
              <p className="text-[#747F88] mt-1 text-[11px] leading-relaxed">
                Connect your supply-chain GPS coordinates to our Copernicus Sentinel-1 radar verification pipeline.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[#C8CFD5] mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-[#747F88]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Elena Rostova"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#060A10] border border-[#1B283D] rounded-lg pl-9 pr-3 py-2 text-white placeholder-[#747F88] focus:border-[#00F2FE] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#C8CFD5] mb-1">Corporate Work Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#747F88]" />
                  <input
                    type="email"
                    required
                    placeholder="name@commodity-trader.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#060A10] border border-[#1B283D] rounded-lg pl-9 pr-3 py-2 text-white placeholder-[#747F88] focus:border-[#00F2FE] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#C8CFD5] mb-1">Organization / Trading House *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-[#747F88]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Continental Cocoa Trading B.V."
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-[#060A10] border border-[#1B283D] rounded-lg pl-9 pr-3 py-2 text-white placeholder-[#747F88] focus:border-[#00F2FE] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#C8CFD5] mb-1">Target Commodity</label>
                  <select
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    className="w-full bg-[#060A10] border border-[#1B283D] rounded-lg px-3 py-2 text-white focus:border-[#00F2FE] outline-none"
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
                  <label className="block text-[#C8CFD5] mb-1">Parcel Volume</label>
                  <select
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="w-full bg-[#060A10] border border-[#1B283D] rounded-lg px-3 py-2 text-white focus:border-[#00F2FE] outline-none"
                  >
                    <option>&lt; 1,000 parcels</option>
                    <option>1,000 - 10,000 parcels</option>
                    <option>10,000 - 100,000 parcels</option>
                    <option>&gt; 100,000 parcels</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#C8CFD5] mb-1">Notes / Current Bottleneck (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dealing with 35% false deforestation alerts in Ivory Coast cooperatives..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#060A10] border border-[#1B283D] rounded-lg p-2.5 text-white placeholder-[#747F88] focus:border-[#00F2FE] outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#10B981] text-[#060A10] font-bold uppercase tracking-wider hover:brightness-110 shadow-glow-cyan flex items-center justify-center gap-2 transition-all"
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
