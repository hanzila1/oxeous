"use client";

import React, { useState } from "react";
import {
  Calculator,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Euro,
  Scale,
} from "lucide-react";

interface RegulatoryCalculatorProps {
  onOpenPilotModal: () => void;
}

export default function RegulatoryCalculator({ onOpenPilotModal }: RegulatoryCalculatorProps) {
  const [turnoverMillions, setTurnoverMillions] = useState<number>(35); // €35M turnover
  const [monthlyContainers, setMonthlyContainers] = useState<number>(60); // 60 containers / mo

  // EUDR Article 25: Maximum fine is 4% of annual Union turnover
  const maxFineExposure = turnoverMillions * 1_000_000 * 0.04;

  // Demurrage & port dispute delay cost:
  // Optical satellites trigger false alarms on ~32% of cloudy tropical shipments
  // Average port demurrage + dispute lawyer fees per delayed container = €12,500
  const falseAlarmContainersYearly = Math.round(monthlyContainers * 12 * 0.32);
  const demurrageLossRisk = falseAlarmContainersYearly * 12_500;

  // Total annual financial exposure under legacy tools
  const totalRiskExposure = maxFineExposure + demurrageLossRisk;

  // Oxeous Savings: Eliminates 99% of false alarms & avoids fines
  const estimatedSavings = Math.round(demurrageLossRisk * 0.94);

  return (
    <section id="calculator" className="py-24 bg-[#060A10] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1724] border border-[#1B283D] text-xs font-mono text-[#F59E0B] mb-4">
            <Scale className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>ARTICLE 25 STATUTORY EXPOSURE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            EUDR Regulatory Risk &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#00F2FE] to-[#10B981]">
              Financial ROI Calculator
            </span>
          </h2>

          <p className="mt-4 text-base text-[#AAB3BB] leading-relaxed">
            Under Regulation (EU) 2023/1115 Article 25, non-compliant shipments face confiscation 
            and fines of <strong>up to 4% of annual Union turnover</strong>. Calculate your enterprise risk exposure below.
          </p>
        </div>

        {/* Interactive Calculator Card */}
        <div className="mt-12 max-w-5xl mx-auto rounded-2xl bg-[#0A101A] border border-[#1B283D] p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 6 cols: Sliders */}
            <div className="lg:col-span-6 space-y-6">
              {/* Slider 1: Annual EU Turnover */}
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-[#C8CFD5]">ANNUAL EU COMMODITY TURNOVER:</span>
                  <span className="text-[#00F2FE] font-bold text-sm">
                    €{turnoverMillions} Million / year
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="250"
                  step="5"
                  value={turnoverMillions}
                  onChange={(e) => setTurnoverMillions(Number(e.target.value))}
                  className="w-full h-2 bg-[#1B283D] rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#747F88] mt-1">
                  <span>€5M (Mid-market)</span>
                  <span>€100M</span>
                  <span>€250M+ (Enterprise Trader)</span>
                </div>
              </div>

              {/* Slider 2: Monthly Container Ingestion */}
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="text-[#C8CFD5]">MONTHLY IMPORT CONTAINERS:</span>
                  <span className="text-[#10B981] font-bold text-sm">
                    {monthlyContainers} containers / month
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={monthlyContainers}
                  onChange={(e) => setMonthlyContainers(Number(e.target.value))}
                  className="w-full h-2 bg-[#1B283D] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#747F88] mt-1">
                  <span>10 containers</span>
                  <span>150 containers</span>
                  <span>300+ containers</span>
                </div>
              </div>

              {/* Legal Reference Note */}
              <div className="p-3.5 rounded-xl bg-[#060A10] border border-[#1B283D] text-[11px] font-mono text-[#AAB3BB] leading-relaxed">
                <span className="text-[#F59E0B]">⚖️ Statutory Rule:</span> Article 25(2) mandates that fines 
                effectively deprive operators of economic benefits gained and scale proportionally up to <strong>4% of annual Union turnover</strong>.
              </div>
            </div>

            {/* Right 6 cols: Calculated Exposure & ROI Dashboard */}
            <div className="lg:col-span-6 space-y-4 font-mono text-xs">
              <div className="p-5 rounded-2xl bg-[#0F1724] border border-[#1B283D] space-y-4 shadow-xl">
                <div>
                  <div className="text-[10px] text-[#747F88] uppercase tracking-wider">
                    Statutory Fine Exposure (Article 25)
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#EF4444] mt-1">
                    €{maxFineExposure.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#AAB3BB]">
                    Maximum 4% turnover penalty on non-compliant filings
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1B283D]">
                  <div className="text-[10px] text-[#747F88] uppercase tracking-wider">
                    Optical False Alarm Delay Risk
                  </div>
                  <div className="text-xl font-bold text-[#F59E0B] mt-1">
                    €{demurrageLossRisk.toLocaleString()} / year
                  </div>
                  <div className="text-[10px] text-[#AAB3BB]">
                    ~{falseAlarmContainersYearly} containers paralyzed at port due to cloud cover
                  </div>
                </div>

                <div className="pt-4 border-t border-[#10B981]/30 bg-[#10B981]/5 -mx-5 -mb-5 p-5 rounded-b-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[#10B981] font-bold uppercase tracking-wider">
                        Protected Value with Oxeous
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                        €{estimatedSavings.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[#10B981]">
                        Salvaged demurrage + zero statutory fine exposure
                      </div>
                    </div>

                    <button
                      onClick={onOpenPilotModal}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#00F2FE] text-[#060A10] font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-glow-emerald transition-all"
                    >
                      Book Pilot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

