import React from 'react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFooter from './LandingFooter';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B24] flex flex-col font-sans selection:bg-[#166534]/15 selection:text-[#166534]">
      {/* 1. Navigation bar */}
      <LandingNavbar />

      {/* 2. Hero section */}
      <main className="flex-1 flex items-center justify-center">
        <LandingHero />
      </main>

      {/* 3. Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
