/**
 * convex/artifacts.ts
 *
 * Build artifacts (ANCL reports, wireframes, GitHub repos, etc.) attached to a project.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function nowIso() {
  return new Date().toISOString();
}

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return ctx.db
      .query("artifacts")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    kind: v.string(),
    title: v.optional(v.string()),
    path: v.optional(v.string()),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    provider: v.optional(v.string()),
    sourceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("artifacts", {
      ...args,
      createdAt: nowIso(),
    });
  },
});

/**
 * Upsert an artifact — if one with the same kind+title already exists for this project,
 * update it in place. Otherwise insert a new one. Keeps a max of 200 artifacts per project.
 */
export const upsert = mutation({
  args: {
    projectId: v.id("projects"),
    kind: v.string(),
    title: v.optional(v.string()),
    path: v.optional(v.string()),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    provider: v.optional(v.string()),
    sourceType: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, kind, title, ...rest }) => {
    // Look for existing artifact with same kind + title
    const existing = await ctx.db
      .query("artifacts")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .filter((q) => q.and(q.eq(q.field("kind"), kind), q.eq(q.field("title"), title)))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { kind, title, ...rest });
      return existing._id;
    }

    return ctx.db.insert("artifacts", {
      projectId,
      kind,
      title,
      ...rest,
      createdAt: nowIso(),
    });
  },
});
