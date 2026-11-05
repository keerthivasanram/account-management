import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Briefcase,
  FolderGit2,
  Plus,
  Building2,
  CheckCircle2,
  XCircle,
  Calendar,
  X
} from 'lucide-react';

export const AdminClientsCampaignsPage = () => {
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  // Form states
  const [clientForm, setClientForm] = useState({ name: '', description: '' });
  const [campaignForm, setCampaignForm] = useState({ client_id: '', name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, campaignsRes] = await Promise.all([
        api.admin.listClients(),
        api.admin.listCampaigns(),
      ]);
      setClients(clientsRes.data);
      setCampaigns(campaignsRes.data);
    } catch (err) {
      console.error('Failed to load clients/campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.admin.createClient(clientForm);
      setFeedback({ type: 'success', text: `Client "${clientForm.name}" created successfully.` });
      setShowClientModal(false);
      setClientForm({ name: '', description: '' });
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail || 'Failed to create client.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.admin.createCampaign(campaignForm);
      setFeedback({ type: 'success', text: `Campaign "${campaignForm.name}" created successfully.` });
      setShowCampaignModal(false);
      setCampaignForm({ client_id: '', name: '', description: '' });
      fetchData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail || 'Failed to create campaign.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Clients & Campaigns Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Manage corporate clients and their respective Instagram marketing campaigns</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowClientModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Client</span>
          </button>
          <button
            onClick={() => setShowCampaignModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Campaign</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading clients & campaigns..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clients List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Clients ({clients.length})</h3>
              </div>
            </div>

            {clients.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No clients configured yet.</p>
            ) : (
              <div className="space-y-3">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{c.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{c.description || 'No description'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-slate-300 block">
                        {c.campaigns_count} campaigns
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {c.accounts_count} accounts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaigns List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <FolderGit2 className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-bold text-white">Campaigns ({campaigns.length})</h3>
              </div>
            </div>

            {campaigns.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No campaigns created yet.</p>
            ) : (
              <div className="space-y-3">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{camp.name}</h4>
                      <p className="text-xs text-pink-400 font-medium">{camp.client_name}</p>
                      {camp.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{camp.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-slate-300 block">
                        {camp.accounts_count} accounts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showClientModal && (
        <Modal
          isOpen={showClientModal}
          onClose={() => setShowClientModal(false)}
          title="Create New Client Record"
        >
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Client Name <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                required
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder="e.g. Acme Corporation"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={clientForm.description}
                onChange={(e) => setClientForm({ ...clientForm, description: e.target.value })}
                placeholder="Industry, brand niche, points of contact..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25"
              >
                {isSubmitting ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Campaign Modal */}
      {showCampaignModal && (
        <Modal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          title="Create New Campaign"
        >
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Client <span className="text-pink-400">*</span>
              </label>
              <select
                required
                value={campaignForm.client_id}
                onChange={(e) => setCampaignForm({ ...campaignForm, client_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select a Client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Campaign Name <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                required
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="e.g. Summer 2026 Influencer Launch"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                placeholder="Objectives, deliverables, dates..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCampaignModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !campaignForm.client_id}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-pink-500/25 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminClientsCampaignsPage;
