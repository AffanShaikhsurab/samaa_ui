# Samaa Builder 20/80 Implementation Guide

## Purpose
This folder is the execution playbook for other coding agents. The goal is to ship the smallest set of complete features that delivers most product value.

Guiding rule:
- Implement roughly 20% of features that drive 80% of value.
- Each selected feature must be end-to-end complete: UI, API, authz, reliability, observability, tests, docs.

## Current State (Repository Truth)
Implemented now:
- Prompt entry and session creation flow in app/flutter/page.tsx and app/api/builder/sessions/route.ts.
- Workspace chat plus preview with SSE event handling in app/flutter/workspace/page.tsx.
- Project dashboard and project CRUD in app/dashboard/page.tsx and app/api/projects/**.
- Retry, repair, snapshots, restore workflows in app/api/projects/[projectId]/**.
- Build job lease and stale recovery logic in lib/project-store.ts.
- Runtime provider abstraction files in lib/e2b-provider.ts and lib/daytona-provider.ts.

Partially implemented or missing for production:
- Durable multi-instance persistence (still file-based .samaa/projects.json).
- Strong API and SSE contract versioning and compatibility tests.
- Queue semantics are partially in file store, not in durable shared store.
- Cancellation path, hard cost guardrails, and dead-letter lifecycle.
- Deploy and share governance model (preview lifecycle, secret management, audit trail).

## Scope Decision (80% Value Gate)
Must complete first:
1. Reliable builder loop: run, resume, retry, repair, snapshot, restore with deterministic states.
2. Durable data and authz on Convex plus Clerk, replacing local JSON for shared reliability.
3. Durable build control plane with queue, lease, heartbeat, retries, DLQ, and recovery.
4. Production deploy/share loop with secure secrets and rollback.

Deferred until above is complete:
- Advanced visual editor.
- Broad template marketplace.
- Collaboration and enterprise extras.

## Phase Index
- Phase A: 01-phase-a-architecture-baseline.md
- Phase B: 02-phase-b-core-builder-loop.md
- Phase C: 03-phase-c-convex-migration-auth.md
- Phase D: 04-phase-d-control-plane.md
- Phase E: 05-phase-e-deploy-share-governance.md
- Phase F: 06-phase-f-differentiators.md

Supporting docs:
- service-decision-matrix.md
- docs-reading-ladder.md

## Non-Functional Targets
- Chat first token p95 under 2.5s for healthy providers.
- Build queued-to-running p95 under 3s.
- Baseline template preview-ready p95 under 90s.
- Resume success rate above 99%.
- Unauthorized mutating endpoint access blocked at 100% test pass.
- Unauthorized read endpoint access blocked at 100% test pass.
- Zero Critical and High security findings before release gate.

## Overload and Backpressure Rules
- Enforce per-project active job cap and global queue depth cap.
- Enforce per-provider concurrency cap and circuit breaker thresholds.
- On overload, reject new requests with explicit retry-after semantics.
- Use fair scheduling across tenants to avoid starvation.

## Contract Governance
All new API and SSE changes must:
- Include a versioned schema file in code (OpenAPI for HTTP and JSON schema for events).
- Be backward compatible for one minor version window.
- Include provider and consumer contract tests.

## Delivery Checklist For Every Feature
- UX flow defined with failure states and recovery behavior.
- Data model and ownership defined.
- Authorization checks for every read and write, including resume and artifact fetch flows.
- Metrics, logs, traces added.
- Unit, integration, and e2e coverage updated.
- Rollback path and migration fallback documented.
- Sandbox boundary controls documented (egress allowlist, ephemeral credentials, isolation profile).

## Official References Used
This plan was grounded in official docs (see docs-reading-ladder.md), including Convex auth and platform docs, Clerk-Convex integration docs, E2B docs, Daytona docs, Vercel docs, Cloudflare docs, Supabase docs, Firebase docs, and Neon docs.

Note for agents: the repository already includes context7 MCP config in .mcp.json. Use context7 in your environment to fetch latest provider docs before implementing each phase.
