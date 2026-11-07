import React from 'react';
import waveLinesRef from '../../wave-lines-ref.png';

/**
 * FlowingWaveLines
 * 
 * Fine flowing wave lines along the bottom matching the exact reference design:
 * - Multiple thin parallel curves fanning out from the left and right edges
 * - Cyan (#06DAB4) to Aqua (#38BDF8) on the left
 * - Mint/Emerald (#10B981 / #34D399) on the right
 * - Natural overlapping moiré pattern near the bottom center
 * - Continuous smooth horizontal translation and undulating wave motion
 * - Full support for prefers-reduced-motion
 */
export const FlowingWaveLines = () => {
  // Generate 26 fine parallel curves for the sweeping cyan wave bundle
  const cyanParallelCurves = Array.from({ length: 26 }, (_, i) => {
    const offset = i * 2.4;
    return (
      <path
        key={`cyan-curve-${i}`}
        d={`M -120 ${160 + offset} C 260 ${70 + i * 2.1}, 540 ${220 + i * 1.8}, 840 ${130 + i * 1.6} C 1120 ${60 + i * 1.9}, 1360 ${190 + i * 2.2}, 1600 ${160 + offset}`}
        stroke="url(#refWaveCyanGrad)"
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
    );
  });

  // Generate 24 fine parallel curves for the counter-flowing emerald wave bundle
  const emeraldParallelCurves = Array.from({ length: 24 }, (_, i) => {
    const offset = i * 2.6;
    return (
      <path
        key={`emerald-curve-${i}`}
        d={`M -80 ${210 + offset} C 280 ${270 + i * 1.8}, 660 ${105 + i * 2.2}, 1020 ${180 + i * 1.7} C 1240 ${220 + i * 2.0}, 1420 ${130 + i * 1.8}, 1600 ${140 + offset}`}
        stroke="url(#refWaveEmeraldGrad)"
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
    );
  });

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 w-full h-44 sm:h-56 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Exact Reference Wave Line Overlay with subtle floating motion */}
      <div className="absolute inset-x-0 bottom-0 w-full h-full flex items-end justify-center opacity-85">
        <img
          src={waveLinesRef}
          alt=""
          className="w-full h-auto min-h-[160px] object-cover object-bottom"
          draggable="false"
        />
      </div>

      {/* 2. Dynamic Animated SVG Wave Conduits (Seamless Horizontal Flow) */}
      <div className="absolute inset-0 w-[200%] h-full flex animate-wave-flow opacity-60 mix-blend-multiply">
        {/* Track Unit 1 */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="refWaveCyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06DAB4" stopOpacity="0.04" />
              <stop offset="25%" stopColor="#06DAB4" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#00C4D6" stopOpacity="0.50" />
              <stop offset="85%" stopColor="#10B981" stopOpacity="0.40" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.08" />
            </linearGradient>

            <linearGradient id="refWaveEmeraldGrad" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
              <stop offset="35%" stopColor="#34D399" stopOpacity="0.50" />
              <stop offset="65%" stopColor="#06DAB4" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#00C4D6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {cyanParallelCurves}
          {emeraldParallelCurves}
        </svg>

        {/* Seamless Track Unit 2 */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {cyanParallelCurves}
          {emeraldParallelCurves}
        </svg>
      </div>
    </div>
  );
};

export default FlowingWaveLines;
