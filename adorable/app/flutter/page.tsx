"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SkyBackground } from "@/components/sky-background";
import "./landing.css";

export default function FlutterLandingPage() {
  const [prompt, setPrompt] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isTransitioning) return;
    
    // Trigger cinematic transition
    setIsTransitioning(true);
    
    // Match the timing of the .cloud-burst-overlay and .workbench-uplift (approx 800ms)
    setTimeout(() => {
      const params = new URLSearchParams({ prompt: trimmed });
      router.push(`/flutter/workspace?${params.toString()}`);
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
            <a href="#" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Showcase</a>
            <a href="#" className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-black transition-all active:scale-95 shadow-lg">Download App</a>
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
            <textarea
              className="prompt-input"
              placeholder="Ask Sama to build a custom CRM with real-time analytics..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="footer flex justify-between items-center pt-6 border-t border-black/5">
              <div className="kb-hint text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                PRESS <span className="kb-key bg-black/5 px-2 py-0.5 rounded text-[10px]">ENTER</span> TO SUBMIT
              </div>
              <button
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
