import type { Config } from "tailwindcss";

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
        // -- Classic light steel surface system (Cockpit) ----------------
        bg:           "#F4F5F6",   // Cloud White - main background
        "bg-2":       "#E3E7EA",   // Pale Steel - secondary background
        border:       "#C8CFD5",   // Silver Steel - borders/dividers
        "border-2":   "#AAB3BB",   // Soft Steel - subtle/disabled
        text:         "#1D2227",   // Carbon Black - primary text
        "text-2":     "#747F88",   // Slate Steel - secondary text
        muted:        "#AAB3BB",   // Soft Steel - disabled/placeholder
        steel:        "#7A8791",   // Steel Blue-Gray - icons/symbol
        graphite:     "#343B42",   // Graphite - dark surfaces/headers
        verified:     "#315F50",   // Forest green - compliant/verified
        warning:      "#C58A3A",   // Amber - medium risk
        danger:       "#A64B45",   // Muted red - high risk / loss
        "verified-bg":"rgba(49,95,80,0.08)",
        "warning-bg": "rgba(197,138,58,0.08)",
        "danger-bg":  "rgba(166,75,69,0.08)",

        // -- Space / Radar Copernicus Command Palette (Landing & Visuals) --
        space: {
          DEFAULT:      "#060A10",   // Deep Void
          elevated:     "#0A101A",   // Subtle elevated surface
          card:         "#0F1724",   // Card surface
          hover:        "#162234",   // Hover highlight
          border:       "#1B283D",   // Precision border
          "border-light":"#2A3D5B",  // Active border
        },
        radar: {
          cyan:         "#00F2FE",   // Synthetic Aperture Radar beam
          emerald:      "#10B981",   // Article 2(5) compliant green
          amber:        "#F59E0B",   // Warning / advisory alert
          red:          "#EF4444",   // Forest loss cutoff violation
          purple:       "#8B5CF6",   // Cadastral overlay
        },
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
        "glow-cyan": "0 0 25px rgba(0, 242, 254, 0.25)",
        "glow-emerald": "0 0 25px rgba(16, 185, 129, 0.25)",
        "glow-card": "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      },
      transitionTimingFunction: {
        panel: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      animation: {
        "fade-in":       "fadeIn 0.15s ease-out",
        "slide-in":      "slideIn 0.2s ease-out",
        "slide-in-left": "slideInLeft 0.2s ease-out",
        "radar-sweep":   "radarSweep 5s linear infinite",
        "pulse-slow":    "pulseSlow 3s ease-in-out infinite",
        "beacon":        "beacon 2.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
      },
      keyframes: {
        fadeIn:       { from: { opacity: "0" }, to: { opacity: "1" } },
        slideIn:      { from: { transform: "translateX(16px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        slideInLeft:  { from: { transform: "translateX(-16px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        radarSweep: {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%":      { opacity: "0.5", transform: "scale(1.03)" },
        },
        beacon: {
          "0%":   { transform: "scale(0.8)", opacity: "0.9" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
