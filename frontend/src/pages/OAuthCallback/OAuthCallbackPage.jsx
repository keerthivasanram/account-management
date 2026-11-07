import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { CheckCircle2, XCircle, Loader2, Instagram, ArrowRight } from 'lucide-react';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';

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
        setTimeout(() => {
          navigate('/accounts');
        }, 3000);
      } catch (err) {
        console.error('Callback error:', err);
        setStatus('error');
        setErrorMessage(err.response?.data?.detail || 'Failed to exchange Meta code for account token.');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg p-8 shadow-xs space-y-6">
        <div className="w-12 h-12 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#166534] mx-auto">
          <Instagram className="w-6 h-6" />
        </div>

        {status === 'processing' && (
          <div className="space-y-3">
            <Loader2 className="w-7 h-7 text-[#166534] animate-spin mx-auto" />
            <h2 className="text-lg font-semibold text-[#172B24]">Connecting with Meta...</h2>
            <p className="text-xs text-[#64748B] max-w-xs mx-auto">
              Verifying signed state, exchanging long-lived tokens, and establishing official Instagram Graph API connection.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#172B24]">Instagram Connected!</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Account <strong className="text-[#172B24]">@{resultData?.username}</strong> is now securely authorized and linked.
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-1">Redirecting to your accounts in 3 seconds...</p>
            </div>
            <PrimaryButton onClick={() => navigate('/accounts')} icon={ArrowRight} className="w-full">
              Go to My Accounts Now
            </PrimaryButton>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#172B24]">Connection Failed</h2>
              <p className="text-xs text-[#DC2626] max-w-xs mx-auto mt-1">{errorMessage}</p>
            </div>
            <SecondaryButton onClick={() => navigate('/accounts')} className="w-full">
              Return to Accounts
            </SecondaryButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
