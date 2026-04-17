# Phase D: Durable Execution Control Plane

## Outcome
Make build execution resilient to crashes, retries, duplicates, and provider issues.

## Scope
- Durable queue and job lifecycle semantics.
- Lease and heartbeat ownership.
- Retry with backoff and dead-letter queue.
- Worker abstraction across E2B and Daytona.
- Cost guardrails.
- Backpressure and fair-scheduling controls.

## Job State Model
Required states:
- queued
- leased
- running
- retry_scheduled
- dead_letter
- succeeded
- failed
- canceled

Required transitions:
- queued -> leased -> running -> succeeded|failed|canceled
- running -> retry_scheduled (for retriable errors)
- retry_scheduled -> queued
- running or retry_scheduled -> dead_letter after retry budget exhausted

Queue admission and fairness:
- Per-project active job cap.
- Global queue depth cap.
- Per-provider concurrency cap.
- Overload response with retry-after semantics.
- Fair scheduling across tenants to avoid starvation.

## Required Semantics
- Lease owner identity is persisted.
- Heartbeat interval and stale timeout are configurable.
- Sweeper process reconciles stale leased or running jobs.
- Idempotency key required for external trigger endpoints.
- External trigger endpoints require authenticated callers and replay protection.
- Retries use exponential backoff with full jitter and per-project retry budgets.
- Sweeper must be index-backed and paginated to avoid full-store scans.
- Heartbeats should use adaptive cadence and jitter to avoid synchronized write bursts.
- Global retry budget must cap cluster-wide retry throughput during provider incidents.

External trigger authenticity specification:
- Require signed request headers with key id, timestamp, nonce, and signature.
- Signature input must cover method, path, timestamp, nonce, and body hash.
- Enforce strict timestamp skew window and nonce replay cache TTL.
- Reject signature mismatches using constant-time compare.
- Emit rejection telemetry for invalid signature, stale timestamp, replay nonce, and quota violations.
- Support key rotation with overlapping active keys.

## Repository Changes
- Extract queue semantics from lib/project-store.ts into control-plane module.
- Add worker orchestrator module in lib/build-orchestrator.ts.
- Add provider interface for sandbox lifecycle.
- Update app/api/projects/[projectId]/retry-build/route.ts and repair route to return deterministic queue responses.

## Cost and Safety Guardrails
- Per-job max runtime.
- Per-project daily retry budget.
- Sandbox TTL auto-termination.
- Max artifact payload size.
- Request rate limiting for trigger endpoints.
- Circuit breaker thresholds for provider failures.
- Sandbox isolation baseline: non-root, no host mounts, egress allowlist, metadata block.
- Sandbox runtime hardening: capability drop profile, syscall filter, and read-only rootfs where feasible.
- Enforce provider fallback isolation parity before routing cross-provider failover.

## Acceptance Criteria
- No orphaned running jobs after sweeper executes.
- Worker crash recovery resumes or re-queues safely within RTO target.
- Duplicate trigger requests do not create duplicate executions.
- Dead-letter jobs are visible in dashboard diagnostics.
- Queue remains bounded under burst load with defined shed behavior.
- Trigger endpoints reject unauthenticated, replayed, and over-limit requests.

## Testing
Unit:
- Job state transition validity.
- Retry budget enforcement.

Integration:
- Simulated worker crash during running state.
- Lease timeout and sweeper recovery.
- Provider fallback from E2B to Daytona for configured failure classes.

E2E:
- Retry and repair behavior under injected build failure.

## Rollback Plan
- Keep legacy direct execution path behind CONTROL_PLANE_V2 flag.
- On incident, disable flag and route jobs through existing pipeline while preserving event logs.
