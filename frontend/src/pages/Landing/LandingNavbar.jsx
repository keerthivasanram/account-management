import React from 'react';
import { Link } from 'react-router-dom';
import logoMark from '../../logo-mark.png';

export const LandingNavbar = () => {
  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 h-18 flex items-center justify-between">
        {/* Company Identity */}
        <div className="flex items-center gap-3">
          <img
            src={logoMark}
            alt="KLARVES Emblem"
            className="h-8 w-8 object-contain"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-base sm:text-lg text-[#172B24] tracking-tight leading-tight">
              KLARVES
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
              Corporate
            </span>
          </div>
        </div>

        {/* Employee Login Button */}
        <div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center text-xs sm:text-sm font-semibold text-[#172B24] hover:text-[#166534] bg-white hover:bg-slate-50 border border-slate-300 hover:border-[#166534]/50 px-4 py-2 rounded-lg transition-colors duration-150 shadow-xs"
          >
            Employee Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default LandingNavbar;
