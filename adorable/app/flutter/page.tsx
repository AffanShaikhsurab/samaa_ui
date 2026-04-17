"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { SkyBackground } from "@/components/sky-background";
import { STARTER_PACKS } from "@/lib/templates-data";
import "./landing.css";

export default function FlutterLandingPage() {
  const [prompt, setPrompt] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isTransitioning) return;
    setSubmitError(null);
    
    // Trigger cinematic transition
    setIsTransitioning(true);
    
    setTimeout(async () => {
      try {
        const response = await fetch("/api/builder/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          session?: { id: string; sessionToken?: string };
          error?: string;
        };

        if (!response.ok || !payload.session?.id) {
          throw new Error(payload.error ?? "Failed to create project session.");
        }

        if (payload.session.sessionToken) {
          window.localStorage.setItem(`samaa:session-token:${payload.session.id}`, payload.session.sessionToken);
        }

        router.push(`/flutter/workspace/${payload.session.id}`);
      } catch (caught) {
        setSubmitError(caught instanceof Error ? caught.message : "Failed to create project session.");
        setIsTransitioning(false);
      }
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="sama-landing-page">
      <SkyBackground />

      {/* Cinematic Transition Overlay */}
      <div className={`cloud-burst-overlay ${isTransitioning ? 'active' : ''}`} />

      <div className="content">
        <nav className={cn(
          "w-full max-w-[1400px] flex justify-between items-center px-6 md:px-12 py-8 z-50 transition-opacity duration-300",
          isTransitioning ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          <div className="logo text-3xl font-extrabold tracking-tighter font-display">samaa</div>
          <div className="nav-links flex items-center gap-8">
            <Link href="/templates" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Templates</Link>
            <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">My Projects</Link>
            <div className="rounded-full border border-black/5 bg-white/80 p-1">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </nav>

        <section className={cn(
          "hero flex flex-col items-center w-full max-w-[900px] px-6 text-center mt-24 md:mt-32",
          isTransitioning ? "pointer-events-none" : ""
        )}>
          <div className={cn(
            "unblur-reveal",
            isTransitioning ? "opacity-0 scale-95 transition-all duration-700 blur-2xl" : ""
          )}>
            <h1 className="text-6xl md:text-9xl font-bold tracking-tight text-slate-900 mb-8 leading-[0.85] font-display">Build any application.</h1>
            <p className="subtitle text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto mb-16">Use your existing AI subscriptions for free. Experience the future of software creation.</p>
          </div>

          <div className={cn(
            "workbench w-full glass-card p-8 flex flex-col gap-6 unblur-reveal [animation-delay:200ms]",
            isTransitioning ? "workbench-uplift" : ""
          )}>
            {submitError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
            ) : null}
            <textarea
              data-testid="landing-prompt-input"
              className="prompt-input"
              placeholder="Ask Sama to build a custom CRM with real-time analytics..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {/* Phase F: Guided starter prompt chips */}
            {!prompt.trim() && (
              <div className="flex flex-wrap gap-2 -mt-2">
                {STARTER_PACKS.slice(0, 5).map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setPrompt(pack.prompt)}
                    className="tag-pill text-slate-600 hover:bg-white/70 hover:text-slate-900 transition-all cursor-pointer text-left"
                  >
                    {pack.icon} {pack.label}
                  </button>
                ))}
              </div>
            )}
            <div className="footer flex justify-between items-center pt-6 border-t border-black/5">
              <div className="kb-hint text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                PRESS <span className="kb-key bg-black/5 px-2 py-0.5 rounded text-[10px]">ENTER</span> TO SUBMIT
              </div>
              <button
                data-testid="landing-build-button"
                className="btn-build bg-sky-600 text-white px-10 py-4 rounded-full font-bold text-sm transition-all shadow-xl hover:bg-sky-700 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isTransitioning}
              >
                {isTransitioning ? "Sculpting Sky..." : "Build Application →"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
