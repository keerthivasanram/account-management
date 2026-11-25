import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { supabaseAuth } from '../../services/supabase';
import logoLight from '../../logo-light.png';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
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

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#172B24] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Portal</span>
          </Link>
          <span className="text-[11px] font-mono text-[#64748B] bg-white px-2 py-0.5 rounded border border-[#E5E7EB]">
            v3.2 Production
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Link to="/" className="inline-block">
              <img
                src={logoLight}
                alt="Klarves"
                className="h-10 object-contain"
              />
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-[#172B24] tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-xs text-[#64748B]">
            Enterprise Instagram Operations &amp; Fleet Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-xs space-y-5">
          {/* Mode Switcher */}
          <div className="flex bg-[#F1F5F9] p-0.5 rounded-md text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('STANDARD');
                setError(null);
              }}
              className={`flex-1 py-1.5 font-medium rounded-sm transition-colors cursor-pointer ${
                authMode === 'STANDARD'
                  ? 'bg-white text-[#172B24] shadow-xs'
                  : 'text-[#64748B] hover:text-[#172B24]'
              }`}
            >
              Standard Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('MFA');
                setError(null);
              }}
              className={`flex-1 py-1.5 font-medium rounded-sm transition-colors cursor-pointer ${
                authMode === 'MFA'
                  ? 'bg-white text-[#172B24] shadow-xs'
                  : 'text-[#64748B] hover:text-[#172B24]'
              }`}
            >
              2FA Security Challenge
            </button>
          </div>

          {(error || authError) && (
            <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error || authError}</span>
            </div>
          )}

          {authMode === 'STANDARD' ? (
            <form onSubmit={handleSupabaseSubmit} className="space-y-4">
              <FormField label="Work Email" required id="workEmail">
                <input
                  type="email"
                  id="workEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="enterprise-input w-full"
                />
              </FormField>

              <FormField label="Password" required id="workPass">
                <input
                  type="password"
                  id="workPass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required={isSupabaseConfigured}
                  className="enterprise-input w-full"
                />
              </FormField>

              <PrimaryButton
                type="submit"
                loading={isLoading}
                className="w-full mt-2"
              >
                Sign In to Workspace
              </PrimaryButton>

              {isSupabaseConfigured && (
                <>
                  <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                    <span className="h-px flex-1 bg-[#E5E7EB]" />
                    or
                    <span className="h-px flex-1 bg-[#E5E7EB]" />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-sm font-medium text-[#172B24] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              {!mfaChallengeId ? (
                <form onSubmit={handleRequestMfa} className="space-y-4">
                  <FormField label="Registered Corporate Email" required id="mfaEmail">
                    <input
                      type="email"
                      id="mfaEmail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="employee@company.internal"
                      required
                      className="enterprise-input w-full"
                    />
                  </FormField>

                  <PrimaryButton
                    type="submit"
                    loading={isLoading}
                    className="w-full"
                  >
                    Request 2FA Security Challenge
                  </PrimaryButton>
                </form>
              ) : (
                <form onSubmit={handleVerifyMfa} className="space-y-4">
                  <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-md text-xs text-[#15803D]">
                    <p className="font-semibold">{mfaMessage}</p>
                    {mfaHint && (
                      <p className="mt-1 font-mono">
                        Hardware Demo Code: <strong className="underline">{mfaHint}</strong>
                      </p>
                    )}
                  </div>

                  <FormField label="6-Digit Verification Code" required id="mfaCode">
                    <input
                      type="text"
                      id="mfaCode"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      required
                      className="enterprise-input w-full font-mono text-center tracking-widest text-base"
                    />
                  </FormField>

                  <PrimaryButton
                    type="submit"
                    loading={isLoading}
                    className="w-full"
                  >
                    Verify &amp; Authenticate Session
                  </PrimaryButton>
                </form>
              )}
            </div>
          )}

          {/* Instant Development Login Shortcuts (dev builds only) */}
          {DEV_LOGIN_ENABLED && (
            <div className="pt-4 border-t border-[#E5E7EB] space-y-2.5">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block text-center">
                Instant Development Roles
              </span>

              <div className="grid grid-cols-1 gap-2">
                {DEV_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleDevLogin(acc.email, acc.name)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between p-2.5 rounded-md bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E5E7EB] text-xs text-[#172B24] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {acc.label === 'Employee'
                        ? <UserCheck className="w-4 h-4 text-[#2563EB]" />
                        : <ShieldCheck className="w-4 h-4 text-[#166534]" />}
                      <span className="font-semibold">{acc.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#64748B]">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#64748B]">
          KLARVES Corporate Pvt. Ltd &bull; Zero-Trust Enterprise Workspace
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
