import React from 'react';

/**
 * FlowingWaveLines
 * 
 * Fine flowing wave lines along the bottom of the landing page:
 * - Multiple thin parallel curves (guilloche wireframe lines, fill: none, strokeWidth 1.1px - 1.3px)
 * - Cyan (#00C4D6 / #06DAB4) and emerald (#10B981 / #34D399) gradients
 * - Waves entering from both the left and right edges, overlapping naturally near the bottom
 * - Smooth continuous horizontal flowing motion
 * - Low opacity so text and button maintain complete contrast
 * - 100% pure vector SVG (zero bitmap dependencies, zero ghost text)
 */
export const FlowingWaveLines = () => {
  // Bundle 1: Cyan-to-emerald curves entering from bottom-left
  const leftWaveCurves = Array.from({ length: 30 }, (_, i) => {
    const offset = i * 2.2;
    // Cubic bezier parameters with subtle harmonic frequency shift per line
    const y1 = 170 + offset;
    const cp1y = 65 + i * 1.8;
    const cp2y = 220 + i * 1.7;
    const cp3y = 125 + i * 1.5;
    const cp4y = 185 + i * 1.9;
    const y2 = 155 + offset;

    return (
      <path
        key={`left-wave-${i}`}
        d={`M -120 ${y1} C 260 ${cp1y}, 540 ${cp2y}, 840 ${cp3y} C 1120 ${cp4y - 60}, 1360 ${cp4y}, 1600 ${y2}`}
        stroke="url(#waveGradCyanLeft)"
        strokeWidth="1.15"
        strokeLinecap="round"
        fill="none"
      />
    );
  });

  // Bundle 2: Emerald-to-cyan curves entering from bottom-right
  const rightWaveCurves = Array.from({ length: 28 }, (_, i) => {
    const offset = i * 2.4;
    const y1 = 205 + offset;
    const cp1y = 265 + i * 1.6;
    const cp2y = 110 + i * 2.0;
    const cp3y = 175 + i * 1.7;
    const cp4y = 135 + i * 1.8;
    const y2 = 145 + offset;

    return (
      <path
        key={`right-wave-${i}`}
        d={`M -100 ${y1} C 280 ${cp1y}, 660 ${cp2y}, 1020 ${cp3y} C 1240 ${cp4y + 60}, 1420 ${cp4y}, 1620 ${y2}`}
        stroke="url(#waveGradEmeraldRight)"
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
      {/* Dynamic Animated SVG Wave Conduits (Continuous Flowing Movement) */}
      <div className="absolute inset-0 w-[200%] h-full flex animate-wave-flow opacity-75">
        {/* Track 1 */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGradCyanLeft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06DAB4" stopOpacity="0.04" />
              <stop offset="20%" stopColor="#06DAB4" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#00C4D6" stopOpacity="0.55" />
              <stop offset="85%" stopColor="#10B981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.06" />
            </linearGradient>

            <linearGradient id="waveGradEmeraldRight" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
              <stop offset="30%" stopColor="#34D399" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#06DAB4" stopOpacity="0.50" />
              <stop offset="100%" stopColor="#00C4D6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {leftWaveCurves}
          {rightWaveCurves}
        </svg>

        {/* Seamless Repeat Track 2 */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          {leftWaveCurves}
          {rightWaveCurves}
        </svg>
      </div>
    </div>
  );
};

export default FlowingWaveLines;
