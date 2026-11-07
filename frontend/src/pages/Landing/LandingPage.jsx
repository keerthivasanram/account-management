import React from 'react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFooter from './LandingFooter';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B24] flex flex-col font-sans selection:bg-[#166534]/15 selection:text-[#166534]">
      {/* 1. Header (88px, white, thin border, original cyan double-chevron logo, right-aligned login) */}
      <LandingNavbar />

      {/* 2. Hero Section (centered, 3D glass ribbon behind, exact text, dark forest-green heading, fine wave lines at bottom) */}
      <main className="flex-1 flex flex-col items-center justify-center relative">
        <LandingHero />
      </main>

      {/* 3. Footer (white, thin top border, exact copyright & security text) */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
