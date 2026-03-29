"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export const FlutterWelcome = () => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!headingRef.current) return;
    const text = "Build any application";
    headingRef.current.innerHTML = text
      .split("")
      .map((char) => `<span class="inline-block blur-[16px] opacity-0 translate-y-[60px] char">${char === " " ? "&nbsp;" : char}</span>`)
      .join("");

    gsap.to(headingRef.current.querySelectorAll(".char"), {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      duration: 1.2,
      stagger: 0.025,
      ease: "expo.out",
    });
  }, []);

  return (
    <div className="aui-thread-welcome-root mx-auto flex w-full grow flex-col items-center justify-center pt-[15vh]">
      <div className="flex w-full flex-col gap-4 px-2 items-center">
        <h1 
          ref={headingRef} 
          className="font-display text-6xl md:text-[104px] leading-[0.95] font-normal tracking-[-2px] md:tracking-[-4px] text-center text-black whitespace-nowrap"
        >
          Build any application
        </h1>
        
        <p className="text-[19px] font-medium text-black/70 mt-2 mb-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-500 fill-mode-both">
          Use your existing AI subscriptions for free &rarr;
        </p>

        <div className="tags-container flex flex-wrap justify-center gap-3 animate-in fade-in duration-1000 delay-700 fill-mode-both">
          {[
            {
              title: "Web App",
              prompt: "Create a beautiful web app with Flutter",
            },
            {
              title: "Mobile App",
              prompt: "Build a modern mobile app with Flutter",
            },
            {
              title: "AI Agent",
              prompt: "Build an AI agent app",
            },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              className="tag-pill hover-target"
              onClick={() => {
                const composer = document.querySelector(
                  'textarea[data-composer-textarea="true"]'
                ) as HTMLTextAreaElement | null;
                if (composer) {
                  composer.value = item.prompt;
                  composer.dispatchEvent(new Event("input", { bubbles: true }));
                  composer.focus();
                }
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
