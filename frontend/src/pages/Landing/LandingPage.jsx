import React from 'react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFooter from './LandingFooter';

export const LandingPage = () => {
  return (
    <div className="min-h-screen w-full bg-white text-[#172B24] flex flex-col font-sans selection:bg-[#166534]/15 selection:text-[#166534] m-0 p-0 overflow-x-hidden">
      {/* 1. Header (88px, pure white, original cyan double-chevron logo, right-aligned login) */}
      <LandingNavbar />

      {/* 2. Hero Section with 3D Glass Ribbon Sculpture & Fine Flowing Waves */}
      <main className="flex-1 flex flex-col items-center justify-center relative bg-white overflow-hidden m-0 p-0">
        <LandingHero />
      </main>

      {/* 3. Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
