import React from 'react';

/**
 * GlassRibbon3D
 * 
 * Translucent 3D curved glass ribbon positioned directly behind the heading:
 * - Tilted elliptical glass loop with cyan (#06DAB4), aqua (#38BDF8), and emerald (#10B981) reflections
 * - Frosted glass transparency, specular crest highlights, and subtle depth
 * - 100% pure SVG vector construction (zero bitmap artifacts, zero ghost text)
 * - Hardware-accelerated CSS 3D floating and gentle rotation (16s cycle)
 * - Low visual opacity ensuring all foreground typography remains razor-sharp
 */
export const GlassRibbon3D = () => {
  return (
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] sm:w-[740px] lg:w-[860px] pointer-events-none select-none z-0 flex items-center justify-center overflow-visible"
      aria-hidden="true"
    >
      {/* 1. Subtle ambient cyan/mint lighting glow behind the ribbon */}
      <div 
        className="absolute w-[440px] sm:w-[560px] h-[260px] sm:h-[340px] rounded-full blur-[85px] opacity-35 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 62% 38%, rgba(6, 218, 180, 0.32) 0%, rgba(56, 189, 248, 0.16) 45%, rgba(16, 185, 129, 0.18) 70%, transparent 85%)',
        }}
      />

      {/* 2. 3D Floating Translucent Glass Ribbon */}
      <div className="relative w-full animate-glass-ribbon flex items-center justify-center">
        <svg
          viewBox="0 0 860 480"
          className="w-full h-auto overflow-visible drop-shadow-[0_16px_36px_rgba(6,218,180,0.12)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Primary glass gradient across main loop */}
            <linearGradient id="glassLoopFront" x1="15%" y1="80%" x2="85%" y2="20%">
              <stop offset="0%" stopColor="#06DAB4" stopOpacity="0.22" />
              <stop offset="35%" stopColor="#38BDF8" stopOpacity="0.18" />
              <stop offset="65%" stopColor="#10B981" stopOpacity="0.26" />
              <stop offset="90%" stopColor="#06DAB4" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.15" />
            </linearGradient>

            {/* Back twist gradient (subtle depth) */}
            <linearGradient id="glassLoopBack" x1="85%" y1="25%" x2="20%" y2="75%">
              <stop offset="0%" stopColor="#166534" stopOpacity="0.18" />
              <stop offset="45%" stopColor="#06DAB4" stopOpacity="0.14" />
              <stop offset="80%" stopColor="#38BDF8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.06" />
            </linearGradient>

            {/* Outer specular rim highlight */}
            <linearGradient id="glassRimHighlight" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
              <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.80" />
              <stop offset="70%" stopColor="#06DAB4" stopOpacity="0.85" />
              <stop offset="90%" stopColor="#34D399" stopOpacity="0.90" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.40" />
            </linearGradient>

            {/* Inner bevel stroke */}
            <linearGradient id="glassInnerBevel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06DAB4" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.40" />
            </linearGradient>

            {/* Top-right prominent luminous crest gradient */}
            <linearGradient id="crestGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#06DAB4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Under/Back Loop of the Glass Ring (Depth Layer) */}
          <path
            d="M 240 330 C 180 250, 240 140, 410 145 C 570 150, 680 110, 750 160 C 785 185, 760 225, 680 220 C 560 210, 460 270, 340 315 C 290 335, 260 345, 240 330 Z"
            fill="url(#glassLoopBack)"
            stroke="url(#glassInnerBevel)"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />

          {/* Front Primary Sweeping Glass Ring */}
          <path
            d="M 170 290 C 210 160, 390 100, 560 145 C 690 180, 770 140, 810 210 C 840 260, 770 310, 670 290 C 510 260, 380 340, 260 330 C 200 325, 150 320, 170 290 Z"
            fill="url(#glassLoopFront)"
            stroke="url(#glassRimHighlight)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Top-Right Luminous Glass Lip (The bright aqua/lime highlight in the reference) */}
          <path
            d="M 540 140 C 650 170, 740 140, 790 195 C 815 225, 790 260, 720 255 C 640 250, 580 180, 540 140 Z"
            fill="url(#glassLoopFront)"
            stroke="url(#crestGlowGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Specular Edge Accent Lines along the Glass Curvature */}
          <path
            d="M 195 275 C 240 170, 390 120, 550 155 C 670 185, 745 155, 785 210"
            stroke="url(#glassRimHighlight)"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />

          <path
            d="M 235 305 C 310 230, 440 190, 580 215 C 680 235, 740 220, 765 245"
            stroke="url(#glassInnerBevel)"
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />

          {/* Bottom-left delicate frosted glass rim */}
          <path
            d="M 175 285 C 160 310, 190 330, 245 330 C 310 330, 400 295, 480 270"
            stroke="url(#glassRimHighlight)"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
        </svg>
      </div>
    </div>
  );
};

export default GlassRibbon3D;
