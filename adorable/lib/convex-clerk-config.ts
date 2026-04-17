type ConvexClerkConfig = {
  convexUrl?: string;
  clerkPublishableKey?: string;
  clerkJwtIssuerDomain?: string;
};

export type ConvexClerkStatus = {
  isClientConfigured: boolean;
  isServerConfigured: boolean;
  shouldEnableClerkProvider: boolean;
  shouldEnableConvexWithClerk: boolean;
  missingClientVars: string[];
  missingServerVars: string[];
};

export function getConvexClerkStatus(config: ConvexClerkConfig): ConvexClerkStatus {
  const missingClientVars: string[] = [];
  if (!config.convexUrl) {
    missingClientVars.push("NEXT_PUBLIC_CONVEX_URL");
  }
  if (!config.clerkPublishableKey) {
    missingClientVars.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  const missingServerVars: string[] = [];
  if (!config.clerkJwtIssuerDomain) {
    missingServerVars.push("CLERK_JWT_ISSUER_DOMAIN");
  }

  return {
    isClientConfigured: missingClientVars.length === 0,
    isServerConfigured: missingServerVars.length === 0,
    shouldEnableClerkProvider: Boolean(config.clerkPublishableKey),
    shouldEnableConvexWithClerk: missingClientVars.length === 0,
    missingClientVars,
    missingServerVars,
  };
}

export function assertRequiredConvexClerkClientEnv(
  config: Pick<ConvexClerkConfig, "convexUrl" | "clerkPublishableKey">,
): { convexUrl: string; clerkPublishableKey: string } {
  const status = getConvexClerkStatus(config);

  if (!status.shouldEnableConvexWithClerk || !config.convexUrl || !config.clerkPublishableKey) {
    const missing = status.missingClientVars.join(", ");
    throw new Error(
      `Missing required Clerk + Convex client env vars: ${missing}. Set them in .env.local before starting the app.`,
    );
  }

  return {
    convexUrl: config.convexUrl,
    clerkPublishableKey: config.clerkPublishableKey,
  };
}
