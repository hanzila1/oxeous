"use client";

import { useState } from "react";
import {
  Calculator,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Euro,
  Coins,
} from "lucide-react";
import { Reveal, fmt } from "@/hooks/useSite";

export default function RegulatoryRoiCalculator({ onPilot }: { onPilot: () => void }) {
  const [turnoverMillions, setTurnoverMillions] = useState<number>(35); // €35M turnover
  const [monthlyContainers, setMonthlyContainers] = useState<number>(60); // 60 containers / month

  // Statutory calculations (Article 25: max fine is 4% of annual Union turnover)
  const maxFineExposure = turnoverMillions * 1_000_000 * 0.04;

  // Demurrage & port dispute delay cost:
  // Optical satellites trigger false alarms on ~32% of cloudy equatorial shipments
  // Average port demurrage + dispute lawyer fees per delayed container = €12,500
  const falseAlarmContainersYearly = Math.round(monthlyContainers * 12 * 0.32);
  const demurrageLossRisk = falseAlarmContainersYearly * 12_500;

  // Total annual financial exposure under legacy text/optical tools
  const totalRiskExposure = maxFineExposure + demurrageLossRisk;

  // Oxeous Savings: Eliminates 99% of false alarms & avoids fines through SAR radar + ground truth
  const estimatedSavings = Math.round(demurrageLossRisk * 0.94);

  return (
    <section id="calculator" className="relative border-t border-line/70 bg-paper py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-mist/60 px-3.5 py-1 font-data text-[11px] font-semibold text-canopy">
            <Scale className="h-3.5 w-3.5" />
            <span>ARTICLE 25 STATUTORY EXPOSURE</span>
          </div>
          <h2 className="mt-3 font-display text-[34px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">
            EUDR Regulatory Risk &amp; Financial ROI Calculator
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
            Non-compliance under EU Regulation 2023/1115 carries penalties of up to{" "}
            <strong className="font-semibold text-ink">4% of annual Union turnover</strong>, confiscation of revenues,
            and severe port demurrage storage disputes. Calculate your balance sheet exposure below.
          </p>
        </Reveal>

        {/* Interactive Calculator Card */}
        <Reveal delay={120} className="mt-10">
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Column: Interactive Input Sliders (6 cols) */}
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <div className="flex items-center justify-between text-[14px] font-data mb-2">
                    <span className="font-semibold text-ink">Annual EU Market Turnover</span>
                    <span className="font-display font-bold text-canopy text-[20px]">
                      €{turnoverMillions}M
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="250"
                    step="5"
                    value={turnoverMillions}
                    onChange={(e) => setTurnoverMillions(Number(e.target.value))}
                    className="w-full h-2.5 bg-mist rounded-lg appearance-none cursor-pointer accent-canopy"
                  />
                  <div className="flex justify-between text-[11px] text-ink-2 font-data mt-1.5">
                    <span>€5M (SME Importer)</span>
                    <span>€100M (Mid-Tier Trader)</span>
                    <span>€250M+ (Multinational)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[14px] font-data mb-2">
                    <span className="font-semibold text-ink">Monthly Regulated Commodity Shipments</span>
                    <span className="font-display font-bold text-canopy text-[20px]">
                      {monthlyContainers} containers
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={monthlyContainers}
                    onChange={(e) => setMonthlyContainers(Number(e.target.value))}
                    className="w-full h-2.5 bg-mist rounded-lg appearance-none cursor-pointer accent-canopy"
                  />
                  <div className="flex justify-between text-[11px] text-ink-2 font-data mt-1.5">
                    <span>10 / mo</span>
                    <span>100 / mo</span>
                    <span>200+ / mo</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-mist/30 p-4.5 space-y-2 text-[12px] text-ink-2">
                  <div className="font-semibold text-ink flex items-center gap-1.5 font-data">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Statutory Fine Model (Article 25(2))
                  </div>
                  <p className="leading-relaxed">
                    Fines are calculated based on a maximum 4% ceiling of annual EU turnover, graduated by the gravity and
                    duration of the infringement.
                  </p>
                </div>
              </div>

              {/* Right Column: Calculated Risk Breakdown (6 cols) */}
              <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-line bg-paper/70 p-6 sm:p-8">
                <div>
                  <div className="font-data text-[11px] uppercase tracking-wider text-canopy font-semibold">
                    Simulated Exposure Balance Sheet
                  </div>

                  {/* 4% Fine Exposure Metric */}
                  <div className="mt-4 flex items-baseline justify-between border-b border-line pb-3">
                    <div>
                      <div className="text-[14px] font-medium text-ink">Article 25 Maximum Statutory Fine</div>
                      <div className="text-[11px] text-ink-2">4% of €{turnoverMillions}M Union turnover</div>
                    </div>
                    <div className="font-display text-[24px] font-bold text-red-700">
                      €{fmt(maxFineExposure)}
                    </div>
                  </div>

                  {/* Demurrage & Dispute Metric */}
                  <div className="mt-3 flex items-baseline justify-between border-b border-line pb-3">
                    <div>
                      <div className="text-[14px] font-medium text-ink">Port Demurrage Dispute Delay Risk</div>
                      <div className="text-[11px] text-ink-2">
                        {falseAlarmContainersYearly} cloudy false-alarm delays @ €12.5k avg.
                      </div>
                    </div>
                    <div className="font-display text-[22px] font-bold text-amber-700">
                      €{fmt(demurrageLossRisk)}
                    </div>
                  </div>

                  {/* Total Exposure */}
                  <div className="mt-4 rounded-2xl bg-white p-4 border border-line">
                    <div className="flex items-center justify-between">
                      <span className="font-data text-[11px] uppercase tracking-wider text-ink-2 font-semibold">
                        Total Annual Capital At Risk
                      </span>
                      <span className="font-display text-[26px] font-bold text-ink">
                        €{fmt(totalRiskExposure)}
                      </span>
                    </div>
                  </div>

                  {/* Oxeous Savings Highlight */}
                  <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display font-semibold text-[15px] text-emerald-950">
                          Annual Demurrage Capital Protected
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          Via Sentinel-1 SAR cloud-penetrating verification
                        </div>
                      </div>
                      <div className="font-display text-[26px] font-bold text-canopy">
                        €{fmt(estimatedSavings)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pilot Action Button */}
                <div className="mt-6 pt-4 border-t border-line">
                  <button
                    onClick={onPilot}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-display text-[14px] font-semibold text-paper hover:bg-canopy transition-colors shadow-sm"
                  >
                    Request Custom Enterprise Risk Audit
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
