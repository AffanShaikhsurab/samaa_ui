import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ApiKeyGate } from "@/components/api-key-gate";
import { CustomCursor } from "@/components/custom-cursor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adorable",
  description: "Build beautiful apps with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} min-h-screen antialiased bg-white text-black`}
      >
        <CustomCursor />

        {/* ── Page content (conditionally wrapped) ───────────── */}
        {/*
          /flutter and /flutter/workspace pages have their OWN layout defined in
          app/flutter/layout.tsx — that layout returns children directly.
          Here we place children inside a full-height container so they can do
          fixed/absolute positioning freely.
        */}
        <ApiKeyGate>
          <main className="relative flex min-h-screen flex-col overflow-hidden outline-none">
            {children}
          </main>
        </ApiKeyGate>
      </body>
    </html>
  );
}
