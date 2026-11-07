import React from 'react';

export const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#172B24]/60">
        <div>
          <span>KLARVES Corporate Pvt. Ltd &copy; {currentYear}.</span>
        </div>
        <div className="flex items-center gap-2 text-center sm:text-right">
          <span>Authorized employees only.</span>
          <span className="text-slate-300">•</span>
          <span>Secure company access.</span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
