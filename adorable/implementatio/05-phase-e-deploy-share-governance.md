# Phase E: Deploy and Share Governance

## Outcome
Ship one-click deployment and shareable preview flows with secure secrets and rollback controls.

## Scope
- Deploy project build artifact to managed target.
- Preview URL lifecycle governance.
- Secrets management model.
- Audit and rollback operations.

## Primary Provider Decision
- Primary deploy target: Vercel.
- Fallback target after stabilization: Cloudflare.

## Required Capabilities
1. Deployment records:
- deploymentId, projectId, environment, commitHash, status, createdBy, createdAt
2. Preview governance:
- Expiration policy for old preview URLs.
- Access control for private previews.
3. Secret model:
- Never store provider secrets in project artifacts.
- Use provider-managed encrypted environment variables.
 - Use short-lived scoped credentials where possible.
 - Enforce rotation cadence and access audit logging.
 - Store secrets only in KMS-backed secret managers.
 - Define revocation propagation SLA and emergency rotation runbook.
4. Rollback:
- One action in dashboard to revert to previous stable deployment.

## Repository Changes
- Add deploy APIs:
  - app/api/projects/[projectId]/deploy/route.ts
  - app/api/projects/[projectId]/deployments/route.ts
- Add deploy UI controls in app/flutter/workspace/page.tsx and app/dashboard/page.tsx.
- Add deployment persistence model in data layer.

## Security Requirements
- Only owner or authorized org role can deploy.
- Deployment webhook callbacks must verify signature.
- Deployment webhook callbacks must enforce anti-replay checks (timestamp window and event-id dedup).
- Deployment webhook secrets must support key rotation with overlap window.
- Preview links for private projects must require auth.
- Logs and traces must pass secret redaction tests.

## Acceptance Criteria
- Successful deploy flow from workspace in one path under 3 user actions.
- Rollback operation under 2 minutes p95.
- Unauthorized deployment attempts blocked at 100% in tests.
- Deployment audit log is queryable by project and actor.

## Testing
- Integration tests for deploy start, status poll, and rollback.
- Security tests for role-based deployment access.
- E2E test from build completion to live preview link opening.
- Webhook replay and stale timestamp rejection tests.

## Rollback Plan
- Feature flag DEPLOYMENT_V1 controls exposure.
- If provider outage occurs, disable deploy actions and keep builder loop available.
