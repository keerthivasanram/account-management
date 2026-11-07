import React from 'react';

/**
 * FlowingWaveLines
 * 
 * Fine flowing wave lines along the bottom of the landing page:
 * - Multiple elegant SVG Bézier wave curves (fill: none, strokeWidth 0.9px - 1.2px)
 * - Cyan (#00D2D3 / #06DAB4) to emerald (#10B981 / #34D399) color transitions
 * - Dynamic harmonic spacing: lines fan out and pinch naturally (no dense striped block)
 * - Two distinct wave bundles crossing gracefully near the bottom
 * - Smooth continuous flowing movement from left to right
 * - Transparent background (no solid fills, no rectangular banner look)
 * - Supports prefers-reduced-motion
 */
export const FlowingWaveLines = () => {
  // Wave Bundle 1: Primary sweeping wave (Cyan -> Aqua -> Emerald)
  // 10 lines with varying cubic bezier amplitudes and harmonic spacing
  const primaryCurves = Array.from({ length: 11 }, (_, i) => {
    // Harmonic vertical offset: expands at the crest, pinches at the nodes
    const spread = (i - 5) * 4.2;
    const yStart = 160 + spread * 0.7;
    const cp1x = 280, cp1y = 75 + spread * 1.5;
    const cp2x = 560, cp2y = 195 + spread * 0.9;
    const cp3x = 880, cp3y = 95 + spread * 1.3;
    const cp4x = 1180, cp4y = 175 + spread * 0.8;
    const yEnd = 145 + spread * 0.7;

    return (
      <path
        key={`p-wave-${i}`}
        d={`M -120 ${yStart} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cp3x} ${cp3y} C 1040 ${cp4y - 40}, ${cp4x} ${cp4y}, 1560 ${yEnd}`}
        stroke="url(#waveCyanToEmerald)"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
    );
  });

  // Wave Bundle 2: Secondary crossing wave (Emerald -> Mint -> Cyan)
  // 9 lines entering from the right and crossing gracefully under Bundle 1
  const crossingCurves = Array.from({ length: 10 }, (_, i) => {
    const spread = (i - 4.5) * 4.6;
    const yStart = 185 + spread * 0.8;
    const cp1x = 320, cp1y = 230 + spread * 1.0;
    const cp2x = 640, cp2y = 110 + spread * 1.4;
    const cp3x = 980, cp3y = 185 + spread * 0.9;
    const cp4x = 1260, cp4y = 115 + spread * 1.3;
    const yEnd = 150 + spread * 0.8;

    return (
      <path
        key={`c-wave-${i}`}
        d={`M -100 ${yStart} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cp3x} ${cp3y} C 1140 ${cp4y + 35}, ${cp4x} ${cp4y}, 1580 ${yEnd}`}
        stroke="url(#waveEmeraldToCyan)"
        strokeWidth="1.05"
        strokeLinecap="round"
        fill="none"
      />
    );
  });

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 w-full h-40 sm:h-52 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* Seamless Smooth Left-to-Right Flowing Track */}
      <div className="absolute inset-0 w-[200%] h-full flex animate-wave-reverse opacity-70">
        {/* Track Unit 1 */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveCyanToEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06DAB4" stopOpacity="0.05" />
              <stop offset="25%" stopColor="#06DAB4" stopOpacity="0.60" />
              <stop offset="55%" stopColor="#00C4D6" stopOpacity="0.55" />
              <stop offset="85%" stopColor="#10B981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.08" />
            </linearGradient>

            <linearGradient id="waveEmeraldToCyan" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.06" />
              <stop offset="30%" stopColor="#34D399" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#06DAB4" stopOpacity="0.50" />
              <stop offset="100%" stopColor="#00C4D6" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {primaryCurves}
          {crossingCurves}
        </svg>

        {/* Seamless Track Unit 2 */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {primaryCurves}
          {crossingCurves}
        </svg>
      </div>
    </div>
  );
};

export default FlowingWaveLines;
