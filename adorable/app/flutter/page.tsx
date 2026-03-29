"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        <nav className={isTransitioning ? 'opacity-0 transition-opacity duration-300' : ''}>
          <div className="logo">sama</div>
          <div className="nav-links">
            <a href="#">Pricing</a>
            <a href="#">Showcase</a>
            <a href="#" className="btn-cta">Download App</a>
          </div>
        </nav>

        <section className={`hero ${isTransitioning ? 'pointer-events-none' : ''}`}>
          <div className={isTransitioning ? 'opacity-0 transition-all duration-500 blur-lg' : ''}>
            <h1>Build any application.</h1>
            <p className="subtitle">Use your existing AI subscriptions for free.</p>
          </div>

          <div className={`workbench ${isTransitioning ? 'workbench-uplift' : ''}`}>
            <textarea
              className="input-area"
              placeholder="Ask Sama to build a custom CRM with real-time analytics..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
            ></textarea>
            <div className="footer">
              <div className="kb-hint">
                PRESS <span className="kb-key">⌘ K</span> TO OPEN TOOLS
              </div>
              <button
                className="btn-build"
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
