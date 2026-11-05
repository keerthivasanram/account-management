import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { CheckCircle2, XCircle, Loader2, Instagram, ArrowRight } from 'lucide-react';

export const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorReason = searchParams.get('error_reason');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setErrorMessage(errorDescription || errorReason || 'User denied Meta OAuth authorization.');
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Missing authorization code or state parameter in callback URL.');
        return;
      }

      try {
        const res = await api.integrations.callback(code, state);
        setResultData(res.data);
        setStatus('success');
        // Auto-redirect after 3.5 seconds
        setTimeout(() => {
          navigate('/accounts');
        }, 3500);
      } catch (err) {
        console.error('Callback error:', err);
        setStatus('error');
        setErrorMessage(err.response?.data?.detail || 'Failed to exchange Meta code for account token.');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Meta / Instagram Branding */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-pink-500/25">
          <Instagram className="w-8 h-8" />
        </div>

        {status === 'processing' && (
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Connecting with Meta...</h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Verifying signed state, exchanging long-lived tokens, and establishing official Instagram Graph API connection.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Instagram Connected!</h2>
            <p className="text-xs text-slate-300">
              Account <strong className="text-pink-400">@{resultData?.username}</strong> is now securely authorized and linked.
            </p>
            <p className="text-[11px] text-slate-500">Redirecting to your accounts in 3 seconds...</p>
            <Link
              to="/accounts"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl transition-all"
            >
              <span>Go to My Accounts Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Connection Failed</h2>
            <p className="text-xs text-rose-400 max-w-xs mx-auto">{errorMessage}</p>
            <Link
              to="/accounts"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              <span>Return to Accounts</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
