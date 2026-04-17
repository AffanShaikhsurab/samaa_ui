import { getSandbox } from "@/lib/flutter-session";
import { BuilderPhase, ProjectRecord } from "@/lib/project-store";

export type BuilderSession = {
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

export function toBuilderSession(project: ProjectRecord): BuilderSession {
  const sandbox = getSandbox(project.id);
  return {
    id: project.id,
    sessionToken: project.sessionToken,
    sandboxId: sandbox?.sandboxId ?? "pending",
    phase: project.latestPhase,
    createdAt: project.createdAt,
    projectName: project.name,
    previewUrl: project.latestPreviewUrl,
    runtimeProviderName: project.runtimeProvider,
    activeResearchProviders: [],
    compilerReady: true,
  };
}

export function sseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}
