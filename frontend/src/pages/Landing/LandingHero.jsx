import React from 'react';
import { Link } from 'react-router-dom';

export const LandingHero = () => {
  return (
    <section className="w-full max-w-[1200px] mx-auto px-6 sm:px-8 py-20 sm:py-28 lg:py-36 text-center flex flex-col items-center justify-center">
      {/* Small Label */}
      <span className="text-[11px] sm:text-xs font-semibold tracking-[0.16em] uppercase text-[#166534] bg-[#166534]/5 border border-[#166534]/20 px-3.5 py-1.5 rounded-full inline-block mb-6">
        INTERNAL OPERATIONS PLATFORM
      </span>

      {/* Main Heading */}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-[#172B24] tracking-tight leading-tight max-w-3xl mb-4">
        Welcome to KLARVES Corporate
      </h1>

      {/* Subtitle */}
      <p className="text-lg sm:text-xl text-[#172B24]/80 font-medium max-w-xl mb-4">
        A centralized workspace for our team.
      </p>

      {/* Description */}
      <p className="text-sm sm:text-base text-[#172B24]/70 leading-relaxed max-w-xl mx-auto mb-8">
        Manage Instagram accounts, coordinate team activities and streamline daily operations through one secure platform.
      </p>

      {/* Primary Action Button */}
      <div>
        <Link
          to="/login"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md text-sm font-medium text-white bg-[#166534] hover:bg-[#14532d] transition-colors duration-150 shadow-sm"
        >
          Employee Login
        </Link>
      </div>
    </section>
  );
};

export default LandingHero;
