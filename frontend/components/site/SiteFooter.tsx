"use client";

import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { asset, CONTACT_EMAIL } from "@/lib/site";

export default function SiteFooter({ onPilot }: { onPilot: () => void }) {
  return (
    <footer className="border-t border-line bg-paper text-ink">
      {/* Clean Pre-Footer CTA */}
      <div className="border-b border-line/80 bg-mist/40 py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center lg:px-10">
          <div>
            <span className="font-data text-[11.5px] font-semibold uppercase tracking-[0.18em] text-canopy">
              Ready before December 31, 2026
            </span>
            <h3 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
              Verify your supply chain in 30 seconds.
            </h3>
            <p className="mt-1.5 max-w-xl text-[15.5px] text-ink-2">
              Test Oxeous on a real shipment from your suppliers or explore the interactive spatial cockpit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onPilot}
              className="rounded-full bg-ink px-6 py-3.5 font-display text-[14px] font-semibold text-paper transition-colors hover:bg-canopy"
            >
              Request a pilot
            </button>
            <Link
              href="/cockpit/"
              className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-6 py-3.5 font-display text-[14px] font-semibold text-ink transition-colors hover:bg-mist"
            >
              Open the cockpit
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Poster Co-Branding Bar (Matches bottom of docs/EUDR Regulation.png) */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          {/* Oxeous | Imagine Cup By Microsoft for Startups */}
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" aria-label="Oxeous home" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset("/oxeous-logo-tight.png")} alt="Oxeous" className="h-[32px] w-auto" />
            </Link>
            <span className="h-9 w-px bg-ink/25" aria-hidden />
            <div>
              <div className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-ink">
                Imagine Cup
              </div>
              <div className="mt-1 text-[12px] font-medium text-ink-2">
                By Microsoft for Startups
              </div>
            </div>
          </div>

          {/* Navigation & Direct Contact */}
          <div className="flex flex-wrap items-center gap-6 text-[14px] font-medium text-ink-2">
            <a href="#regulation" className="hover:text-ink transition-colors">
              Regulation
            </a>
            <a href="#platform" className="hover:text-ink transition-colors">
              Platform
            </a>
            <a href="#demo" className="hover:text-ink transition-colors">
              Demo
            </a>
            <a href="#impact" className="hover:text-ink transition-colors">
              Impact
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Oxeous%20Pilot%20Inquiry`}
              className="inline-flex items-center gap-1.5 text-ink hover:text-canopy transition-colors"
            >
              <Mail className="h-4 w-4 text-canopy" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-line/70 pt-6 flex flex-col sm:flex-row items-center justify-between text-[12px] text-ink-2 gap-3">
          <span>&copy; {new Date().getFullYear()} Oxeous. Autonomous spatial compliance for EUDR.</span>
          <span>Powered by Microsoft · Copernicus Sentinel Earth Observation</span>
        </div>
      </div>
    </footer>
  );
}
