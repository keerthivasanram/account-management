import React from 'react';
import { Link } from 'react-router-dom';
import logoMark from '../../logo-mark.png';

export const LandingNavbar = () => {
  return (
    <header className="w-full bg-white border-b border-slate-100/90 z-40 m-0 p-0">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 h-[88px] flex items-center justify-between">
        {/* Company Identity: Original Cyan Double-Chevron Logo + Brand Name */}
        <div className="flex items-center gap-3">
          <img
            src={logoMark}
            alt="KLARVES Emblem"
            className="h-8 w-8 object-contain"
          />
          <span className="font-semibold text-lg text-[#172B24] tracking-tight">
            KLARVES Corporate
          </span>
        </div>

        {/* Employee Login Button aligned to far right */}
        <div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center text-sm font-medium text-[#172B24] hover:text-[#146833] bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors duration-150 shadow-2xs"
          >
            Employee Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default LandingNavbar;
