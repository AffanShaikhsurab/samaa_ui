# Phase A: Architecture Baseline and Decision Records

## Outcome
Create the shared architecture contract before feature work so multiple agents can implement consistently.

## Scope
Deliver these artifacts first:
1. Canonical domain model.
2. API and SSE event schema baseline with versioning policy.
3. Threat model and trust boundaries.
4. SLO and observability baseline.
5. ADR set for service decisions.

## Domain Model (Target)
Core entities:
- User
- Project
- BuilderSession
- BuildJob
- Artifact
- Snapshot
- DeploymentRecord

Ownership rules:
- Project belongs to one user/org.
- BuilderSession belongs to one project.
- BuildJob belongs to one project and one initiating action.
- Artifact and Snapshot belong to one project.

Retention defaults:
- Trace and transient tool logs: 30 days.
- BuildJob history: 90 days.
- Snapshots: 30 latest per project (configurable).

## Required Repository Changes
1. Add schema files:
- docs/contracts/http/openapi.yaml
- docs/contracts/events/builder-events.v1.schema.json
2. Add ADRs:
- docs/adr/ADR-001-service-selection.md
- docs/adr/ADR-002-contract-versioning.md
- docs/adr/ADR-003-security-boundaries.md
3. Add observability policy:
- docs/observability/builder-slos.md

## Existing Code To Align
- app/api/builder/sessions/route.ts
- app/api/builder/sessions/[id]/messages/route.ts
- app/api/projects/route.ts
- app/flutter/workspace/page.tsx

## Compatibility Policy
- HTTP and SSE contracts are additive-only for minor versions.
- Removing or renaming fields requires major version.
- New event types must be ignored safely by old clients.

## Security Baseline
Trust zones:
- Browser UI (untrusted)
- Next API routes (trusted boundary with auth checks)
- Convex backend functions (trusted domain logic)
- Sandbox runtime (high-risk isolation boundary)

Minimum controls:
- No secret values emitted to artifacts or SSE events.
- Tool call outputs pass through redaction before persistence.
- Every mutating endpoint enforces identity and ownership.
- Every read endpoint enforces identity and ownership, including resume, artifacts, snapshots, and event streams.
- Production resume requires short-lived signed tokens bound to userId, projectId, and sessionId.
- External callbacks must include replay-resistant authenticity checks.

Sandbox baseline controls:
- Non-root runtime, no host mounts, and no docker socket exposure.
- Outbound network allowlist with metadata endpoint blocking.
- Ephemeral per-job credentials with post-run credential revocation.
- Isolation policy parity across provider fallback paths.

Secret lifecycle controls:
- Credential TTL and rotation policy documented per provider.
- Secret access audit logging required.
- Redaction validation tests for logs, traces, SSE, and artifacts.

## Observability Baseline
Metrics:
- builder_first_token_ms
- build_queue_wait_ms
- build_runtime_ms
- preview_ready_ms
- build_job_recovery_count
- unauthorized_request_count

Logs required fields:
- requestId, userId, projectId, sessionId, jobId, phase, provider, status, errorCode

## Exit Criteria
- All selected endpoints and events have versioned schemas.
- ADRs approved and linked from master guide.
- Threat model reviewed with no unresolved Critical/High issues.
- SLO document includes alert thresholds and ownership.
- Read and write authorization matrices are complete and approved.

## Test Requirements
- Contract tests for HTTP and SSE payloads.
- Schema compatibility tests for previous minor version.
- Security tests for authz rejection paths.
- Negative tests for cross-tenant read attempts.
- Replay and signature validation tests for callbacks.
