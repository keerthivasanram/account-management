import React from 'react';

export const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white/80 backdrop-blur-sm border-t border-slate-200/90 mt-auto relative z-10">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div>
          <span>KLARVES Corporate Pvt. Ltd &copy; {currentYear}.</span>
        </div>
        <div className="flex items-center gap-2 text-center sm:text-right text-slate-400">
          <span>Authorized employees only.</span>
          <span>•</span>
          <span>Secure company access.</span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
