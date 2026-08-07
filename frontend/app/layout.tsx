import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oxeous — Ask the Earth. See the evidence.",
  description:
    "A map-first conversational Earth observation platform powered by IBM Granite and IBM–NASA Prithvi-EO 2.0.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden bg-[#F4F5F6] text-[#1D2227] antialiased">
        {children}
      </body>
    </html>
  );
}
