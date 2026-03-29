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
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full overflow-hidden overscroll-none antialiased cursor-none bg-white text-black`}
      >
        {/* ── Global background layers (always present) ───────── */}
        <div className="fixed inset-0 z-[-1] bg-white">
          <div
            className="w-full h-full bg-cover bg-center no-repeat saturate-[0.5] brightness-[1.1] contrast-[0.95]"
            style={{ backgroundImage: "url('/bg.png')" }}
          />
        </div>
        <div className="full-blur-overlay" />
        <div className="grain-layer" />
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
