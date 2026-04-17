/**
 * lib/checkpoint.ts
 *
 * Central checkpoint/resume logic for the AI builder pipeline.
 *
 * Key exports:
 *   PIPELINE_PHASES       — ordered list of pipeline phases
 *   PHASE_PREREQUISITES   — what must be sealed before each phase can run
 *   isPhaseDataComplete   — checks live project data (independent of checkpoint records)
 *   resolveResumePoint    — main entrypoint: given a project, what can be resumed?
 */

import type { BuilderPhase, CheckpointRecord, ProjectRecord } from "./project-store";

// ---------------------------------------------------------------------------
// Phase ordering
// ---------------------------------------------------------------------------

/**
 * Ordered pipeline phases. Each phase must follow all prior ones.
 * Walkthrough is interactive (no API trigger) but still needs a checkpoint.
 */
export const PIPELINE_PHASES: BuilderPhase[] = [
  "intent_extraction",
  "domain_research",
  "screen_architecture",
  "walkthrough",
  "ancl_generation",
  "repo_publish",
  "preview_ready",
];

export const PHASE_INDEX: Partial<Record<BuilderPhase, number>> = Object.fromEntries(
  PIPELINE_PHASES.map((phase, i) => [phase, i]),
);

/** Phases that are purely interactive (user-driven, no SSE stream to resume). */
export const INTERACTIVE_PHASES = new Set<BuilderPhase>(["walkthrough"]);

// ---------------------------------------------------------------------------
// Prerequisites
// ---------------------------------------------------------------------------

/**
 * Every phase listed here must have a sealed checkpoint before the given
 * phase is allowed to run.
 */
export const PHASE_PREREQUISITES: Partial<Record<BuilderPhase, BuilderPhase[]>> = {
  domain_research: ["intent_extraction"],
  screen_architecture: ["domain_research"],
  walkthrough: ["screen_architecture"],
  ancl_generation: ["walkthrough"],
  repo_publish: ["ancl_generation"],
  preview_ready: ["repo_publish"],
};

// ---------------------------------------------------------------------------
// Data completeness checks (independent of checkpoint records)
// ---------------------------------------------------------------------------

/**
 * Returns true if the live project data proves a phase completed successfully,
 * regardless of whether a CheckpointRecord was ever written.
 *
 * This allows us to back-fill checkpoint status for projects created before
 * the checkpoint system existed.
 */
export function isPhaseDataComplete(project: ProjectRecord, phase: BuilderPhase): boolean {
  switch (phase) {
    case "intent_extraction":
      return Boolean(project.requirementsDoc?.intentAnalysis?.coreProblems?.length);

    case "domain_research":
      return Boolean(project.requirementsDoc?.domainInsights?.length);

    case "screen_architecture":
      return Boolean(project.screenHypotheses?.length) && Boolean(project.wireframeHtml?.trim());

    case "walkthrough":
      return Boolean(
        project.requirementsDoc?.validation?.walkthroughCompleted &&
          project.requirementsDoc?.validation?.sealedAt,
      );

    case "ancl_generation":
      return Boolean(project.anclCode?.trim());

    case "repo_publish":
      return Boolean(project.githubRepositoryUrl?.trim()) && Boolean(project.sourceCommitSha?.trim());

    case "preview_ready":
      return Boolean(project.latestPreviewUrl?.trim());

    default:
      return false;
  }
}

/**
 * Returns true if a phase is considered sealed — either by an explicit
 * CheckpointRecord OR by data completeness (back-compat for older projects).
 */
export function isPhaseSealed(
  project: ProjectRecord,
  phase: BuilderPhase,
): boolean {
  return Boolean(project.checkpoints?.[phase]) || isPhaseDataComplete(project, phase);
}

// ---------------------------------------------------------------------------
// Resume analysis
// ---------------------------------------------------------------------------

export type ResumeAnalysis = {
  /** All phases that have a sealed checkpoint (explicit or inferred). */
  completedPhases: BuilderPhase[];
  /** The last successfully sealed phase, or null if none. */
  lastSealed: BuilderPhase | null;
  /**
   * The next phase that can be triggered for resume/retry.
   * null if all phases are complete or prerequisites are not met.
   */
  nextResumable: BuilderPhase | null;
  /**
   * Phases whose prerequisites are not yet satisfied.
   * Cannot be resumed until earlier phases are sealed.
   */
  blockedPhases: BuilderPhase[];
  /**
   * A phase that was the last `latestPhase` but has no sealed checkpoint.
   * Indicates the phase started but did not complete (stuck/failed).
   */
  stuckPhase: BuilderPhase | null;
  /** All phases that are missing a checkpoint (not sealed). */
  missingPhases: BuilderPhase[];
};

/**
 * Resolve the resume point for a project.
 *
 * Call this whenever a project is opened and its status is "failed" or it
 * appears stuck (status === "running" but no active SSE). The returned
 * `ResumeAnalysis` drives both the resume API and the UI timeline.
 */
export function resolveResumePoint(project: ProjectRecord): ResumeAnalysis {
  const completedPhases: BuilderPhase[] = [];
  const missingPhases: BuilderPhase[] = [];
  const blockedPhases: BuilderPhase[] = [];
  let lastSealed: BuilderPhase | null = null;

  for (const phase of PIPELINE_PHASES) {
    const sealed = isPhaseSealed(project, phase);
    if (sealed) {
      completedPhases.push(phase);
      lastSealed = phase;
    } else {
      missingPhases.push(phase);
    }
  }

  // Determine the stuck phase: the latestPhase if it's not sealed
  const latestPhase = project.latestPhase as BuilderPhase | undefined;
  const stuckPhase =
    latestPhase &&
    PIPELINE_PHASES.includes(latestPhase) &&
    !isPhaseSealed(project, latestPhase)
      ? latestPhase
      : null;

  // Determine the next resumable phase: first missing phase whose prerequisites are all sealed
  let nextResumable: BuilderPhase | null = null;
  for (const phase of missingPhases) {
    if (INTERACTIVE_PHASES.has(phase)) continue; // walkthrough can't be API-resumed

    const prereqs = PHASE_PREREQUISITES[phase] ?? [];
    const prereqsMet = prereqs.every((prereq) => isPhaseSealed(project, prereq));

    if (!prereqsMet) {
      blockedPhases.push(phase);
      continue;
    }

    if (nextResumable === null) {
      nextResumable = phase;
    }
  }

  return {
    completedPhases,
    lastSealed,
    nextResumable,
    blockedPhases,
    stuckPhase,
    missingPhases,
  };
}

// ---------------------------------------------------------------------------
// Frontend-friendly phase labels (used in UI timeline)
// ---------------------------------------------------------------------------

export const PHASE_LABELS: Partial<Record<BuilderPhase, string>> = {
  intent_extraction: "Intent Extraction",
  domain_research: "Domain Research",
  screen_architecture: "Screen Architecture",
  walkthrough: "Requirements Walkthrough",
  ancl_generation: "ANCL Generation",
  repo_publish: "GitHub Publish",
  preview_ready: "Preview Build",
  deployable: "Deploy",
};

export type PhaseTimelineEntry = {
  phase: BuilderPhase;
  label: string;
  status: "complete" | "stuck" | "running" | "pending";
  completedAt?: string;
  isInteractive: boolean;
  isResumable: boolean;
};

/**
 * Build a UI-ready timeline array from a project + resume analysis.
 */
export function buildPhaseTimeline(
  project: ProjectRecord,
  analysis: ResumeAnalysis,
): PhaseTimelineEntry[] {
  const isCurrentlyRunning = project.status === "running";
  const runningPhase = isCurrentlyRunning ? (project.latestPhase as BuilderPhase) : null;

  return PIPELINE_PHASES.map((phase) => {
    const sealed = isPhaseSealed(project, phase);
    const checkpoint = project.checkpoints?.[phase];
    const isStuck = analysis.stuckPhase === phase;
    const isRunning = runningPhase === phase && !sealed;

    let status: PhaseTimelineEntry["status"] = "pending";
    if (sealed) status = "complete";
    else if (isRunning) status = "running";
    else if (isStuck) status = "stuck";

    return {
      phase,
      label: PHASE_LABELS[phase] ?? phase,
      status,
      completedAt: checkpoint?.completedAt,
      isInteractive: INTERACTIVE_PHASES.has(phase),
      isResumable: analysis.nextResumable === phase || analysis.missingPhases.includes(phase),
    };
  });
}
