import React from 'react';
import { Link } from 'react-router-dom';
import GlassRibbon3D from './GlassRibbon3D';
import FlowingWaveLines from './FlowingWaveLines';

export const LandingHero = () => {
  return (
    <section className="relative w-full flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-8 py-20 sm:py-28 lg:py-32 overflow-hidden">
      {/* 1. Translucent 3D Curved Glass Ribbon behind the heading */}
      <GlassRibbon3D />

      {/* 2. Centered Hero Content Container */}
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center justify-center">
        {/* Eyebrow Label */}
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.16em] uppercase text-[#166534] bg-[#166534]/5 border border-[#166534]/20 px-3.5 py-1.5 rounded-full inline-block mb-6 shadow-2xs">
          INTERNAL OPERATIONS PLATFORM
        </span>

        {/* Main Heading: Bold Dark Forest-Green Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-bold text-[#166534] tracking-tight leading-[1.15] mb-4">
          Welcome to KLARVES Corporate
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[#172B24]/85 font-medium max-w-xl mb-4">
          A centralized workspace for our team.
        </p>

        {/* Supporting Description */}
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto mb-8">
          Manage Instagram accounts, coordinate team activities and streamline daily operations through one secure platform.
        </p>

        {/* Primary Action Button: Dark-green primary login button */}
        <div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-md text-sm font-medium text-white bg-[#166534] hover:bg-[#14532d] transition-colors duration-150 shadow-sm"
          >
            Employee Login
          </Link>
        </div>
      </div>

      {/* 3. Fine Flowing Wave Lines at the bottom of the section */}
      <FlowingWaveLines />
    </section>
  );
};

export default LandingHero;
