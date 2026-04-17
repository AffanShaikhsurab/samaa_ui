import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Users ────────────────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise"))),
    creditsUsed: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // ── Projects ─────────────────────────────────────────────────────────────
  projects: defineTable({
    ownerClerkId: v.string(),
    name: v.string(),
    initialPrompt: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    latestPhase: v.string(),
    latestPreviewUrl: v.optional(v.string()),
    runtimeProvider: v.optional(v.string()),
    lastError: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
    runMode: v.optional(v.union(v.literal("strict"), v.literal("resilient"))),

    // ── Hashes / fingerprints ─────────────────────────────────────────────
    requirementsHash: v.optional(v.string()),
    anclHash: v.optional(v.string()),
    flutterHash: v.optional(v.string()),
    compilerFingerprint: v.optional(v.string()),
    modelConfigFingerprint: v.optional(v.string()),

    // ── GitHub metadata ───────────────────────────────────────────────────
    // For samaa-storage: points to users/{clerkId}/{projectId}/ folder URL
    githubRepositoryUrl: v.optional(v.string()),
    githubRepositoryFullName: v.optional(v.string()),
    sourceCommitSha: v.optional(v.string()),
    githubStoragePath: v.optional(v.string()),   // users/{clerkId}/{projectId}

    // ── Remediation ───────────────────────────────────────────────────────
    remediationBranch: v.optional(v.string()),
    remediationPrUrl: v.optional(v.string()),

    // ── Discovery pipeline state ──────────────────────────────────────────
    // All stored as v.any() because they are large, deeply nested JSON objects
    // that mirror the TypeScript types in lib/project-store.ts
    requirementsDoc: v.optional(v.any()),
    screenHypotheses: v.optional(v.any()),
    wireframeHtml: v.optional(v.string()),
    clarificationQuestions: v.optional(v.any()),
    discoveryQuestions: v.optional(v.any()),
    discoveryAnswers: v.optional(v.any()),
    currentWalkthroughScreenIndex: v.optional(v.number()),

    // ── Checkpoint system ─────────────────────────────────────────────────
    // Partial<Record<BuilderPhase, CheckpointRecord>> serialised as plain JSON
    checkpoints: v.optional(v.any()),

    // ── Timestamps ────────────────────────────────────────────────────────
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner", ["ownerClerkId"])
    .index("by_owner_status", ["ownerClerkId", "status"])
    .index("by_session_token", ["sessionToken"]),

  // ── Messages ─────────────────────────────────────────────────────────────
  messages: defineTable({
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.string(),
  }).index("by_project", ["projectId"]),

  // ── Build Jobs ────────────────────────────────────────────────────────────
  buildJobs: defineTable({
    projectId: v.id("projects"),
    action: v.union(
      v.literal("generate"),
      v.literal("retry-build"),
      v.literal("repair"),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("leased"),
      v.literal("running"),
      v.literal("retry_scheduled"),
      v.literal("dead_letter"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    message: v.string(),
    attempt: v.number(),
    leaseOwnerId: v.optional(v.string()),
    leaseVersion: v.number(),
    retryCount: v.number(),
    maxRetries: v.number(),
    idempotencyKey: v.optional(v.string()),
    nextAttemptAt: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    finishedAt: v.optional(v.string()),
    leaseAt: v.optional(v.string()),
    terminalReason: v.optional(v.string()),
    errorNote: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"]),

  // ── Artifacts ─────────────────────────────────────────────────────────────
  artifacts: defineTable({
    projectId: v.id("projects"),
    kind: v.string(),
    title: v.optional(v.string()),
    path: v.optional(v.string()),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    provider: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_project", ["projectId"]),

  // ── Snapshots ─────────────────────────────────────────────────────────────
  snapshots: defineTable({
    projectId: v.id("projects"),
    phase: v.string(),
    prompt: v.string(),
    previewUrl: v.optional(v.string()),
    outcome: v.union(
      v.literal("success"),
      v.literal("failed"),
      v.literal("partial"),
    ),
    filesManifest: v.array(
      v.object({
        path: v.string(),
        size: v.optional(v.number()),
      }),
    ),
    createdAt: v.string(),
  }).index("by_project", ["projectId"]),

  // ── Deployments ───────────────────────────────────────────────────────────
  deployments: defineTable({
    projectId: v.id("projects"),
    environment: v.union(v.literal("preview"), v.literal("production")),
    commitHash: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("rolled_back"),
    ),
    provider: v.union(v.literal("vercel"), v.literal("cloudflare")),
    url: v.optional(v.string()),
    createdBy: v.string(),
    rolledBackFromDeploymentId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_project", ["projectId"]),
});
