import React from 'react';
import { Link } from 'react-router-dom';
import logoMark from '../../logo-mark.png';
import LandingWaveBackground from './LandingWaveBackground';

export const LandingHero = () => {
  return (
    <section className="relative w-full flex-1 flex items-center justify-center py-24 sm:py-32 px-6 sm:px-8 overflow-hidden">
      {/* Mild flow of color waves matching logo palette (#06dab4 teal, #02164b navy) */}
      <LandingWaveBackground />

      {/* Minimalist Welcome Container */}
      <div className="relative z-10 max-w-xl mx-auto text-center flex flex-col items-center justify-center">
        {/* Logo Emblem */}
        <div className="mb-6 h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm flex items-center justify-center p-3">
          <img
            src={logoMark}
            alt="KLARVES Logo"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Small Eyebrow Label */}
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] uppercase text-[#166534] bg-white/85 backdrop-blur-sm border border-[#166534]/20 px-3.5 py-1.5 rounded-full inline-block mb-4 shadow-xs">
          INTERNAL OPERATIONS PLATFORM
        </span>

        {/* Welcome Headline */}
        <h1 className="text-3xl sm:text-5xl font-semibold text-[#172B24] tracking-tight leading-tight mb-4">
          Welcome to KLARVES Corporate
        </h1>

        {/* Welcome Description */}
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-md mx-auto mb-8 font-normal">
          A centralized workspace for our team to manage operations securely.
        </p>

        {/* Login Action Button */}
        <div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg text-sm font-semibold text-white bg-[#166534] hover:bg-[#14532d] shadow-sm hover:shadow-md transition-all duration-150"
          >
            Employee Login
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
