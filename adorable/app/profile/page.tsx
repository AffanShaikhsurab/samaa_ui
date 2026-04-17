"use client";

/**
 * app/profile/page.tsx
 *
 * Phase E + F: User Profile Page
 *
 * Sections:
 *  1. User card — Clerk avatar, name, email, plan badge
 *  2. Stats grid — total projects, completed builds, running, failed builds
 *  3. Deployment activity — recent deployments across all projects
 *  4. Recent projects — 3 most recent with status + resume link
 *  5. Quick links — Templates, Settings, Dashboard
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  status: "idle" | "running" | "complete" | "failed";
  updatedAt: string;
  latestPreviewUrl?: string;
  latestPhase?: string;
  deployments?: Array<{
    deploymentId: string;
    status: string;
    provider: string;
    url?: string;
    createdAt: string;
    environment: string;
  }>;
};

const STATUS_CONFIG: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  idle: { label: "Idle", dotClass: "bg-slate-400", badgeClass: "border-slate-200 bg-slate-50 text-slate-600" },
  running: { label: "Building", dotClass: "bg-sky-500 animate-pulse", badgeClass: "border-sky-200 bg-sky-50 text-sky-700" },
  complete: { label: "Complete", dotClass: "bg-emerald-500", badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", dotClass: "bg-red-500", badgeClass: "border-red-200 bg-red-50 text-red-600" },
};

const DEPLOY_STATUS_BADGE: Record<string, string> = {
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  running: "border-sky-200 bg-sky-50 text-sky-700",
  failed: "border-red-200 bg-red-50 text-red-600",
  queued: "border-slate-200 bg-slate-50 text-slate-600",
  rolled_back: "border-amber-200 bg-amber-50 text-amber-700",
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - Date.parse(isoDate);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function ProfilePage() {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { projects?: Project[] };
        setProjects(payload.projects ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => ({
    total: projects.length,
    complete: projects.filter((p) => p.status === "complete").length,
    failed: projects.filter((p) => p.status === "failed").length,
    running: projects.filter((p) => p.status === "running").length,
    deployed: projects.filter((p) => (p.deployments?.length ?? 0) > 0).length,
  }), [projects]);

  // Gather all deployments across all projects for activity feed
  const recentDeployments = useMemo(() => {
    return projects
      .flatMap((p) => (p.deployments ?? []).map((d) => ({ ...d, projectName: p.name, projectId: p.id })))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [projects]);

  const recentProjects = projects.slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/20 flex items-center justify-center">
        <div className="text-sm text-slate-400 animate-pulse">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/20">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:px-10">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500">Profile</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Account overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              ⚙ Settings
            </Link>
            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-black transition"
            >
              My Projects
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── User Card ────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-5">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt="User avatar"
                  className="size-16 rounded-full border-2 border-white shadow-md"
                />
              ) : (
                <div className="size-16 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xl font-bold">
                  {user?.firstName?.charAt(0) ?? "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xl font-bold text-slate-900">{user?.fullName ?? "User"}</p>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                    Free Plan
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {user?.primaryEmailAddress?.emailAddress ?? "No email"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "N/A"}
                </p>
              </div>
              <Link
                href="/settings"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white transition"
              >
                Edit →
              </Link>
            </div>
          </section>

          {/* ── Stats Grid ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { label: "Total Projects", value: stats.total, valueClass: "text-slate-900" },
              { label: "Completed", value: stats.complete, valueClass: "text-emerald-700" },
              { label: "Building", value: stats.running, valueClass: "text-sky-700" },
              { label: "Failed", value: stats.failed, valueClass: "text-red-600" },
              { label: "Deployed", value: stats.deployed, valueClass: "text-violet-700" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm text-center">
                <p className={cn("text-2xl font-bold", stat.valueClass)}>{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* ── Deployment Activity ──────────────────────────────────── */}
          {recentDeployments.length > 0 && (
            <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-900 mb-4">Deployment activity</p>
              <div className="space-y-2">
                {recentDeployments.map((d) => (
                  <div key={d.deploymentId} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0", DEPLOY_STATUS_BADGE[d.status] ?? "border-slate-200 bg-slate-50 text-slate-600")}>
                        {d.status}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{d.projectName}</p>
                        <p className="text-[10px] text-slate-400">{d.environment} · {d.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.url && d.status === "succeeded" && (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-sky-600 hover:underline"
                        >
                          Open ↗
                        </a>
                      )}
                      <span className="text-[10px] text-slate-400">{timeAgo(d.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Recent Projects ──────────────────────────────────────── */}
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Recent projects</p>
              <Link href="/dashboard" className="text-sm font-bold text-sky-600 hover:underline">
                View all →
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">No projects yet.</p>
                <Link
                  href="/flutter"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-bold hover:bg-black transition"
                >
                  Start building →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((project) => {
                  const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.idle;
                  return (
                    <Link
                      key={project.id}
                      href={`/flutter/workspace/${project.id}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-sky-200 hover:bg-sky-50/50 transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn("size-2 rounded-full shrink-0", cfg.dotClass)} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-sky-700">{project.name}</p>
                          <p className="text-[11px] text-slate-400">{timeAgo(project.updatedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", cfg.badgeClass)}>
                          {cfg.label}
                        </span>
                        {project.latestPreviewUrl && (
                          <a
                            href={project.latestPreviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold text-sky-600 hover:underline"
                          >
                            Preview ↗
                          </a>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Quick Links ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[
              { href: "/templates", icon: "🎨", label: "Browse Templates", desc: "Start from a curated template" },
              { href: "/flutter", icon: "✨", label: "New Project", desc: "Build something from scratch" },
              { href: "/settings", icon: "⚙", label: "Settings", desc: "API keys and LLM provider" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-3xl border border-black/5 bg-white p-5 shadow-sm hover:border-sky-200 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-3">{link.icon}</div>
                <p className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">{link.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
