import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
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
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail.includes('admin')) {
          await loginWithDev(cleanEmail, 'admin', 'System Administrator');
          navigate('/dashboard');
          return;
        } else if (cleanEmail) {
          const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
          const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          await loginWithDev(cleanEmail, 'employee', formattedName);
          navigate('/dashboard');
          return;
        }
        throw new Error('Please enter a work email or select an Instant Development Login.');
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
      setMfaHint(res.data.sample_code_for_demo);
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
      await loginWithMfa(email.trim(), mfaCode.trim(), mfaChallengeId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired 2FA code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (devEmail, role, name) => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithDev(devEmail, role, name);
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

          {/* Instant Development Login Shortcuts */}
          <div className="pt-4 border-t border-[#E5E7EB] space-y-2.5">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block text-center">
              Instant Development Roles
            </span>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleDevLogin('admin@company.internal', 'admin', 'System Administrator')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-2.5 rounded-md bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E5E7EB] text-xs text-[#172B24] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#166534]" />
                  <span className="font-semibold">Administrator (Global Access)</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">admin@company.internal</span>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin('employee1@company.internal', 'employee', 'Elena Rossi')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-2.5 rounded-md bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E5E7EB] text-xs text-[#172B24] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#2563EB]" />
                  <span className="font-semibold">Elena Rossi (Staff Portfolio 1)</span>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">employee1@company.internal</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#64748B]">
          KLARVES Corporate Pvt. Ltd &bull; Zero-Trust Enterprise Workspace
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
