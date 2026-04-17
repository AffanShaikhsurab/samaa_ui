# Phase 1 — Convex Database Migration & Real-Time Updates

## Why This Is Critical

The current project store (`lib/project-store.ts`) is a **file-based JSON store** at `.samaa/projects.json`. This works for a single developer but has critical flaws:

- **No multi-user support** — all users share one JSON file
- **No real-time updates** — dashboard doesn't live-update when a build completes
- **No data durability** — file can be lost on server restart / redeploy
- **Race conditions** — write-lock queue is a hack; Convex eliminates this entirely
- **No Clerk user association** — projects are not tied to authenticated users

The Convex client provider is already wired in `app/layout.tsx` and auth config exists in `convex/auth.config.ts`, but **no schema or functions exist** in the `convex/` folder.

---

## 📁 Files To Create / Modify

### New Files in `convex/`

```
convex/
├── schema.ts          [NEW] — Database schema
├── users.ts           [NEW] — User queries & mutations
├── projects.ts        [NEW] — Project CRUD queries & mutations
├── buildJobs.ts       [NEW] — Build job queue queries & mutations
├── artifacts.ts       [NEW] — Artifact & snapshot mutations
└── auth.config.ts     [EXISTS] — Already wired to Clerk
```

### Modified Files

- `lib/project-store.ts` → becomes a thin adapter calling Convex HTTP client (or replaced by direct Convex calls from API routes)
- `components/convex-client-provider.tsx` → verify it passes auth token
- `app/dashboard/page.tsx` → switch `useQuery` from REST fetch to Convex `useQuery`
- `app/flutter/workspace/[projectId]/page.tsx` → add real-time status subscription

---

## 🗄️ Schema Design (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Users ──────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Billing / usage
    creditsused: v.optional(v.number()),
    plan: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise"))),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // ── Projects ───────────────────────────────────────────────
  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    initialPrompt: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed")
    ),
    latestPhase: v.string(),           // BuilderPhase string
    latestPreviewUrl: v.optional(v.string()),
    runtimeProvider: v.optional(v.string()),
    lastError: v.optional(v.string()),
    // Session token for API-level auth (builder session)
    sessionToken: v.optional(v.string()),
    // E2B sandbox ID for resume (optional, may expire)
    sandboxId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // ── Project Messages ────────────────────────────────────────
  messages: defineTable({
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  })
    .index("by_project", ["projectId"]),

  // ── Build Jobs ─────────────────────────────────────────────
  buildJobs: defineTable({
    projectId: v.id("projects"),
    action: v.union(
      v.literal("generate"),
      v.literal("retry-build"),
      v.literal("repair")
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled")
    ),
    message: v.string(),
    attempt: v.number(),
    idempotencyKey: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    finishedAt: v.optional(v.string()),
    leaseAt: v.optional(v.string()),
    terminalReason: v.optional(v.string()),
    errorNote: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"]),

  // ── Artifacts ──────────────────────────────────────────────
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
  })
    .index("by_project", ["projectId"]),

  // ── Snapshots ──────────────────────────────────────────────
  snapshots: defineTable({
    projectId: v.id("projects"),
    phase: v.string(),
    prompt: v.string(),
    previewUrl: v.optional(v.string()),
    outcome: v.union(
      v.literal("success"),
      v.literal("failed"),
      v.literal("partial")
    ),
    filesManifest: v.array(v.object({
      path: v.string(),
      size: v.optional(v.number()),
    })),
  })
    .index("by_project", ["projectId"]),
});
```

**Key design decisions:**
- `users.clerkId` is indexed so we can look up users by Clerk's `userId` on every authenticated request
- `projects.userId` is indexed so dashboard queries only return the current user's projects
- `buildJobs` uses an `idempotencyKey` to prevent duplicate job creation on network retries
- All text fields use `v.string()` — no structured JSON blobs (except `filesManifest` which is typed)

---

## 👤 User Module (`convex/users.ts`)

```typescript
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Called from Clerk webhook OR on first login
export const upsertUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      plan: "free",
      creditsUsed: 0,
    });
  },
});

// Returns the current user from Convex auth identity
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});
```

---

## 📁 Projects Module (`convex/projects.ts`)

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Live-subscribable query — dashboard auto-updates!
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const project = await ctx.db.get(projectId);
    if (!project) return null;

    return project;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    initialPrompt: v.string(),
    runtimeProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const projectId = await ctx.db.insert("projects", {
      userId: user._id,
      name: args.name,
      initialPrompt: args.initialPrompt,
      status: "idle",
      latestPhase: "clarifying",
      runtimeProvider: args.runtimeProvider,
      sessionToken: crypto.randomUUID(),
    });

    return await ctx.db.get(projectId);
  },
});

export const updateStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: v.string(),
    latestPhase: v.optional(v.string()),
    latestPreviewUrl: v.optional(v.string()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...patch } = args;
    await ctx.db.patch(projectId, patch);
    return await ctx.db.get(projectId);
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Cascade delete related records
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);

    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    for (const a of artifacts) await ctx.db.delete(a._id);

    await ctx.db.delete(projectId);
  },
});
```

---

## 🔄 Migration Strategy

### Step 1: Add Convex Functions (no breaking changes)

1. Create `convex/schema.ts` with the schema above
2. Create `convex/users.ts`, `convex/projects.ts`, `convex/buildJobs.ts`, `convex/artifacts.ts`
3. Run `npx convex dev` to sync schema to Convex cloud
4. Verify schema is pushed: `npx convex dashboard`

### Step 2: Dual-Write Period

Modify API routes to write to BOTH file store and Convex:

```typescript
// In app/api/builder/sessions/route.ts — add Convex write alongside file store
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// After creating file-based project:
await convex.mutation(api.projects.create, {
  name: project.name,
  initialPrompt: project.initialPrompt,
});
```

### Step 3: Migrate Dashboard to useQuery

```typescript
// app/dashboard/page.tsx — replace fetch() with Convex subscription
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  // Auto-updates in real-time when a build completes!
  const projects = useQuery(api.projects.listByUser);
  // ...
}
```

### Step 4: Remove File Store

Once Convex is the source of truth, delete `lib/project-store.ts` and update all imports.

---

## ⚙️ Environment Variables Required

Add to `.env.local`:

```bash
# Convex (already partially set)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-deploy-key  # for server-side Convex HTTP client

# Clerk JWT (already in auth.config.ts)
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev
```

---

## 🔗 References

- [Convex Schema Docs](https://docs.convex.dev/database/schemas)
- [Convex Clerk Integration](https://docs.convex.dev/auth/clerk)
- [Convex React useQuery Hook](https://docs.convex.dev/client/react)
- [ConvexHttpClient (server-side)](https://docs.convex.dev/client/javascript/convex-in-functions)
- [Convex Mutations](https://docs.convex.dev/functions/mutations)
- [Convex Indexes](https://docs.convex.dev/database/indexes/indexes-and-query-perf)

---

## ✅ Verification Checklist

- [ ] `npx convex dev` succeeds without errors
- [ ] `npx convex dashboard` shows all 6 tables
- [ ] Creating a project via `/flutter` creates a Convex record
- [ ] Dashboard page shows projects from Convex `useQuery`
- [ ] Dashboard auto-refreshes when build status changes (no manual refresh needed)
- [ ] Deleting a project cascades and removes messages + artifacts
- [ ] Two different users see only their own projects
