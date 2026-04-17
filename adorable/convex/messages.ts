/**
 * convex/messages.ts
 *
 * Chat messages associated with a project.
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
      .query("messages")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();
  },
});

export const add = mutation({
  args: {
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("messages", {
      ...args,
      createdAt: nowIso(),
    });
  },
});

/** Add multiple messages in a single mutation (used when syncing from file store). */
export const addMany = mutation({
  args: {
    projectId: v.id("projects"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        createdAt: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { projectId, messages }) => {
    const now = nowIso();
    for (const msg of messages) {
      await ctx.db.insert("messages", {
        projectId,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt ?? now,
      });
    }
  },
});
