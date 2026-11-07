import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Instagram, 
  Users, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Sparkles, 
  FileCheck,
  Send,
  Activity,
  Layers,
  KeyRound
} from 'lucide-react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFooter from './LandingFooter';
import FeatureCard3D from './FeatureCard3D';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B24] flex flex-col font-sans selection:bg-[#06dab4]/20 selection:text-[#02164b]">
      {/* 1. Header Navigation */}
      <LandingNavbar />

      {/* 2. Hero Section with Mild Wave Flow Background & 3D Instagram Fleet Simulation */}
      <main className="flex-1 flex flex-col">
        <LandingHero />

        {/* 3. Operational Metrics Strip (Logo Color Accents) */}
        <section className="w-full border-y border-slate-200/90 bg-white/90 backdrop-blur-sm py-8 sm:py-10 relative z-10">
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-[#02164b] tracking-tight">5,000+</span>
                <span className="text-xs text-slate-500 font-medium mt-1">Instagram Business Fleet</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-[#166534] tracking-tight">60 / Worker</span>
                <span className="text-xs text-slate-500 font-medium mt-1">Strict Quota Ceiling</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-[#0284c7] tracking-tight">Meta v20.0</span>
                <span className="text-xs text-slate-500 font-medium mt-1">Zero-Trust Token Flow</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-[#06dab4] tracking-tight" style={{ color: '#059669' }}>99.98%</span>
                <span className="text-xs text-slate-500 font-medium mt-1">Publishing Dispatch SLA</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive 3D Feature Grid (Tailored to Company Work) */}
        <section id="architecture" className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 py-20 relative z-10">
          <div className="flex flex-col items-center text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-[#02164b] bg-[#06dab4]/10 border border-[#06dab4]/30 px-3 py-1 rounded-full mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#06dab4]" />
              <span>CORE OPERATIONAL CAPABILITIES</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-semibold text-[#172B24] tracking-tight max-w-2xl mb-4">
              Engineered specifically for corporate Instagram multi-account operations
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              Eliminate shared passwords, prevent employee burnout, and automate media publishing across your entire corporate account footprint.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            <FeatureCard3D
              icon={Instagram}
              tag="Account Federation"
              title="Official Meta Graph API Direct"
              description="Direct Graph API v20.0 connectivity with single-use OAuth 2.0 PKCE state handshakes, 60-day auto-refreshing tokens, and zero plain-text password sharing."
              badge="v20.0 Verified"
              highlight={true}
            />

            <FeatureCard3D
              icon={Users}
              tag="Workforce Balance"
              title="60-Account Workload Governor"
              description="Automated quota ceiling of 60 Instagram accounts per employee. System automatically flags overload, suggests reassignment, and tracks team capacity."
              badge="Quota Enforced"
            />

            <FeatureCard3D
              icon={Send}
              tag="Scheduled Dispatch"
              title="Timezone-Aware Publishing Engine"
              description="Coordinate media carousels, stories, and feed posts. Validates video aspect ratios, handles timezone scheduling, and auto-retries failed dispatches."
              badge="Automated SLA"
            />

            <FeatureCard3D
              icon={ShieldCheck}
              tag="Enterprise Security"
              title="DLP Canvas & Device Trust"
              description="Real-time watermarking tied to active employee credentials, hardware device attestation, and rapid incident response defense locks."
              badge="Zero Exposure"
            />

            <FeatureCard3D
              icon={FileCheck}
              tag="Compliance Trail"
              title="Immutable Audit Ledger"
              description="Every account registration, OAuth handshake, client attribution, approval decision, and role modification is logged cryptographically."
              badge="Tamper Proof"
            />

            <FeatureCard3D
              icon={Activity}
              tag="Live Telemetry"
              title="Fleet Health Monitoring"
              description="Continuous token validity probes, instant Meta Graph webhook listeners, and automatic detection of revoked client permissions."
              badge="Sub-50ms Sync"
            />
          </div>
        </section>

        {/* 5. Company Workflow Pipeline: From Onboarding to Publishing */}
        <section className="w-full bg-[#02164b] text-white py-16 sm:py-20 relative overflow-hidden">
          {/* Subtle background glow in logo teal */}
          <div 
            className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #06dab4 0%, transparent 70%)',
            }}
          />

          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#06dab4] bg-[#06dab4]/15 border border-[#06dab4]/30 px-3 py-1 rounded-full inline-block mb-4">
                  OPERATIONAL LIFECYCLE
                </span>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-4">
                  How our team executes Instagram operations daily
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  From initial account onboarding to daily publishing, every step is safeguarded by strict enterprise governance policies.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-[#06dab4]/20 text-[#06dab4] border border-[#06dab4]/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Controlled Account Registration</h4>
                      <p className="text-xs text-slate-300 mt-0.5">Employee registers handle, associates Client & Campaign, and confirms capacity within the 60-account threshold.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-[#06dab4]/20 text-[#06dab4] border border-[#06dab4]/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Zero-Password OAuth Handshake</h4>
                      <p className="text-xs text-slate-300 mt-0.5">Direct Meta OAuth flow exchanges single-use authorization code for long-lived AES-256 encrypted tokens.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-[#06dab4]/20 text-[#06dab4] border border-[#06dab4]/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Manager Approval & Quota Validation</h4>
                      <p className="text-xs text-slate-300 mt-0.5">Admin or Team Lead approves assignment before active dispatches or client media scheduling can commence.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-[#06dab4]/20 text-[#06dab4] border border-[#06dab4]/40 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Governed Daily Publishing</h4>
                      <p className="text-xs text-slate-300 mt-0.5">Automated dispatch queue schedules stories and posts with full DLP watermarking and audit recording.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Fleet Telemetry Terminal */}
              <div className="lg:col-span-6">
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/90 p-5 font-mono text-xs shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-500/80" />
                      <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                      <span className="h-3 w-3 rounded-full bg-[#06dab4]" />
                      <span className="text-slate-400 text-[11px] ml-2">klarves-fleet-governor.log</span>
                    </div>
                    <span className="text-[10px] text-[#06dab4] uppercase tracking-wider font-semibold">Active Cluster</span>
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <p className="text-slate-500">[2026-11-07 14:12:01 UTC] INF Instagram Fleet Engine v20.0 initialized.</p>
                    <p className="text-[#06dab4]">[2026-11-07 14:12:02 UTC] SEC OAuth token handshakes verified for 4,892 active accounts.</p>
                    <p className="text-slate-300">[2026-11-07 14:12:03 UTC] POL Quota check: 0 workers exceed 60-account threshold.</p>
                    <p className="text-emerald-400">[2026-11-07 14:12:04 UTC] PUB Dispatched 14 scheduled reels across Client Group Beta.</p>
                    <p className="text-blue-400">[2026-11-07 14:12:05 UTC] AUD DLP watermark session attached to employee workspace.</p>
                    <p className="text-[#06dab4]">[2026-11-07 14:12:06 UTC] OK Fleet health: 99.98% operational. Next cycle in 30s.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Employee Sign-in Callout */}
        <section className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 py-16 sm:py-20 text-center relative z-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm flex flex-col items-center max-w-3xl mx-auto">
            <div className="h-12 w-12 rounded-xl bg-[#06dab4]/15 text-[#02164b] flex items-center justify-center mb-4">
              <Instagram className="h-6 w-6 text-[#02164b]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-[#172B24] tracking-tight mb-2">
              Ready to manage your Instagram fleet?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mb-6 leading-relaxed">
              Log in with your authorized corporate employee credentials to view assigned accounts, submit new connections, and schedule publications.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[#166534] hover:bg-[#14532d] transition-colors duration-150 shadow-xs"
            >
              <span>Employee Portal Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
