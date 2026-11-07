import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Users, 
  Shield, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Layers, 
  Sparkles, 
  FileCheck,
  Send,
  ShieldCheck,
  Activity
} from 'lucide-react';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import LandingFooter from './LandingFooter';
import FeatureCard3D from './FeatureCard3D';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172B24] flex flex-col font-sans selection:bg-[#166534]/15 selection:text-[#166534]">
      {/* 1. Header Navigation */}
      <LandingNavbar />

      {/* 2. Hero Section with 3D Operations Globe */}
      <main className="flex-1 flex flex-col">
        <LandingHero />

        {/* 3. Operational Metrics Strip */}
        <section className="w-full border-y border-slate-200/80 bg-white py-8 sm:py-10">
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-[#172B24] tracking-tight">5,000+</span>
                <span className="text-xs text-slate-500 font-medium mt-1">Target Account Fleet</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-[#166534] tracking-tight">60 / Emp</span>
                <span className="text-xs text-slate-500 font-medium mt-1">Strict Quota Ceiling</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-[#172B24] tracking-tight">Zero-Trust</span>
                <span className="text-xs text-slate-500 font-medium mt-1">OAuth Token Federation</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold text-[#166534] tracking-tight">99.98%</span>
                <span className="text-xs text-slate-500 font-medium mt-1">Automated Dispatch SLA</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive 3D Feature Grid */}
        <section id="architecture" className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 py-20">
          <div className="flex flex-col items-center text-center mb-12 sm:mb-16">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#166534] bg-[#166534]/8 border border-[#166534]/20 px-3 py-1 rounded-full mb-3">
              PLATFORM CAPABILITIES
            </span>
            <h2 className="text-2xl sm:text-4xl font-semibold text-[#172B24] tracking-tight max-w-2xl mb-4">
              Enterprise architecture engineered for high-volume Instagram operations
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              Every workflow is protected with end-to-end token encryption, multi-tier admin approvals, and hardware attestation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            <FeatureCard3D
              icon={Globe}
              tag="Fleet Federation"
              title="Meta Graph API Integration"
              description="Direct Graph API v20.0 connectivity with single-use OAuth state parameters, automated 60-day token rotation, and zero manual password handling."
              badge="v20.0 Verified"
              highlight={true}
            />

            <FeatureCard3D
              icon={Users}
              tag="Workload Protection"
              title="Workload & Quota Governor"
              description="Hard ceiling of 60 Instagram accounts per employee with automatic capacity forecasting, reassignments, and multi-tier manager approvals."
              badge="Quota Enforced"
            />

            <FeatureCard3D
              icon={ShieldCheck}
              tag="Security Vault"
              title="DLP & Dynamic Watermarking"
              description="Continuous canvas-level dynamic watermarking, hardware device trust fingerprinting, and real-time screen inspection defenses."
              badge="ISO 27001 Aligned"
            />

            <FeatureCard3D
              icon={Send}
              tag="Publishing Engine"
              title="Timezone-Aware Dispatch"
              description="Automated media asset publishing with validation checks, scheduled publication pipelines, and automatic exponential backoff retries."
              badge="Fault Tolerant"
            />

            <FeatureCard3D
              icon={FileCheck}
              tag="Compliance Audit"
              title="Immutable Activity Ledger"
              description="Every administrative approval, reassignment, account connection, and data view is cryptographically recorded in an immutable audit log."
              badge="Tamper Proof"
            />

            <FeatureCard3D
              icon={Cpu}
              tag="High Availability"
              title="Centralized Telemetry"
              description="Instant health monitoring across all client campaigns, real-time connection status probes, and instant anomaly notifications."
              badge="Real-Time"
            />
          </div>
        </section>

        {/* 5. Enterprise Security Pipeline Section */}
        <section className="w-full bg-slate-900 text-white py-16 sm:py-20 relative overflow-hidden">
          {/* Subtle technological background grid */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }}
          />

          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full inline-block mb-4">
                  OPERATIONAL LIFECYCLE
                </span>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-4">
                  How accounts are governed from onboarding to publishing
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  Our 4-step governance lifecycle ensures absolute compliance with corporate security protocols and Meta platform policies.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Controlled Account Registration</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Account metadata, client attribution, and campaign tagging with capacity validation.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">OAuth 2.0 PKCE Authorization</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Direct Meta redirect handshake with cryptographic nonce verification.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Admin Approval & Quota Binding</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Administrative review before enabling active publishing or workload assignment.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Audited Operational Execution</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Continuous DLP watermarking, token health checks, and scheduled publishing dispatches.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code / Visual Terminal Block */}
              <div className="lg:col-span-6">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 font-mono text-xs shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-500/80" />
                      <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                      <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                      <span className="text-slate-400 text-[11px] ml-2">klarves-nexus-telemetry.log</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Active Monitoring</span>
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <p className="text-slate-500">[2026-11-07 14:06:12 UTC] INF Initializing Fleet Governance Engine...</p>
                    <p className="text-slate-400">[2026-11-07 14:06:13 UTC] INF Loaded 5,000 capacity cluster across employee nodes.</p>
                    <p className="text-emerald-400">[2026-11-07 14:06:14 UTC] SEC OAuth token handshakes verified with Meta Graph API v20.0.</p>
                    <p className="text-slate-400">[2026-11-07 14:06:15 UTC] POL Quota threshold check: 0/60 threshold breached. Fleet balanced.</p>
                    <p className="text-blue-400">[2026-11-07 14:06:16 UTC] AUD Security watermark attached: session employee-attested.</p>
                    <p className="text-emerald-300">[2026-11-07 14:06:17 UTC] OK 99.98% dispatch pipeline active. Operational state: OPTIMAL.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Employee Sign-in Callout */}
        <section className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 py-16 sm:py-20 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm flex flex-col items-center max-w-3xl mx-auto">
            <div className="h-12 w-12 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-[#172B24] tracking-tight mb-2">
              Ready to access your assigned operations?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mb-6 leading-relaxed">
              Log in with your corporate employee credentials to manage accounts, schedule publications, review assigned tasks, and track performance.
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
