import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Landing page for Supabase OAuth (Google). Not the Meta/Instagram callback (/oauth/callback).
const readProviderError = () => {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('error_description') || hash.get('error_description') || null;
};

export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { completeOAuthLogin } = useAuth();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;

    const providerError = readProviderError();
    if (providerError) {
      setError(providerError);
      return;
    }
    completeOAuthLogin()
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((err) => setError(err.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm bg-white border border-[#E5E7EB] rounded-lg p-6 text-center space-y-4">
        {error ? (
          <>
            <div className="flex items-start gap-2 p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <Link to="/login" className="inline-block text-sm font-medium text-[#166534] hover:underline">
              Back to sign in
            </Link>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-[#64748B]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing you in…
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
