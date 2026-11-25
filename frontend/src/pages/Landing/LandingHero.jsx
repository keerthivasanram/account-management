import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Instagram, UsersRound, ShieldCheck, Lock } from 'lucide-react';
import FlowingWaveLines from './FlowingWaveLines';
import logoMark from '../../logo-mark.png';

const FEATURES = [
  {
    icon: Instagram,
    title: 'Account fleet',
    text: 'Register, connect and assign Instagram accounts, with connection health at a glance.',
  },
  {
    icon: UsersRound,
    title: 'Team workspace',
    text: 'Tasks, attendance, leave and approvals routed to the right manager automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    text: 'Role-based access, audit trails and confidential watermarking on every screen.',
  },
];

/** Decorative miniature of the signed-in workspace. No real data; hidden from screen readers. */
const ProductPreview = () => (
  <div aria-hidden="true" className="relative w-full max-w-[560px] mx-auto">
    <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-brand-100/70 via-white to-cyan-100/60 blur-2xl" />
    <div className="relative rounded-2xl bg-white ring-1 ring-slate-200 shadow-[0_24px_60px_-20px_rgba(11,47,39,0.35)] overflow-hidden">
      {/* window chrome */}
      <div className="h-8 px-3 flex items-center gap-1.5 bg-slate-50 border-b border-slate-100">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
      </div>
      <div className="flex h-[300px] sm:h-[330px]">
        {/* sidebar */}
        <div className="w-[30%] bg-shell-900 p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-4">
            <img src={logoMark} alt="" className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-[0.08em] text-white">KLARVES</span>
          </div>
          <div className="h-6 rounded-md bg-brand-600" />
          {[80, 65, 72, 58, 70, 62].map((w, i) => (
            <div key={i} className="h-2 rounded-full bg-white/15" style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* content */}
        <div className="flex-1 p-4 space-y-3 bg-[#F4F6FA]">
          <div className="h-3 w-24 rounded-full bg-slate-800/80" />
          <div className="grid grid-cols-4 gap-px rounded-lg overflow-hidden bg-slate-200 ring-1 ring-slate-200">
            {['bg-emerald-500', 'bg-brand-600', 'bg-amber-400', 'bg-rose-400'].map((c) => (
              <div key={c} className="bg-white p-2.5 space-y-2">
                <div className="h-1.5 w-10 rounded-full bg-slate-200" />
                <div className="h-3 w-6 rounded bg-slate-800/80" />
                <div className={`h-1.5 w-8 rounded-full ${c} opacity-60`} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 rounded-lg bg-white ring-1 ring-slate-200 p-3 space-y-2.5">
              <div className="h-2 w-20 rounded-full bg-slate-300" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-slate-100" />
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100" />
                  <div className={`h-3 w-10 rounded-full ${i === 1 ? 'bg-amber-100' : 'bg-emerald-100'}`} />
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white ring-1 ring-slate-200 p-3 space-y-3">
              <div className="h-2 w-12 rounded-full bg-slate-300" />
              {['w-[78%] bg-emerald-500', 'w-[35%] bg-amber-400', 'w-[15%] bg-rose-400'].map((c) => (
                <div key={c} className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${c}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const LandingHero = () => (
  <section className="relative w-full flex-1 overflow-hidden">
    {/* soft brand wash */}
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_20%,rgba(22,163,74,0.08),transparent_70%),radial-gradient(50%_45%_at_90%_30%,rgba(6,182,212,0.08),transparent_70%)]" />

    <div className="relative z-10 max-w-[1280px] mx-auto px-6 sm:px-8 pt-14 sm:pt-20 lg:pt-24 pb-28">
      <div className="grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-12 items-center">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase text-brand-700 bg-brand-50 ring-1 ring-brand-200 px-3.5 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            Internal operations platform
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-bold text-slate-900 tracking-tight leading-[1.08]">
            Welcome to <span className="text-brand-700">KLARVES</span> Corporate
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-slate-800 font-semibold">
            A centralized workspace for our team.
          </p>
          <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Manage Instagram accounts, coordinate team activities and streamline daily operations through one secure platform.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
            <Link
              to="/login"
              className="group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 shadow-lg shadow-brand-900/20 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            >
              Employee login
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Company accounts only
            </span>
          </div>
        </div>

        {/* Preview */}
        <ProductPreview />
      </div>

      {/* Features */}
      <ul className="mt-20 lg:mt-24 grid sm:grid-cols-3 gap-4 lg:gap-6">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-2xl bg-white/80 backdrop-blur ring-1 ring-slate-200 p-6 shadow-soft">
            <span className="w-10 h-10 rounded-xl bg-brand-50 ring-1 ring-brand-100 text-brand-700 flex items-center justify-center">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[15px] font-semibold text-slate-900">{title}</h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{text}</p>
          </li>
        ))}
      </ul>
    </div>

    <FlowingWaveLines />
  </section>
);

export default LandingHero;
