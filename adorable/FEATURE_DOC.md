# Samaa UI Feature Doc

## Product Overview
Samaa UI is an authenticated AI app builder for generating Flutter apps from natural language. The product starts at a prompt-based landing page, creates a builder session, streams build progress in a workspace, and then lets the user manage, deploy, and roll back projects from a dashboard.

## App Shell And Access Model

The app is split into two layout layers:

- `app/layout.tsx` wraps the main app shell with `ClerkProvider`, `ConvexClientProvider`, and the global `ApiKeyGate`.
- `app/flutter/layout.tsx` is a lighter layout for the Flutter landing and workspace surfaces. It keeps the branded sky background and does not add the dashboard-style shell.

Important access rules:

- The global API-key gate blocks most screens until either a global provider key exists or the user saves a personal key.
- Clerk handles authentication and ownership checks for project and deployment APIs.
- `TEMPLATES_V1` gates the curated templates API.
- `DEPLOYMENT_V1` gates deploy and rollback APIs.
- Builder session tokens are stored per project in `localStorage` and are required for deploy and rollback actions.

## Main User Journeys

### 1. Start A New Build

Screens:

- `/flutter` in `app/flutter/page.tsx`

What the screen does:

- Lets the user describe an app in a large prompt box.
- Shows starter prompt chips when the input is empty.
- Provides quick links to Templates, Dashboard, and the Clerk user button.
- Animates the handoff into the workspace after submission.

How it works:

1. The user enters a prompt and presses Enter or clicks Build Application.
2. The screen calls `POST /api/builder/sessions` with the prompt.
3. The API creates a new project or builder session and returns a session id plus an optional session token.
4. The session token is stored in `localStorage` under a project-scoped key.
5. The app navigates to `/flutter/workspace/{projectId}`.

Connects to:

- Templates at `/templates`.
- Dashboard at `/dashboard`.
- Workspace at `/flutter/workspace/{projectId}`.

External services used here:

- Clerk for the account button.
- The builder session backend, which in turn orchestrates the model and sandbox workflow.

### 2. Start From A Template

Screens:

- `/templates` in `app/templates/page.tsx`

What the screen does:

- Shows a curated template gallery.
- Filters by category, complexity, and search.
- Offers quick starter packs by business intent.
- Opens a guided prompt dialog for templates that need clarifying choices.

How it works:

1. The page renders from the local `lib/templates-data` catalog.
2. When the user chooses a template, the guided dialog collects optional answers.
3. The final prompt is assembled from the template plus the selected answers.
4. The page calls `POST /api/builder/sessions` to launch the build.
5. The returned session token is stored in `localStorage` and the app opens the workspace.

Connects to:

- Workspace at `/flutter/workspace/{projectId}`.
- Landing and dashboard through the shared navigation.

External services used here:

- The build-launch API path that creates a builder session.

Notes:

- The page itself is driven by local template data.
- The `GET /api/templates` route exists for the curated catalog API and is gated by `TEMPLATES_V1`, but the current page does not fetch that route directly.

### 3. Build, Refine, And Preview

Screens:

- `/flutter/workspace` in `app/flutter/workspace/page.tsx`
- `/flutter/workspace/{projectId}` in `app/flutter/workspace/[projectId]/page.tsx`

What the screen does:

- Resumes an existing session or creates one when needed.
- Shows a chat-style build conversation.
- Streams build progress, tool calls, and completion events.
- Displays trace items, research artifacts, enhancement summaries, snapshots, and compiler logs.
- Embeds a live preview iframe with back, forward, reload, and direct URL controls.
- Switches to a mobile split view for chat versus preview.
- Exposes repair, retry, snapshot restore, deploy, and rollback actions.

How it works:

1. On load, the workspace reads project state and existing artifacts through the project APIs.
2. It sends chat or build messages to `POST /api/builder/sessions/{id}/messages`.
3. The messages endpoint streams Server-Sent Events for phase changes, tool calls, artifacts, preview URLs, and completion events.
4. The workspace stores the latest preview URL, trace state, artifacts, and snapshots in local component state.
5. The user can restore snapshots, retry builds, repair failed builds, or trigger deploy and rollback actions through the project APIs.

Connects to:

- Landing and dashboard through normal app navigation.
- Project detail state through `/api/projects/{projectId}`.

External services used here:

- E2B for sandboxed Flutter runtime and preview execution.
- LLM providers for generation, clarifying questions, and remediation.
- Vercel for deploy-backed stable preview URLs.

### 4. Manage Projects

Screens:

- `/dashboard` in `app/dashboard/page.tsx`
- `/profile` in `app/profile/page.tsx`

What the dashboard does:

- Lists the current user’s projects with status, latest phase, prompt, and error state.
- Resumes a project.
- Duplicates, deletes, deploys, and rolls back a project.
- Shows deploy feedback inline when an action fails or succeeds.

How the dashboard works:

1. It calls `GET /api/projects` to load owner-scoped projects.
2. Resume links open the workspace for a selected project.
3. Duplicate calls `POST /api/projects/{projectId}/duplicate` and opens the cloned workspace.
4. Delete calls `DELETE /api/projects/{projectId}` and refreshes the list.
5. Deploy and rollback use the stored session token and call the deployment APIs.

What the profile page does:

- Shows Clerk identity data such as avatar, name, and email.
- Summarizes total projects, completed builds, running builds, failed builds, and deployed projects.
- Shows recent deployment activity across all projects.
- Lists recent projects with quick resume links.

How the profile page works:

1. It uses Clerk’s `useUser` hook for identity details.
2. It calls `GET /api/projects` to load project history.
3. It aggregates the project list into stats and deployment activity in the UI.

Connects to:

- New project flow at `/flutter`.
- Workspace resume at `/flutter/workspace/{projectId}`.
- Settings at `/settings`.

External services used here:

- Clerk for identity.
- Vercel-backed deployment APIs when the user deploys or rolls back.

### 5. Configure AI Access

Screens:

- `/settings` in `app/settings/page.tsx`

What the screen does:

- Lets the user choose the LLM provider.
- Lets the user save or remove a personal API key.
- Shows provider documentation links.
- Displays development-only feature flags.

How it works:

1. The page calls `GET /api/api-key` to read the current key status.
2. The user can save a provider key with `POST /api/api-key`.
3. The key is stored in an HTTP-only cookie and never echoed back to the browser.
4. Removing the key deletes the cookie pair.

Connects to:

- Dashboard.
- Profile.

External services used here:

- OpenAI, Anthropic, Groq, and NVIDIA key-management ecosystems through the provider documentation links.
- Cookie-backed server storage for the key itself.

### 6. Explore The Demo Surface

Screens:

- `/demo` in `app/demo/page.tsx`

What the screen does:

- Provides a standalone showcase surface for the app’s technical story.
- Demonstrates the generation and composition concept without needing a project flow.

How it works:

- It renders as a client-side experience and does not require a build session.

Connects to:

- Mostly standalone.

External services used here:

- None required for the core demo flow.

## Screen Reference

| Screen | Path | Main Purpose | Typical Next Step |
| --- | --- | --- | --- |
| Root redirect | `/` | Sends users to the Flutter landing experience | `/flutter` |
| Flutter landing | `/flutter` | Collects the initial prompt and starts a session | `/flutter/workspace/{projectId}` |
| Templates | `/templates` | Lets users start from curated templates or starter packs | `/flutter/workspace/{projectId}` |
| Workspace | `/flutter/workspace` | Creates or resumes a build session | `/flutter/workspace/{projectId}` |
| Workspace detail | `/flutter/workspace/{projectId}` | Runs the build loop, preview, artifacts, deploy, and rollback actions | Stay in workspace or return to dashboard |
| Dashboard | `/dashboard` | Lists and manages all projects | Workspace or new build |
| Profile | `/profile` | Summarizes account activity and recent deployments | Dashboard, settings, or workspace |
| Settings | `/settings` | Manages provider selection and API keys | Dashboard or profile |
| Demo | `/demo` | Shows a standalone product demo | None required |

## Backend And API Map

### Product APIs Used By Screens

- `POST /api/builder/sessions` creates or resumes a builder session.
- `POST /api/builder/sessions/{id}/messages` streams build conversation and orchestration events.
- `GET /api/builder/sessions/{id}/artifacts` loads artifacts, snapshots, and queue diagnostics.
- `GET /api/projects` lists owner-scoped projects.
- `GET /api/projects/{projectId}` loads the current project state.
- `POST /api/projects/{projectId}/duplicate` clones a project.
- `DELETE /api/projects/{projectId}` deletes a project.
- `POST /api/projects/{projectId}/retry-build` retries a build job.
- `POST /api/projects/{projectId}/repair` triggers repair logic.
- `GET /api/projects/{projectId}/deployments` loads deployment history.
- `POST /api/projects/{projectId}/deploy` deploys or rolls back.
- `GET/POST /api/api-key` reads or updates the provider key cookie.
- `GET /api/templates` exposes the curated template catalog behind a feature flag.

### Supporting Or Internal Routes

These routes support the product, but they are not primary user-facing screens:

- `POST /api/flutter/chat`
- `POST /api/flutter/build`
- `GET /api/health`
- `POST /api/control-plane/sweep`
- `GET /api/e2b-test`
- `GET /api/test`
- `POST /api/webhooks/vercel`

## Data Ownership And Storage

| Data | Source Of Truth | Storage Or Access Path | Notes |
| --- | --- | --- | --- |
| Clerk identity | Clerk | `useUser` and server auth checks | Used for ownership and profile UI |
| Project records | Project store | `GET /api/projects`, `GET /api/projects/{projectId}` | Includes status, prompt, preview URL, and deployment history |
| Session token | Project store plus client `localStorage` copy | Stored per project id in the browser and verified by APIs | Used for deploy and rollback authorization |
| API key | HTTP-only cookie | `GET/POST /api/api-key` | Never rendered back to the browser |
| Messages and artifacts | Project store | Builder session and artifact routes | Power the workspace trace and side panel |
| Snapshots | Project store | Builder artifacts endpoint plus snapshot restore route | Supports restore and project history |
| Deployments | Project store | Deployment routes | Used by dashboard, profile, and rollback flows |

## External Services

| Service | Used By | Purpose |
| --- | --- | --- |
| Clerk | Root shell, dashboard, profile, secure APIs | Authentication, user identity, and ownership checks |
| Convex | Root shell wiring | App-wide client provider for the broader architecture |
| E2B | Builder backend and workspace preview flow | Sandboxed Flutter execution and preview hosting |
| Vercel | Deployment flow | Stable deploy URL for shared previews |
| LLM providers | Builder backend and settings | Prompt handling, generation, clarifying questions, and remediation |
| Daytona | Supporting sandbox tooling in `lib/` | Present in the repository for sandbox orchestration helpers, but not the primary user-facing screen flow documented above |

## Notes

- The user-facing product story is prompt to workspace to deployment.
- The dashboard and profile pages are read-heavy management surfaces built on the same project records.
- The main screen flows stay inside the Next.js app, while sandbox execution and deployment are handled by external services.
- If a user has no API key configured, the global gate prompts them to add one before using most of the app.# Samaa UI Feature Documentation

## 1. Product Summary
Samaa UI is an authenticated AI app builder focused on generating Flutter apps from natural language prompts.

The core user loop is:
1. Start from Flutter landing.
2. Create or resume a builder session.
3. Stream build progress in the workspace.
4. Preview app output.
5. Save snapshots, retry or repair builds, and optionally deploy.
6. Manage projects from dashboard.

## 2. Main Screens and How They Connect

### 2.1 Root Redirect Screen
Path: /
File: app/page.tsx

What it does:
- Redirects users to the Flutter landing screen.

Connects to:
- Flutter Landing at /flutter.

External services:
- None.

---

### 2.2 Flutter Landing Screen
Path: /flutter
File: app/flutter/page.tsx

Primary features:
- Prompt input textarea to describe the app to build.
- Starter prompt chips for quick-start prompts.
- Build button that creates a new builder session.
- Templates and Dashboard navigation links.
- Clerk user button for account actions.

How it works:
1. User enters prompt.
2. Frontend calls POST /api/builder/sessions.
3. Receives session id and optional session token.
4. Stores session token in localStorage keyed by project id.
5. Navigates to /flutter/workspace/{projectId}.

Connects to:
- Templates at /templates.
- Dashboard at /dashboard.
- Workspace at /flutter/workspace/{projectId}.

External services:
- Clerk for identity and user controls.
- Builder session backend APIs.

---

### 2.3 Flutter Workspace Screen
Paths:
- /flutter/workspace
- /flutter/workspace/{projectId}
Files:
- app/flutter/workspace/page.tsx
- app/flutter/workspace/[projectId]/page.tsx

Primary features:
- Session resume or creation logic.
- Chat-like build conversation UI.
- Server-Sent Events streaming for build lifecycle updates.
- Build phase tracking with trace panel.
- Artifact panel for research artifacts, logs, and enhancement data.
- Snapshot create and snapshot restore controls.
- Retry build and repair controls.
- Deploy and rollback controls.
- Embedded live preview iframe with browser controls.
- Mobile split view between chat and preview.

How it works:
1. On load, it calls POST /api/builder/sessions to create or resume.
2. User sends message, frontend calls POST /api/builder/sessions/{id}/messages.
3. Backend streams phase, tool, artifact, and completion events.
4. Frontend updates messages, phases, artifacts, and preview URL in real time.
5. User can trigger retry, repair, snapshot, restore, deploy, and rollback actions through project APIs.

Connects to:
- Back to Flutter landing via workspace breadcrumb.
- Dashboard via normal app navigation.

External services:
- E2B sandbox runtime for Flutter build and preview execution.
- LLM providers for generation and orchestration.
- Vercel deployment API for deploy and stable preview URL.
- Clerk for authenticated access and ownership checks.

---

### 2.4 Dashboard Screen
Path: /dashboard
File: app/dashboard/page.tsx

Primary features:
- Lists user projects with status and latest phase.
- Resume project.
- Duplicate project.
- Delete project.
- Deploy project.
- Rollback project.

How it works:
1. Calls GET /api/projects to fetch owner-scoped projects.
2. Uses action buttons to call duplicate, delete, deploy, and deployments APIs.
3. Uses stored session token per project for deploy and rollback authorization.

Connects to:
- New project flow at /flutter.
- Resume flow at /flutter/workspace/{projectId}.

External services:
- Clerk-authenticated project APIs.
- Deployment API integration (Vercel-backed path).

---

### 2.5 Templates Screen
Path: /templates
File: app/templates/page.tsx

Primary features:
- Curated template gallery.
- Category and complexity filters.
- Search.
- Guided prompt flow with clarifying questions.
- Risk note display for sensitive template flows.
- Starter packs by business intent.

How it works:
1. User selects template.
2. Optional guided questions collect choices.
3. Final prompt is composed.
4. Frontend calls POST /api/builder/sessions.
5. Navigates to workspace with returned project id.

Connects to:
- Workspace after template launch.
- Dashboard and landing through global navigation.

External services:
- Uses internal templates data and template APIs.
- Uses builder session APIs for launch.

---

### 2.6 Settings Screen
Path: /settings
File: app/settings/page.tsx

Primary features:
- LLM provider selection.
- User API key save and delete controls.
- Key visibility toggle during entry.
- Provider docs links.
- Optional feature flag display in development mode.

How it works:
1. Calls GET /api/api-key for current key source status.
2. Calls POST /api/api-key to save or delete key.
3. Keys are persisted in secure HTTP-only cookies.

Connects to:
- Dashboard.
- Profile.

External services:
- LLM provider ecosystem links (OpenAI, Anthropic, Groq, NVIDIA).
- Cookie-backed server key management endpoint.

---

### 2.7 Profile Screen
Path: /profile
File: app/profile/page.tsx

Primary features:
- Shows Clerk user profile data (name, avatar, email).
- Shows project stats (total, running, complete, failed, deployed).
- Recent deployment activity feed.
- Recent project quick links.

How it works:
1. Uses Clerk useUser hook for identity info.
2. Calls GET /api/projects for current user project data.
3. Aggregates stats and deployment activity in UI.

Connects to:
- Settings.
- Dashboard.
- Workspace resume links.

External services:
- Clerk user identity.
- Project APIs.

---

### 2.8 Demo Screen
Path: /demo
File: app/demo/page.tsx

Primary features:
- Interactive technical demo of ANCL to Flutter generation concepts.
- Visualization of generated structure and code composition.

How it works:
- Runs as a client-side demo surface.

Connects to:
- Mostly standalone; useful for showcase or internal product explanation.

External services:
- None required for core demo rendering.

## 3. Core API Features That Power the Screens

### 3.1 Builder Session APIs
Files:
- app/api/builder/sessions/route.ts
- app/api/builder/sessions/[id]/messages/route.ts
- app/api/builder/sessions/[id]/artifacts/route.ts

Responsibilities:
- Create session and resume session.
- Stream orchestration events over SSE.
- Execute build steps in sandbox.
- Persist messages, artifacts, snapshots, build history.
- Return diagnostics and artifact data.

Used by screens:
- Flutter landing.
- Flutter workspace.
- Templates.

External integrations:
- E2B sandbox runtime.
- Control-plane queue and lease operations.
- Project store persistence.

### 3.2 Project APIs
Files:
- app/api/projects/route.ts
- app/api/projects/[projectId]/route.ts
- app/api/projects/[projectId]/duplicate/route.ts
- app/api/projects/[projectId]/retry-build/route.ts
- app/api/projects/[projectId]/repair/route.ts
- app/api/projects/[projectId]/snapshots/route.ts
- app/api/projects/[projectId]/snapshots/[snapshotId]/restore/route.ts
- app/api/projects/[projectId]/deploy/route.ts
- app/api/projects/[projectId]/deployments/route.ts

Responsibilities:
- List and create owner-scoped projects.
- Read, update, delete project.
- Duplicate project.
- Queue retry and repair actions.
- Snapshot create and restore.
- Deploy and rollback lifecycle.
- Deployment history fetch.

Used by screens:
- Dashboard.
- Workspace.
- Profile.

### 3.3 API Key API
File:
- app/api/api-key/route.ts

Responsibilities:
- Get key source status.
- Save user key and provider in secure cookies.
- Delete user key.

Used by screens:
- Settings.
- Api key gate and dialog surfaces.

### 3.4 Templates API
File:
- app/api/templates/route.ts

Responsibilities:
- Return curated templates with filtering.
- Guarded by feature flag and auth.

Used by screens:
- Templates screen.

### 3.5 Vercel Webhook API
File:
- app/api/webhooks/vercel/route.ts

Responsibilities:
- Verify signed webhook requests.
- Enforce anti-replay protections.
- Process deployment status callbacks.

Used by screens:
- Indirectly updates deployment states reflected in dashboard and profile.

External integration:
- Vercel webhooks.

## 4. Navigation and User Journey Map

### Journey A: New Build
1. / -> redirects to /flutter
2. User enters prompt on /flutter
3. Session created via /api/builder/sessions
4. User lands in /flutter/workspace/{projectId}
5. Build stream begins and preview appears
6. Optional snapshot/deploy actions from workspace

### Journey B: Template-Driven Build
1. User goes to /templates
2. Picks template and completes guided prompts
3. Session created via /api/builder/sessions
4. User lands in /flutter/workspace/{projectId}

### Journey C: Resume and Operate Existing Project
1. User opens /dashboard
2. Clicks Resume for project
3. Lands at /flutter/workspace/{projectId}
4. Can retry, repair, snapshot, deploy, rollback

### Journey D: Account and Model Configuration
1. User opens /settings
2. Chooses provider and saves key via /api/api-key
3. Returns to builder workflows with updated provider/key context

## 5. External Services Used

### Clerk
Used for:
- Route and API protection.
- User identity and user menu.
- Owner-scoped authorization checks.

Integrated in:
- app/layout.tsx
- middleware.ts
- lib/api-auth.ts

### Convex
Used for:
- Client provider wiring in app shell.
- Auth + real-time foundation.

Integrated in:
- app/layout.tsx
- components/convex-client-provider.tsx
- convex/auth.config.ts and convex/schema.ts

### E2B
Used for:
- Isolated sandbox execution.
- Running Flutter commands.
- Serving build preview URLs.

Integrated in:
- lib/e2b-provider.ts
- builder message orchestration routes

### Daytona
Used for:
- Secondary sandbox/runtime provider support path.

Integrated in:
- lib/daytona-provider.ts

### LLM Providers
Used for:
- Generation and tool orchestration streams.

Supported providers:
- OpenAI
- Anthropic
- Groq
- NVIDIA

Integrated in:
- lib/llm-provider.ts

### Vercel
Used for:
- Deployment and stable preview URL path.
- Deployment webhook events.

Integrated in:
- lib/vercel-deploy.ts
- app/api/projects/[projectId]/deploy/route.ts
- app/api/webhooks/vercel/route.ts

## 6. Security and Access Model
- Protected screens: dashboard, workspace, templates, settings, profile.
- Most APIs require authenticated Clerk user.
- Public APIs are intentionally limited (health and webhook paths).
- Owner checks are enforced for project-bound operations.
- Session token headers add defense-in-depth on sensitive routes.
- API keys are stored in HTTP-only cookies, not exposed back to client JS.

## 7. Operational Features and Reliability
- Queue admission controls (per-project, global queue, per-provider concurrency).
- Build job leasing and heartbeat logic.
- Retry scheduling and dead-letter pathways.
- Sweeper endpoint for stale job recovery.
- Mock orchestration mode for deterministic test and e2e flows.

## 8. Feature Flags in Current App
- DEPLOYMENT_V1
- TEMPLATES_V1
- STARTER_PROMPTS_V1
- CONTROL_PLANE_V2

These flags gate rollout and allow safe staged activation.
