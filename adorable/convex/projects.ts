/**
 * convex/projects.ts
 *
 * All project CRUD operations.
 * Called from Next.js API routes via fetchMutation / fetchQuery (convex/nextjs).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function nowIso() {
  return new Date().toISOString();
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Get a project by its Convex document ID. Ownership is validated by the caller. */
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return ctx.db.get(projectId);
  },
});

/** Get all projects owned by the authenticated Clerk user. */
export const getByOwner = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerClerkId", identity.subject))
      .order("desc")
      .collect();
  },
});

/**
 * Find a project by its session token.
 * Used by API routes when they receive x-builder-session-token header.
 */
export const getBySessionToken = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    return ctx.db
      .query("projects")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Create a new project for the authenticated user. Returns the new project ID. */
export const create = mutation({
  args: {
    name: v.string(),
    initialPrompt: v.string(),
    sessionToken: v.optional(v.string()),
    latestPhase: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("running"),
        v.literal("complete"),
        v.literal("failed"),
      ),
    ),
    runtimeProvider: v.optional(v.string()),
    runMode: v.optional(v.union(v.literal("strict"), v.literal("resilient"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const now = nowIso();
    return ctx.db.insert("projects", {
      ownerClerkId: identity.subject,
      name: args.name,
      initialPrompt: args.initialPrompt,
      sessionToken: args.sessionToken,
      status: args.status ?? "idle",
      latestPhase: args.latestPhase ?? "clarifying",
      runtimeProvider: args.runtimeProvider,
      runMode: args.runMode,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Patch one or more scalar fields on a project. */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    // All fields are optional — only provided ones are patched
    status: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("running"),
        v.literal("complete"),
        v.literal("failed"),
      ),
    ),
    latestPhase: v.optional(v.string()),
    lastError: v.optional(v.string()),
    latestPreviewUrl: v.optional(v.string()),
    requirementsDoc: v.optional(v.any()),
    screenHypotheses: v.optional(v.any()),
    wireframeHtml: v.optional(v.string()),
    clarificationQuestions: v.optional(v.any()),
    discoveryQuestions: v.optional(v.any()),
    discoveryAnswers: v.optional(v.any()),
    currentWalkthroughScreenIndex: v.optional(v.number()),
    checkpoints: v.optional(v.any()),
    requirementsHash: v.optional(v.string()),
    anclHash: v.optional(v.string()),
    flutterHash: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, ...fields }) => {
    const patch: Record<string, unknown> = { updatedAt: nowIso() };
    // Only include defined fields in the patch
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(projectId, patch);
  },
});

/** Update GitHub metadata after a successful repo publish. */
export const updateGitMetadata = mutation({
  args: {
    projectId: v.id("projects"),
    githubRepositoryUrl: v.string(),
    githubRepositoryFullName: v.string(),
    sourceCommitSha: v.string(),
    githubStoragePath: v.optional(v.string()),
    latestPhase: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("running"),
        v.literal("complete"),
        v.literal("failed"),
      ),
    ),
  },
  handler: async (ctx, { projectId, ...fields }) => {
    await ctx.db.patch(projectId, {
      ...fields,
      updatedAt: nowIso(),
    });
  },
});

/** Delete a project (and let cascading cleanup happen at the application layer). */
export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const project = await ctx.db.get(projectId);
    if (!project || project.ownerClerkId !== identity.subject) {
      throw new Error("Project not found or not owned by user.");
    }
    await ctx.db.delete(projectId);
    return true;
  },
});
