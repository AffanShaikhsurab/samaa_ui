# Phase 1A - Convex Cutover Checklist and Rollout Playbook

## Purpose
This document is the execution runbook for Phase 1 persistence cutover from file-store (`.samaa/projects.json`) to Convex.

This is an operations-only playbook. It does not prescribe new product features.

## Scope
In scope:
- Data migration and cutover sequencing.
- Dual-write/read-switch behavior.
- Parity tooling requirements.
- Authorization and ownership invariants.
- Canary rollout, rollback, and verification gates.

Out of scope:
- New UX features.
- Non-Phase-1 architectural redesign.

## Global Guardrails
- Use freeze windows only (no unrelated deploys during migration).
- Fail closed on auth uncertainty.
- No irreversible step without backup checkpoint.
- Each stage has explicit entry criteria, exit criteria, and abort criteria.
- Incident commander has authority to force rollback at any stage.

Absolute migration hard stops (apply in all stages):
- p95 latency must stay <= 800ms.
- p99 latency must stay <= 1500ms.
- 5xx rate must stay <= 1.0%.
- timeout rate must stay <= 0.5%.

Stage checks must satisfy both:
- Relative regression threshold versus control cohort.
- Absolute hard-stop threshold above.

## Roles (RACI)
- Migration Lead: executes steps, maintains decision log.
- Incident Commander: owns go/no-go and rollback decisions.
- SRE On-Call: observability, alert triage, runtime safety.
- Security Approver: authz and boundary signoff.
- Product Approver: business acceptance and window approval.

## Required Flags and Runtime Controls
- `CONVEX_READ_PRIMARY`: when true, read path uses Convex as authoritative source.
- `CONVEX_DUAL_WRITE`: when true, writes target both file-store and Convex.
- `CONVEX_BACKFILL_ENABLED`: enables migration backfill workers.
- `CONVEX_MIGRATION_CANARY_PERCENT`: canary traffic percentage for read switch.
- `CONVEX_MIGRATION_FREEZE`: blocks non-migration mutating admin operations.

Security controls for flag changes:
- Flag changes require RBAC-restricted operator role.
- Flag changes require MFA.
- Authority-switch flags (`CONVEX_READ_PRIMARY`, `CONVEX_DUAL_WRITE`) require two-person approval.
- Every flag change must be written to immutable audit log with actor, time, previous value, and reason.

Recommended defaults by stage are defined below.

## Consistency Contract by Stage
| Stage | Read Authority | Write Authority | Conflict Policy | Allowed Staleness |
|---|---|---|---|---|
| Stage 0 Prepare | File-store | File-store | N/A | N/A |
| Stage 1 Dual-Write Warmup | File-store | File-store + Convex | File-store wins for user-facing reads | 0 user-visible |
| Stage 2 Backfill | File-store | File-store + Convex | Server-side migration sequence wins, with owner lineage validation | <= 60s internal parity lag |
| Stage 3 Parity Validation | File-store | File-store + Convex | Drift blocks progression | <= 60s internal parity lag |
| Stage 4 Read Canary | Cohort on Convex, rest file-store | File-store + Convex | Per-request authority determined by cohort | <= 30s canary lag |
| Stage 5 Full Read Switch | Convex | Convex + optional file-store mirror | Convex authoritative | <= 10s replication lag |
| Stage 6 Legacy Decommission | Convex | Convex | N/A | N/A |

## Security and Auth Invariants (Must Hold in All Stages)
- Every read and write path must enforce owner-scoped access using authenticated Clerk identity.
- Session token checks are additive and never replace ownership checks.
- Missing identity/claims must return deny response (fail closed).
- Cross-tenant access must be blocked for all project-bound entities (`projects`, `messages`, `artifacts`, `snapshots`, `buildJobs`, `deployments`).
- API behavior parity includes denial behavior parity (status code and error envelope).

## Idempotency and Replay Safety Requirements
- All migration writes use deterministic upsert keys:
  - Project: `project.id`
  - Message: `project.id + message.id`
  - Snapshot: `project.id + snapshot.id`
  - BuildJob: `buildJob.id`
  - Deployment: `deployment.deploymentId`
- Backfill worker checkpoints must be persisted with monotonic sequence cursor.
- Re-running backfill on same range must be no-op safe.
- Reconciliation actions must write migration audit records with run id and timestamp.

Tenant-safety requirements:
- Upserts must revalidate owner identity and tenant/project lineage before write.
- Replay/reconciliation writes must use tenant-qualified composite keys where applicable.
- Conflict resolution must not trust client timestamps. Use server-side migration sequence and server timestamp.

## Backpressure and Overload Controls
- Convex mirror write timeout budget: 500ms per operation.
- Max in-flight mirror writes: 200.
- Mirror write circuit breaker opens when Convex write failures exceed 5% for 2 minutes.
- While circuit is open, mirror writes go to bounded reconciliation queue only.
- Reconciliation queue hard limits:
  - Max queue depth: 50,000.
  - Max queue age: 10 minutes.
- If queue limits are breached, stage progression is blocked and incident process starts.

Retry controls:
- Retry policy: exponential backoff with full jitter.
- Max retries per migration operation: 5.
- Global retry budget: 2,000 retries per 5 minutes.

## Preconditions Checklist (Stage 0)
Required before any migration action:
- [ ] Full backup of `.samaa/projects.json` created and checksum verified.
- [ ] Restore drill executed on backup in non-prod environment.
- [ ] Backup and archive encryption enabled with managed keys.
- [ ] Backup access policy set to least privilege and access audit logging enabled.
- [ ] Convex deployment healthy and `convex/schema.ts` applied.
- [ ] Clerk issuer/domain and auth integration validated.
- [ ] Authz negative tests pass for core project endpoints.
- [ ] Observability dashboards and alerts configured:
  - write error rate
  - authz denials
  - parity drift count
  - p95/p99 route latency
  - queue depth / job lease staleness
- [ ] Decision log initialized with migration window and owners.

Baseline and capacity prerequisites:
- [ ] 24-hour baseline capture completed for latency/error/throughput.
- [ ] Load test evidence at projected peak and 1.5x surge available.
- [ ] Capacity margin >= 30% verified for critical dependencies.

Abort criteria:
- Any failed restore drill.
- Missing security approval.
- Unknown high-severity incidents active.

## Stage 1 - Dual-Write Warmup
Flag profile:
- `CONVEX_DUAL_WRITE=true`
- `CONVEX_READ_PRIMARY=false`
- `CONVEX_BACKFILL_ENABLED=false`

Entry criteria:
- Stage 0 complete.

Execution checklist:
- [ ] Enable dual-write in low-traffic window.
- [ ] Verify write success in both stores for create/update/delete flows.
- [ ] Confirm no change in client-visible behavior.
- [ ] Monitor 30-minute warmup with no sustained write errors.

Exit criteria:
- Convex write success >= 99.9% for warmup window.
- No increase in authz failures beyond baseline + 5% relative.

Abort criteria:
- Convex write error rate > 0.5% for 5 min.
- p95 latency regression > 20% over baseline for 10 min.

## Stage 2 - Backfill
Flag profile:
- `CONVEX_DUAL_WRITE=true`
- `CONVEX_BACKFILL_ENABLED=true`
- `CONVEX_READ_PRIMARY=false`

Execution checklist:
- [ ] Start backfill with bounded batch size.
- [ ] Use adaptive pacing tied to API latency and queue depth.
- [ ] Persist checkpoint every batch.
- [ ] Produce run summary with counts per entity.

Required pacing parameters:
- Max batch size: 500 records.
- Max concurrent backfill workers: 4.
- Max in-flight backfill writes: 2,000.
- Auto-throttle by 50% if p95 > 700ms or 5xx > 0.8% for 5 minutes.
- Auto-pause if p99 > 1400ms or timeout rate > 0.4% for 3 minutes.

Exit criteria:
- 100% source entities processed.
- Backfill rerun on final batch is idempotent (no net new rows except expected updates).

Abort criteria:
- Worker retry storm detected.
- Checkpoint corruption or non-monotonic cursor movement.

## Stage 3 - Parity Validation
Required parity tooling outputs:
1. Count parity by entity type.
2. Ownership parity by user/project relationships.
3. Deep sampled parity for nested structures.
4. API response parity (including denial behavior) across sampled endpoints.
5. Schema/version parity hash check.

Parity checklist:
- [ ] `users`: count parity and `clerkId` uniqueness parity.
- [ ] `projects`: count parity and owner mapping parity.
- [ ] `messages`: sampled content/order parity.
- [ ] `artifacts`: sampled kind/path/url/content metadata parity.
- [ ] `snapshots`: sampled phase/outcome/filesManifest parity.
- [ ] `buildJobs`: status/attempt/retry/lease fields parity.
- [ ] `deployments`: status/provider/rollback lineage parity.
- [ ] Authz parity: cross-tenant denied in both paths.

Gate thresholds:
- Count drift: 0 critical entity drift.
- Deep-sample mismatch: <= 0.1% sample mismatch.
- Authz mismatch: 0 tolerated.

Abort criteria:
- Any authz mismatch.
- Any project ownership drift.

## Stage 4 - Read Canary
Flag profile:
- `CONVEX_DUAL_WRITE=true`
- `CONVEX_READ_PRIMARY=false`
- `CONVEX_MIGRATION_CANARY_PERCENT=5` (increase to 10/25/50 only after pass gates)

Canary policy:
- Use tenant-aware cohorting, not only random request-level sampling.
- Keep cohorts stable across the soak window.
- Limit canary growth by both percentage and max incremental RPS.
- Do not increase cohort while latency/error/queue trends are rising.

Canary checklist:
- [ ] 5% cohort for 30 min soak.
- [ ] 10% cohort for 30 min soak.
- [ ] 25% cohort for 60 min soak.
- [ ] 50% cohort for 60 min soak.

Pass criteria for each step:
- Error rate regression <= 10% relative vs control cohort.
- p95 latency regression <= 15% vs control.
- p99 latency regression <= 15% vs control.
- No authz regressions.
- No parity drift spikes.

Auto-abort triggers:
- Any sev-1 incident.
- Error rate increase > 25% for 5 min.
- Authz mismatch detected.
- p99 latency above 1500ms for 3 minutes.
- Timeout rate above 0.5% for 3 minutes.
- Queue age above 10 minutes for 3 minutes.

## Stage 5 - Full Read Switch
Flag profile:
- `CONVEX_READ_PRIMARY=true`
- `CONVEX_DUAL_WRITE=true` (temporary safety mirror)

Checklist:
- [ ] Flip full read authority to Convex.
- [ ] Keep dual-write mirror for at least 24h observation window.
- [ ] Run full parity and authz suite after switch.
- [ ] Confirm SLOs stable for 24h.

Exit criteria:
- Stable error and latency metrics for full observation window.
- Zero unresolved critical/high incidents.

## Stage 6 - Legacy Decommission
Checklist:
- [ ] Security and product approval to retire mirror writes.
- [ ] Disable `CONVEX_DUAL_WRITE`.
- [ ] Archive final file-store snapshot and checksums.
- [ ] Enforce retention policy and restoration window.
- [ ] Execute restore drill from archived snapshot before destructive cleanup.
- [ ] Document decommission signoff.

## Rollback Playbook
### Rollback Triggers
Immediate rollback to file-store reads if any:
- Authz mismatch.
- Ownership drift.
- Sev-1 migration-related outage.
- Sustained latency regression > 30% for 10 min.
- Sustained 5xx increase > 20% for 10 min.

### Rollback Actions
1. Set `CONVEX_READ_PRIMARY=false`.
2. If rollback trigger is authz mismatch or identity uncertainty, set `CONVEX_DUAL_WRITE=false` immediately.
3. If rollback trigger is non-security performance drift, keep `CONVEX_DUAL_WRITE=true` only if security invariants are healthy.
4. Freeze further migration stage progression.
5. Capture incident snapshot: flags, metrics, affected cohorts, request ids.
6. Run reconciliation report for writes accepted during faulty window.
7. Validate file-store read correctness and authz denial behavior.
8. Decide whether to continue dual-write or disable it after stability.

### Rollback Correctness Proof
Before declaring rollback complete:
- [ ] File-store authority restored and verified.
- [ ] Convex drift report generated for rollback window.
- [ ] No data loss beyond declared RPO.
- [ ] RTO met and documented.

## RPO/RTO Targets
- Target RPO: <= 5 minutes.
- Target RTO: <= 15 minutes.

If either target is missed, migration is automatically blocked pending postmortem and explicit re-approval.

## Verification Matrix
### Mandatory Test Gates
- Unit tests: pass 100% on changed modules.
- Integration tests: pass 100% for owner-scoped routes and migration adapters.
- E2E tests: pass 100% for create/resume/retry/repair/snapshot/restore/deploy flows.
- Contract tests: pass 100% for API and SSE compatibility envelopes.
- Security negative tests: pass 100% for cross-tenant and token-mismatch access.

### Mandatory Failure-Injection Scenarios
- Convex write failure during dual-write.
- Clerk auth transient failure / token validation error.
- Network latency spike for Convex path.
- Backfill worker restart and replay.
- Queue backlog stress during migration.

### Capacity and Soak Gates
- Peak-traffic soak: >= 2 hours at 50% canary before full read switch.
- Surge test gate: successful validation at 1.5x projected peak request rate.

### Full-Suite Verification Commands
Run from `adorable/`:
- `npm test`
- `npm run test:e2e`
- `npm run lint`

Optional extra gate if available:
- `npm run test:coverage`

## Go / No-Go Checklist
Go requires all true:
- [ ] All prior stage exit criteria passed.
- [ ] No unresolved critical/high findings.
- [ ] Security approver signoff.
- [ ] SRE on-call signoff.
- [ ] Product approver signoff.
- [ ] Rollback path validated in current release.
- [ ] Security conditions validated for current stage (no authz or identity anomalies).

No-Go if any true:
- [ ] Any authz mismatch.
- [ ] Unknown parity drift.
- [ ] Missing backup/restore validation.
- [ ] Active sev-1/sev-2 incident in migration area.

## Decision Log Template
- Timestamp:
- Stage:
- Decision: Go / Hold / Rollback
- Evidence links: dashboards, test run ids, parity reports
- Risk accepted:
- Owner approvals:

## Communication Cadence
- T-24h: migration window announcement.
- T-1h: freeze reminder and owner confirmation.
- Stage start: broadcast with expected duration and abort criteria.
- Stage complete: broadcast outcomes and next gate.
- Incident: immediate rollback notice with ETA.
- Post-migration: closure summary with signoffs.

## Secret and Artifact Redaction Rules
- Never include auth tokens, cookies, session secrets, or raw PII in parity reports.
- Incident snapshots must use redacted request metadata only.
- Migration artifacts shared outside on-call channel must be scrubbed and approved by Security Approver.

## Post-Cutover Follow-Up
Within 48h of full read switch:
- [ ] Publish migration summary report.
- [ ] Capture lessons learned and update this runbook.
- [ ] Create action items for any medium/low residual issues.
- [ ] Schedule decommission retrospective.
