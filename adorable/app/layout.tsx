import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ApiKeyGate } from "@/components/api-key-gate";
import { ConvexClientProvider } from "@/components/convex-client-provider";
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
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";

  /**
   * If both Convex + Clerk are configured, wrap with ConvexClientProvider
   * (which enables real-time queries against Convex + Clerk auth).
   * Otherwise fall back to just the Clerk auth layer — the app still works,
   * real-time Convex features are just unavailable.
   */
  const hasConvex = Boolean(convexUrl && clerkPublishableKey);

  const appContent = hasConvex ? (
    <ConvexClientProvider convexUrl={convexUrl} clerkPublishableKey={clerkPublishableKey}>
      <CustomCursor />
      <ApiKeyGate>
        <main className="relative flex min-h-screen flex-col overflow-hidden outline-none">
          {children}
        </main>
      </ApiKeyGate>
    </ConvexClientProvider>
  ) : (
    <>
      <CustomCursor />
      <ApiKeyGate>
        <main className="relative flex min-h-screen flex-col overflow-hidden outline-none">
          {children}
        </main>
      </ApiKeyGate>
    </>
  );

  return (
    <html suppressHydrationWarning lang="en" className="h-full overflow-hidden">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} min-h-screen antialiased bg-white text-black`}
      >
        {/*
         * ClerkProvider must wrap the entire tree so that:
         *   - useAuth() / useUser() work in Client Components
         *   - auth() works in Server Components and API Routes (via middleware)
         *   - SignIn / SignUp / UserButton components render correctly
         *
         * We pass publishableKey explicitly so it doesn't crash when the env var
         * is momentarily missing during hot-reload.
         */}
        <ClerkProvider publishableKey={clerkPublishableKey}>
          {appContent}
        </ClerkProvider>
      </body>
    </html>
  );
}
