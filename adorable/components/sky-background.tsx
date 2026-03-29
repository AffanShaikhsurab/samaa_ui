"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * Senior UI/UX: Mica Noise Texture
 * Provides that 'physical' material feel to the glass elements.
 */
function MicaTexture() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03] animate-pulse-slow">
      <svg width="100%" height="100%" className="mix-blend-overlay">
        <filter id="mica-noise">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.8" 
            numOctaves="4" 
            stitchTiles="stitch" 
          />
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
function LightOrb({ className, delay = 0 }: { className: string, delay?: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: [0.3, 0.5, 0.3],
        scale: [1, 1.1, 1],
        x: [0, 30, 0],
        y: [0, -20, 0]
      }}
      transition={{ 
        duration: 15 + Math.random() * 10,
        repeat: Infinity,
        ease: "easeInOut",
        delay 
      }}
      className={cn("absolute rounded-full blur-[140px] pointer-events-none", className)} 
    />
  );
}

export function SkyBackground({ variant = "landing" }: { variant?: "landing" | "workspace" }) {
  const isWorkspace = variant === "workspace";

  return (
    <div className="fixed inset-0 z-0 select-none pointer-events-none overflow-hidden bg-background">
      {/* Cinematic Sky Base - Light Airy Blue Gradient */}
      <div 
        className={cn(
          "absolute inset-0 transition-colors duration-1000",
          isWorkspace ? "bg-[#f8fafc]" : "bg-gradient-to-b from-[#f0f9ff] to-[#e0f2fe]"
        )} 
      />
      
      {/* Mica Material Layer */}
      <MicaTexture />

      {/* Atmospheric Light Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <LightOrb 
          className="w-[900px] h-[900px] top-[-15%] left-[-10%] bg-blue-200/40" 
          delay={0}
        />
        <LightOrb 
          className="w-[700px] h-[700px] bottom-[5%] right-[-10%] bg-sky-100/60" 
          delay={2}
        />
        <LightOrb 
          className="w-[500px] h-[500px] top-[25%] right-[15%] bg-blue-50/50" 
          delay={4}
        />
        {isWorkspace && (
          <LightOrb 
            className="w-[600px] h-[600px] bottom-[-20%] left-[20%] bg-white/40" 
            delay={1}
          />
        )}
      </div>
    </div>
  );
}
