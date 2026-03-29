"use client";

import { cn } from "@/lib/utils";

/**
 * Senior UI/UX: Mica Noise Texture
 * Provides that 'physical' material feel to the glass elements.
 */
function MicaTexture() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-overlay">
      <svg width="100%" height="100%">
        <filter id="mica-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#mica-noise)" />
      </svg>
    </div>
  );
}

/**
 * Senior UI/UX: Light Orb
 * Moving glowing spheres that create an atmospheric, cinematic sky depth.
 */
function LightOrb({ className }: { className: string }) {
  return (
    <div className={cn("absolute rounded-full blur-[120px] opacity-40 animate-drift-slow", className)} />
  );
}

export function SkyBackground({ variant = "landing" }: { variant?: "landing" | "workspace" }) {
  if (variant === "workspace") {
    return (
      <>
        {/* Cinematic Sky Base - Light Airy Blue */}
        <div className="fixed inset-0 workspace-sky z-0 bg-[#f0f9ff]" />
        
        {/* Mica Material Layer */}
        <MicaTexture />

        {/* Atmospheric Light Orbs - Very Subtle */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <LightOrb className="w-[800px] h-[800px] top-[-10%] left-[-10%] bg-blue-100 opacity-60" />
          <LightOrb className="w-[600px] h-[600px] bottom-[10%] right-[-5%] bg-sky-50 opacity-40" />
          <LightOrb className="w-[500px] h-[500px] top-[30%] right-[10%] bg-white opacity-30" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sky-background fixed inset-0 z-0 bg-gradient-to-b from-[#f0f9ff] to-[#e0f2fe]"></div>
      <MicaTexture />
      
      <div className="sky-canvas fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <LightOrb className="w-[700px] h-[700px] top-[10%] left-[-15%] bg-blue-200 opacity-30" />
        <LightOrb className="w-[600px] h-[600px] bottom-[20%] right-[-10%] bg-sky-100 opacity-40" />
      </div>
    </>
  );
}
