import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CheckCircle2, Lock, Sparkles, Send } from 'lucide-react';
import InstagramFleetHologram3D from './InstagramFleetHologram3D';
import LandingWaveBackground from './LandingWaveBackground';

export const LandingHero = () => {
  return (
    <section className="relative w-full overflow-hidden py-10 lg:py-16">
      {/* Mild flow of color waves matching the logo palette (#06dab4 teal, #02164b navy, #166534 green) */}
      <LandingWaveBackground />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7 text-left flex flex-col items-start justify-center">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase text-[#02164b] bg-white/80 backdrop-blur-md border border-[#06dab4]/40 px-3.5 py-1.5 rounded-full mb-6 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#06dab4] animate-ping" />
              <span className="text-[#02164b] font-bold">KLARVES INSTAGRAM FLEET OPERATIONS</span>
              <span className="text-slate-300">|</span>
              <span className="text-[#166534] font-medium">Meta API v20.0</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-semibold text-[#172B24] tracking-tight leading-[1.12] mb-5">
              Enterprise Instagram operations with <span className="text-[#02164b] bg-gradient-to-r from-[#02164b] via-[#06dab4] to-[#166534] bg-clip-text text-transparent">zero credential risk</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed max-w-xl mb-7">
              Centrally orchestrate, verify, and publish across 5,000+ corporate Instagram accounts. Automated quota governance guarantees no employee exceeds 60 accounts.
            </p>

            {/* Primary & Secondary Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-9">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold text-white bg-[#166534] hover:bg-[#14532d] shadow-sm hover:shadow-md transition-all duration-150 group"
              >
                <span>Access Employee Workspace</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>

              <a
                href="#architecture"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg text-sm font-medium text-slate-700 bg-white/90 backdrop-blur-sm hover:bg-white border border-slate-300 hover:border-slate-400 transition-colors duration-150 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-[#0284c7]" />
                <span>Security & 60-Cap Policy</span>
              </a>
            </div>

            {/* Trust & Compliance Indicators */}
            <div className="pt-6 border-t border-slate-200/90 w-full grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#06dab4] shrink-0" />
                <span className="font-medium text-slate-800">Meta Verified Partner</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#02164b] shrink-0" />
                <span className="font-medium text-slate-800">OAuth PKCE Handshakes</span>
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <Sparkles className="w-4 h-4 text-[#166534] shrink-0" />
                <span className="font-medium text-slate-800">Max 60 Accts / Worker</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Instagram Fleet Hologram Simulator */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="w-full max-w-[540px] lg:max-w-none">
              <InstagramFleetHologram3D />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
