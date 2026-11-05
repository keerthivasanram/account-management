import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Instagram, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithSupabase, loginWithDev, isSupabaseConfigured, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSupabaseSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await loginWithSupabase(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
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
      setError(err.message || 'Dev login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 items-center justify-center text-white shadow-xl shadow-pink-500/20 mb-2">
            <Instagram className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Instagram Account Management
          </h1>
          <p className="text-sm text-slate-400">
            Internal registration, assignment & Meta integration platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {(error || authError) && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error || authError}</span>
            </div>
          )}

          {/* Supabase Password Form */}
          <form onSubmit={handleSupabaseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@company.internal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isSupabaseConfigured}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In via Supabase Auth'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isSupabaseConfigured && (
              <p className="text-[11px] text-amber-400/90 text-center mt-2">
                Supabase credentials not configured in .env. Use Instant Dev Login below to test the platform.
              </p>
            )}
          </form>

          {/* Dev Quick-Login Section */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Instant Development Logins
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => handleDevLogin('admin@company.internal', 'admin', 'System Administrator')}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-semibold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <p className="font-bold text-white">Administrator Access</p>
                    <p className="text-[10px] text-purple-400/80 font-mono">admin@company.internal</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold bg-purple-500/20 px-2 py-0.5 rounded">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin('employee1@company.internal', 'employee', 'Sarah Jenkins')}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs font-semibold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-pink-400" />
                  <div className="text-left">
                    <p className="font-bold text-white">Sarah Jenkins (Employee)</p>
                    <p className="text-[10px] text-pink-400/80 font-mono">employee1@company.internal</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold bg-pink-500/20 px-2 py-0.5 rounded">Staff</span>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin('employee2@company.internal', 'employee', 'Marcus Vance')}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-semibold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  <div className="text-left">
                    <p className="font-bold text-white">Marcus Vance (Employee 2)</p>
                    <p className="text-[10px] text-slate-400 font-mono">employee2@company.internal</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold bg-slate-700 px-2 py-0.5 rounded">Staff</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <p className="text-xs text-center text-slate-500">
          Internal platform. All sessions and Instagram connections are audit-logged.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
