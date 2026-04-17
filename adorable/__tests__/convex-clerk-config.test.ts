import { describe, expect, it } from "vitest";
import {
  assertRequiredConvexClerkClientEnv,
  getConvexClerkStatus,
} from "@/lib/convex-clerk-config";

describe("getConvexClerkStatus", () => {
  it("marks client and server configured when all required values exist", () => {
    const status = getConvexClerkStatus({
      convexUrl: "https://example.convex.cloud",
      clerkPublishableKey: "pk_test_123",
      clerkJwtIssuerDomain: "https://dev-example.clerk.accounts.dev",
    });

    expect(status.isClientConfigured).toBe(true);
    expect(status.isServerConfigured).toBe(true);
    expect(status.shouldEnableClerkProvider).toBe(true);
    expect(status.shouldEnableConvexWithClerk).toBe(true);
    expect(status.missingClientVars).toEqual([]);
    expect(status.missingServerVars).toEqual([]);
  });

  it("reports missing client vars when convex or clerk keys are absent", () => {
    const status = getConvexClerkStatus({
      convexUrl: undefined,
      clerkPublishableKey: undefined,
      clerkJwtIssuerDomain: "https://dev-example.clerk.accounts.dev",
    });

    expect(status.isClientConfigured).toBe(false);
    expect(status.shouldEnableClerkProvider).toBe(false);
    expect(status.shouldEnableConvexWithClerk).toBe(false);
    expect(status.missingClientVars).toEqual([
      "NEXT_PUBLIC_CONVEX_URL",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    ]);
    expect(status.isServerConfigured).toBe(true);
  });

  it("reports missing server issuer when not provided", () => {
    const status = getConvexClerkStatus({
      convexUrl: "https://example.convex.cloud",
      clerkPublishableKey: "pk_test_123",
      clerkJwtIssuerDomain: undefined,
    });

    expect(status.isClientConfigured).toBe(true);
    expect(status.isServerConfigured).toBe(false);
    expect(status.shouldEnableClerkProvider).toBe(true);
    expect(status.shouldEnableConvexWithClerk).toBe(true);
    expect(status.missingServerVars).toEqual(["CLERK_JWT_ISSUER_DOMAIN"]);
  });

  it("enables only ClerkProvider when publishable key exists without Convex URL", () => {
    const status = getConvexClerkStatus({
      convexUrl: undefined,
      clerkPublishableKey: "pk_test_123",
      clerkJwtIssuerDomain: "https://dev-example.clerk.accounts.dev",
    });

    expect(status.shouldEnableClerkProvider).toBe(true);
    expect(status.shouldEnableConvexWithClerk).toBe(false);
    expect(status.missingClientVars).toEqual(["NEXT_PUBLIC_CONVEX_URL"]);
  });

  it("throws when required client vars are missing", () => {
    expect(() =>
      assertRequiredConvexClerkClientEnv({
        convexUrl: undefined,
        clerkPublishableKey: "pk_test_123",
      }),
    ).toThrow(/Missing required Clerk \+ Convex client env vars/);
  });

  it("returns validated env vars when both required client vars exist", () => {
    const result = assertRequiredConvexClerkClientEnv({
      convexUrl: "https://example.convex.cloud",
      clerkPublishableKey: "pk_test_123",
    });

    expect(result).toEqual({
      convexUrl: "https://example.convex.cloud",
      clerkPublishableKey: "pk_test_123",
    });
  });
});
