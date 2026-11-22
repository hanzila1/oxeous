"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Command, Lock, Menu, Search, X } from "lucide-react";
import { asset } from "@/lib/site";
import { useAuthStore } from "@/lib/auth";

const LINKS = [
  { label: "Regulation", href: "#regulation" },
  { label: "Platform", href: "#platform" },
  { label: "Spatial Stage", href: "#demo" },
  { label: "Impact & ROI", href: "#impact" },
];

export default function SiteNav({
  onPilot,
  onCommand,
}: {
  onPilot: () => void;
  onCommand: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onCommand();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCommand]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 pt-3.5">
      <div className="mx-auto max-w-[1340px] px-6 sm:px-8 lg:px-12">
        <div
          className={`flex h-[54px] items-center justify-between rounded-full border px-4 sm:px-5 transition-shadow duration-300 ${
            scrolled || open
              ? "border-ink/15 bg-white/95 shadow-[0_12px_36px_-12px_rgba(18,48,42,0.22)] backdrop-blur-xl"
              : "border-line bg-white/90 shadow-[0_4px_20px_-6px_rgba(18,48,42,0.12)] backdrop-blur-md"
          }`}
        >
          <div className="flex items-center gap-7">
            <Link href="/" aria-label="Oxeous home" className="flex items-center pl-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset("/oxeous-logo-tight.png")} alt="Oxeous" className="h-[24px] w-auto" />
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3.5 py-1.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-paper hover:text-ink"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={onCommand}
              title="Open Command Menu (Ctrl+K / ⌘K)"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-canopy/50 hover:bg-white hover:text-ink"
            >
              <Search className="h-3.5 w-3.5 text-canopy" />
              <span className="hidden lg:inline">Quick jump</span>
              <kbd className="inline-flex items-center gap-0.5 rounded border border-line bg-white px-1.5 py-0.5 font-data text-[10px] font-semibold text-ink shadow-sm">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            <button
              type="button"
              onClick={onPilot}
              className="rounded-full px-3.5 py-1.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper"
            >
              Request a pilot
            </button>

            <Link
              href={user ? "/cockpit/" : "/cockpit/?login=1"}
              className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-paper shadow-sm transition-all hover:bg-canopy"
            >
              <Lock className="h-3 w-3 opacity-80" />
              <span>{user ? "Open cockpit" : "Client sign in"}</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              onClick={onCommand}
              aria-label="Open command menu"
              className="rounded-full border border-line bg-paper p-2 text-ink"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-ink"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-2 rounded-3xl border border-line bg-white/95 px-6 pb-5 pt-3 shadow-xl backdrop-blur-xl md:hidden">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block border-b border-line/60 py-3 text-[15px] font-medium text-ink"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={user ? "/cockpit/" : "/cockpit/?login=1"}
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-paper"
              >
                <Lock className="h-3.5 w-3.5 opacity-80" />
                {user ? "Open cockpit" : "Client sign in"} <ArrowUpRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPilot();
                }}
                className="rounded-full border border-line bg-paper px-5 py-3 text-[14px] font-medium text-ink"
              >
                Request a pilot
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
