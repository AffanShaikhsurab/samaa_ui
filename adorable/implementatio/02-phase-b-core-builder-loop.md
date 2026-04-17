# Phase B: Reliable Core Builder Loop (80% Value Gate)

## Outcome
Make the run/resume/retry/repair/snapshot flow deterministic, user-trustworthy, and complete.

## Scope
- Deterministic state machine for builder lifecycle.
- Idempotent commands and resume safety.
- User-facing recovery UX for failed and stalled states.
- Artifact lineage and trace integrity.
- Authenticated and ownership-verified resume/read flows.

## State Machine (Required)
States:
- idle
- clarifying
- planning
- generating
- building
- fixing
- verifying
- complete
- failed
- canceled

Rules:
- Only valid transitions allowed.
- Every transition emits an event and log entry.
- Transition failure reverts to last stable state with reason.

## Repository Changes
1. Add state machine module:
- lib/builder-state-machine.ts
2. Refactor workspace state handling:
- app/flutter/workspace/page.tsx
3. Harden message endpoint behavior:
- app/api/builder/sessions/[id]/messages/route.ts
4. Add cancel endpoint:
- app/api/projects/[projectId]/cancel/route.ts
5. Add idempotency key handling for interactive actions.

## Must-Fix Gaps
- Explicit cancel path does not exist.
- Some phase updates are event-driven but not centrally validated.
- In-flight recovery UX can still present ambiguous running states.
- Resume and artifact reads must not permit tokenless or cross-tenant access in production.

## UX Completion Requirements
- Failed state always shows one primary recovery action and one secondary action.
- Running state always displays phase plus elapsed time.
- Retry and repair actions must be disabled when incompatible with current state.

## Acceptance Criteria
- Resume after refresh recovers correct state and messages in over 99% of test runs.
- Duplicate submit events do not duplicate BuildJob creation.
- Cancel action stops further execution and updates UI under 2 seconds p95.
- No UI limbo state without mapped backend state.
- Resume requires valid signed token bound to identity and project.

## Testing
Unit:
- Transition table validation.
- Idempotency behavior for retry/repair/cancel.

Integration:
- Session resume with token and without token.
- Retry then repair flow with mocked failures.
- Cross-tenant resume and artifact read attempts are rejected.

E2E:
- Prompt to preview success path.
- Prompt fail then repair success path.
- Prompt run then user cancel path.

## Rollback Plan
- Keep legacy transition handling behind feature flag BUILDER_STATE_MACHINE_V2.
- If defects appear, switch flag off and route through existing behavior while preserving logs.
