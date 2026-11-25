import React from 'react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFooter from './LandingFooter';

export const LandingPage = () => {
  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col font-sans selection:bg-brand-700/15 selection:text-brand-700 m-0 p-0 overflow-x-hidden">
      {/* 1. Header (88px, pure white, original cyan double-chevron logo, right-aligned login) */}
      <LandingNavbar />

      {/* 2. Hero: copy + product preview, feature cards, flowing waves */}
      <main className="flex-1 flex flex-col relative bg-white overflow-hidden m-0 p-0">
        <LandingHero />
      </main>

      {/* 3. Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
