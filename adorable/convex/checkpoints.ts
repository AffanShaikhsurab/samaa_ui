/**
 * convex/checkpoints.ts
 *
 * Phase checkpoint sealing and retrieval.
 * Checkpoints are stored as a JSON object on the project document itself
 * (Partial<Record<BuilderPhase, CheckpointRecord>>) rather than as a
 * separate table, because reads are always project-scoped and the total
 * size is small (7 phases × ~100 bytes each).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function nowIso() {
  return new Date().toISOString();
}

/** Seal a pipeline phase checkpoint. Idempotent — preserves the original completedAt. */
export const seal = mutation({
  args: {
    projectId: v.id("projects"),
    phase: v.string(),
    dataHash: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, phase, dataHash }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const existing = (project.checkpoints as Record<string, { phase: string; completedAt: string; dataHash?: string }> | undefined) ?? {};
    const existingEntry = existing[phase];

    const updated = {
      ...existing,
      [phase]: {
        phase,
        completedAt: existingEntry?.completedAt ?? nowIso(),
        dataHash: dataHash ?? existingEntry?.dataHash,
      },
    };

    await ctx.db.patch(projectId, { checkpoints: updated, updatedAt: nowIso() });
  },
});

/** Clear a checkpoint so the phase can be retried. */
export const clear = mutation({
  args: {
    projectId: v.id("projects"),
    phase: v.string(),
  },
  handler: async (ctx, { projectId, phase }) => {
    const project = await ctx.db.get(projectId);
    if (!project?.checkpoints) return;

    const updated = { ...(project.checkpoints as Record<string, unknown>) };
    delete updated[phase];
    await ctx.db.patch(projectId, { checkpoints: updated, updatedAt: nowIso() });
  },
});

/** Get all checkpoint records for a project. */
export const getAll = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    return (project?.checkpoints as Record<string, unknown> | undefined) ?? {};
  },
});
