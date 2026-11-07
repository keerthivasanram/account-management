import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import {
  Briefcase,
  FolderGit2,
  Plus,
  Calendar,
  X
} from 'lucide-react';

export const AdminClientsCampaignsPage = () => {
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs: 'clients' | 'campaigns'
  const [activeTab, setActiveTab] = useState('clients');

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
    setError(null);
    try {
      const [clientsRes, campaignsRes] = await Promise.all([
        api.admin.listClients(),
        api.admin.listCampaigns(),
      ]);
      setClients(clientsRes.data || []);
      setCampaigns(campaignsRes.data || []);
    } catch (err) {
      console.error('Failed to load clients/campaigns:', err);
      setError('Failed to fetch clients or campaigns.');
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

  const clientColumns = [
    {
      header: 'Client Name',
      accessor: 'name',
      render: (row) => (
        <span className="font-semibold text-sm text-[#172B24]">{row.name}</span>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span className="text-xs text-[#64748B]">{row.description || '—'}</span>
      ),
    },
    {
      header: 'Associated Campaigns',
      accessor: 'campaigns_count',
      render: (row) => {
        const cCount = campaigns.filter((c) => c.client_id === row.id).length;
        return <span className="text-xs text-[#172B24] font-medium">{cCount} campaigns</span>;
      },
    },
    {
      header: 'Created Date',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const campaignColumns = [
    {
      header: 'Campaign Name',
      accessor: 'name',
      render: (row) => (
        <span className="font-semibold text-sm text-[#172B24]">{row.name}</span>
      ),
    },
    {
      header: 'Client',
      accessor: 'client_name',
      render: (row) => {
        const clientObj = clients.find((c) => c.id === row.client_id);
        return <span className="text-xs font-medium text-[#172B24]">{clientObj?.name || '—'}</span>;
      },
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span className="text-xs text-[#64748B]">{row.description || '—'}</span>
      ),
    },
    {
      header: 'Created Date',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Clients & Campaigns"
        description="Enterprise client accounts and associated marketing campaign containers."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Management' },
          { label: 'Clients & Campaigns' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              size="sm"
              onClick={() => setShowClientModal(true)}
              icon={Plus}
            >
              Add Client
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              onClick={() => setShowCampaignModal(true)}
              icon={Plus}
            >
              Add Campaign
            </PrimaryButton>
          </div>
        }
      />

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="p-0.5 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#E5E7EB] gap-6">
        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
            activeTab === 'clients'
              ? 'border-[#166534] text-[#166534]'
              : 'border-transparent text-[#64748B] hover:text-[#172B24]'
          }`}
        >
          Clients ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
            activeTab === 'campaigns'
              ? 'border-[#166534] text-[#166534]'
              : 'border-transparent text-[#64748B] hover:text-[#172B24]'
          }`}
        >
          Campaigns ({campaigns.length})
        </button>
      </div>

      {/* Tab Data Table */}
      {activeTab === 'clients' ? (
        <DataTable
          columns={clientColumns}
          data={clients}
          loading={loading}
          emptyTitle="No clients configured"
          emptyDescription="Create your first client organization to allocate campaigns and Instagram accounts."
          emptyAction={
            <PrimaryButton size="sm" onClick={() => setShowClientModal(true)} icon={Plus}>
              Create Client
            </PrimaryButton>
          }
        />
      ) : (
        <DataTable
          columns={campaignColumns}
          data={campaigns}
          loading={loading}
          emptyTitle="No campaigns created"
          emptyDescription="Set up campaigns under existing clients to group Instagram publishing and accounts."
          emptyAction={
            <PrimaryButton size="sm" onClick={() => setShowCampaignModal(true)} icon={Plus}>
              Create Campaign
            </PrimaryButton>
          }
        />
      )}

      {/* Create Client Modal */}
      {showClientModal && (
        <Modal
          isOpen={showClientModal}
          onClose={() => setShowClientModal(false)}
          title="Create New Client"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateClient} className="space-y-4">
            <FormField label="Client Organization Name" required id="c_name">
              <input
                type="text"
                id="c_name"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder="e.g. Acme Media Corp"
                required
                className="enterprise-input w-full"
              />
            </FormField>

            <FormField label="Description (Optional)" id="c_desc">
              <textarea
                id="c_desc"
                value={clientForm.description}
                onChange={(e) => setClientForm({ ...clientForm, description: e.target.value })}
                placeholder="Client notes, industry, or operational scope..."
                rows={3}
                className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setShowClientModal(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting}>
                Save Client
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Campaign Modal */}
      {showCampaignModal && (
        <Modal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          title="Create New Campaign"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <FormField label="Assign to Client" required id="camp_client">
              <select
                id="camp_client"
                value={campaignForm.client_id}
                onChange={(e) => setCampaignForm({ ...campaignForm, client_id: e.target.value })}
                required
                className="enterprise-input w-full cursor-pointer"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Campaign Title" required id="camp_name">
              <input
                type="text"
                id="camp_name"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="e.g. Q4 Brand Awareness"
                required
                className="enterprise-input w-full"
              />
            </FormField>

            <FormField label="Description" id="camp_desc">
              <textarea
                id="camp_desc"
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                placeholder="Deliverables and schedule notes..."
                rows={3}
                className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setShowCampaignModal(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting} disabled={!campaignForm.client_id}>
                Save Campaign
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminClientsCampaignsPage;
