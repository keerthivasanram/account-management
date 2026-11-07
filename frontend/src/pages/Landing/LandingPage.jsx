import React from 'react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFooter from './LandingFooter';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B24] flex flex-col font-sans selection:bg-[#06dab4]/20 selection:text-[#02164b]">
      {/* 1. Navigation Header */}
      <LandingNavbar />

      {/* 2. Welcome Message & Login Button */}
      <main className="flex-1 flex flex-col">
        <LandingHero />
      </main>

      {/* 3. Minimal Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
