import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Laptop, Mail, MailCheck, ShieldCheck, UserCheck } from 'lucide-react';
import { MOBILE_BLOCKED_MESSAGE, isMobileDevice } from '../../utils/device';
import { useAuth } from '../../context/AuthContext';
import { supabaseAuth } from '../../services/supabase';
import logoMark from '../../logo-mark.png';
import chevronArt from '../../assets/login-chevrons.jpg';

// Development-only shortcuts, compiled out of production builds unless explicitly enabled.
const DEV_LOGIN_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';
const DEV_ACCOUNTS = [
  { email: 'superadmin@company.internal', name: 'Founder (Super Admin)', label: 'Super Admin' },
  { email: 'admin@company.internal', name: 'System Administrator', label: 'Admin (HR / Ops)' },
  { email: 'manager1@company.internal', name: 'Priya Nair', label: 'Team Lead (Marketing)' },
  { email: 'employee1@company.internal', name: 'Sarah Jenkins', label: 'Employee' },
];

const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const optionButton =
  'w-full max-w-[420px] h-[60px] flex items-center justify-center gap-4 rounded-2xl border border-slate-300 bg-white ' +
  'text-[17px] font-semibold text-[#0B1F1B] shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:bg-slate-50 hover:border-slate-400 ' +
  'transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200';

/**
 * The front door. Everyone signs in with Google or a one-time email link; the backend
 * matches the verified email to an employee record and that record decides the role.
 */
export const LoginPage = () => {
  const navigate = useNavigate();
  const { employee, loading, loginWithDev, isSupabaseConfigured, error: authError } = useAuth();

  const [mode, setMode] = useState('choose'); // 'choose' | 'email' | 'sent'
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showDev, setShowDev] = useState(false);
  const [searchParams] = useSearchParams();
  const mobile = isMobileDevice();
  // Phones/tablets: the page shows, but every sign-in path explains it's company-computer only
  const [mobileBlocked, setMobileBlocked] = useState(searchParams.get('blocked') === 'mobile');

  if (!loading && employee && !mobile) return <Navigate to="/dashboard" replace />;

  const blockOnMobile = () => {
    if (!mobile) return false;
    setMobileBlocked(true);
    return true;
  };

  const handleGoogle = async () => {
    if (blockOnMobile()) return;
    setError(null);
    setBusy(true);
    try {
      await supabaseAuth.signInWithGoogle(); // the browser leaves for Google here
    } catch (err) {
      setError(err.message || 'Could not start Google sign-in.');
      setBusy(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    if (blockOnMobile()) return;
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setError(null);
    setBusy(true);
    try {
      await supabaseAuth.signInWithEmailLink(clean);
      setEmail(clean);
      setMode('sent');
    } catch (err) {
      setError(err.message || 'Could not send the sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  const handleDevLogin = async (devEmail, name) => {
    if (blockOnMobile()) return;
    setError(null);
    setBusy(true);
    try {
      await loginWithDev(devEmail, name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Development sign-in failed. Is the backend running?');
    } finally {
      setBusy(false);
    }
  };

  const shownError = error || authError;

  return (
    <div className="min-h-screen grid lg:grid-cols-[52%_48%] bg-[#FCF6F1]">
      {/* Sign-in column */}
      <main className="relative flex flex-col min-h-screen px-6 sm:px-12 lg:px-[84px] py-10 lg:py-14">
        <div className="flex items-center gap-3">
          <img src={logoMark} alt="" className="h-11 w-11 object-contain" />
          <span className="text-[26px] font-semibold tracking-tight text-[#0B1F1B]">KLARVES Corporate</span>
        </div>

        <div className="flex-1 flex flex-col justify-center py-12">
          <h1 className="text-[44px] sm:text-[64px] leading-[1.05] font-bold tracking-tight text-[#0B1F1B]">
            Employee portal
          </h1>

          {mode === 'sent' ? (
            <div className="mt-5 max-w-[460px]" role="status">
              <p className="text-lg sm:text-[22px] text-slate-600">Check your inbox.</p>
              <div className="mt-7 flex items-start gap-3 rounded-2xl border border-teal-200 bg-white p-5">
                <MailCheck className="w-6 h-6 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[15px] text-slate-700 leading-relaxed">
                  We sent a sign-in link to <strong className="text-slate-900">{email}</strong>. Open it on this device to continue.
                  The link only works if this email belongs to an approved employee.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setMode('choose'); setError(null); }}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Use a different method
              </button>
            </div>
          ) : (
            <>
              <p className="mt-5 text-lg sm:text-[22px] text-slate-600">
                Sign in with your approved Google account or work email.
              </p>

              {mobileBlocked && (
                <div role="alert" className="mt-7 max-w-[420px] flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[15px] text-amber-900">
                  <Laptop className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold">Use your company computer</span>
                    {MOBILE_BLOCKED_MESSAGE}
                  </span>
                </div>
              )}

              {shownError && !mobileBlocked && (
                <div role="alert" className="mt-7 max-w-[420px] flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{shownError}</span>
                </div>
              )}

              {!isSupabaseConfigured ? (
                <p className="mt-10 max-w-[420px] text-sm text-slate-600">
                  Sign-in isn&apos;t configured yet. Please contact your administrator.
                </p>
              ) : mode === 'choose' || mobile ? (
                <div className="mt-10 space-y-3.5">
                  <button type="button" onClick={handleGoogle} disabled={busy} className={optionButton}>
                    <GoogleIcon />
                    Continue with Google
                  </button>
                  <button type="button" onClick={() => { if (blockOnMobile()) return; setMode('email'); setError(null); }} disabled={busy} className={optionButton}>
                    <Mail className="w-6 h-6 text-slate-600" aria-hidden="true" />
                    Continue with email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmail} className="mt-10 max-w-[420px] space-y-3.5">
                  <label htmlFor="loginEmail" className="block text-sm font-medium text-slate-700">Work email</label>
                  <input
                    id="loginEmail"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-[56px] px-4 rounded-2xl border border-slate-300 bg-white text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-[56px] rounded-2xl bg-[#0B3B3C] hover:bg-[#0E4A4B] text-white text-base font-semibold transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200"
                  >
                    {busy ? 'Sending link…' : 'Email me a sign-in link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('choose'); setError(null); }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
                  </button>
                </form>
              )}
            </>
          )}

          {/* Development test roles (never in production builds) */}
          {DEV_LOGIN_ENABLED && (
            <div className="mt-10 max-w-[420px]">
              <button
                type="button"
                onClick={() => setShowDev((v) => !v)}
                aria-expanded={showDev}
                aria-controls="dev-roles"
                className="text-xs font-medium text-amber-800 hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {showDev ? 'Hide' : 'Show'} development test roles
              </button>
              {showDev && (
                <div id="dev-roles" className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-3">
                  {DEV_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleDevLogin(acc.email, acc.name)}
                      disabled={busy}
                      title={acc.email}
                      className="text-left px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                    >
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                        {acc.label === 'Employee'
                          ? <UserCheck className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                          : <ShieldCheck className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />}
                        {acc.label}
                      </span>
                      <span className="block mt-0.5 text-[11px] text-slate-500 truncate">{acc.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500">KLARVES Corporate Pvt. Ltd. &copy; {new Date().getFullYear()}.</p>
      </main>

      {/* Brand artwork */}
      <div className="relative hidden lg:block bg-[#062F34] overflow-hidden" aria-hidden="true">
        <img src={chevronArt} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
      </div>
    </div>
  );
};

export default LoginPage;
