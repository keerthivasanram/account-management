import React from 'react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFooter from './LandingFooter';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white text-[#172B24] flex flex-col font-sans selection:bg-[#166534]/15 selection:text-[#166534]">
      {/* 1. Header */}
      <LandingNavbar />

      {/* 2. Hero Section with 3D Glass Ribbon & Flowing Wave Lines */}
      <main className="flex-1 flex flex-col items-center justify-center relative bg-white">
        <LandingHero />
      </main>

      {/* 3. Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
