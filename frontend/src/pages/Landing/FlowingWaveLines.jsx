import React from 'react';

/**
 * FlowingWaveLines
 * 
 * Fine flowing wave lines at the bottom of the hero section:
 * - Multiple thin parallel curves (strokeWidth 1.2px - 1.5px, fill: none)
 * - Cyan (#06dab4), Aqua (#38bdf8), and Emerald (#166534 / #10b981) gradients
 * - Waves entering from both left and right edges, overlapping naturally near the bottom
 * - Smooth continuous horizontal movement via hardware-accelerated CSS animations
 * - Low opacity so text and button maintain complete contrast
 * - Fully supports prefers-reduced-motion
 */
export const FlowingWaveLines = () => {
  return (
    <div 
      className="absolute bottom-0 left-0 right-0 w-full h-48 sm:h-64 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* Wave Group 1: Continuous Flow moving Left-to-Right */}
      <div className="absolute inset-0 w-[200%] h-full flex animate-wave-flow">
        {/* Unit A */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gradCyanEmerald1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06DAB4" stopOpacity="0.05" />
              <stop offset="25%" stopColor="#06DAB4" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="gradEmeraldAqua1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#166534" stopOpacity="0.08" />
              <stop offset="35%" stopColor="#10B981" stopOpacity="0.38" />
              <stop offset="70%" stopColor="#06DAB4" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.05" />
            </linearGradient>

            <linearGradient id="gradAquaTeal1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.05" />
              <stop offset="40%" stopColor="#06DAB4" stopOpacity="0.35" />
              <stop offset="80%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#166534" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Thin parallel line wave bundle 1 (left to right sweep) */}
          <path
            d="M -100 160 C 240 70, 520 220, 840 140 C 1140 60, 1380 190, 1540 170"
            stroke="url(#gradCyanEmerald1)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M -100 172 C 240 82, 520 232, 840 152 C 1140 72, 1380 202, 1540 182"
            stroke="url(#gradCyanEmerald1)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M -100 184 C 240 94, 520 244, 840 164 C 1140 84, 1380 214, 1540 194"
            stroke="url(#gradEmeraldAqua1)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M -100 196 C 240 106, 520 256, 840 176 C 1140 96, 1380 226, 1540 206"
            stroke="url(#gradEmeraldAqua1)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M -100 208 C 240 118, 520 268, 840 188 C 1140 108, 1380 238, 1540 218"
            stroke="url(#gradAquaTeal1)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M -100 220 C 240 130, 520 280, 840 200 C 1140 120, 1380 250, 1540 230"
            stroke="url(#gradAquaTeal1)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>

        {/* Seamless Repeat Unit B */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M -100 160 C 240 70, 520 220, 840 140 C 1140 60, 1380 190, 1540 170"
            stroke="url(#gradCyanEmerald1)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M -100 172 C 240 82, 520 232, 840 152 C 1140 72, 1380 202, 1540 182"
            stroke="url(#gradCyanEmerald1)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M -100 184 C 240 94, 520 244, 840 164 C 1140 84, 1380 214, 1540 194"
            stroke="url(#gradEmeraldAqua1)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M -100 196 C 240 106, 520 256, 840 176 C 1140 96, 1380 226, 1540 206"
            stroke="url(#gradEmeraldAqua1)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M -100 208 C 240 118, 520 268, 840 188 C 1140 108, 1380 238, 1540 218"
            stroke="url(#gradAquaTeal1)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M -100 220 C 240 130, 520 280, 840 200 C 1140 120, 1380 250, 1540 230"
            stroke="url(#gradAquaTeal1)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Wave Group 2: Counter-flowing Overlapping Waves (Right to Left Sweep) */}
      <div className="absolute inset-0 w-[200%] h-full flex animate-wave-reverse opacity-75">
        {/* Unit A */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gradCounterWave1" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#06DAB4" stopOpacity="0.04" />
              <stop offset="30%" stopColor="#38BDF8" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#10B981" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#166534" stopOpacity="0.08" />
            </linearGradient>

            <linearGradient id="gradCounterWave2" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#166534" stopOpacity="0.05" />
              <stop offset="40%" stopColor="#06DAB4" stopOpacity="0.3" />
              <stop offset="80%" stopColor="#0284C7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06DAB4" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Thin counter-curves with different harmonic crests */}
          <path
            d="M -80 210 C 280 270, 680 110, 1020 180 C 1260 230, 1420 130, 1520 140"
            stroke="url(#gradCounterWave1)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M -80 222 C 280 282, 680 122, 1020 192 C 1260 242, 1420 142, 1520 152"
            stroke="url(#gradCounterWave1)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M -80 234 C 280 294, 680 134, 1020 204 C 1260 254, 1420 154, 1520 164"
            stroke="url(#gradCounterWave2)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M -80 246 C 280 306, 680 146, 1020 216 C 1260 266, 1420 166, 1520 176"
            stroke="url(#gradCounterWave2)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>

        {/* Seamless Repeat Unit B */}
        <svg
          className="w-1/2 h-full shrink-0"
          viewBox="0 0 1440 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M -80 210 C 280 270, 680 110, 1020 180 C 1260 230, 1420 130, 1520 140"
            stroke="url(#gradCounterWave1)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M -80 222 C 280 282, 680 122, 1020 192 C 1260 242, 1420 142, 1520 152"
            stroke="url(#gradCounterWave1)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M -80 234 C 280 294, 680 134, 1020 204 C 1260 254, 1420 154, 1520 164"
            stroke="url(#gradCounterWave2)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M -80 246 C 280 306, 680 146, 1020 216 C 1260 266, 1420 166, 1520 176"
            stroke="url(#gradCounterWave2)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default FlowingWaveLines;
