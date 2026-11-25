import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { supabaseAuth } from '../../services/supabase';
import logoMark from '../../logo-mark.png';
import PrimaryButton from '../../components/ui/PrimaryButton';
import FormField from '../../components/ui/FormField';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

// Dev shortcuts are compiled out of production builds unless explicitly enabled.
const DEV_LOGIN_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';

const DEV_ACCOUNTS = [
  { email: 'superadmin@company.internal', name: 'Founder (Super Admin)', label: 'Super Admin' },
  { email: 'admin@company.internal', name: 'System Administrator', label: 'Admin (HR / Ops)' },
  { email: 'manager1@company.internal', name: 'Priya Nair', label: 'Manager (Marketing)' },
  { email: 'employee1@company.internal', name: 'Sarah Jenkins', label: 'Employee' },
];

const getDeviceFingerprint = () => {
  try {
    let fp = localStorage.getItem('device_fp');
    if (!fp) {
      fp = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
      localStorage.setItem('device_fp', fp);
    }
    return fp;
  } catch {
    return 'unknown-device';
  }
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithSupabase, loginWithDev, loginWithMfa, isSupabaseConfigured, error: authError } = useAuth();

  const [authMode, setAuthMode] = useState('STANDARD'); // 'STANDARD' | 'MFA'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // MFA Challenge State
  const [mfaChallengeId, setMfaChallengeId] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaHint, setMfaHint] = useState(null);
  const [mfaMessage, setMfaMessage] = useState(null);

  const handleSupabaseSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        if (!DEV_LOGIN_ENABLED) {
          throw new Error('Sign-in is not configured. Please contact your administrator.');
        }
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) {
          throw new Error('Please enter a work email or select an Instant Development Login.');
        }
        const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        await loginWithDev(cleanEmail, formattedName);
        navigate('/dashboard');
        return;
      }
      await loginWithSupabase(email, password);
      navigate('/dashboard');
    } catch (err) {
      let msg = err.response?.data?.detail;
      if (!msg && typeof err.response?.data === 'string') {
        msg = err.response.data;
      }
      if (!msg) {
        msg = err.message || 'Login failed';
      }
      if (msg.includes('500') || msg.includes('Network Error')) {
        msg = 'Authentication service returned an unexpected response. Please ensure backend is active at http://127.0.0.1:8000.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await supabaseAuth.signInWithGoogle(); // browser leaves for Google here
    } catch (err) {
      setError(err.message || 'Could not start Google sign-in');
      setIsLoading(false);
    }
  };

  const handleRequestMfa = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your corporate work email.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.mfa.requestChallenge(email.trim());
      setMfaChallengeId(res.data.challenge_id);
      setMfaHint(res.data.hint);
      setMfaMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to dispatch MFA security challenge.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    if (!mfaCode.trim() || !mfaChallengeId) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await loginWithMfa({
        email: email.trim(),
        code: mfaCode.trim(),
        challenge_id: mfaChallengeId,
        device_fingerprint: getDeviceFingerprint(),
        device_name: 'Browser Workstation',
        browser: navigator.userAgent.slice(0, 100),
        os: navigator.platform || 'unknown'
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired 2FA code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (devEmail, name) => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithDev(devEmail, name);
      navigate('/dashboard');
    } catch (err) {
      setError('Development authentication failed. Verify backend API is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const tabClass = (active) =>
    `flex-1 h-9 text-[13px] font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-white">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-shell-900 via-shell-800 to-brand-900 text-white px-12 py-10">
        <img src={logoMark} alt="" aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 w-[420px] opacity-[0.07] rotate-12" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2.5 w-fit rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
          <img src={logoMark} alt="" className="h-8 w-8 object-contain" />
          <span className="leading-none">
            <span className="block font-bold tracking-[0.08em] text-[17px]">KLARVES</span>
            <span className="block text-[10px] text-emerald-100/60 mt-1">Employee Platform</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-[34px] leading-tight font-semibold tracking-tight">
            One secure workspace for the whole team.
          </h2>
          <p className="mt-3 text-[15px] text-emerald-50/70 leading-relaxed">
            Accounts, tasks, attendance and approvals in one place, with access matched to your role.
          </p>
          <ul className="mt-8 space-y-3.5 text-sm text-emerald-50/85">
            {[
              [ShieldCheck, 'Role-based access checked on every request'],
              [KeyRound, 'Instagram tokens never leave the server'],
              [CheckCircle2, 'Every privileged action is audit-logged'],
            ].map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-brand-300" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-emerald-50/50">
          KLARVES Corporate Pvt. Ltd. &middot; Authorized employees only
        </p>
      </aside>

      {/* Form column */}
      <main className="flex flex-col min-h-screen bg-[#F7F9F8] lg:bg-white">
        <div className="flex items-center justify-between px-6 sm:px-10 h-16">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to home
          </Link>
          <Link to="/" className="lg:hidden flex items-center gap-2" aria-label="KLARVES home">
            <img src={logoMark} alt="" className="h-7 w-7" />
            <span className="font-bold tracking-[0.08em] text-[15px] text-slate-900">KLARVES</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 py-8">
          <div className="w-full max-w-[400px]">
            <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Sign in</h1>
            <p className="mt-1.5 text-sm text-slate-500">Use your company account to open your workspace.</p>

            {(error || authError) && (
              <div role="alert" className="mt-6 p-3 rounded-xl bg-rose-50 ring-1 ring-rose-200 text-[13px] text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error || authError}</span>
              </div>
            )}

            {isSupabaseConfigured && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="mt-7 w-full h-11 flex items-center justify-center gap-2.5 rounded-xl ring-1 ring-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-900 shadow-sm transition-colors cursor-pointer disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
                  </svg>
                  Continue with Google
                </button>
                <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  or sign in with email
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
              </>
            )}

            {/* Method switch */}
            <div role="tablist" aria-label="Sign-in method" className={`flex p-1 rounded-xl bg-slate-100 ${isSupabaseConfigured ? '' : 'mt-7'}`}>
              <button type="button" role="tab" aria-selected={authMode === 'STANDARD'} onClick={() => { setAuthMode('STANDARD'); setError(null); }} className={tabClass(authMode === 'STANDARD')}>
                Password
              </button>
              <button type="button" role="tab" aria-selected={authMode === 'MFA'} onClick={() => { setAuthMode('MFA'); setError(null); }} className={tabClass(authMode === 'MFA')}>
                Email code
              </button>
            </div>

            {authMode === 'STANDARD' ? (
              <form onSubmit={handleSupabaseSubmit} className="mt-5 space-y-4">
                <FormField label="Work email" required id="workEmail">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    <input type="email" id="workEmail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com" required className="enterprise-input w-full !h-11 !pl-9 !rounded-xl" />
                  </div>
                </FormField>
                <FormField label="Password" required id="workPass">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    <input type={showPassword ? 'text' : 'password'} id="workPass" autoComplete="current-password" value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required={isSupabaseConfigured}
                      className="enterprise-input w-full !h-11 !pl-9 !pr-16 !rounded-xl" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 h-7 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </FormField>
                <PrimaryButton type="submit" loading={isLoading} className="w-full !h-11 !rounded-xl">
                  Sign in
                </PrimaryButton>
              </form>
            ) : !mfaChallengeId ? (
              <form onSubmit={handleRequestMfa} className="mt-5 space-y-4">
                <p className="text-[13px] text-slate-500">We&apos;ll email a 6-digit code to your registered work address.</p>
                <FormField label="Work email" required id="mfaEmail">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    <input type="email" id="mfaEmail" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com" required className="enterprise-input w-full !h-11 !pl-9 !rounded-xl" />
                  </div>
                </FormField>
                <PrimaryButton type="submit" loading={isLoading} className="w-full !h-11 !rounded-xl">Send code</PrimaryButton>
              </form>
            ) : (
              <form onSubmit={handleVerifyMfa} className="mt-5 space-y-4">
                <div className="p-3 rounded-xl bg-brand-50 ring-1 ring-brand-200 text-[13px] text-brand-800">
                  <p className="font-medium">{mfaMessage}</p>
                  {mfaHint && (
                    <p className="mt-1 font-mono text-xs">Development code: <strong>{mfaHint}</strong></p>
                  )}
                </div>
                <FormField label="6-digit code" required id="mfaCode">
                  <input type="text" id="mfaCode" inputMode="numeric" autoComplete="one-time-code" value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" maxLength={6} required
                    className="enterprise-input w-full !h-12 !rounded-xl font-mono text-center tracking-[0.5em] text-lg" />
                </FormField>
                <PrimaryButton type="submit" loading={isLoading} className="w-full !h-11 !rounded-xl">Verify and sign in</PrimaryButton>
                <button type="button" onClick={() => { setMfaChallengeId(null); setMfaCode(''); setMfaHint(null); }}
                  className="w-full text-center text-[13px] text-slate-500 hover:text-slate-900">
                  Use a different email
                </button>
              </form>
            )}

            {/* Test roles: development builds only */}
            {DEV_LOGIN_ENABLED && (
              <div className="mt-8 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-4">
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-[0.12em]">Development test roles</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {DEV_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleDevLogin(acc.email, acc.name)}
                      disabled={isLoading}
                      title={acc.email}
                      className="text-left px-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 hover:ring-brand-300 hover:bg-brand-50/40 transition-colors cursor-pointer disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                        {acc.label === 'Employee'
                          ? <UserCheck className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
                          : <ShieldCheck className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />}
                        {acc.label}
                      </span>
                      <span className="block mt-0.5 text-[11px] text-slate-500 truncate">{acc.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-8 text-center text-xs text-slate-400 lg:hidden">
              KLARVES Corporate Pvt. Ltd. &middot; Authorized employees only
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
