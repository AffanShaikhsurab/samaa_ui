"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  initialPrompt: string;
  status: "idle" | "running" | "complete" | "failed";
  createdAt: string;
  updatedAt: string;
  latestPreviewUrl?: string;
  latestPhase: string;
  lastError?: string;
};

const sessionTokenStorageKey = (projectId: string) => `samaa:session-token:${projectId}`;

const statusBadgeClass: Record<Project["status"], string> = {
  idle: "bg-slate-100 text-slate-700 border-slate-200",
  running: "bg-sky-50 text-sky-700 border-sky-200",
  complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployFeedback, setDeployFeedback] = useState<Record<string, string>>({});

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const payload = (await response.json()) as { projects?: Project[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load projects.");
      }
      setProjects(payload.projects ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [projects],
  );

  const handleDelete = useCallback(
    async (projectId: string) => {
      const sessionToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem(sessionTokenStorageKey(projectId)) ?? ""
          : "";
      if (!sessionToken) {
        setDeployFeedback((prev) => ({ ...prev, [projectId]: "Missing session token for delete." }));
        return;
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "x-builder-session-token": sessionToken },
      });
      if (!response.ok) return;
      await loadProjects();
    },
    [loadProjects],
  );

  const handleDuplicate = useCallback(
    async (projectId: string) => {
      const sessionToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem(sessionTokenStorageKey(projectId)) ?? ""
          : "";
      if (!sessionToken) {
        setDeployFeedback((prev) => ({ ...prev, [projectId]: "Missing session token for duplicate." }));
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/duplicate`, {
        method: "POST",
        headers: { "x-builder-session-token": sessionToken },
      });
      const payload = (await response.json()) as { project?: Project };
      if (response.ok && payload.project?.id) {
        router.push(`/flutter/workspace/${payload.project.id}`);
      }
    },
    [router],
  );

  const handleDeploy = useCallback(async (project: Project) => {
    const sessionToken = typeof window !== "undefined" ? window.localStorage.getItem(sessionTokenStorageKey(project.id)) ?? "" : "";
    if (!sessionToken) {
      setDeployFeedback((prev) => ({ ...prev, [project.id]: "Missing session token for deploy." }));
      return;
    }

    const response = await fetch(`/api/projects/${project.id}/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-builder-session-token": sessionToken,
      },
      body: JSON.stringify({ action: "deploy", environment: "preview", provider: "vercel" }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setDeployFeedback((prev) => ({ ...prev, [project.id]: payload.error ?? "Deploy failed." }));
      return;
    }

    setDeployFeedback((prev) => ({ ...prev, [project.id]: "Deploy succeeded." }));
  }, []);

  const handleRollback = useCallback(async (project: Project) => {
    const sessionToken = typeof window !== "undefined" ? window.localStorage.getItem(sessionTokenStorageKey(project.id)) ?? "" : "";
    if (!sessionToken) {
      setDeployFeedback((prev) => ({ ...prev, [project.id]: "Missing session token for rollback." }));
      return;
    }

    const listResponse = await fetch(`/api/projects/${project.id}/deployments`, {
      headers: { "x-builder-session-token": sessionToken },
    });
    const listPayload = (await listResponse.json().catch(() => ({}))) as {
      deployments?: Array<{ deploymentId: string; status: string }>;
      error?: string;
    };
    if (!listResponse.ok) {
      setDeployFeedback((prev) => ({ ...prev, [project.id]: listPayload.error ?? "Failed to load deployments." }));
      return;
    }

    const successful = (listPayload.deployments ?? []).filter((entry) => entry.status === "succeeded");
    const target = successful[1];
    if (!target) {
      setDeployFeedback((prev) => ({ ...prev, [project.id]: "Rollback requires a previous successful deployment." }));
      return;
    }

    const response = await fetch(`/api/projects/${project.id}/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-builder-session-token": sessionToken,
      },
      body: JSON.stringify({ action: "rollback", rollbackToDeploymentId: target.deploymentId }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setDeployFeedback((prev) => ({ ...prev, [project.id]: payload.error ?? "Rollback failed." }));
      return;
    }

    setDeployFeedback((prev) => ({ ...prev, [project.id]: "Rollback succeeded." }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-10 md:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Flutter Builder Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/flutter"
              data-testid="dashboard-new-project"
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              New Project
            </Link>
            <button
              type="button"
              data-testid="dashboard-refresh"
              onClick={() => void loadProjects()}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading projects...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && sortedProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
            <p className="text-sm text-slate-600">No projects yet. Create your first Flutter app from /flutter.</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sortedProjects.map((project) => (
            <div
              key={project.id}
              data-testid="dashboard-project-card"
              data-project-id={project.id}
              className="rounded-2xl border border-black/5 bg-white/90 p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{project.latestPhase}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                    statusBadgeClass[project.status],
                  )}
                >
                  {project.status}
                </span>
              </div>

              <p className="line-clamp-2 text-sm text-slate-600">{project.initialPrompt || "No prompt captured."}</p>
              {project.lastError ? <p className="mt-2 text-xs text-red-600">Last error: {project.lastError}</p> : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href={`/flutter/workspace/${project.id}`}
                  data-testid="dashboard-resume"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
                >
                  Resume
                </Link>
                <button
                  type="button"
                  data-testid="dashboard-duplicate"
                  onClick={() => void handleDuplicate(project.id)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  data-testid="dashboard-delete"
                  onClick={() => void handleDelete(project.id)}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Delete
                </button>
                <button
                  type="button"
                  data-testid="dashboard-deploy"
                  onClick={() => void handleDeploy(project)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Deploy
                </button>
                <button
                  type="button"
                  data-testid="dashboard-rollback"
                  onClick={() => void handleRollback(project)}
                  className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  Rollback
                </button>
              </div>

              {deployFeedback[project.id] ? (
                <p className="mt-2 text-xs text-slate-500">{deployFeedback[project.id]}</p>
              ) : null}

              <p className="mt-3 text-[11px] text-slate-400">Updated {new Date(project.updatedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
