import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Instagram,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Building2,
  FolderGit2
} from 'lucide-react';

export const RegisterAccountPage = () => {
  const navigate = useNavigate();
  const { employee } = useAuth();

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    profile_url: '',
    display_name: '',
    account_created_date: new Date().toISOString().split('T')[0],
    niche: '',
    client_id: '',
    campaign_id: '',
  });

  // Dynamic Options
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);

  // Duplicate Check & Validation State
  const [duplicateStatus, setDuplicateStatus] = useState(null); // { isChecking, isDuplicate, message }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [connectOption, setConnectOption] = useState('connect_later'); // 'connect_now' | 'connect_later'

  // Load clients and campaigns
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [clientsRes, campaignsRes] = await Promise.all([
          api.admin.listClients(),
          api.admin.listCampaigns(),
        ]);
        setClients(clientsRes.data || []);
        setCampaigns(campaignsRes.data || []);
      } catch (err) {
        console.warn('Could not load clients/campaigns metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  // Filter campaigns when client changes
  useEffect(() => {
    if (formData.client_id) {
      setFilteredCampaigns(campaigns.filter((c) => c.client_id === formData.client_id));
    } else {
      setFilteredCampaigns([]);
    }
  }, [formData.client_id, campaigns]);

  // Debounced duplicate check when username changes
  useEffect(() => {
    const rawUser = formData.username.trim().replace(/^@/, '');
    if (!rawUser || rawUser.length < 2) {
      setDuplicateStatus(null);
      return;
    }

    setDuplicateStatus({ isChecking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await api.accounts.checkDuplicate(rawUser);
        setDuplicateStatus({
          isChecking: false,
          isDuplicate: res.data.is_duplicate,
          message: res.data.message,
        });
      } catch (err) {
        setDuplicateStatus({
          isChecking: false,
          isDuplicate: false,
          message: 'Unable to check duplicate',
        });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.username]);

  // Handle inputs
  const handleUsernameChange = (e) => {
    const val = e.target.value;
    const clean = val.replace(/^@/, '');
    setFormData((prev) => ({
      ...prev,
      username: val,
      // Auto-suggest profile URL if not manually modified
      profile_url: clean ? `https://www.instagram.com/${clean}` : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (duplicateStatus?.isDuplicate) {
      setErrorMessage('Please resolve duplicate username before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        username: formData.username.trim().replace(/^@/, ''),
        profile_url: formData.profile_url.trim(),
        display_name: formData.display_name.trim(),
        account_created_date: formData.account_created_date,
        niche: formData.niche ? formData.niche.trim() : null,
        client_id: formData.client_id || null,
        campaign_id: formData.campaign_id || null,
      };

      const res = await api.accounts.register(payload);
      const createdAccount = res.data;
      setSubmitSuccess(createdAccount);

      if (connectOption === 'connect_now') {
        // Trigger Meta OAuth authorization
        const authRes = await api.integrations.getAuthorizeUrl(createdAccount.id);
        window.location.href = authRes.data.authorization_url;
      }
    } catch (err) {
      console.error('Registration failed:', err);
      const detail = err.response?.data?.detail;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(', ')
          : 'Failed to register Instagram account. Please verify input fields.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <span>Register Instagram Account</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
            Form
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Add an assigned Instagram page to your platform portfolio. Employee identity (<span className="text-slate-200 font-mono">{employee?.employee_code}</span>) is automatically attached.
        </p>
      </div>

      {/* Success Banner */}
      {submitSuccess && connectOption === 'connect_later' && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-3 shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-bold text-white text-base">Account Registered Successfully!</h3>
              <p className="text-xs text-emerald-400/90">
                @{submitSuccess.username} is saved with status <span className="font-semibold uppercase">Pending Connection</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/accounts')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-colors"
            >
              Go to My Accounts
            </button>
            <button
              onClick={() => {
                setSubmitSuccess(null);
                setFormData({
                  username: '',
                  profile_url: '',
                  display_name: '',
                  account_created_date: new Date().toISOString().split('T')[0],
                  niche: '',
                  client_id: '',
                  campaign_id: '',
                });
                setDuplicateStatus(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors"
            >
              + Register Another Account
            </button>
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Basic Account Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center text-xs font-bold border border-pink-500/20">
                  1
                </span>
                <span>Basic Account Details</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Core identification and category metadata</p>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">* Required fields</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Instagram Username */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Instagram Username <span className="text-pink-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">@</span>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleUsernameChange}
                  placeholder="brand_page_official"
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors ${
                    duplicateStatus?.isDuplicate
                      ? 'border-rose-500'
                      : duplicateStatus?.isDuplicate === false
                      ? 'border-emerald-500'
                      : 'border-slate-800 focus:border-pink-500'
                  }`}
                />
                <div className="absolute right-3.5 top-3">
                  {duplicateStatus?.isChecking && (
                    <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin block"></span>
                  )}
                  {!duplicateStatus?.isChecking && duplicateStatus?.isDuplicate === false && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {!duplicateStatus?.isChecking && duplicateStatus?.isDuplicate === true && (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>
              {/* Duplicate check helper text */}
              {duplicateStatus && !duplicateStatus.isChecking && (
                <p
                  className={`text-xs ${
                    duplicateStatus.isDuplicate ? 'text-rose-400 font-medium' : 'text-emerald-400'
                  }`}
                >
                  {duplicateStatus.message}
                </p>
              )}
            </div>

            {/* Profile URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Instagram Profile URL <span className="text-pink-400">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="url"
                  required
                  value={formData.profile_url}
                  onChange={(e) => setFormData({ ...formData, profile_url: e.target.value })}
                  placeholder="https://www.instagram.com/username"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Display Name <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Brand Official Page"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            {/* Account Creation Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Account Creation Date <span className="text-pink-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.account_created_date}
                onChange={(e) => setFormData({ ...formData, account_created_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            {/* Niche / Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Niche / Category
              </label>
              <input
                type="text"
                value={formData.niche}
                onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                placeholder="e.g. Fashion, Tech, Fitness, Food"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            {/* Client Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Client (Optional)</span>
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value, campaign_id: '' })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
              >
                <option value="">No Client Assigned</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Campaign Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Campaign (Optional)</span>
              </label>
              <select
                value={formData.campaign_id}
                onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                disabled={!formData.client_id || filteredCampaigns.length === 0}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.client_id
                    ? 'Select a client first'
                    : filteredCampaigns.length === 0
                    ? 'No campaigns for this client'
                    : 'No Campaign Assigned'}
                </option>
                {filteredCampaigns.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Connect Instagram */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs font-bold border border-purple-500/20">
                2
              </span>
              <span>Meta Instagram Authorization</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Official Meta Graph API OAuth connection for insights and account verification
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setConnectOption('connect_later')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                connectOption === 'connect_later'
                  ? 'bg-pink-500/10 border-pink-500/40 text-pink-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Save & Connect Later</span>
                <Clock className="w-4 h-4 text-pink-400" />
              </div>
              <p className="text-xs leading-relaxed opacity-80">
                Register basic account details now. You or your team can trigger the Meta OAuth flow anytime later from your dashboard.
              </p>
            </div>

            <div
              onClick={() => setConnectOption('connect_now')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                connectOption === 'connect_now'
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Connect Instagram Now</span>
                </span>
                <Instagram className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-xs leading-relaxed opacity-80">
                Registers the account and immediately opens the official Meta login dialog to connect and verify ownership.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Verification & Submission */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-5 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/20">
                3
              </span>
              <span>Verification Checklist</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Automated validation status</p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Employee Identity attached: <strong className="text-white">{employee?.full_name}</strong> ({employee?.employee_code})
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              {duplicateStatus?.isDuplicate === false ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : duplicateStatus?.isDuplicate === true ? (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span>Duplicate check: {duplicateStatus?.message || 'Awaiting username entry'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Token security: Backend Fernet symmetric encryption enabled</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || duplicateStatus?.isDuplicate}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {isSubmitting
                  ? 'Saving Account...'
                  : connectOption === 'connect_now'
                  ? 'Save & Authorize via Meta'
                  : 'Register Account'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RegisterAccountPage;
