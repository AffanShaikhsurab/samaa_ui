# Phase F: Differentiators After Reliability Gates

## Outcome
Add high-impact features only after Phases B-E are complete and stable.

## Scope
- Template gallery with quality gates.
- Guided starter prompts and workflow acceleration.

## Guardrail
Do not start this phase unless all prior gates are green:
- Reliability metrics hit target for two consecutive release cycles.
- No unresolved Critical/High security findings.
- Migration and control plane incidents below error budget.

## Template Gallery Requirements
- Curated templates only (no unvetted community uploads in first release).
- Each template includes:
  - category
  - use-case description
  - architecture notes
  - quality score
  - maintenance owner
- Template instantiation must create a full project with baseline tests.

## Guided Prompt Requirements
- Prompt starter packs by business intent (SaaS dashboard, marketplace, social app).
- Structured clarifying questions mapped to domain model.
- Built-in risk prompts for auth, data privacy, and compliance considerations.

## Repository Changes
- Add templates route and page:
  - app/templates/page.tsx
  - app/api/templates/route.ts
- Add template metadata store and scoring pipeline.
- Integrate guided starter into app/flutter/page.tsx flow.

## Acceptance Criteria
- New users reach first meaningful preview at least 25% faster versus baseline.
- Template-generated projects pass baseline contract and smoke tests.
- User satisfaction for onboarding flow improves by target metric.

## Testing
- E2E for template selection to successful preview.
- Regression tests ensuring templates do not bypass auth or queue controls.

## Rollback Plan
- Feature flag TEMPLATES_V1 and STARTER_PROMPTS_V1.
- On quality regression, disable templates while keeping core builder available.
