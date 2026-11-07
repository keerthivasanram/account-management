import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import FormSection from '../../components/ui/FormSection';
import FormField from '../../components/ui/FormField';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  Instagram,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Clock,
  ShieldCheck,
  Building2,
  FolderGit2,
  ArrowRight
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
    account_type: 'BUSINESS',
    niche: '',
    client_id: '',
    campaign_id: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);

  // Duplicate Check & Submission State
  const [duplicateStatus, setDuplicateStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectOption, setConnectOption] = useState('connect_later'); // 'connect_now' | 'connect_later'
  const [submitError, setSubmitError] = useState(null);

  // Load clients and campaigns
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [clientsRes, campaignsRes] = await Promise.all([
          api.admin.listClients().catch(() => ({ data: [] })),
          api.admin.listCampaigns().catch(() => ({ data: [] })),
        ]);
        setClients(clientsRes.data || []);
        setCampaigns(campaignsRes.data || []);
      } catch (err) {
        console.warn('Could not load clients/campaigns:', err);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Auto-update profile URL if username is edited
    if (name === 'username') {
      const cleanUser = value.trim().replace(/^@/, '');
      if (cleanUser) {
        newFormData.profile_url = `https://www.instagram.com/${cleanUser}/`;
      }
    }

    setFormData(newFormData);

    // Clear field-specific error
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const cleanUser = formData.username.trim().replace(/^@/, '');

    if (!cleanUser) {
      errors.username = 'Instagram username is required.';
    } else if (!/^[a-zA-Z0-9._]+$/.test(cleanUser)) {
      errors.username = 'Username may only contain letters, numbers, periods, and underscores.';
    }

    if (duplicateStatus?.isDuplicate) {
      errors.username = 'This Instagram username is already registered in the platform.';
    }

    if (!formData.profile_url.trim()) {
      errors.profile_url = 'Profile URL is required.';
    } else if (!formData.profile_url.startsWith('http')) {
      errors.profile_url = 'Must be a valid URL starting with http:// or https://';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        username: formData.username.trim().replace(/^@/, ''),
        profile_url: formData.profile_url.trim(),
        display_name: formData.display_name.trim() || undefined,
        account_created_date: formData.account_created_date,
        account_type: formData.account_type,
        niche: formData.niche.trim() || undefined,
        client_id: formData.client_id || undefined,
        campaign_id: formData.campaign_id || undefined,
      };

      const res = await api.accounts.register(payload);
      const createdAccount = res.data;

      if (connectOption === 'connect_now') {
        const authRes = await api.integrations.getAuthorizeUrl(createdAccount.id);
        window.location.href = authRes.data.authorization_url;
      } else {
        navigate('/accounts');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setSubmitError(
        err.response?.data?.detail || 'Failed to register account. Please check input values.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Register Instagram Account"
        description="Add a new Instagram business or creator account to the organization fleet."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Instagram Accounts', to: '/accounts' },
          { label: 'Register Account' },
        ]}
      />

      {submitError && (
        <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between text-xs text-[#DC2626]">
          <span>{submitError}</span>
          <button onClick={() => setSubmitError(null)} className="p-1 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Main Registration Form Container */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#E5E7EB] rounded-lg shadow-xs p-6 space-y-6">
        {/* =========================================================================
            SECTION 1: BASIC ACCOUNT DETAILS
        ========================================================================== */}
        <FormSection
          title="1. Basic Account Details"
          description="Enter core identity details for the Instagram profile."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <FormField
              label="Instagram Username"
              required
              id="username"
              error={formErrors.username}
              helpText={
                duplicateStatus?.isChecking
                  ? 'Checking availability...'
                  : duplicateStatus && !duplicateStatus.isDuplicate
                  ? '✓ Username is available'
                  : null
              }
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8] font-mono">
                  @
                </span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="brand_handle"
                  className="enterprise-input pl-8 w-full"
                />
              </div>
            </FormField>

            {/* Display Name */}
            <FormField label="Display Name" id="display_name">
              <input
                type="text"
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="Brand Name / Project Title"
                className="enterprise-input w-full"
              />
            </FormField>

            {/* Profile URL */}
            <FormField
              label="Profile URL"
              required
              id="profile_url"
              error={formErrors.profile_url}
              className="md:col-span-2"
            >
              <input
                type="url"
                id="profile_url"
                name="profile_url"
                value={formData.profile_url}
                onChange={handleChange}
                placeholder="https://www.instagram.com/brand_handle/"
                className="enterprise-input w-full font-mono text-xs"
              />
            </FormField>

            {/* Account Type */}
            <FormField label="Account Type" required id="account_type">
              <select
                id="account_type"
                name="account_type"
                value={formData.account_type}
                onChange={handleChange}
                className="enterprise-input w-full cursor-pointer"
              >
                <option value="BUSINESS">Business Account (Meta Graph API Standard)</option>
                <option value="CREATOR">Creator Account</option>
              </select>
            </FormField>

            {/* Niche / Industry */}
            <FormField label="Niche / Category" id="niche">
              <input
                type="text"
                id="niche"
                name="niche"
                value={formData.niche}
                onChange={handleChange}
                placeholder="e.g. Fashion, SaaS, Retail"
                className="enterprise-input w-full"
              />
            </FormField>

            {/* Client Allocation */}
            <FormField label="Client (Optional)" id="client_id">
              <select
                id="client_id"
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className="enterprise-input w-full cursor-pointer"
              >
                <option value="">Unassigned Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Campaign Allocation */}
            <FormField label="Campaign (Optional)" id="campaign_id">
              <select
                id="campaign_id"
                name="campaign_id"
                value={formData.campaign_id}
                onChange={handleChange}
                disabled={!formData.client_id || filteredCampaigns.length === 0}
                className="enterprise-input w-full cursor-pointer disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
              >
                <option value="">
                  {!formData.client_id
                    ? 'Select a client first'
                    : filteredCampaigns.length === 0
                    ? 'No active campaigns'
                    : 'Unassigned Campaign'}
                </option>
                {filteredCampaigns.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </FormSection>

        {/* =========================================================================
            SECTION 2: INSTAGRAM CONNECTION
        ========================================================================== */}
        <FormSection
          title="2. Instagram Connection & Meta Authorization"
          description="Choose how to connect official Meta Graph API tokens."
        >
          <div className="space-y-3">
            <label
              className={`p-4 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                connectOption === 'connect_later'
                  ? 'bg-[#F0FDF4] border-[#166534]'
                  : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              <input
                type="radio"
                name="connectOption"
                value="connect_later"
                checked={connectOption === 'connect_later'}
                onChange={() => setConnectOption('connect_later')}
                className="mt-0.5 text-[#166534] focus:ring-[#166534]"
              />
              <div>
                <span className="text-sm font-semibold text-[#172B24]">
                  Register profile and connect later
                </span>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Creates the account entry in the workspace directory. You or another team member can authorize Meta OAuth at any time from the account list.
                </p>
              </div>
            </label>

            <label
              className={`p-4 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                connectOption === 'connect_now'
                  ? 'bg-[#F0FDF4] border-[#166534]'
                  : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              <input
                type="radio"
                name="connectOption"
                value="connect_now"
                checked={connectOption === 'connect_now'}
                onChange={() => setConnectOption('connect_now')}
                className="mt-0.5 text-[#166534] focus:ring-[#166534]"
              />
              <div>
                <span className="text-sm font-semibold text-[#172B24]">
                  Authorize Meta OAuth immediately upon creation
                </span>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Redirects directly to Facebook Login / Meta OAuth to exchange long-lived page tokens with AES-128 Fernet server-side encryption.
                </p>
              </div>
            </label>
          </div>
        </FormSection>

        {/* =========================================================================
            SECTION 3: VERIFICATION & SUBMISSION STATUS
        ========================================================================== */}
        <FormSection
          title="3. Verification & Governance"
          description="Confirm employee assignment and workload threshold."
        >
          <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-xs space-y-2">
            <div className="flex justify-between items-center text-[#172B24]">
              <span className="text-[#64748B]">Assignee Portfolio</span>
              <span className="font-semibold">{employee?.full_name} ({employee?.employee_code})</span>
            </div>
            <div className="flex justify-between items-center text-[#172B24]">
              <span className="text-[#64748B]">Capacity Compliance</span>
              <span className="text-[#15803D] font-medium">Within 60-account threshold</span>
            </div>
            <div className="flex justify-between items-center text-[#172B24]">
              <span className="text-[#64748B]">Token Encryption</span>
              <span className="font-mono text-[11px] text-[#64748B]">AES-128 Fernet At-Rest</span>
            </div>
          </div>
        </FormSection>

        {/* Consistent Action Buttons (Cancel / Submit) */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
          <SecondaryButton
            type="button"
            onClick={() => navigate('/accounts')}
            disabled={isSubmitting}
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            type="submit"
            loading={isSubmitting}
            icon={connectOption === 'connect_now' ? Zap : CheckCircle2}
          >
            {connectOption === 'connect_now'
              ? 'Save & Authorize Meta OAuth'
              : 'Complete Registration'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default RegisterAccountPage;
