import React from 'react';

/**
 * GlassRibbon3D
 * 
 * Translucent abstract glass ribbon positioned directly behind the hero heading:
 * - Large, elegant curved ribbon with transparent glass-like appearance
 * - Cyan, aqua, and light emerald reflections (#06dab4, #38bdf8, #10b981)
 * - Soft highlights, specular crests, and subtle depth
 * - Very slow floating and gentle 3D rotation (16s cycle via CSS 3D)
 * - Low visual opacity ensuring all foreground text remains 100% legible
 * - Respects prefers-reduced-motion
 */
export const GlassRibbon3D = () => {
  return (
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] sm:w-[860px] lg:w-[980px] h-[360px] sm:h-[440px] pointer-events-none select-none z-0 flex items-center justify-center overflow-visible"
      aria-hidden="true"
    >
      {/* 1. Ambient atmospheric glow behind the glass ribbon (subtle cyan/emerald light) */}
      <div 
        className="absolute w-[480px] h-[280px] rounded-full blur-[90px] opacity-35 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6, 218, 180, 0.35) 0%, rgba(16, 185, 129, 0.20) 45%, rgba(56, 189, 248, 0.12) 70%, transparent 85%)',
        }}
      />

      {/* 2. 3D Floating Translucent Glass Ribbon */}
      <div className="relative w-full h-full animate-glass-ribbon flex items-center justify-center">
        <svg
          viewBox="0 0 960 480"
          className="w-full h-full overflow-visible drop-shadow-[0_16px_36px_rgba(6,218,180,0.12)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Primary glass gradient across main ribbon loop */}
            <linearGradient id="glassRibbonGrad1" x1="12%" y1="18%" x2="88%" y2="82%">
              <stop offset="0%" stopColor="#06DAB4" stopOpacity="0.32" />
              <stop offset="28%" stopColor="#38BDF8" stopOpacity="0.22" />
              <stop offset="55%" stopColor="#10B981" stopOpacity="0.28" />
              <stop offset="82%" stopColor="#06DAB4" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.10" />
            </linearGradient>

            {/* Inner fold gradient creating 3D depth */}
            <linearGradient id="glassRibbonGrad2" x1="85%" y1="20%" x2="15%" y2="80%">
              <stop offset="0%" stopColor="#166534" stopOpacity="0.22" />
              <stop offset="40%" stopColor="#10B981" stopOpacity="0.18" />
              <stop offset="75%" stopColor="#06DAB4" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.08" />
            </linearGradient>

            {/* Specular crest highlights along outer glass edges */}
            <linearGradient id="specularHighlightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
              <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.75" />
              <stop offset="65%" stopColor="#06DAB4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.25" />
            </linearGradient>

            {/* Under-edge subtle glass reflection */}
            <linearGradient id="underEdgeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#06DAB4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Ribbon Back Twist (Depth Layer) */}
          <path
            d="M 210 280 C 140 190, 240 90, 420 120 C 580 145, 720 95, 820 160 C 860 190, 810 240, 710 220 C 580 195, 460 270, 310 295 C 250 305, 230 300, 210 280 Z"
            fill="url(#glassRibbonGrad2)"
            stroke="url(#underEdgeGrad)"
            strokeWidth="1.2"
            strokeOpacity="0.45"
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* Ribbon Front Primary Sweeping Loop */}
          <path
            d="M 120 220 C 180 100, 380 70, 560 140 C 720 200, 840 180, 890 260 C 930 320, 840 370, 710 340 C 510 290, 340 360, 200 330 C 130 310, 80 280, 120 220 Z"
            fill="url(#glassRibbonGrad1)"
            stroke="url(#specularHighlightGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Inner Specular Light Ridge Line (Glass Refraction) */}
          <path
            d="M 150 210 C 210 110, 380 90, 550 150 C 700 205, 810 190, 860 255"
            stroke="url(#specularHighlightGrad)"
            strokeWidth="1.4"
            strokeDasharray="4 1"
            strokeOpacity="0.6"
            fill="none"
          />

          {/* Secondary Delicate Flow Line inside the Ribbon */}
          <path
            d="M 190 235 C 270 160, 420 140, 580 190 C 720 235, 800 230, 840 280"
            stroke="url(#underEdgeGrad)"
            strokeWidth="1.2"
            strokeOpacity="0.45"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
};

export default GlassRibbon3D;
