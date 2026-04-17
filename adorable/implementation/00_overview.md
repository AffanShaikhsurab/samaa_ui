# Samaa (adorable) — Implementation Master Guide

> **For AI Agents & Senior Developers:** This folder contains a complete, phase-by-phase implementation roadmap for the `adorable` Flutter-first AI builder. Read `00_overview.md` (this file) first, then the relevant phase file. All docs reference actual paths in the codebase and external documentation links.

---

## 🎯 Product Vision

**Samaa** is a **Flutter-first AI app builder** — the equivalent of Lovable/Bolt.new but targeting mobile-first Flutter apps that compile to real native code. Users type a natural language prompt and get a live, running Flutter web preview within minutes.

**The 80/20 Rule we follow:** Implement the 20% of features that give 80% of user value. Complete each feature end-to-end before moving to the next.

---

## 📊 Current Implementation Status

### ✅ FULLY IMPLEMENTED

| Feature | Location | Completeness |
|---------|----------|-------------|
| **Landing Page** (prompt entry) | `app/flutter/page.tsx` | ✅ Complete |
| **Workspace Page** (chat + preview panel) | `app/flutter/workspace/page.tsx` (1089 lines) | ✅ Complete |
| **E2B Sandbox Flutter Builder** | `lib/flutter-builder.ts`, `lib/e2b/` | ✅ Complete |
| **AI Tool Suite** (bash, readFile, writeFile, flutter build/serve) | `lib/e2b-flutter-tools.ts` | ✅ Complete |
| **Project Store** (file-based JSON CRUD) | `lib/project-store.ts` | ✅ Complete |
| **Build Job Queue** (queued/running/succeeded/failed) | `lib/project-store.ts` | ✅ Complete |
| **Dashboard** (project list, resume, duplicate, delete) | `app/dashboard/page.tsx` | ✅ Complete |
| **Builder Session API** | `app/api/builder/sessions/` | ✅ Complete |
| **Projects API** (CRUD + retry-build + repair + snapshots + duplicate) | `app/api/projects/` | ✅ Complete |
| **Artifact Panel** (research sources, enhancement plan, snapshots) | `app/flutter/workspace/page.tsx` | ✅ Complete |
| **SSE Streaming Events** | `app/flutter/workspace/page.tsx` | ✅ Complete |
| **Snapshot / Restore** | `lib/project-store.ts`, `app/api/projects/[projectId]/snapshots/` | ✅ Complete |
| **Retry Build / Repair** | `lib/project-store.ts`, `app/api/projects/[projectId]/retry-build/` | ✅ Complete |
| **Clerk Auth** (middleware, layout) | `middleware.ts`, `app/layout.tsx` | ✅ Complete |
| **Convex Client Provider** | `components/convex-client-provider.tsx` | ✅ Wired up |
| **Multi-LLM Provider** (OpenAI, Anthropic, Groq, NVIDIA) | `lib/llm-provider.ts` | ✅ Complete |
| **API Key Gate** | `components/api-key-gate.tsx` | ✅ Complete |
| **Custom Cursor** | `components/custom-cursor.tsx` | ✅ Complete |
| **Sky Background** | `components/sky-background.tsx` | ✅ Complete |
| **Phase Trace Log** | Workspace page | ✅ Complete |
| **Browser Bar** (back/forward/reload/URL bar in preview) | Workspace page | ✅ Complete |
| **Mobile responsive** (chat/preview toggle) | Workspace page | ✅ Complete |

### ⚠️ PARTIALLY IMPLEMENTED

| Feature | Location | Gap |
|---------|----------|-----|
| **Convex Database** | `convex/auth.config.ts` only | Schema not defined, no tables, no queries/mutations — only auth config exists |
| **E2B Build Template** | `lib/e2b/build-template.ts` | Template building works but sandbox warm-up time (30-90s) is a UX problem |
| **Templates Gallery** | No file | Mentioned in nav but not built |
| **Settings Page** | No file | API key dialog exists as modal only |
| **Profile Page** | No file | Clerk auth exists but no profile UI |

### ❌ NOT YET IMPLEMENTED

| Feature | Priority | Phase |
|---------|----------|-------|
| **Convex Database Migration** (replace file-based store) | 🔴 Critical | Phase 1 |
| **Real-time project status** (live updates via Convex subscriptions) | 🔴 Critical | Phase 1 |
| **Templates Gallery page** | 🟡 High | Phase 2 |
| **Settings Page** | 🟡 High | Phase 2 |
| **Profile Page** | 🟡 High | Phase 2 |
| **GitHub Integration** (export/sync code) | 🟠 Medium | Phase 3 |
| **One-click Deploy** (Vercel/Netlify) | 🟠 Medium | Phase 3 |
| **Stripe Billing** | 🟢 Low | Phase 4 |
| **Visual Editor** (click-to-edit) | 🟢 Low | Phase 4 |

---

## 🏗️ Architecture Overview

```
adorable/
├── app/                        # Next.js 16 App Router
│   ├── flutter/                # Builder landing + workspace
│   │   ├── page.tsx            # Landing (prompt input)
│   │   ├── layout.tsx          # Flutter-specific layout
│   │   └── workspace/
│   │       └── [projectId]/
│   │           └── page.tsx    # Main builder workspace (1089 lines)
│   ├── dashboard/
│   │   └── page.tsx            # Project dashboard
│   └── api/
│       ├── builder/sessions/   # Session create + message SSE stream
│       └── projects/           # Project CRUD + build jobs
├── convex/                     # Convex backend (NEEDS EXPANSION)
│   └── auth.config.ts          # Clerk integration only
├── lib/                        # Server-side business logic
│   ├── project-store.ts        # File-based project + job store
│   ├── flutter-builder.ts      # E2B sandbox management
│   ├── e2b-flutter-tools.ts    # AI tool set for the LLM agent
│   ├── llm-provider.ts         # Multi-LLM abstraction
│   └── e2b/                    # E2B agent runner + Dockerfile
└── components/                 # React components
    ├── api-key-gate.tsx
    ├── flutter-preview.tsx
    └── assistant-ui/
```

---

## 📋 Phase Summary

| Phase | Title | Priority | Duration |
|-------|-------|----------|----------|
| [Phase 1](./01_phase1_convex_migration.md) | Convex DB Migration & Real-time | 🔴 Critical | 3-4 days |
| [Phase 2](./02_phase2_ux_pages.md) | Templates, Settings, Profile Pages | 🟡 High | 2-3 days |
| [Phase 3](./03_phase3_github_deploy.md) | GitHub Export & One-click Deploy | 🟠 Medium | 3-4 days |
| [Phase 4](./04_phase4_billing_visual.md) | Billing & Visual Editor | 🟢 Low | 5-7 days |

---

## 🔑 Key Design Decisions

1. **E2B for sandboxing** — Chosen over Daytona (also present) because E2B offers faster cold-start times, a public preview URL out of the box, and a Flutter web template (`flutter-web-base-v1`) already built.

2. **File-based project store** — Currently `lib/project-store.ts` uses `.samaa/projects.json`. This MUST be migrated to Convex for multi-user support, real-time updates, and data durability.

3. **Clerk for Auth** — Already integrated. Convex Auth config is wired. The gap is the Convex schema / functions which are not yet written.

4. **SSE for streaming** — All LLM output is streamed via Server-Sent Events. The client parses `BuilderEvent` types in real-time.

5. **Multi-LLM** — `lib/llm-provider.ts` supports OpenAI (gpt-5.2-codex), Anthropic (claude-sonnet-4), Groq, NVIDIA. Provider is runtime-configurable.

---

## 📚 Key References

- [Convex Docs](https://docs.convex.dev) — Database, auth, real-time queries
- [E2B Docs](https://e2b.dev/docs) — Sandbox templates, file ops, preview URLs
- [Clerk Docs](https://clerk.com/docs) — Auth, webhooks, user management
- [AI SDK Docs](https://sdk.vercel.ai) — `streamText`, `tool`, SSE streaming
- [Next.js 16 Docs](https://nextjs.org/docs) — App Router, Route Handlers
- [Vercel Deploy API](https://vercel.com/docs/rest-api) — For Phase 3 deployment
