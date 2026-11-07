import React from 'react';
import { Link } from 'react-router-dom';
import GlassRibbon3D from './GlassRibbon3D';
import FlowingWaveLines from './FlowingWaveLines';

export const LandingHero = () => {
  return (
    <section className="relative w-full flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-8 py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* 1. Translucent 3D Curved Glass Ribbon sculpture positioned behind and around the headline */}
      <GlassRibbon3D />

      {/* 2. Main Centered Content Container */}
      <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center justify-center">
        {/* Eyebrow Label: Capsule pill with delicate green border */}
        <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#166534] bg-[#F0FDF4] border border-[#166534]/20 px-3.5 py-1.5 rounded-full inline-block mb-5 shadow-2xs">
          INTERNAL OPERATIONS PLATFORM
        </span>

        {/* Main Heading: Exact two lines and dark forest-green typography */}
        <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-[#172B24] tracking-tight leading-[1.14] mb-4">
          Welcome to KLARVES<br />Corporate
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-[#172B24] font-semibold max-w-xl mb-4">
          A centralized workspace for our team.
        </p>

        {/* Supporting Description */}
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto mb-8 font-normal">
          Manage Instagram accounts, coordinate team activities and streamline daily operations through one secure platform.
        </p>

        {/* Primary Action Button */}
        <div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-7 py-3 rounded-lg text-sm font-semibold text-white bg-[#146833] hover:bg-[#0f5328] transition-colors duration-150 shadow-xs"
          >
            Employee Login
          </Link>
        </div>
      </div>

      {/* 3. Fine Flowing Wave Lines along the bottom */}
      <FlowingWaveLines />
    </section>
  );
};

export default LandingHero;
