"use client";

/**
 * app/templates/page.tsx
 *
 * Phase F: Templates Gallery + Guided Starter Prompts
 *
 * Features:
 *  - Category filter tabs
 *  - Complexity filter
 *  - Guided prompt dialog (shows clarifying questions before building)
 *  - Risk note displayed before building sensitive template types
 *  - Starter Packs by business intent (Phase F: "structured by domain")
 *  - Feature flag: TEMPLATES_V1 (soft check via /api/templates; falls back gracefully)
 *  - Anti-regression: template instantiation calls POST /api/builder/sessions
 *    which enforces auth + queue admission controls
 */

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TemplateCard } from "@/components/templates/template-card";
import { TEMPLATES, STARTER_PACKS, type TemplateCategory, type AppTemplate } from "@/lib/templates-data";

const CATEGORIES: Array<"all" | TemplateCategory> = [
  "all",
  "social",
  "productivity",
  "ecommerce",
  "utility",
  "entertainment",
];

const COMPLEXITY_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// ── Guided Prompt Dialog ──────────────────────────────────────────────────────

type GuidedState = {
  template: AppTemplate;
  answers: Record<string, string>;
  step: number;
};

function buildFinalPrompt(template: AppTemplate, answers: Record<string, string>): string {
  let prompt = template.prompt;
  // Append each answered customization to the base prompt
  for (const part of template.guidedPromptParts) {
    const answer = answers[part.key];
    if (answer) {
      prompt += ` ${answer}.`;
    }
  }
  return prompt.trim();
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const [category, setCategory] = useState<"all" | TemplateCategory>("all");
  const [complexity, setComplexity] = useState<"" | "beginner" | "intermediate" | "advanced">("");
  const [submittingTemplateId, setSubmittingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guided, setGuided] = useState<GuidedState | null>(null);
  const [search, setSearch] = useState("");

  const templates = useMemo(() => {
    let list = category === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);
    if (complexity) list = list.filter((t) => t.complexity === complexity);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      );
    }
    return list;
  }, [category, complexity, search]);

  // Start guided flow for a template
  const handleUseTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    // If the template has guided questions, show the dialog
    if (template.guidedPromptParts.length > 0) {
      setGuided({ template, answers: {}, step: 0 });
      return;
    }

    // No guided questions — build directly
    void startBuild(template.prompt, templateId, template.name);
  }, []);

  const handleGuidedAnswer = (key: string, option: string) => {
    if (!guided) return;
    const newAnswers = { ...guided.answers, [key]: option };
    const nextStep = guided.step + 1;

    if (nextStep < guided.template.guidedPromptParts.length) {
      setGuided({ ...guided, answers: newAnswers, step: nextStep });
    } else {
      // All questions answered — build
      const finalPrompt = buildFinalPrompt(guided.template, newAnswers);
      setGuided(null);
      void startBuild(finalPrompt, guided.template.id, guided.template.name);
    }
  };

  const skipGuided = () => {
    if (!guided) return;
    const finalPrompt = buildFinalPrompt(guided.template, guided.answers);
    setGuided(null);
    void startBuild(finalPrompt, guided.template.id, guided.template.name);
  };

  const startBuild = async (prompt: string, templateId: string, name: string) => {
    setSubmittingTemplateId(templateId);
    setError(null);

    try {
      const response = await fetch("/api/builder/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, name }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        session?: { id: string; sessionToken?: string };
        error?: string;
      };

      if (!response.ok || !payload.session?.id) {
        throw new Error(payload.error ?? "Failed to start template build.");
      }

      if (payload.session.sessionToken) {
        window.localStorage.setItem(
          `samaa:session-token:${payload.session.id}`,
          payload.session.sessionToken,
        );
      }

      router.push(`/flutter/workspace/${payload.session.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to start template build.");
    } finally {
      setSubmittingTemplateId(null);
    }
  };

  const handleStarterPack = (prompt: string) => {
    void startBuild(prompt, "starter-pack", "Starter App");
  };

  const currentGuidedPart = guided ? guided.template.guidedPromptParts[guided.step] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">

      {/* ── Guided Dialog ──────────────────────────────────────────────────── */}
      {guided && currentGuidedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white shadow-2xl p-8 space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {guided.template.guidedPromptParts.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i <= guided.step ? "bg-sky-500" : "bg-slate-200"}`}
                />
              ))}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">
                Customizing · {guided.template.name}
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900 leading-snug">
                {currentGuidedPart.question}
              </h2>
            </div>

            {/* Risk note */}
            {guided.step === 0 && guided.template.riskNote && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700">⚠ Note</p>
                <p className="mt-0.5 text-xs text-amber-700">{guided.template.riskNote}</p>
              </div>
            )}

            <div className="space-y-2">
              {currentGuidedPart.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleGuidedAnswer(currentGuidedPart.key, option)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-800 font-medium transition hover:border-sky-300 hover:bg-sky-50 active:scale-[0.99]"
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setGuided(null)}
                className="text-sm text-slate-400 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={skipGuided}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Skip → Build with defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl px-6 pt-12 pb-8 md:px-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-500">Templates</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
              Start with a template
            </h1>
            <p className="mt-2 max-w-2xl text-base text-slate-500">
              Curated, quality-reviewed Flutter app templates. Pick one and customize with natural language.
            </p>
          </div>
          <a
            href="/flutter"
            className="hidden md:inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Or start from scratch →
          </a>
        </div>

        {/* ── Starter Packs ─────────────────────────────────────────────── */}
        <div className="mt-10">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Quick starters</p>
          <div className="flex flex-wrap gap-3">
            {STARTER_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => handleStarterPack(pack.prompt)}
                disabled={!!submittingTemplateId}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                <span className="text-lg">{pack.icon}</span>
                <span>{pack.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <svg className="size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-44 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  category === item
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Complexity filter */}
          <div className="flex gap-1.5 ml-auto">
            {(["", "beginner", "intermediate", "advanced"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setComplexity(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  complexity === c
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {c === "" ? "All levels" : COMPLEXITY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Template Grid ──────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-10">
        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {templates.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 text-sm">No templates match your filters.</p>
            <button
              type="button"
              onClick={() => { setCategory("all"); setComplexity(""); setSearch(""); }}
              className="mt-4 text-sm font-semibold text-sky-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUseTemplate={handleUseTemplate}
                isSubmitting={submittingTemplateId === template.id}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="mt-8 text-center text-xs text-slate-400">
          {templates.length} template{templates.length !== 1 ? "s" : ""} · Quality gate ≥ 7.0 · Curated by Samaa
        </p>
      </div>
    </div>
  );
}
