"use client";

/**
 * components/templates/template-card.tsx
 *
 * Phase F: Premium Template Card
 *
 * Displays all Phase F required fields:
 *  - Category badge
 *  - Quality score (shown as star rating)
 *  - Complexity dot indicator
 *  - Architecture notes (expandable)
 *  - Use-case description
 *  - Tags
 *  - Risk note warning pill
 *  - Estimated build time
 *  - "Start Building →" CTA
 */

import { useState } from "react";
import type { AppTemplate } from "@/lib/templates-data";
import { cn } from "@/lib/utils";

type Props = {
  template: AppTemplate;
  onUseTemplate: (templateId: string) => void;
  isSubmitting?: boolean;
};

const categoryColors: Record<AppTemplate["category"], string> = {
  social: "bg-pink-50 text-pink-700 border-pink-200",
  productivity: "bg-blue-50 text-blue-700 border-blue-200",
  ecommerce: "bg-amber-50 text-amber-700 border-amber-200",
  utility: "bg-emerald-50 text-emerald-700 border-emerald-200",
  entertainment: "bg-violet-50 text-violet-700 border-violet-200",
};

const complexityDot: Record<AppTemplate["complexity"], string> = {
  beginner: "bg-emerald-500",
  intermediate: "bg-amber-500",
  advanced: "bg-red-500",
};

const complexityLabel: Record<AppTemplate["complexity"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** Convert quality score (1-10) to filled/half/empty stars (out of 5) */
function QualityStars({ score }: { score: number }) {
  const stars = score / 2; // 10-pt → 5-star scale
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Quality score ${score.toFixed(1)} / 10`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={cn(
            "size-3",
            stars >= star ? "text-amber-400" : stars >= star - 0.5 ? "text-amber-300" : "text-slate-200",
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-[10px] font-bold text-slate-500">{score.toFixed(1)}</span>
    </span>
  );
}

export function TemplateCard({ template, onUseTemplate, isSubmitting }: Props) {
  const [showArch, setShowArch] = useState(false);

  return (
    <article className={cn(
      "group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm",
      "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-black/10",
    )}>
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        <img
          src={template.thumbnail}
          alt={`${template.name} preview`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            // Fallback to a gradient placeholder if image missing
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {/* Category badge overlaid on thumbnail */}
        <span className={cn(
          "absolute top-3 left-3 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm",
          categoryColors[template.category],
        )}>
          {template.category}
        </span>

        {/* Risk note badge */}
        {template.riskNote && (
          <span className="absolute top-3 right-3 rounded-full border border-amber-200 bg-amber-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 backdrop-blur-sm">
            ⚠ review
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Name + Quality */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 leading-tight">{template.name}</h3>
          <QualityStars score={template.qualityScore} />
        </div>

        {/* Use case */}
        <p className="text-sm text-slate-500 leading-relaxed">{template.useCase}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {template.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {tag}
            </span>
          ))}
        </div>

        {/* Architecture notes (collapsible) */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowArch((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Architecture</span>
            <span className={cn("text-slate-400 transition-transform duration-200", showArch && "rotate-180")}>
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          {showArch && (
            <p className="border-t border-slate-100 px-3 pb-3 pt-2 text-[11px] leading-relaxed text-slate-600">
              {template.architectureNotes}
            </p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("inline-block size-2 rounded-full", complexityDot[template.complexity])} />
            {complexityLabel[template.complexity]}
          </span>
          <span className="inline-flex items-center gap-1">
            <svg className="size-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {template.estimatedBuildTime}
          </span>
        </div>

        {/* CTA */}
        <button
          type="button"
          id={`template-cta-${template.id}`}
          onClick={() => onUseTemplate(template.id)}
          disabled={isSubmitting}
          className={cn(
            "mt-auto w-full rounded-full py-2.5 text-sm font-bold transition-all duration-200",
            "bg-slate-900 text-white hover:bg-black active:scale-[0.98]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            isSubmitting && "animate-pulse",
          )}
        >
          {isSubmitting ? "Starting build…" : "Start Building →"}
        </button>
      </div>
    </article>
  );
}
