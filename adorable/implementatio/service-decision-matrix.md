# Service Decision Matrix

## Decision Goal
Pick services that maximize shipping speed and reliability for an AI app builder with long-running build jobs and preview environments.

Scoring scale: 1 (poor) to 5 (excellent)
Weights total: 100

## Backend Data and Auth Platform
Weights:
- Real-time and reactive UX fit: 20
- Auth integration and authorization flexibility: 20
- Operational simplicity for small team: 20
- Queue and background workflow fit: 15
- Cost predictability: 10
- Vendor lock-in risk: 5
- Migration complexity from current repo: 10

| Option | Real-time Fit | Authz Fit | Ops Simplicity | Queue Fit | Cost | Lock-in | Migration Fit | Weighted Score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Convex + Clerk | 5 | 5 | 4 | 4 | 3 | 2 | 5 | 4.35 |
| Supabase + Clerk/Auth | 4 | 3 | 4 | 3 | 4 | 3 | 3 | 3.65 |
| Firebase + Clerk/Firebase Auth | 4 | 3 | 4 | 3 | 3 | 2 | 2 | 3.35 |
| Neon + Drizzle + Auth.js/Clerk | 3 | 4 | 2 | 3 | 4 | 4 | 2 | 3.05 |

Decision:
- Primary: Convex + Clerk.
- Reason: strongest fit with existing code and reactive builder UX, lowest migration risk from current repository structure.

## Sandbox Execution Provider
Weights:
- Isolation and security controls: 30
- Startup latency and runtime reliability: 25
- SDK and operational ergonomics: 20
- Cost controls and lifecycle tooling: 15
- Ecosystem maturity for AI agent workloads: 10

| Option | Isolation | Latency/Reliability | SDK Ergonomics | Cost Controls | Ecosystem | Weighted Score |
|---|---:|---:|---:|---:|---:|---:|
| E2B | 5 | 4 | 5 | 4 | 5 | 4.65 |
| Daytona | 4 | 4 | 4 | 4 | 4 | 4.00 |

Decision:
- Primary: E2B for default builder workload.
- Secondary: keep Daytona adapter as fallback/provider option through existing abstraction in lib/daytona-provider.ts and lib/e2b-provider.ts.

## Deployment and Preview Platform
Weights:
- Preview environment UX and speed: 30
- Next.js alignment: 25
- Secrets and governance: 20
- Observability and rollback: 15
- Cost and scaling predictability: 10

| Option | Preview UX | Framework Fit | Secrets/Governance | Observability/Rollback | Cost | Weighted Score |
|---|---:|---:|---:|---:|---:|---:|
| Vercel | 5 | 5 | 4 | 4 | 3 | 4.45 |
| Cloudflare Pages/Workers | 4 | 4 | 4 | 4 | 4 | 4.00 |

Decision:
- Primary: Vercel for first complete release.
- Secondary: Cloudflare deployment option after control plane stabilization.

## Tradeoff Notes
- Convex lock-in risk is acceptable for phase speed, mitigated by domain interfaces and ADRs.
- E2B gives strong out-of-box sandbox velocity for AI execution.
- Vercel gives best immediate preview and rollback ergonomics for this codebase.

## ADR Requirements
Before implementation in each phase, write ADRs for:
- Data ownership and schema strategy.
- Queue semantics and retries.
- Sandbox selection policy and fallback behavior.
- Deployment target and rollback policy.
