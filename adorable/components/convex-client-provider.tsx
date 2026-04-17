"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

type ConvexClientProviderProps = {
  children: ReactNode;
  convexUrl: string;
  clerkPublishableKey?: string;
};

export function ConvexClientProvider({
  children,
  convexUrl,
}: ConvexClientProviderProps) {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
