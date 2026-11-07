import React from 'react';
import glassRibbonImg from '../../glass-ribbon.png';

/**
 * GlassRibbon3D
 * 
 * The exact 3D translucent curved glass ribbon shown in the reference design:
 * - Tilted elliptical glass loop with cyan, aqua, and light emerald reflections
 * - Positioned directly behind the hero heading
 * - Low visual opacity and authentic frosted glass transparency so text remains perfectly crisp
 * - Slow floating and gentle 3D rotation via hardware-accelerated CSS 3D
 * - Supports prefers-reduced-motion
 */
export const GlassRibbon3D = () => {
  return (
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] sm:w-[680px] lg:w-[780px] pointer-events-none select-none z-0 flex items-center justify-center overflow-visible"
      aria-hidden="true"
    >
      {/* Subtle ambient cyan/mint glow behind the ribbon */}
      <div 
        className="absolute w-[440px] sm:w-[540px] h-[260px] sm:h-[320px] rounded-full blur-[80px] opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 60% 35%, rgba(6, 218, 180, 0.32) 0%, rgba(56, 189, 248, 0.16) 45%, rgba(16, 185, 129, 0.18) 70%, transparent 85%)',
        }}
      />

      {/* 3D Floating Glass Ribbon */}
      <div className="relative w-full animate-glass-ribbon flex items-center justify-center">
        <img
          src={glassRibbonImg}
          alt=""
          className="w-full h-auto object-contain drop-shadow-[0_12px_28px_rgba(6,218,180,0.12)] opacity-90 transition-opacity duration-500"
          draggable="false"
        />
      </div>
    </div>
  );
};

export default GlassRibbon3D;
