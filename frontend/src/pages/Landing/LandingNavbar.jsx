import React from 'react';
import { Link } from 'react-router-dom';
import logoMark from '../../logo-mark.png';

export const LandingNavbar = () => {
  return (
    <header className="w-full bg-white/80 backdrop-blur border-b border-slate-100 z-40 m-0 p-0 sticky top-0">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 h-[72px] flex items-center justify-between">
        {/* Company Identity: Original Cyan Double-Chevron Logo + Brand Name */}
        <div className="flex items-center gap-3">
          <img
            src={logoMark}
            alt=""
            className="h-8 w-8 object-contain"
          />
          <span className="font-semibold text-lg text-slate-900 tracking-tight whitespace-nowrap">
            KLARVES<span className="hidden sm:inline"> Corporate</span>
          </span>
        </div>

        {/* Employee Login Button aligned to far right */}
        <div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center whitespace-nowrap h-10 px-4 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 ring-1 ring-brand-200 rounded-xl transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            Employee Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default LandingNavbar;
