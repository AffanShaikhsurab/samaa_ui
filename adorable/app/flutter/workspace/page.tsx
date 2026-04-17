"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiKeySettingsDialog } from "@/components/api-key-gate";
import { SkyBackground } from "@/components/sky-background";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import "../landing.css";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Loader2,
  MessageSquare,
  Monitor,
  RotateCwIcon,
  Send,
} from "lucide-react";

type BuilderPhase =
  | "clarifying"
  | "planning"
  | "generating"
  | "building"
  | "generating_ancl"
  | "compiling"
  | "intent_extraction"
  | "domain_research"
  | "screen_architecture"
  | "collecting_questions"
  | "walkthrough"
  | "ancl_generation"
  | "fixing"
  | "researching"
  | "planning_enhancement"
  | "enhancing"
  | "verifying"
  | "serving"
  | "repo_publish"
  | "preview_ready"
  | "deployable"
  | "complete"
  | "failed";

type BuilderQuestion = {
  id: string;
  question: string;
  options: string[];
};

type FeatureSpec = {
  id: string;
  name: string;
  description: string;
  logic: string;
  edgeCases: string[];
};

type ScreenHypothesis = {
  id: string;
  name: string;
  purpose: string;
  assumption: string;
  problemSolved: string;
  features: FeatureSpec[];
  userFlow: string;
  edgeCases: string[];
  dataFlow: string;
  navigatesTo: string[];
  validatedByUser: boolean;
  validationStatus?: "pending" | "accepted" | "modified" | "rejected";
  userFeedback?: string;
};

type ClarificationQuestion = {
  id: string;
  question: string;
  rationale: string;
  suggestedOptions?: string[];
  answer?: string;
};

type BuilderSession = {
  id: string;
  sessionToken?: string;
  sandboxId: string;
  phase: BuilderPhase;
  createdAt: string;
  projectName?: string;
  previewUrl?: string;
  runtimeProviderName?: "openai" | "anthropic" | "groq" | "nvidia";
  activeResearchProviders?: string[];
  compilerReady?: boolean;
};

type BuilderEvent =
  | { type: "assistant_delta"; text: string }
  | { type: "question_options"; question: BuilderQuestion }
  | { type: "phase"; phase: BuilderPhase; label: string }
  | {
      type: "runtime_status";
      modelProvider?: "openai" | "anthropic" | "groq" | "nvidia";
      activeResearchProviders: string[];
      compilerReady?: boolean;
    }
  | { type: "research_summary"; bundle: { productCategory: string; sources: Array<{ title: string; url: string }> } }
  | { type: "enhancement_plan"; plan: { goals: string[]; uiImprovements: string[]; uxImprovements: string[] } }
  | { type: "enhancement_applied"; output: string; verification?: { success: boolean; issues: string[]; repaired: boolean } }
  | { type: "tool_call_started"; name: string; input?: unknown }
  | { type: "tool_result"; name: string; ok: boolean; output?: string; error?: string }
  | {
      type: "artifact";
      artifact: {
        kind: string;
        title?: string;
        path?: string;
        content?: string;
        url?: string;
        imageUrl?: string;
        provider?: string;
        sourceType?: string;
      };
    }
  | { type: "preview_url"; url: string }
  | { type: "discovery_event"; event: { type: string; message?: string } }
  | { type: "walkthrough_state"; currentIndex: number; totalScreens: number; blocked?: boolean }
  | { type: "artifact_ready"; artifact: string; label: string }
  | { type: "stage_blocked"; stage: string; reason: string; recoverable?: boolean }
  | { type: "question_set_ready"; questions: ClarificationQuestion[] }
  | { type: "generation_started" }
  | { type: "ancl_event"; event: { type: string; message?: string; payload?: unknown } }
  | { type: "remediation_screen_started"; screenId: string; screenName: string }
  | { type: "verification_complete"; previewUrl?: string }
  | { type: "completed"; session: BuilderSession }
  | { type: "error"; message: string; code?: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type TraceItem = {
  id: string;
  label: string;
  detail?: string;
  status?: "running" | "success" | "error" | "info";
};

type BuilderArtifact = Extract<BuilderEvent, { type: "artifact" }>["artifact"];

type ProjectSnapshot = {
  id: string;
  projectId: string;
  createdAt: string;
  phase: BuilderPhase;
  prompt: string;
  previewUrl?: string;
  outcome: "success" | "failed" | "partial";
};

type DeploymentRecord = {
  deploymentId: string;
  projectId: string;
  environment: "preview" | "production";
  commitHash: string;
  status: "queued" | "running" | "succeeded" | "failed" | "rolled_back";
  provider: "vercel" | "cloudflare";
  url?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  rolledBackFromDeploymentId?: string;
  failureReason?: string;
};

type RemediationEventPayload = {
  type: string;
  status: "info" | "success" | "error";
  message: string;
  data?: Record<string, unknown>;
  occurredAt: string;
};

type RemediationPullRequest = {
  number: number;
  url: string;
  state: "open" | "closed";
  merged: boolean;
  headSha: string;
  mergeCommitSha?: string;
};

type BuildJobDiagnostic = {
  id: string;
  action: "generate" | "retry-build" | "repair";
  status: "retry_scheduled" | "dead_letter";
  retryCount: number;
  maxRetries: number;
  terminalReason?: string;
  errorNote?: string;
  nextAttemptAt?: string;
  updatedAt: string;
};

const sessionTokenStorageKey = (projectId: string) => `samaa:session-token:${projectId}`;

// ── Checkpoint types (mirrors lib/checkpoint.ts for client-side use) ────────
type CheckpointRecord = {
  phase: BuilderPhase;
  completedAt: string;
  dataHash?: string;
};

type PhaseTimelineEntry = {
  phase: BuilderPhase;
  label: string;
  status: "complete" | "stuck" | "running" | "pending";
  completedAt?: string;
  isInteractive: boolean;
  isResumable: boolean;
};

type ResumeAnalysis = {
  completedPhases: BuilderPhase[];
  lastSealed: BuilderPhase | null;
  nextResumable: BuilderPhase | null;
  blockedPhases: BuilderPhase[];
  stuckPhase: BuilderPhase | null;
  missingPhases: BuilderPhase[];
};

function artifactKey(artifact: BuilderArtifact) {
  return [artifact.kind, artifact.path, artifact.url, artifact.title].filter(Boolean).join("::");
}

function parseArtifactJson<T>(content?: string): T | null {
  if (!content || !content.trim().startsWith("{")) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function ArtifactPanel({
  artifacts,
  enhancementSummary,
  snapshots,
  onRestoreSnapshot,
}: {
  artifacts: BuilderArtifact[];
  enhancementSummary: string | null;
  snapshots: ProjectSnapshot[];
  onRestoreSnapshot: (snapshotId: string) => void;
}) {
  const researchSources = artifacts.filter((artifact) => artifact.kind === "research_source");
  const researchReport = artifacts.find((artifact) => artifact.kind === "research_report");
  const enhancementPlan = artifacts.find((artifact) => artifact.kind === "enhancement_plan");
  const summaryArtifact =
    artifacts.find((artifact) => artifact.kind === "log" && artifact.title === "Enhancement summary") ?? null;
  const compilerLogs = artifacts.filter((artifact) => artifact.kind === "log" && /compiler/i.test(artifact.title ?? ""));

  const parsedResearch = parseArtifactJson<{
    productCategory?: string;
    competitors?: string[];
    uiReferences?: string[];
  }>(researchReport?.content);
  const parsedPlan = parseArtifactJson<{
    goals?: string[];
    uiImprovements?: string[];
    uxImprovements?: string[];
  }>(enhancementPlan?.content);

  if (
    artifacts.length === 0 &&
    !enhancementSummary &&
    !parsedResearch &&
    !parsedPlan &&
    researchSources.length === 0
  ) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs text-slate-400">Research artifacts and enhancement summaries will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {snapshots.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Snapshots</p>
          {snapshots.slice(0, 5).map((snapshot) => (
            <button
              key={snapshot.id}
              type="button"
              data-testid="workspace-restore-snapshot"
              data-snapshot-id={snapshot.id}
              onClick={() => onRestoreSnapshot(snapshot.id)}
              className="w-full rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-left transition hover:bg-white"
            >
              <p className="text-xs font-semibold text-slate-900">
                {snapshot.phase.replace(/_/g, " ")} • {snapshot.outcome}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{new Date(snapshot.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </section>
      ) : null}

      {(parsedResearch || researchSources.length > 0) && (
        <section className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Research</p>
            {parsedResearch?.productCategory && (
              <p className="mt-1 text-xs text-slate-500">
                Category: <span className="font-semibold text-slate-700">{parsedResearch.productCategory}</span>
              </p>
            )}
          </div>
          {parsedResearch?.competitors?.length ? (
            <div className="flex flex-wrap gap-2">
              {parsedResearch.competitors.slice(0, 6).map((competitor) => (
                <span
                  key={competitor}
                  className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700"
                >
                  {competitor}
                </span>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            {researchSources.slice(0, 6).map((artifact) => (
              <a
                key={artifactKey(artifact)}
                href={artifact.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-black/5 bg-white/70 p-3 transition hover:bg-white"
              >
                {artifact.imageUrl ? (
                  <img
                    src={artifact.imageUrl}
                    alt={artifact.title ?? "Research source"}
                    className="mb-3 h-28 w-full rounded-lg object-cover"
                  />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{artifact.title ?? "Research source"}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {artifact.provider ?? artifact.sourceType ?? "source"}
                  </span>
                </div>
                {artifact.content ? (
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{artifact.content}</p>
                ) : null}
              </a>
            ))}
          </div>
        </section>
      )}

      {(parsedPlan || enhancementSummary || summaryArtifact?.content) && (
        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Enhancement</p>
          {parsedPlan ? (
            <div className="rounded-xl border border-black/5 bg-white/70 p-3">
              <p className="text-sm font-semibold text-slate-900">Planned improvements</p>
              <div className="mt-3 space-y-3">
                {(parsedPlan.goals ?? []).slice(0, 3).length > 0 ? (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Goals</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(parsedPlan.goals ?? []).slice(0, 4).map((goal) => (
                        <span
                          key={goal}
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                        >
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {(parsedPlan.uiImprovements ?? []).slice(0, 3).length > 0 ? (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">UI</p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                      {(parsedPlan.uiImprovements ?? []).slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(parsedPlan.uxImprovements ?? []).slice(0, 3).length > 0 ? (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">UX</p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                      {(parsedPlan.uxImprovements ?? []).slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {enhancementSummary || summaryArtifact?.content ? (
            <div className="rounded-xl border border-black/5 bg-slate-950 p-3 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">Applied summary</p>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                {enhancementSummary ?? summaryArtifact?.content}
              </p>
            </div>
          ) : null}
        </section>
      )}

      {compilerLogs.length > 0 ? (
        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Compiler</p>
          {compilerLogs.slice(0, 2).map((artifact) => (
            <div key={artifactKey(artifact)} className="rounded-xl border border-black/5 bg-slate-950 p-3 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">
                {artifact.title ?? "Compiler log"}
              </p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-white/80">
                {artifact.content}
              </pre>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function BrowserBar({
  previewUrl,
  iframeRef,
}: {
  previewUrl: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [urlInput, setUrlInput] = useState(previewUrl);

  useEffect(() => setUrlInput(previewUrl), [previewUrl]);

  return (
    <div className="shrink-0 flex items-center gap-2 px-4 h-14 glass-card-deep !rounded-none border-x-0 border-t-0 border-b border-black/5">
      <div className="flex items-center gap-1.5 mr-2">
        <button
          type="button"
          onClick={() => iframeRef.current?.contentWindow?.history.back()}
          className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-black/5 transition-all active:scale-95"
          title="Back"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => iframeRef.current?.contentWindow?.history.forward()}
          className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-black/5 transition-all active:scale-95"
          title="Forward"
        >
          <ArrowRightIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
          }}
          className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-black/5 transition-all active:scale-95"
          title="Reload"
        >
          <RotateCwIcon className="size-4" />
        </button>
      </div>

      <form
        className="flex items-center gap-3 flex-1 rounded-full bg-black/5 border border-black/5 px-5 h-9"
        onSubmit={(event) => {
          event.preventDefault();
          if (iframeRef.current) iframeRef.current.src = urlInput;
        }}
      >
        <div className="size-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        <input
          type="text"
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
          className="w-full bg-transparent text-[13px] text-slate-600 outline-none placeholder:text-slate-300 font-semibold"
          aria-label="Preview URL"
        />
      </form>
    </div>
  );
}

function PreviewPanel({ previewUrl, isRunning }: { previewUrl: string | null; isRunning: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => setIframeLoaded(false), [previewUrl]);

  if (!previewUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden w-full h-full bg-slate-50/50">
        <div className="phone-frame unblur-reveal relative z-10 shadow-2xl scale-110">
          <div className="skeleton-header animate-pulse bg-slate-100 h-14 mb-4 rounded-lg mx-4 mt-4" />
          <div className="skeleton-item animate-pulse bg-slate-50 h-32 mb-4 rounded-lg mx-4" />
          <div className="skeleton-item animate-pulse bg-slate-100 h-12 mb-4 rounded-lg mx-4" />
          <div className="skeleton-item animate-pulse bg-slate-50 h-24 mb-4 rounded-lg mx-4" />
        </div>
        <div className="relative z-10 mt-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display mb-2">
            {isRunning ? "Building..." : "Flutter Preview"}
          </h1>
          <div className="flex items-center gap-2 justify-center">
            {isRunning && <Loader2 className="size-3 animate-spin text-sky-500" />}
            <p className="text-xs font-bold text-sky-600/60 uppercase tracking-widest leading-none">
              {isRunning ? "Running ANCL and remediation pipeline" : "Start with a prompt"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <BrowserBar previewUrl={previewUrl} iframeRef={iframeRef} />
      <div className="relative flex-1 min-h-0 bg-white">
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 backdrop-blur-md">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-6 animate-spin text-black/20" />
              <p className="text-sm text-black/30 font-medium">Loading preview...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className={cn("h-full w-full transition-opacity duration-300", iframeLoaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setIframeLoaded(true)}
          title="Flutter App Preview"
        />
      </div>
    </div>
  );
}

function parseSseChunk(buffer: string): { events: BuilderEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events = parts
    .map((part) => {
      const data = part
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) return null;
      try {
        return JSON.parse(data) as BuilderEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is BuilderEvent => Boolean(event));

  return { events, rest };
}

function WorkspaceContent({
  initialPrompt,
  initialProjectId,
}: {
  initialPrompt: string;
  initialProjectId?: string;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const [session, setSession] = useState<BuilderSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [artifacts, setArtifacts] = useState<BuilderArtifact[]>([]);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [enhancementSummary, setEnhancementSummary] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [githubRepositoryFullName, setGithubRepositoryFullName] = useState<string | null>(null);
  const [githubRepositoryUrl, setGithubRepositoryUrl] = useState<string | null>(null);
  const [sourceCommitSha, setSourceCommitSha] = useState<string | null>(null);
  const [remediationBranch, setRemediationBranch] = useState<string | null>(null);
  const [remediationPrUrl, setRemediationPrUrl] = useState<string | null>(null);
  const [remediationPullRequest, setRemediationPullRequest] = useState<RemediationPullRequest | null>(null);
  const [remediationEvents, setRemediationEvents] = useState<RemediationEventPayload[]>([]);
  const [queueDiagnostics, setQueueDiagnostics] = useState<{
    retryScheduledCount: number;
    deadLetterCount: number;
    jobs: BuildJobDiagnostic[];
  }>({ retryScheduledCount: 0, deadLetterCount: 0, jobs: [] });
  const [deployError, setDeployError] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [deployBusy, setDeployBusy] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<BuilderQuestion | null>(null);
  const [walkthroughScreens, setWalkthroughScreens] = useState<ScreenHypothesis[]>([]);
  const [walkthroughIndex, setWalkthroughIndex] = useState(0);
  const [walkthroughWireframeHtml, setWalkthroughWireframeHtml] = useState("");
  const [walkthroughClarificationQuestions, setWalkthroughClarificationQuestions] = useState<
    Record<string, ClarificationQuestion[]>
  >({});
  const [walkthroughAnswers, setWalkthroughAnswers] = useState<Record<string, string>>({});
  const [discoveryQuestions, setDiscoveryQuestions] = useState<ClarificationQuestion[]>([]);
  const [discoveryAnswers, setDiscoveryAnswers] = useState<Record<string, string>>({});
  const [isSubmittingDiscoveryAnswers, setIsSubmittingDiscoveryAnswers] = useState(false);
  const [walkthroughFeedback, setWalkthroughFeedback] = useState("");
  const [stageBlockedReason, setStageBlockedReason] = useState<string | null>(null);
  const [isWalkthroughSubmitting, setIsWalkthroughSubmitting] = useState(false);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<BuilderPhase>("clarifying");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [modelProvider, setModelProvider] = useState<BuilderSession["runtimeProviderName"] | null>(null);
  const [researchProviders, setResearchProviders] = useState<string[]>([]);
  const [compilerReady, setCompilerReady] = useState<boolean | null>(null);
  const [phaseTimeline, setPhaseTimeline] = useState<PhaseTimelineEntry[]>([]);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const hasSubmittedRef = useRef(false);

  const addTrace = useCallback((item: Omit<TraceItem, "id">) => {
    setTrace((prev) => [{ id: crypto.randomUUID(), ...item }, ...prev].slice(0, 80));
  }, []);

  const upsertArtifact = useCallback((artifact: BuilderArtifact) => {
    setArtifacts((prev) => {
      const key = artifactKey(artifact);
      const filtered = prev.filter((entry) => artifactKey(entry) !== key);
      return [artifact, ...filtered].slice(0, 80);
    });
  }, []);

  const loadArtifacts = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/builder/sessions/${sessionId}/artifacts`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      artifacts?: BuilderArtifact[];
      snapshots?: ProjectSnapshot[];
      queueDiagnostics?: {
        retryScheduledCount?: number;
        deadLetterCount?: number;
        jobs?: BuildJobDiagnostic[];
      };
    };
    setArtifacts(payload.artifacts ?? []);
    setSnapshots(payload.snapshots ?? []);
    setQueueDiagnostics({
      retryScheduledCount: payload.queueDiagnostics?.retryScheduledCount ?? 0,
      deadLetterCount: payload.queueDiagnostics?.deadLetterCount ?? 0,
      jobs: payload.queueDiagnostics?.jobs ?? [],
    });
  }, []);

  const loadDeployments = useCallback(async (sessionId: string, token?: string) => {
    if (!token) {
      setDeployments([]);
      return;
    }
    const response = await fetch(`/api/projects/${sessionId}/deployments`, {
      cache: "no-store",
      headers: {
        "x-builder-session-token": token,
      },
    });
    if (!response.ok) {
      if (response.status !== 404) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setDeployError(payload.error ?? "Failed to load deployments.");
      }
      return;
    }
    const payload = (await response.json()) as { deployments?: DeploymentRecord[] };
    setDeployments(payload.deployments ?? []);
  }, []);

  const loadCheckpoints = useCallback(async (sessionId: string, token?: string) => {
    if (!token) return;
    const response = await fetch(`/api/builder/sessions/${sessionId}/checkpoints`, {
      cache: "no-store",
      headers: { "x-builder-session-token": token },
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      checkpoints?: Record<string, CheckpointRecord>;
      analysis?: ResumeAnalysis;
      timeline?: PhaseTimelineEntry[];
    };
    if (payload.timeline) setPhaseTimeline(payload.timeline);
    if (payload.analysis) setResumeAnalysis(payload.analysis);
  }, []);

  const loadRemediationStatus = useCallback(async (sessionId: string, token?: string) => {
    if (!token) {
      setGithubRepositoryFullName(null);
      setGithubRepositoryUrl(null);
      setSourceCommitSha(null);
      setRemediationBranch(null);
      setRemediationPrUrl(null);
      setRemediationPullRequest(null);
      setRemediationEvents([]);
      return;
    }

    const response = await fetch(`/api/projects/${sessionId}/remediation`, {
      cache: "no-store",
      headers: {
        "x-builder-session-token": token,
      },
    });

    if (!response.ok) {
      if (response.status !== 404) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setGithubError(payload.error ?? "Failed to load remediation status.");
      }
      return;
    }

    const payload = (await response.json()) as {
      repository?: { fullName?: string; url?: string };
      sourceCommitSha?: string;
      remediationBranch?: string;
      remediationPrUrl?: string;
      remediationPullRequest?: RemediationPullRequest | null;
      events?: RemediationEventPayload[];
    };

    setGithubRepositoryFullName(payload.repository?.fullName ?? null);
    setGithubRepositoryUrl(payload.repository?.url ?? null);
    setSourceCommitSha(payload.sourceCommitSha ?? null);
    setRemediationBranch(payload.remediationBranch ?? null);
    setRemediationPrUrl(payload.remediationPrUrl ?? null);
    setRemediationPullRequest(payload.remediationPullRequest ?? null);
    setRemediationEvents(payload.events ?? []);
  }, []);

  const loadProjectState = useCallback(async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      project?: {
        latestPhase?: BuilderPhase;
        latestPreviewUrl?: string;
        runtimeProvider?: BuilderSession["runtimeProviderName"];
        messages?: Array<{ id: string; role: "user" | "assistant"; content: string }>;
      };
    };
    const project = payload.project;
    if (!project) return;
    if (project.latestPhase) setPhase(project.latestPhase);
    if (project.latestPreviewUrl) setPreviewUrl(project.latestPreviewUrl);
    if (project.runtimeProvider) setModelProvider(project.runtimeProvider);
    if (project.messages?.length) {
      setMessages(project.messages.map((message) => ({ id: message.id, role: message.role, content: message.content })));
    }
  }, []);

  const loadWalkthroughState = useCallback(async (sessionId: string, token?: string) => {
    const response = await fetch(`/api/builder/sessions/${sessionId}/walkthrough`, {
      cache: "no-store",
      headers: token ? { "x-builder-session-token": token } : {},
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      screenHypotheses?: ScreenHypothesis[];
      currentIndex?: number;
      wireframeHtml?: string;
      clarificationQuestions?: Record<string, ClarificationQuestion[]>;
      discoveryQuestions?: ClarificationQuestion[];
      discoveryAnswers?: Record<string, string>;
    };
    setWalkthroughScreens(payload.screenHypotheses ?? []);
    setWalkthroughIndex(payload.currentIndex ?? 0);
    setWalkthroughWireframeHtml(payload.wireframeHtml ?? "");
    setWalkthroughClarificationQuestions(payload.clarificationQuestions ?? {});
    setDiscoveryQuestions(payload.discoveryQuestions ?? []);
    setDiscoveryAnswers(payload.discoveryAnswers ?? {});
  }, []);

  const runDiscovery = useCallback(
    async (message: string, allowDegradedContinue = false) => {
      if (!session || isRunning) return;
      const trimmed = message.trim();
      if (!trimmed) return;

      setError(null);
      setStageBlockedReason(null);
      setDiscoveryQuestions([]);
      setDiscoveryAnswers({});
      setIsRunning(true);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);

      try {
        const response = await fetch(`/api/builder/sessions/${session.id}/discover`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-builder-session-token": session.sessionToken ?? "",
          },
          body: JSON.stringify({ message: trimmed, allowDegradedContinue }),
        });

        if (!response.ok || !response.body) {
          throw new Error((await response.json().catch(() => null))?.error ?? "Discovery request failed.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseChunk(buffer);
          buffer = parsed.rest;
          for (const event of parsed.events) {
            if (event.type === "phase") {
              setPhase(event.phase);
              addTrace({ label: event.label, status: "running" });
            } else if (event.type === "discovery_event") {
              addTrace({
                label: `Discovery: ${event.event.type.replace(/_/g, " ")}`,
                detail: event.event.message,
                status: "info",
              });
            } else if (event.type === "artifact_ready") {
              addTrace({ label: event.label, detail: event.artifact, status: "success" });
            } else if (event.type === "walkthrough_state") {
              setWalkthroughIndex(event.currentIndex);
            } else if (event.type === "stage_blocked") {
              setStageBlockedReason(event.reason);
              addTrace({ label: "Stage blocked", detail: event.reason, status: "error" });
            } else if (event.type === "question_set_ready") {
              setDiscoveryQuestions(event.questions);
              setDiscoveryAnswers((prev) => {
                const next: Record<string, string> = {};
                for (const question of event.questions) {
                  next[question.id] = prev[question.id] ?? "";
                }
                return next;
              });
            } else if (event.type === "error") {
              setError(event.message);
              addTrace({ label: "Discovery failed", detail: event.message, status: "error" });
            } else if (event.type === "completed") {
              setSession(event.session);
              setPhase(event.session.phase);
            }
          }
        }

        await loadWalkthroughState(session.id, session.sessionToken);
      } catch (caught) {
        const messageText = caught instanceof Error ? caught.message : "Discovery request failed.";
        setError(messageText);
        addTrace({ label: "Discovery failed", detail: messageText, status: "error" });
      } finally {
        setIsRunning(false);
      }
    },
    [addTrace, isRunning, loadWalkthroughState, session],
  );

  const submitWalkthroughDecision = useCallback(
    async (action: "accept" | "modify" | "reject") => {
      if (!session || isWalkthroughSubmitting) return;
      const screen = walkthroughScreens[walkthroughIndex];
      if (!screen) return;

      setIsWalkthroughSubmitting(true);
      try {
        const response = await fetch(`/api/builder/sessions/${session.id}/walkthrough`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-builder-session-token": session.sessionToken ?? "",
          },
          body: JSON.stringify({
            screenId: screen.id,
            action,
            feedback: walkthroughFeedback || undefined,
            answers: walkthroughAnswers,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          isComplete?: boolean;
          session?: BuilderSession;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to submit walkthrough feedback.");
        }

        if (payload.session) {
          setSession(payload.session);
          setPhase(payload.session.phase);
        }
        setWalkthroughFeedback("");
        setWalkthroughAnswers({});
        await loadWalkthroughState(session.id, session.sessionToken);
        addTrace({ label: `Walkthrough ${action}`, detail: screen.name, status: "success" });
      } catch (caught) {
        const messageText = caught instanceof Error ? caught.message : "Walkthrough submission failed.";
        setError(messageText);
        addTrace({ label: "Walkthrough error", detail: messageText, status: "error" });
      } finally {
        setIsWalkthroughSubmitting(false);
      }
    },
    [
      addTrace,
      isWalkthroughSubmitting,
      loadWalkthroughState,
      session,
      walkthroughAnswers,
      walkthroughFeedback,
      walkthroughIndex,
      walkthroughScreens,
    ],
  );

  const submitDiscoveryQuestions = useCallback(async () => {
    if (!session || isSubmittingDiscoveryAnswers) return;
    if (discoveryQuestions.length === 0) return;

    const hasMissing = discoveryQuestions.some((question) => !(discoveryAnswers[question.id] ?? "").trim());
    if (hasMissing) {
      setError("Please answer all clarification questions before continuing.");
      return;
    }

    setError(null);
    setIsSubmittingDiscoveryAnswers(true);
    try {
      const response = await fetch(`/api/builder/sessions/${session.id}/answer-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken ?? "",
        },
        body: JSON.stringify({ answers: discoveryAnswers }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        session?: BuilderSession;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to submit clarification answers.");
      }

      if (payload.session) {
        setSession(payload.session);
        setPhase(payload.session.phase);
      }
      addTrace({ label: "Clarifications sealed", status: "success" });
      await loadWalkthroughState(session.id, session.sessionToken);
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : "Failed to submit clarification answers.";
      setError(messageText);
      addTrace({ label: "Clarification submission failed", detail: messageText, status: "error" });
    } finally {
      setIsSubmittingDiscoveryAnswers(false);
    }
  }, [
    addTrace,
    discoveryAnswers,
    discoveryQuestions,
    isSubmittingDiscoveryAnswers,
    loadWalkthroughState,
    session,
  ]);

  const handleEvent = useCallback(
    (event: BuilderEvent) => {
      if (event.type === "assistant_delta") {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: event.text },
        ]);
      }

      if (event.type === "question_options") {
        setPendingQuestion(event.question);
        addTrace({ label: "Clarification requested", detail: event.question.question, status: "info" });
      }

      if (event.type === "phase") {
        setPhase(event.phase);
        addTrace({ label: event.label, status: "running" });
      }

      if (event.type === "runtime_status") {
        setModelProvider(event.modelProvider ?? null);
        setResearchProviders(event.activeResearchProviders);
        setCompilerReady(event.compilerReady ?? null);
      }

      if (event.type === "tool_call_started") {
        addTrace({ label: event.name, detail: "started", status: "running" });
      }

      if (event.type === "tool_result") {
        addTrace({
          label: event.name,
          detail: event.error || event.output,
          status: event.ok ? "success" : "error",
        });
      }

      if (event.type === "artifact") {
        addTrace({
          label: event.artifact.title || `${event.artifact.kind} artifact`,
          detail: event.artifact.path || event.artifact.url || event.artifact.content,
          status: "info",
        });
        upsertArtifact(event.artifact);
      }

      if (event.type === "research_summary") {
        addTrace({
          label: `Research: ${event.bundle.productCategory}`,
          detail: event.bundle.sources.map((source) => source.title).join(", "),
          status: "info",
        });
      }

      if (event.type === "enhancement_plan") {
        addTrace({
          label: "Enhancement plan ready",
          detail: [...event.plan.goals, ...event.plan.uiImprovements, ...event.plan.uxImprovements].join(" • "),
          status: "info",
        });
      }

      if (event.type === "enhancement_applied") {
        setEnhancementSummary(event.output);
        addTrace({
          label: event.verification?.success ? "Enhancement applied" : "Enhancement issues found",
          detail: event.verification?.success
            ? event.output
            : event.verification?.issues.join(" | ") || event.output,
          status: event.verification?.success ? "success" : "error",
        });
      }

      if (event.type === "preview_url") {
        setPreviewUrl(event.url);
        addTrace({ label: "Preview ready", detail: event.url, status: "success" });
      }

      if (event.type === "discovery_event") {
        addTrace({
          label: `Discovery: ${event.event.type.replace(/_/g, " ")}`,
          detail: event.event.message,
          status: "info",
        });
      }

      if (event.type === "walkthrough_state") {
        setWalkthroughIndex(event.currentIndex);
      }

      if (event.type === "artifact_ready") {
        addTrace({ label: event.label, detail: event.artifact, status: "success" });
      }

      if (event.type === "stage_blocked") {
        setStageBlockedReason(event.reason);
        addTrace({ label: "Stage blocked", detail: event.reason, status: "error" });
      }

      if (event.type === "question_set_ready") {
        setPhase("collecting_questions");
        setDiscoveryQuestions(event.questions);
        setDiscoveryAnswers((prev) => {
          const next: Record<string, string> = {};
          for (const question of event.questions) {
            next[question.id] = prev[question.id] ?? "";
          }
          return next;
        });
        addTrace({ label: "Clarification set ready", detail: `${event.questions.length} questions`, status: "info" });
      }

      if (event.type === "generation_started") {
        addTrace({ label: "ANCL generation started", status: "running" });
      }

      if (event.type === "ancl_event") {
        const eventType = event.event.type.replace(/_/g, " ");
        addTrace({
          label: `ANCL: ${eventType}`,
          detail: event.event.message,
          status: event.event.type === "compile_failed" ? "error" : "info",
        });
      }

      if (event.type === "remediation_screen_started") {
        addTrace({ label: `Remediation: ${event.screenName}`, detail: event.screenId, status: "running" });
      }

      if (event.type === "verification_complete") {
        addTrace({ label: "Verification complete", detail: event.previewUrl, status: "success" });
      }

      if (event.type === "error") {
        setError(event.message);
        addTrace({ label: "Builder error", detail: event.message, status: "error" });
      }

      if (event.type === "completed") {
        setSession(event.session);
        setPhase(event.session.phase);
        setIsRunning(false);
        if (event.session.previewUrl) setPreviewUrl(event.session.previewUrl);
        setModelProvider(event.session.runtimeProviderName ?? null);
        setResearchProviders(event.session.activeResearchProviders ?? []);
        setCompilerReady(event.session.compilerReady ?? null);
        void loadArtifacts(event.session.id);
        void loadDeployments(event.session.id, event.session.sessionToken);
        void loadRemediationStatus(event.session.id, event.session.sessionToken);
      }
    },
    [addTrace, loadArtifacts, loadDeployments, loadRemediationStatus, upsertArtifact],
  );

  const runMessage = useCallback(
    async (message: string, jobId?: string) => {
      if (!session || isRunning) return;
      const trimmed = message.trim();
      if (!trimmed && !jobId) return;

      setError(null);
      setPendingQuestion(null);
      setIsRunning(true);
      setInput("");
      setEnhancementSummary(null);
      if (trimmed) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
      }

      try {
        const response = await fetch(`/api/builder/sessions/${session.id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-builder-session-token": session.sessionToken ?? "",
          },
          body: JSON.stringify({ message: trimmed || undefined, jobId }),
        });

        if (response.status === 401) {
          const data = await response.json().catch(() => ({}));
          setError(data.error ?? "Your session has expired. Please update your API key.");
          setShowApiKeyDialog(true);
          addTrace({ label: "Authentication failed", detail: "Session expired or API key invalid", status: "error" });
          setIsRunning(false);
          return;
        }

        if (!response.ok || !response.body) {
          throw new Error((await response.json().catch(() => null))?.error ?? "Builder request failed.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseChunk(buffer);
          buffer = parsed.rest;
          for (const event of parsed.events) handleEvent(event);
        }
      } catch (caught) {
        const messageText = caught instanceof Error ? caught.message : "Builder request failed.";
        setError(messageText);
        addTrace({ label: "Request failed", detail: messageText, status: "error" });
      } finally {
        setIsRunning(false);
      }
    },
    [addTrace, handleEvent, isRunning, session],
  );

  const runSseRoute = useCallback(
    async (route: string, body?: Record<string, unknown>) => {
      if (!session || isRunning) return { ok: false, hadError: true };

      const response = await fetch(route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken ?? "",
        },
        body: JSON.stringify(body ?? {}),
      });

      if (!response.ok || !response.body) {
        throw new Error((await response.json().catch(() => null))?.error ?? "Pipeline request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hadError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;
        for (const event of parsed.events) {
          handleEvent(event);
          if (event.type === "error") hadError = true;
        }
      }

      return { ok: !hadError, hadError };
    },
    [handleEvent, isRunning, session],
  );

  const runCoreFlow = useCallback(async () => {
    if (!session || isRunning) return;

    setError(null);
    setPendingQuestion(null);
    setIsRunning(true);

    try {
      // ── Step 1: ANCL generation + E2B compilation ─────────────────────
      addTrace({ label: "ANCL pipeline", detail: "Writing ANCL and compiling in E2B sandbox", status: "running" });
      const anclResult = await runSseRoute(`/api/builder/sessions/${session.id}/ancl`);
      if (anclResult.hadError) {
        addTrace({ label: "ANCL pipeline failed", detail: "Generation failed", status: "error" });
        return;
      }

      // ── Step 2: Publish Flutter project to a new GitHub repo ──────────
      addTrace({ label: "Publishing to GitHub", detail: "Creating new private repository", status: "running" });
      const publishResult = await runSseRoute(`/api/builder/sessions/${session.id}/publish`);
      if (publishResult.hadError) {
        addTrace({ label: "GitHub publish failed", detail: "Could not create repository", status: "error" });
        return;
      }

      // ── Step 3: Clone repo into E2B → flutter build web → serve preview ─
      addTrace({ label: "Building preview", detail: "Cloning repo into E2B and building Flutter web", status: "running" });
      const previewResult = await runSseRoute(`/api/builder/sessions/${session.id}/preview`);
      if (previewResult.hadError) {
        addTrace({ label: "Preview build failed", detail: "Flutter web build error in E2B", status: "error" });
        return;
      }

      addTrace({
        label: "App ready",
        detail: "ANCL compiled, published to GitHub, and preview is live",
        status: "success",
      });
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : "Core flow request failed.";
      setError(messageText);
      addTrace({ label: "Core flow failed", detail: messageText, status: "error" });
    } finally {
      setIsRunning(false);
      await loadProjectState(session.id);
      await loadArtifacts(session.id);
    }
  }, [addTrace, isRunning, loadArtifacts, loadProjectState, runSseRoute, session]);


  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resumeToken = initialProjectId ? window.localStorage.getItem(sessionTokenStorageKey(initialProjectId)) ?? "" : "";
      const response = await fetch("/api/builder/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(resumeToken ? { "x-builder-session-token": resumeToken } : {}),
        },
        body: JSON.stringify(initialProjectId ? { projectId: initialProjectId } : { prompt: initialPrompt }),
      });

      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        if (!cancelled) {
          setError(data.error ?? "Your session has expired. Please update your API key.");
          setShowApiKeyDialog(true);
        }
        return;
      }

      const data = (await response.json()) as { session?: BuilderSession; error?: string };
      if (cancelled) return;
      if (!response.ok || !data.session) {
        setError(data.error ?? "Failed to create builder session.");
        return;
      }
      setSession(data.session);
      setPhase(data.session.phase);
      setModelProvider(data.session.runtimeProviderName ?? null);
      setResearchProviders(data.session.activeResearchProviders ?? []);
      setCompilerReady(data.session.compilerReady ?? null);
      if (data.session.sessionToken) {
        window.localStorage.setItem(sessionTokenStorageKey(data.session.id), data.session.sessionToken);
      }
      await loadProjectState(data.session.id);
      void loadArtifacts(data.session.id);
      void loadDeployments(data.session.id, data.session.sessionToken);
      void loadRemediationStatus(data.session.id, data.session.sessionToken);
      void loadWalkthroughState(data.session.id, data.session.sessionToken);
      void loadCheckpoints(data.session.id, data.session.sessionToken);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialProjectId, initialPrompt, loadArtifacts, loadCheckpoints, loadDeployments, loadProjectState, loadRemediationStatus, loadWalkthroughState]);

  useEffect(() => {
    if (session && initialPrompt && !initialProjectId && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      void runDiscovery(initialPrompt);
    }
  }, [initialProjectId, initialPrompt, runDiscovery, session]);

  useEffect(() => {
    if (!session || hasSubmittedRef.current) return;
    if (phase !== "intent_extraction") return;
    if (walkthroughScreens.length > 0) return;

    const seededPrompt =
      initialPrompt || messages.find((entry) => entry.role === "user")?.content || "";
    if (!seededPrompt.trim()) return;

    hasSubmittedRef.current = true;
    void runDiscovery(seededPrompt);
  }, [initialPrompt, messages, phase, runDiscovery, session, walkthroughScreens.length]);

  const retryBuild = useCallback(async () => {
    if (!session) return;
    const response = await fetch(`/api/projects/${session.id}/retry-build`, {
      method: "POST",
      headers: { "x-builder-session-token": session.sessionToken ?? "" },
    });
    const payload = (await response.json().catch(() => ({}))) as {
      suggestedMessage?: string;
      jobId?: string;
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Failed to queue retry build.");
      return;
    }
    await loadProjectState(session.id);
    setPhase("building");
    addTrace({ label: "Retry build requested", status: "info" });

    if (payload.jobId) {
      await runMessage(payload.suggestedMessage ?? "", payload.jobId);
    }
  }, [addTrace, loadProjectState, runMessage, session]);

  const attemptRepair = useCallback(async () => {
    if (!session) return;
    const response = await fetch(`/api/projects/${session.id}/repair`, {
      method: "POST",
      headers: { "x-builder-session-token": session.sessionToken ?? "" },
    });
    const payload = (await response.json().catch(() => ({}))) as {
      suggestedMessage?: string;
      jobId?: string;
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Failed to queue repair.");
      return;
    }
    await loadProjectState(session.id);
    setPhase("fixing");
    addTrace({ label: "Repair requested", status: "info" });

    if (payload.jobId) {
      await runMessage(payload.suggestedMessage ?? "", payload.jobId);
    }
  }, [addTrace, loadProjectState, runMessage, session]);

  const createSnapshot = useCallback(async () => {
    if (!session) return;
    await fetch(`/api/projects/${session.id}/snapshots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-builder-session-token": session.sessionToken ?? "",
      },
      body: JSON.stringify({
        prompt: messages.find((msg) => msg.role === "user")?.content ?? initialPrompt,
        phase,
        previewUrl,
        outcome: phase === "failed" ? "failed" : "partial",
      }),
    });
    await loadArtifacts(session.id);
    addTrace({ label: "Snapshot created", status: "success" });
  }, [addTrace, initialPrompt, loadArtifacts, messages, phase, previewUrl, session]);

  const restoreSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!session) return;
      await fetch(`/api/projects/${session.id}/snapshots/${snapshotId}/restore`, {
        method: "POST",
        headers: { "x-builder-session-token": session.sessionToken ?? "" },
      });
      await loadProjectState(session.id);
      await loadArtifacts(session.id);
      addTrace({ label: "Snapshot restored", detail: snapshotId, status: "info" });
    },
    [addTrace, loadArtifacts, loadProjectState, session],
  );

  const handleResume = useCallback(async (fromPhase: BuilderPhase) => {
    if (!session?.sessionToken || isResuming || isRunning) return;
    setIsResuming(true);
    setError(null);
    addTrace({ label: `Resuming from ${fromPhase}…`, status: "running" });

    try {
      const response = await fetch(`/api/builder/sessions/${session.id}/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken,
        },
        body: JSON.stringify({ fromPhase }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Resume failed.");
        addTrace({ label: "Resume failed", status: "error" });
        return;
      }

      // Stream the SSE response through the existing event handler
      setIsRunning(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseChunk(buffer);
        buffer = rest;

        for (const event of events) {
          if (event.type === "phase") {
            setPhase(event.phase);
            addTrace({ label: event.label, status: "running" });
          } else if (event.type === "completed") {
            setSession(event.session);
            setPhase(event.session.phase);
            addTrace({ label: "Resume completed", status: "success" });
            // Refresh checkpoints after resume
            void loadCheckpoints(session.id, session.sessionToken);
          } else if (event.type === "error") {
            setError(event.message);
            addTrace({ label: event.message, status: "error" });
          } else if (event.type === "artifact") {
            upsertArtifact(event.artifact);
          }
        }
      }
    } finally {
      setIsResuming(false);
      setIsRunning(false);
    }
  }, [addTrace, isResuming, isRunning, loadCheckpoints, session, upsertArtifact]);

  const triggerDeploy = useCallback(async () => {
    if (!session) return;
    if (deployBusy) return;
    setDeployBusy(true);
    setDeployError(null);
    try {
      const response = await fetch(`/api/projects/${session.id}/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken ?? "",
        },
        body: JSON.stringify({ action: "deploy", environment: "preview", provider: "vercel" }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setDeployError(payload.error ?? "Deployment failed.");
        return;
      }

      addTrace({ label: "Deployment started", status: "info" });
      await loadDeployments(session.id, session.sessionToken);
    } finally {
      setDeployBusy(false);
    }
  }, [addTrace, deployBusy, loadDeployments, session]);

  const rollbackLatestSuccessfulDeployment = useCallback(async () => {
    if (!session || deployBusy) return;
    const successful = deployments.filter((entry) => entry.status === "succeeded");
    if (successful.length < 2) {
      setDeployError("Rollback requires at least one previous successful deployment.");
      return;
    }

    const rollbackTarget = successful[1];
    setDeployBusy(true);
    setDeployError(null);
    try {
      const response = await fetch(`/api/projects/${session.id}/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken ?? "",
        },
        body: JSON.stringify({ action: "rollback", rollbackToDeploymentId: rollbackTarget.deploymentId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setDeployError(payload.error ?? "Rollback failed.");
        return;
      }

      addTrace({ label: "Rollback completed", detail: rollbackTarget.deploymentId, status: "success" });
      await loadDeployments(session.id, session.sessionToken);
    } finally {
      setDeployBusy(false);
    }
  }, [addTrace, deployments, deployBusy, loadDeployments, session]);

  const publishRepository = useCallback(async () => {
    if (!session || githubBusy) return;
    setGithubBusy(true);
    setGithubError(null);
    try {
      const response = await fetch(`/api/projects/${session.id}/github/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken ?? "",
        },
        body: JSON.stringify({}),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; sourceCommitSha?: string };
      if (!response.ok) {
        setGithubError(payload.error ?? "Failed to publish GitHub repository.");
        return;
      }

      if (payload.sourceCommitSha) {
        setSourceCommitSha(payload.sourceCommitSha);
      }
      addTrace({ label: "Repository published", status: "success" });
      await loadRemediationStatus(session.id, session.sessionToken);
      await loadProjectState(session.id);
    } finally {
      setGithubBusy(false);
    }
  }, [addTrace, githubBusy, loadProjectState, loadRemediationStatus, session]);

  const openRemediationPullRequest = useCallback(async () => {
    if (!session || githubBusy) return;
    setGithubBusy(true);
    setGithubError(null);
    try {
      const response = await fetch(`/api/projects/${session.id}/remediation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken ?? "",
        },
        body: JSON.stringify({ action: "open_pr" }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setGithubError(payload.error ?? "Failed to open remediation pull request.");
        return;
      }

      addTrace({ label: "Remediation PR opened", status: "success" });
      await loadRemediationStatus(session.id, session.sessionToken);
      await loadProjectState(session.id);
    } finally {
      setGithubBusy(false);
    }
  }, [addTrace, githubBusy, loadProjectState, loadRemediationStatus, session]);

  const syncRemediationStatus = useCallback(async () => {
    if (!session || githubBusy) return;
    setGithubBusy(true);
    setGithubError(null);
    try {
      const response = await fetch(`/api/projects/${session.id}/remediation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken ?? "",
        },
        body: JSON.stringify({ action: "sync_status" }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setGithubError(payload.error ?? "Failed to sync remediation status.");
        return;
      }

      addTrace({ label: "Remediation status synced", status: "info" });
      await loadRemediationStatus(session.id, session.sessionToken);
      await loadProjectState(session.id);
    } finally {
      setGithubBusy(false);
    }
  }, [addTrace, githubBusy, loadProjectState, loadRemediationStatus, session]);

  const mergeRemediationPullRequest = useCallback(async () => {
    if (!session || githubBusy || !remediationPullRequest) return;
    setGithubBusy(true);
    setGithubError(null);
    try {
      const response = await fetch(`/api/projects/${session.id}/remediation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-builder-session-token": session.sessionToken ?? "",
        },
        body: JSON.stringify({
          action: "merge_pr",
          pullNumber: remediationPullRequest.number,
          expectedHeadSha: remediationPullRequest.headSha,
          mergeMethod: "squash",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setGithubError(payload.error ?? "Failed to merge remediation pull request.");
        return;
      }

      addTrace({ label: "Remediation PR merged", status: "success" });
      await loadRemediationStatus(session.id, session.sessionToken);
      await loadProjectState(session.id);
    } finally {
      setGithubBusy(false);
    }
  }, [addTrace, githubBusy, loadProjectState, loadRemediationStatus, remediationPullRequest, session]);

  const PHASE_LABELS: Record<BuilderPhase, string> = {
    clarifying: "Clarifying",
    planning: "Planning",
    generating: "Generating",
    building: "Building",
    generating_ancl: "Writing ANCL",
    compiling: "Compiling in E2B",
    intent_extraction: "Extracting Intent",
    domain_research: "Domain Research",
    screen_architecture: "Screen Architecture",
    collecting_questions: "Clarification Questions",
    walkthrough: "Screen Walkthrough",
    ancl_generation: "ANCL Generation",
    fixing: "Fixing",
    researching: "Researching",
    planning_enhancement: "Planning Enhancement",
    enhancing: "Enhancing",
    verifying: "Verifying",
    serving: "Serving",
    repo_publish: "Publishing to GitHub",
    preview_ready: "Building Preview",
    deployable: "Ready to Deploy",
    complete: "Complete",
    failed: "Failed",
  };
  const phaseLabel = PHASE_LABELS[phase] ?? phase.replace(/_/g, " ");
  const currentWalkthroughScreen = walkthroughScreens[walkthroughIndex] ?? null;
  const currentClarificationQuestions = currentWalkthroughScreen
    ? walkthroughClarificationQuestions[currentWalkthroughScreen.id] ?? []
    : [];

  useEffect(() => {
    if (!currentWalkthroughScreen) return;
    const questions = walkthroughClarificationQuestions[currentWalkthroughScreen.id] ?? [];
    if (questions.length === 0) return;

    setWalkthroughAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const question of questions) {
        if (next[question.id] === undefined && question.answer) {
          next[question.id] = question.answer;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentWalkthroughScreen, walkthroughClarificationQuestions]);

  return (
    <div className="workspace-root relative flex h-screen w-full overflow-hidden bg-slate-50">
      <SkyBackground variant="workspace" />

      <aside
        className={cn(
          "workspace-sidebar h-full flex flex-col glass-card !rounded-none !border-y-0 !border-l-0 !shadow-none z-20 w-[420px] shrink-0",
          isMobile && mobileView === "preview" ? "hidden" : "flex",
        )}
      >
        <header className="flex flex-col gap-5 py-8 px-8 border-b border-black/5 bg-white/10 backdrop-blur-md">
          <div className="flex items-center justify-between w-full">
            <nav className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
              <button onClick={() => router.push("/flutter")} className="hover:text-slate-900 transition-colors">
                Workspace
              </button>
              <span>/</span>
              <span className="text-slate-600">{phaseLabel}</span>
            </nav>
            <div
              data-testid="workspace-running-state"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm uppercase",
                isRunning
                  ? "bg-sky-50 text-sky-600 border-sky-100"
                  : phase === "failed"
                    ? "bg-red-50 text-red-600 border-red-100"
                    : "bg-emerald-50 text-emerald-600 border-emerald-100",
              )}
            >
              <div className={cn("size-1.5 rounded-full", isRunning ? "bg-sky-500 animate-pulse" : "bg-emerald-500")} />
              {isRunning ? "Running" : phase}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-950 leading-tight tracking-tight font-display truncate">
                {session?.projectName || initialPrompt || "Samaa Builder"}
              </h1>
              <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase mt-1 opacity-60">
                ANCL to Flutter pipeline
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="workspace-retry-build"
                  onClick={() => void retryBuild()}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                >
                  Retry Build
                </button>
                <button
                  type="button"
                  data-testid="workspace-repair"
                  onClick={() => void attemptRepair()}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                >
                  Repair
                </button>
                <button
                  type="button"
                  data-testid="workspace-snapshot"
                  onClick={() => void createSnapshot()}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                >
                  Snapshot
                </button>
                <button
                  type="button"
                  data-testid="workspace-github-publish"
                  onClick={() => void publishRepository()}
                  disabled={githubBusy || isRunning || !session?.sessionToken}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 disabled:opacity-50"
                >
                  Publish Repo
                </button>
                <button
                  type="button"
                  data-testid="workspace-remediation-open-pr"
                  onClick={() => void openRemediationPullRequest()}
                  disabled={githubBusy || isRunning || !githubRepositoryFullName || !sourceCommitSha || !session?.sessionToken}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700 disabled:opacity-50"
                >
                  Open PR
                </button>
                <button
                  type="button"
                  data-testid="workspace-remediation-sync"
                  onClick={() => void syncRemediationStatus()}
                  disabled={githubBusy || isRunning || !remediationPrUrl || !session?.sessionToken}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 disabled:opacity-50"
                >
                  Sync PR
                </button>
                <button
                  type="button"
                  data-testid="workspace-remediation-merge"
                  onClick={() => void mergeRemediationPullRequest()}
                  disabled={
                    githubBusy ||
                    isRunning ||
                    !remediationPullRequest ||
                    remediationPullRequest.merged ||
                    remediationPullRequest.state !== "open" ||
                    !session?.sessionToken
                  }
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 disabled:opacity-50"
                >
                  Merge PR
                </button>
                <button
                  type="button"
                  data-testid="workspace-deploy"
                  onClick={() => void triggerDeploy()}
                  disabled={deployBusy || isRunning || !session?.sessionToken || !sourceCommitSha}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 disabled:opacity-50"
                >
                  Deploy
                </button>
                <button
                  type="button"
                  data-testid="workspace-rollback"
                  onClick={() => void rollbackLatestSuccessfulDeployment()}
                  disabled={deployBusy || deployments.filter((entry) => entry.status === "succeeded").length < 2}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 disabled:opacity-50"
                >
                  Rollback
                </button>
                {modelProvider ? (
                  <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                    {modelProvider}
                  </span>
                ) : null}
                {researchProviders.map((provider) => (
                  <span
                    key={provider}
                    className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                  >
                    {provider}
                  </span>
                ))}
                {compilerReady !== null ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                      compilerReady
                        ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border border-red-100 bg-red-50 text-red-700",
                    )}
                  >
                    {compilerReady ? "compiler ready" : "compiler blocked"}
                  </span>
                ) : null}
              </div>
              {deployError ? <p className="mt-2 text-xs text-red-600">{deployError}</p> : null}
              {githubError ? <p className="mt-2 text-xs text-red-600">{githubError}</p> : null}
              {githubRepositoryFullName ? (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Repo: {githubRepositoryFullName}
                </p>
              ) : null}
              {sourceCommitSha ? (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Source commit: {sourceCommitSha.slice(0, 12)}
                </p>
              ) : null}
              {remediationPullRequest ? (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  PR #{remediationPullRequest.number}: {remediationPullRequest.merged ? "merged" : remediationPullRequest.state}
                </p>
              ) : null}
              {deployments.length > 0 ? (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Latest deploy: {deployments[0].status} ({deployments[0].provider})
                </p>
              ) : null}
              {githubRepositoryUrl ? (
                <a
                  href={githubRepositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wide text-sky-600 hover:underline"
                >
                  Open Repository
                </a>
              ) : null}
              {remediationPrUrl ? (
                <a
                  href={remediationPrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 ml-3 inline-block text-[10px] font-bold uppercase tracking-wide text-violet-600 hover:underline"
                >
                  Open Pull Request
                </a>
              ) : null}
              {remediationEvents.length > 0 ? (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Last remediation event: {remediationEvents[0].type.replace(/_/g, " ")}
                </p>
              ) : null}
              {(queueDiagnostics.retryScheduledCount > 0 || queueDiagnostics.deadLetterCount > 0) && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">Queue Diagnostics</p>
                    <button
                      type="button"
                      onClick={() => session && void loadArtifacts(session.id)}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      retry_scheduled: {queueDiagnostics.retryScheduledCount}
                    </span>
                    <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                      dead_letter: {queueDiagnostics.deadLetterCount}
                    </span>
                  </div>
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                    {queueDiagnostics.jobs.slice(0, 6).map((job) => (
                      <div key={job.id} className="rounded-lg border border-black/5 bg-white/80 px-2 py-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                          {job.action} • {job.status}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          retries {job.retryCount}/{job.maxRetries}
                          {job.nextAttemptAt ? ` • next ${new Date(job.nextAttemptAt).toLocaleTimeString()}` : ""}
                        </p>
                        {(job.errorNote || job.terminalReason) ? (
                          <p className="line-clamp-1 text-[10px] text-slate-400">{job.errorNote ?? job.terminalReason}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileView("preview")}
                className="p-3 rounded-lg bg-slate-900 text-white hover:bg-black transition-all active:scale-95 shadow-lg"
              >
                <Monitor className="size-4" />
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
          {stageBlockedReason ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Stage blocked</p>
              <p className="mt-1 text-xs text-amber-800">{stageBlockedReason}</p>
              <button
                type="button"
                onClick={() => initialPrompt && void runDiscovery(initialPrompt, true)}
                className="mt-3 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700"
              >
                Continue With Degraded Research
              </button>
            </div>
          ) : null}

          {phase === "walkthrough" && currentWalkthroughScreen ? (
            <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
                Walkthrough {walkthroughIndex + 1}/{walkthroughScreens.length}
              </p>
              <h3 className="text-base font-bold text-slate-900">{currentWalkthroughScreen.name}</h3>
              <p className="text-sm text-slate-700">{currentWalkthroughScreen.purpose}</p>
              <div className="rounded-md border border-sky-100 bg-white p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Assumption</p>
                <p className="mt-1">{currentWalkthroughScreen.assumption}</p>
              </div>
              <div className="rounded-md border border-sky-100 bg-white p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Features</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {currentWalkthroughScreen.features.map((feature) => (
                    <li key={feature.id}>{feature.name}</li>
                  ))}
                </ul>
              </div>
              {currentWalkthroughScreen.edgeCases.length > 0 ? (
                <div className="rounded-md border border-sky-100 bg-white p-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Edge Cases</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {currentWalkthroughScreen.edgeCases.map((edgeCase) => (
                      <li key={edgeCase}>{edgeCase}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {walkthroughWireframeHtml ? (
                <div className="rounded-md border border-sky-100 bg-white p-2">
                  <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Wireframe</p>
                  <iframe
                    srcDoc={walkthroughWireframeHtml}
                    title="Walkthrough wireframe"
                    className="h-56 w-full rounded border border-slate-100"
                  />
                </div>
              ) : null}
              {currentClarificationQuestions.length > 0 ? (
                <div className="space-y-3 rounded-md border border-sky-100 bg-white p-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Clarification Questions</p>
                  {currentClarificationQuestions.map((question) => (
                    <div key={question.id} className="space-y-2 rounded-md border border-slate-100 p-2">
                      <p className="text-xs font-semibold text-slate-800">{question.question}</p>
                      <p className="text-[11px] text-slate-500">{question.rationale}</p>
                      {question.suggestedOptions?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {question.suggestedOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                setWalkthroughAnswers((prev) => ({
                                  ...prev,
                                  [question.id]: option,
                                }))
                              }
                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <input
                        value={walkthroughAnswers[question.id] ?? ""}
                        onChange={(event) =>
                          setWalkthroughAnswers((prev) => ({
                            ...prev,
                            [question.id]: event.target.value,
                          }))
                        }
                        placeholder="Answer this question in simple terms"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              <textarea
                value={walkthroughFeedback}
                onChange={(event) => setWalkthroughFeedback(event.target.value)}
                placeholder="Add corrections or notes for this screen..."
                className="min-h-20 w-full rounded-md border border-sky-100 bg-white px-3 py-2 text-sm text-slate-800"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isWalkthroughSubmitting}
                  onClick={() => void submitWalkthroughDecision("accept")}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={isWalkthroughSubmitting}
                  onClick={() => void submitWalkthroughDecision("modify")}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700 disabled:opacity-50"
                >
                  Modify
                </button>
                <button
                  type="button"
                  disabled={isWalkthroughSubmitting}
                  onClick={() => void submitWalkthroughDecision("reject")}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : null}

          {phase === "collecting_questions" ? (
            <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                Final Clarification Questions
              </p>
              <p className="text-sm text-slate-700">
                Answer every question once so requirements are sealed deterministically before walkthrough.
              </p>
              <div className="space-y-3">
                {discoveryQuestions.map((question) => (
                  <div key={question.id} className="space-y-2 rounded-md border border-indigo-100 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">{question.question}</p>
                    <p className="text-xs text-slate-500">{question.rationale}</p>
                    {question.suggestedOptions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {question.suggestedOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setDiscoveryAnswers((prev) => ({
                                ...prev,
                                [question.id]: option,
                              }))
                            }
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <input
                      value={discoveryAnswers[question.id] ?? ""}
                      onChange={(event) =>
                        setDiscoveryAnswers((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }))
                      }
                      placeholder="Answer in simple terms"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void submitDiscoveryQuestions()}
                disabled={isSubmittingDiscoveryAnswers || discoveryQuestions.length === 0}
                className="rounded-full border border-indigo-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700 disabled:opacity-50"
              >
                {isSubmittingDiscoveryAnswers ? "Submitting..." : "Submit Answers"}
              </button>
            </div>
          ) : null}

          {phase === "ancl_generation" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Requirements sealed</p>
              <p className="mt-1 text-xs text-emerald-800">All screens are validated. You can generate the app now.</p>
              <button
                type="button"
                onClick={() => void runCoreFlow()}
                disabled={isRunning}
                className="mt-3 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 disabled:opacity-50"
              >
                Run Core Flow
              </button>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg px-4 py-3 text-sm leading-relaxed border",
                message.role === "user"
                  ? "ml-8 bg-sky-500/10 border-sky-500/20 text-slate-900"
                  : "mr-8 bg-white/45 border-white/50 text-slate-700",
              )}
            >
              {message.content}
            </div>
          ))}

          {pendingQuestion && (
            <div className="space-y-3 rounded-lg border border-sky-500/20 bg-white/55 p-4">
              <p className="text-sm font-semibold text-slate-900">{pendingQuestion.question}</p>
              <div className="space-y-2">
                {pendingQuestion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={isRunning}
                    onClick={() => runMessage(option)}
                    className="w-full rounded-lg border border-black/5 bg-white/70 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-white active:scale-[0.99]"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Phase Timeline + Resume Banner ─────────────────────────── */}
          {phaseTimeline.length > 0 && (
            <div className="rounded-xl border border-white/30 bg-white/40 backdrop-blur-sm overflow-hidden">
              {/* Timeline header */}
              <div className="px-4 py-2.5 border-b border-black/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Build Pipeline</span>
                {resumeAnalysis?.stuckPhase && !isRunning && (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Paused at {resumeAnalysis.stuckPhase.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {/* Phase rows */}
              <div className="divide-y divide-black/5">
                {phaseTimeline.map((entry) => (
                  <div key={entry.phase} className={cn(
                    "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                    entry.status === "complete" && "opacity-60",
                    entry.status === "running" && "bg-blue-50/50",
                    entry.status === "stuck" && "bg-amber-50/60",
                  )}>
                    {/* Status icon */}
                    <span className="text-base leading-none flex-shrink-0">
                      {entry.status === "complete" && "✅"}
                      {entry.status === "running" && <Loader2 className="size-4 animate-spin text-blue-500" />}
                      {entry.status === "stuck" && "❌"}
                      {entry.status === "pending" && "⬜"}
                    </span>

                    {/* Label + time */}
                    <span className={cn(
                      "flex-1 font-medium",
                      entry.status === "complete" && "text-slate-500",
                      entry.status === "running" && "text-blue-700",
                      entry.status === "stuck" && "text-amber-700",
                      entry.status === "pending" && "text-slate-400",
                    )}>
                      {entry.label}
                    </span>
                    {entry.completedAt && (
                      <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                        {new Date(entry.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}

                    {/* Resume button */}
                    {(entry.status === "stuck" || entry.status === "pending") &&
                      entry.isResumable &&
                      !entry.isInteractive &&
                      !isRunning &&
                      resumeAnalysis?.nextResumable === entry.phase && (
                        <button
                          type="button"
                          disabled={isResuming}
                          onClick={() => void handleResume(entry.phase)}
                          className="flex-shrink-0 rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700 active:scale-95 disabled:opacity-50"
                        >
                          {isResuming ? <Loader2 className="size-3 animate-spin" /> : "Resume →"}
                        </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <form
          className="p-6 border-t border-black/5"
          onSubmit={(event) => {
            event.preventDefault();
            if (phase === "intent_extraction" || phase === "domain_research" || phase === "screen_architecture") {
              void runDiscovery(input);
              return;
            }
            if (phase === "collecting_questions") {
              void submitDiscoveryQuestions();
              return;
            }
            if (phase === "ancl_generation") {
              void runCoreFlow();
              return;
            }
            void runMessage(input);
          }}
        >
          <div className="flex items-center gap-3 bg-white/55 backdrop-blur-3xl border border-white/50 rounded-lg px-4 py-3 shadow-premium">
            <input
              data-testid="workspace-message-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                !session
                  ? "Creating sandbox..."
                  : phase === "walkthrough"
                    ? "Use the walkthrough controls to validate this screen"
                    : phase === "collecting_questions"
                      ? "Answer all clarification questions above"
                    : phase === "ancl_generation"
                      ? "Press Run Core Flow to execute ANCL -> remediate"
                    : phase === "intent_extraction" || phase === "domain_research" || phase === "screen_architecture"
                      ? "Refine discovery intent..."
                      : "Describe or refine the app..."
              }
              disabled={!session || isRunning || phase === "walkthrough" || phase === "collecting_questions"}
              className="flex-1 bg-transparent border-none outline-none text-slate-900 text-sm placeholder:text-slate-400"
            />
            <button
              type="submit"
              data-testid="workspace-send"
              disabled={!session || isRunning || (!input.trim() && phase !== "collecting_questions") || phase === "walkthrough"}
              className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-white disabled:opacity-40"
            >
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </form>
      </aside>

      <main
        className={cn(
          "workspace-content h-full flex-1 min-w-0 flex flex-col relative",
          isMobile && mobileView === "chat" ? "hidden" : "flex",
        )}
      >
        {isMobile && mobileView === "preview" && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
            <button
              type="button"
              onClick={() => setMobileView("chat")}
              className="flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-black/5 text-slate-900 px-5 py-2.5 rounded-full shadow-xl active:scale-95 transition-all outline-none"
            >
              <MessageSquare className="size-4" />
              <span className="text-sm font-semibold">Back to Chat</span>
            </button>
          </div>
        )}

        <div className="absolute top-6 right-6 z-[20]">
          <ApiKeySettingsDialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog} />
        </div>

        <div className="workspace-preview-container flex-1 m-4 rounded-3xl overflow-hidden border border-black/5 shadow-2xl bg-white/50 backdrop-blur-sm relative z-10">
          <PreviewPanel previewUrl={previewUrl} isRunning={isRunning} />
        </div>

        <div className="absolute bottom-8 right-8 z-20 hidden w-[380px] max-h-[60vh] overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-xl backdrop-blur-xl xl:flex xl:flex-col">
          <div className="border-b border-black/5 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Artifacts</p>
          </div>
          <div data-testid="workspace-artifacts" className="max-h-[34vh] overflow-y-auto border-b border-black/5">
            <ArtifactPanel
              artifacts={artifacts}
              enhancementSummary={enhancementSummary}
              snapshots={snapshots}
              onRestoreSnapshot={restoreSnapshot}
            />
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Trace</p>
          </div>
          <div className="overflow-y-auto p-3 space-y-2">
            {trace.length === 0 ? (
              <p className="px-1 py-2 text-xs text-slate-400">Pipeline events will appear here.</p>
            ) : (
              trace.map((item) => (
                <div key={item.id} className="rounded-lg border border-black/5 bg-white/65 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        item.status === "error"
                          ? "bg-red-500"
                          : item.status === "success"
                            ? "bg-emerald-500"
                            : item.status === "running"
                              ? "bg-sky-500 animate-pulse"
                              : "bg-slate-300",
                      )}
                    />
                    <p className="truncate text-xs font-semibold text-slate-800">{item.label}</p>
                  </div>
                  {item.detail && (
                    <p className="mt-1 break-words text-[11px] leading-relaxed text-slate-500 line-clamp-3">
                      {item.detail}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FlutterWorkspacePageInner({ initialProjectId }: { initialProjectId?: string }) {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") ?? "";
  const queryProjectId = searchParams.get("projectId") ?? undefined;
  return <WorkspaceContent initialPrompt={initialPrompt} initialProjectId={initialProjectId ?? queryProjectId} />;
}

export default function FlutterWorkspacePage({ initialProjectId }: { initialProjectId?: string } = {}) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="text-white/30 text-sm">Loading...</div>
        </div>
      }
    >
      <FlutterWorkspacePageInner initialProjectId={initialProjectId} />
    </Suspense>
  );
}
