# Documentation Reading Ladder

Use this sequence before implementing any phase. Read in order.

## Foundation First
1. Convex overview and core concepts
- https://docs.convex.dev/home
2. Convex authentication and authorization
- https://docs.convex.dev/auth
3. Clerk and Convex integration guide
- https://clerk.com/docs/integrations/databases/convex

## Execution Runtime
4. E2B docs home and quickstart
- https://e2b.dev/docs
5. Daytona docs overview
- https://www.daytona.io/docs

## Deployment and Governance
6. Vercel docs overview and environments
- https://vercel.com/docs
7. Cloudflare developers overview
- https://developers.cloudflare.com/

## Comparative Alternatives
8. Supabase getting started and architecture links
- https://supabase.com/docs/guides/getting-started
9. Firebase docs overview (build/run)
- https://firebase.google.com/docs
10. Neon docs introduction and branching model
- https://neon.com/docs

## Repo-Specific Read Order
11. Current builder workspace UI and state handling
- app/flutter/workspace/page.tsx
12. Session creation and auth checks
- app/api/builder/sessions/route.ts
13. Project APIs and recovery actions
- app/api/projects/route.ts
- app/api/projects/[projectId]/retry-build/route.ts
- app/api/projects/[projectId]/repair/route.ts
14. Current store and queue semantics
- lib/project-store.ts

## Required Output After Reading
Before coding, produce:
- Service choice rationale for the specific phase.
- API and event schema diff plan.
- Security boundary checklist for changed routes.
- Performance target impact estimate.
- Test plan (unit, integration, e2e) with pass thresholds.
