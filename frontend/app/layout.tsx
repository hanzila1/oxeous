import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display face echoes the geometric sans of the Oxeous wordmark / EUDR poster.
const display = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const data = JetBrains_Mono({ subsets: ["latin"], variable: "--font-data", display: "swap" });

export const metadata: Metadata = {
  title: "Oxeous - Ask the Earth. See the evidence.",
  description:
    "Autonomous spatial agent for verified EUDR compliance. Multi-sensor Earth observation (Sentinel-1 SAR, Sentinel-2, forest baselines) checks every plot against the 31 December 2020 cutoff.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/oxeous-emblem.png", type: "image/png" },
    ],
    shortcut: "/favicon.svg?v=2",
    apple: "/oxeous-emblem.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${data.variable}`} suppressHydrationWarning>
      <head>
        {/* Enables scroll-reveal styles only when JS is running, so content is never hidden without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      {/* The cockpit pins itself to the viewport (h-screen overflow-hidden) in its own root,
          so the body must stay free to scroll for the marketing page. */}
      <body className="bg-[#F4F5F6] text-[#1D2227] antialiased">{children}</body>
    </html>
  );
}
