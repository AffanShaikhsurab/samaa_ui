"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    gsap.set([inner, outer], { xPercent: -50, yPercent: -50 });

    const moveCursor = (e: MouseEvent) => {
      gsap.to(inner, {
        x: e.clientX,
        y: e.clientY,
        duration: 0,
      });
      gsap.to(outer, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
        ease: "power2.out",
      });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest("[role='button']") ||
        target.classList.contains("hover-target")
      ) {
        document.body.classList.add("is-hovering");
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest("[role='button']") ||
        target.classList.contains("hover-target")
      ) {
        document.body.classList.remove("is-hovering");
      }
    };

    window.addEventListener("mousemove", moveCursor);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return (
    <>
      <div
        ref={outerRef}
        aria-hidden="true"
        className="fixed top-0 left-0 z-[10000] pointer-events-none transition-[width,height,background-color] duration-300 ease-out flex items-center justify-center border border-black rounded-full w-8 h-8 [.is-hovering_&]:w-14 [.is-hovering_&]:h-14 [.is-hovering_&]:bg-black/5"
      />
      <div
        ref={innerRef}
        aria-hidden="true"
        className="fixed top-0 left-0 z-[10001] pointer-events-none w-1.5 h-1.5 bg-black rounded-full transition-opacity duration-300 [.is-hovering_&]:opacity-0"
      />
    </>
  );
}
