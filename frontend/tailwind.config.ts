import type { Config } from "tailwindcss";

// ── Oxeous Light Steel Palette ────────────────────────────────────────────────
// Main background:     Cloud White   #F4F5F6
// Secondary bg:        Pale Steel    #E3E7EA
// Borders/dividers:    Silver Steel  #C8CFD5
// Disabled/subtle:     Soft Steel    #AAB3BB
// Icons/logo symbol:   Steel Blue-Gray #7A8791
// Secondary text:      Slate Steel   #747F88
// Dark surfaces:       Graphite      #343B42
// Primary text:        Carbon Black  #1D2227
// Accent verified:     Forest Green  #315F50
// Warning medium-risk: Amber         #C58A3A
// Danger high-risk:    Forest Red    #A64B45

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Surface system ──────────────────────────────────────────
        bg:           "#F4F5F6",   // Cloud White — main background
        "bg-2":       "#E3E7EA",   // Pale Steel — secondary background
        border:       "#C8CFD5",   // Silver Steel — borders/dividers
        "border-2":   "#AAB3BB",   // Soft Steel — subtle/disabled
        // ── Text system ─────────────────────────────────────────────
        text:         "#1D2227",   // Carbon Black — primary text
        "text-2":     "#747F88",   // Slate Steel — secondary text
        muted:        "#AAB3BB",   // Soft Steel — disabled/placeholder
        // ── Brand ───────────────────────────────────────────────────
        steel:        "#7A8791",   // Steel Blue-Gray — icons/symbol
        graphite:     "#343B42",   // Graphite — dark surfaces/headers
        // ── Functional accents ──────────────────────────────────────
        verified:     "#315F50",   // Forest green — compliant/verified
        warning:      "#C58A3A",   // Amber — medium risk
        danger:       "#A64B45",   // Muted red — high risk / loss
        // ── Subtle tints ────────────────────────────────────────────
        "verified-bg":  "rgba(49,95,80,0.08)",
        "warning-bg":   "rgba(197,138,58,0.08)",
        "danger-bg":    "rgba(166,75,69,0.08)",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        card: "10px",
        chip: "999px",
      },
      boxShadow: {
        panel: "0 1px 4px rgba(29,34,39,0.08), 0 4px 16px rgba(29,34,39,0.06)",
        "panel-lg": "0 2px 8px rgba(29,34,39,0.10), 0 8px 32px rgba(29,34,39,0.08)",
        header: "0 1px 0 #C8CFD5",
      },
      animation: {
        "fade-in":      "fadeIn 0.15s ease-out",
        "slide-in":     "slideIn 0.2s ease-out",
        "slide-in-left":"slideInLeft 0.2s ease-out",
      },
      keyframes: {
        fadeIn:      { from: { opacity: "0" }, to: { opacity: "1" } },
        slideIn:     { from: { transform: "translateX(16px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        slideInLeft: { from: { transform: "translateX(-16px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
      },
    },
  },
  plugins: [],
};

export default config;
