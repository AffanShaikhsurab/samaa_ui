# Phase C: Convex Migration and Auth Hardening

## Outcome
Move from local JSON persistence to durable Convex-backed storage with strict ownership checks and safe migration.

## Scope
- Convex schema for all core entities.
- Clerk identity propagation to Convex.
- Dual-write migration from .samaa/projects.json.
- Backfill, parity checks, cutover, rollback.

## Why This Phase Is Critical
Current storage in lib/project-store.ts is file-based and not suitable for multi-instance reliability.

## Required Data Model in Convex
Tables (or equivalent collections):
- users
- projects
- builderSessions
- buildJobs
- artifacts
- snapshots
- deployments

Index requirements:
- projects by owner and updatedAt
- buildJobs by projectId and status
- artifacts by projectId and createdAt
- snapshots by projectId and createdAt

## Migration Playbook (Mandatory)
1. Prepare:
- Add Convex schema and query/mutation/action modules.
- Introduce repository interface with two implementations:
  - FileStoreAdapter
  - ConvexStoreAdapter
2. Dual-write window:
- Writes go to both stores.
- Reads continue from file store.
3. Backfill:
- Import all existing .samaa/projects.json data.
- Record migration metadata and checksums.
 - Use bounded batch size and adaptive pacing based on API latency.
4. Parity validation:
- Count parity for each entity type.
- Sample parity for nested structures.
- Principal-aware parity checks for ownership and access decisions.
5. Read switch:
- Enable CONVEX_READ_PRIMARY flag.
6. Rollback trigger:
- If mismatch rate above threshold, switch reads back to file store.
7. Cutover completion:
- Disable file-store writes only after stable window.

Migration load controls:
- Limit concurrent migrating projects.
- Apply global migration write budget with token bucket.
- Pause migration when queue depth or API p95 crosses thresholds.
- Resume migration only after health recovers for configured window.

## Repository Changes
- lib/project-store.ts split into abstraction plus adapters.
- convex/schema.ts and convex/functions/*.ts added.
- app/api/projects/** and app/api/builder/sessions/** moved to adapter interface.
- components/convex-client-provider.tsx verified against Clerk flow.

## Authz Requirements
- Every mutation verifies project ownership from auth identity.
- Every read verifies project ownership from auth identity.
- Service-level jobs use scoped service auth, never end-user token reuse.
- Session token checks remain but are additive, not replacement for ownership checks.
- A single shared policy layer must be used by both FileStoreAdapter and ConvexStoreAdapter during dual-write.

## Acceptance Criteria
- Zero data-loss in migration rehearsal.
- Authz tests pass for all mutating routes.
- Authz tests pass for all read routes.
- Dashboard and workspace read from Convex without behavior regression.
- Rollback can be executed in under 10 minutes.
- Migration does not breach operational SLO guardrails.

## Testing
- Migration dry run in staging from snapshot fixture.
- Ownership enforcement tests for all project route handlers.
- Concurrency tests for duplicate mutation requests.

## Rollback Plan
- Keep file-store adapter live for one release cycle.
- Toggle CONVEX_READ_PRIMARY to false for emergency rollback.
