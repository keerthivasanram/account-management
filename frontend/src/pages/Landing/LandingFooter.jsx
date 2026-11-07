import React from 'react';

export const LandingFooter = () => {
  return (
    <footer className="w-full bg-white border-t border-[#E5E7EB] relative z-20">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-normal">
        <div>
          <span>KLARVES Corporate Pvt. Ltd. &copy; 2026.</span>
        </div>
        <div className="flex items-center gap-2 text-center sm:text-right">
          <span>Authorized employees only.</span>
          <span className="text-slate-300">&middot;</span>
          <span>Secure company access.</span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
