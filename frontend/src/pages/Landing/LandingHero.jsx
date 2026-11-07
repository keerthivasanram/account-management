import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import OperationsGlobe3D from './OperationsGlobe3D';

export const LandingHero = () => {
  return (
    <section className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 py-12 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column: Value Proposition & CTAs */}
        <div className="lg:col-span-7 text-left flex flex-col items-start justify-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase text-[#166534] bg-[#166534]/8 border border-[#166534]/20 px-3.5 py-1.5 rounded-full mb-6 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#166534] animate-pulse" />
            <span>ENTERPRISE FLEET ARCHITECTURE v2.4</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-semibold text-[#172B24] tracking-tight leading-[1.12] mb-5">
            Mission-critical Instagram operations for <span className="text-[#166534] underline decoration-[#166534]/25 decoration-4 underline-offset-8">KLARVES</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed max-w-xl mb-8">
            A centralized enterprise platform to securely register, verify, orchestrate, and publish across 5,000+ corporate Instagram accounts with zero credential exposure.
          </p>

          {/* Primary & Secondary Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-10">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold text-white bg-[#166534] hover:bg-[#14532d] shadow-sm hover:shadow-md transition-all duration-150 group"
            >
              <span>Access Employee Workspace</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>

            <a
              href="#architecture"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 transition-colors duration-150"
            >
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span>Security & Architecture</span>
            </a>
          </div>

          {/* Trust & Compliance Indicators */}
          <div className="pt-6 border-t border-slate-200/80 w-full grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
              <span className="font-medium">Meta Graph Partner API</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#166534] shrink-0" />
              <span className="font-medium">Zero-Trust OAuth 2.0</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <Sparkles className="w-4 h-4 text-[#166534] shrink-0" />
              <span className="font-medium">Max 60 Accts / Employee</span>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Interactive WebGL Operations Globe */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="w-full max-w-[500px] lg:max-w-none">
            <OperationsGlobe3D />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
