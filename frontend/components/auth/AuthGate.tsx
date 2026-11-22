"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Clock,
  User,
  KeyRound,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { asset } from "@/lib/site";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, hydrated, hydrate, signIn, signUp } = useAuthStore();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Independent form state so switching panes feels instant and never flickers values
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [regName, setRegName] = useState("");
  const [regOrg, setRegOrg] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAccessCode, setRegAccessCode] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceLoginPreview, setForceLoginPreview] = useState(false);

  useEffect(() => {
    hydrate();
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "1" || params.get("login") === "true") {
      setForceLoginPreview(true);
    }
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-paper text-ink">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-canopy border-t-transparent" />
          <span className="font-data text-xs uppercase tracking-widest text-ink-2">
            Verifying Oxeous Session...
          </span>
        </div>
      </div>
    );
  }

  if (user && !forceLoginPreview) {
    return <>{children}</>;
  }

  const isRegister = mode === "register";

  const switchMode = (next: "login" | "register") => {
    if (next === mode) return;
    // Carry email across if user already typed it
    if (next === "register" && loginEmail && !regEmail) setRegEmail(loginEmail);
    if (next === "login" && regEmail && !loginEmail) setLoginEmail(regEmail);
    setError(null);
    setMode(next);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginEmail.trim() || !loginPassword) {
      setError("Please enter your work email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await signIn(loginEmail, loginPassword);
      if (!res.ok) setError(res.error || "Invalid email or password.");
      else setForceLoginPreview(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (regName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!regEmail.trim()) {
      setError("Please enter your work email.");
      return;
    }
    if (regPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (regAccessCode.trim().length < 3) {
      setError("Please enter your B2B enterprise access code.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await signUp({
        fullName: regName,
        email: regEmail,
        password: regPassword,
        organization: regOrg,
        accessCode: regAccessCode,
      });
      if (!res.ok) setError(res.error || "Could not create account.");
      else setForceLoginPreview(false);
    } finally {
      setSubmitting(false);
    }
  };

  const pwStrength =
    regPassword.length === 0 ? 0 : regPassword.length < 8 ? 1 : regPassword.length < 12 ? 2 : 3;

  return (
    <div className="site-root relative flex min-h-screen w-full overflow-hidden bg-paper text-ink lg:h-screen">
      {/* Subtle Topographic Contour Paper */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          backgroundImage: `url(${asset("/site/contours.svg")})`,
          backgroundSize: "cover",
        }}
      />

      {/* LEFT ARCHITECTURAL VALUE PANEL — Locked to 100vh, completely isolated from right card */}
      <div className="relative hidden h-full w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset("/site/hero-canopy-bleed.webp")}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ink/92 via-ink/78 to-canopy/70"
        />

        {/* Top Brand + Back Link */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-paper backdrop-blur transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Oxeous
          </Link>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 font-data text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
            EU 2023/1115 Ready
          </span>
        </div>

        {/* Center Outcome-Driven Value Proposition */}
        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/oxeous-emblem.png")}
              alt="Oxeous"
              className="h-10 w-10 brightness-0 invert opacity-90"
            />
            <span className="font-display text-2xl font-bold tracking-tight text-white">Oxeous</span>
          </div>

          <h1 className="font-display text-[38px] font-bold leading-[1.08] tracking-[-0.03em] text-white">
            Ask the Earth.
            <br />
            <span className="text-emerald-300">Clear EU customs in 30 seconds.</span>
          </h1>

          <p className="text-[15px] leading-relaxed text-paper/80">
            Turn raw supplier farm coordinates into customs-ready EU Due Diligence Statements—protecting your
            shipments from port detention, manual GIS bottlenecks, and up to 4% EU turnover fines.
          </p>

          <div className="space-y-3.5 border-t border-white/15 pt-6 text-[13.5px] text-paper/90">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span>
                <strong className="font-semibold text-white">30-second autonomous audits</strong> — verify 100s of
                supplier plots with zero GIS analysts required
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span>
                <strong className="font-semibold text-white">Salvage clean harvests</strong> — surgically isolate
                boundary overlaps instead of rejecting entire farms
              </span>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span>
                <strong className="font-semibold text-white">5-year legal audit proof</strong> — cryptographically
                signed EU TRACES NT filings backed by ground truth
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Footnote */}
        <div className="relative z-10 flex items-center justify-between text-[11.5px] text-paper/60">
          <span>Oxeous Spatial Intelligence</span>
          <span className="font-data">EUDR COMPLIANCE · TRACES NT</span>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION WORKSPACE — Independently scrolled, zero impact on left panel */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8 sm:px-10">
        {/* Mobile Back Link */}
        <div className="mb-5 flex w-full max-w-[460px] items-center justify-between lg:hidden">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Back to Oxeous
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/oxeous-logo-tight.png")} alt="Oxeous" className="h-6 w-auto" />
        </div>

        {/* Fixed-Height Stable Card: ZERO vertical jump, pure GPU horizontal glide! */}
        <div className="w-full max-w-[460px] rounded-[28px] border border-line/80 bg-white/92 p-7 shadow-[0_24px_64px_-24px_rgba(18,48,42,0.22)] backdrop-blur-xl sm:p-8">
          {/* Stable Header */}
          <div className="mb-5">
            <div className="font-data text-[10.5px] font-semibold uppercase tracking-[0.16em] text-canopy">
              Operator Access
            </div>
            <h2 className="mt-1 font-display text-[27px] font-bold tracking-[-0.03em] text-ink">
              {!isRegister ? "Sign in to your cockpit" : "Create an Oxeous account"}
            </h2>
            <p className="mt-1 min-h-[38px] text-[13.5px] leading-snug text-ink-2">
              {!isRegister
                ? "Enter your credentials to access your audits, salvaged plots, and EU filings."
                : "Set up your operator workspace to start verifying shipments in seconds."}
            </p>
          </div>

          {/* Pure GPU Sliding Pill Switcher */}
          <div className="relative mb-5 grid grid-cols-2 rounded-full border border-line bg-paper p-1">
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-ink shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
              style={{ transform: isRegister ? "translateX(100%)" : "translateX(0%)" }}
            />
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`relative z-10 rounded-full py-2 text-[13px] font-semibold transition-colors duration-300 ${
                !isRegister ? "text-paper" : "text-ink-2 hover:text-ink"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`relative z-10 rounded-full py-2 text-[13px] font-semibold transition-colors duration-300 ${
                isRegister ? "text-paper" : "text-ink-2 hover:text-ink"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-[12.5px] text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PURE GPU HORIZONTAL SLIDING FORM VIEWPORT (ZERO vertical reflow!) */}
          <div className="overflow-hidden">
            <div
              className="flex w-[200%] items-start transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
              style={{ transform: isRegister ? "translateX(-50%)" : "translateX(0%)" }}
            >
              {/* PANE 1: SIGN IN */}
              <form
                onSubmit={handleLogin}
                aria-hidden={isRegister}
                className={`w-1/2 pr-2 transition-opacity duration-300 ${
                  !isRegister ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="flex min-h-[296px] flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-ink">Work Email</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/70" />
                        <input
                          type="email"
                          required={!isRegister}
                          tabIndex={!isRegister ? 0 : -1}
                          autoComplete="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="operator@company.eu"
                          className="w-full rounded-xl border border-line bg-paper/70 py-2.5 pl-10 pr-4 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-2/50 focus:border-canopy focus:bg-white focus:ring-2 focus:ring-canopy/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-ink">Password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/70" />
                        <input
                          type={showLoginPw ? "text" : "password"}
                          required={!isRegister}
                          tabIndex={!isRegister ? 0 : -1}
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full rounded-xl border border-line bg-paper/70 py-2.5 pl-10 pr-11 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-2/50 focus:border-canopy focus:bg-white focus:ring-2 focus:ring-canopy/15"
                        />
                        <button
                          type="button"
                          tabIndex={!isRegister ? 0 : -1}
                          onClick={() => setShowLoginPw((v) => !v)}
                          aria-label={showLoginPw ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-2 hover:text-ink"
                        >
                          {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    tabIndex={!isRegister ? 0 : -1}
                    className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-display text-[14.5px] font-semibold text-paper shadow-[0_12px_28px_-10px_rgba(18,48,42,0.55)] transition-colors hover:bg-canopy disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in to Cockpit
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* PANE 2: CREATE ACCOUNT (Same compact height via 2-column Name + Org row!) */}
              <form
                onSubmit={handleRegister}
                aria-hidden={!isRegister}
                className={`w-1/2 pl-2 transition-opacity duration-300 ${
                  isRegister ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="flex min-h-[296px] flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[12px] font-semibold text-ink">Full Name</label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2/70" />
                          <input
                            type="text"
                            required={isRegister}
                            tabIndex={isRegister ? 0 : -1}
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="Elena Vance"
                            className="w-full rounded-xl border border-line bg-paper/70 py-2.5 pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-2/50 focus:border-canopy focus:bg-white focus:ring-2 focus:ring-canopy/15"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[12px] font-semibold text-ink">
                          Organization <span className="font-normal text-ink-2">(Opt.)</span>
                        </label>
                        <div className="relative">
                          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2/70" />
                          <input
                            type="text"
                            tabIndex={isRegister ? 0 : -1}
                            value={regOrg}
                            onChange={(e) => setRegOrg(e.target.value)}
                            placeholder="Nordic Traders"
                            className="w-full rounded-xl border border-line bg-paper/70 py-2.5 pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-2/50 focus:border-canopy focus:bg-white focus:ring-2 focus:ring-canopy/15"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[12px] font-semibold text-ink">Work Email</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2/70" />
                        <input
                          type="email"
                          required={isRegister}
                          tabIndex={isRegister ? 0 : -1}
                          autoComplete="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="operator@company.eu"
                          className="w-full rounded-xl border border-line bg-paper/70 py-2.5 pl-10 pr-4 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-2/50 focus:border-canopy focus:bg-white focus:ring-2 focus:ring-canopy/15"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[12px] font-semibold text-ink">Password</label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2/70" />
                          <input
                            type={showRegPw ? "text" : "password"}
                            required={isRegister}
                            tabIndex={isRegister ? 0 : -1}
                            autoComplete="new-password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="8+ chars"
                            className="w-full rounded-xl border border-line bg-paper/70 py-2.5 pl-9 pr-9 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-2/50 focus:border-canopy focus:bg-white focus:ring-2 focus:ring-canopy/15"
                          />
                          <button
                            type="button"
                            tabIndex={isRegister ? 0 : -1}
                            onClick={() => setShowRegPw((v) => !v)}
                            aria-label={showRegPw ? "Hide password" : "Show password"}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-2 hover:text-ink"
                          >
                            {showRegPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[12px] font-semibold text-ink">Access Code</label>
                        <div className="relative">
                          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2/70" />
                          <input
                            type="text"
                            required={isRegister}
                            tabIndex={isRegister ? 0 : -1}
                            value={regAccessCode}
                            onChange={(e) => setRegAccessCode(e.target.value.toUpperCase())}
                            placeholder="B2B invite code"
                            className="w-full rounded-xl border border-line bg-paper/70 py-2.5 pl-9 pr-3 font-data text-[12.5px] uppercase tracking-wider text-ink outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-2/50 focus:border-canopy focus:bg-white focus:ring-2 focus:ring-canopy/15"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fixed-height strength bar slot so typing never shifts card height */}
                    <div className="-mt-2 flex h-3.5 items-center gap-1.5">
                      {regPassword.length > 0 && (
                        <>
                          {[1, 2, 3].map((lvl) => (
                            <span
                              key={lvl}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                pwStrength >= lvl
                                  ? lvl === 1
                                    ? "bg-danger"
                                    : lvl === 2
                                    ? "bg-warning"
                                    : "bg-canopy"
                                  : "bg-line"
                              }`}
                            />
                          ))}
                          <span className="ml-1 font-data text-[10px] text-ink-2">
                            {pwStrength === 1 ? "Too short" : pwStrength === 2 ? "Good" : "Strong"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    tabIndex={isRegister ? 0 : -1}
                    className="group mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-display text-[14.5px] font-semibold text-paper shadow-[0_12px_28px_-10px_rgba(18,48,42,0.55)] transition-colors hover:bg-canopy disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account & Enter
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer Switch */}
          <div className="mt-5 border-t border-line/70 pt-4 text-center text-[12.5px] text-ink-2">
            {!isRegister ? (
              <>
                New to Oxeous?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold text-canopy hover:underline"
                >
                  Create an operator account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-canopy hover:underline"
                >
                  Sign in instead
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
