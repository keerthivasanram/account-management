import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import FilterDropdown from '../../components/ui/FilterDropdown';
import StatusBadge from '../../components/ui/StatusBadge';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import {
  Share2,
  Calendar,
  Clock,
  Plus,
  Send,
  ExternalLink,
  Instagram,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const ScheduledPostsPage = () => {
  const { employee, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    account_id: '',
    caption: '',
    media_url: '',
    media_type: 'IMAGE',
    scheduled_at: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [postsRes, accsRes] = await Promise.all([
        api.socialPosts.list(),
        api.admin.listAccounts({ limit: 100 }).catch(() => api.employees.getMyAccounts({ limit: 100 })),
      ]);
      setPosts(postsRes.data || []);
      setAccounts(accsRes.data?.items || accsRes.data || []);
    } catch (err) {
      console.error('Failed to load social posts queue:', err);
      setError('Failed to fetch scheduled posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!form.account_id || !form.caption.trim() || !form.media_url.trim() || !form.scheduled_at) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await api.socialPosts.create({
        ...form,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
      });
      setFeedback({ type: 'success', text: 'Instagram post scheduled successfully.' });
      setIsModalOpen(false);
      setForm({
        account_id: '',
        caption: '',
        media_url: '',
        media_type: 'IMAGE',
        scheduled_at: '',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to schedule post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishNow = async (postId) => {
    try {
      await api.socialPosts.publishNow(postId);
      setFeedback({ type: 'success', text: 'Post dispatched to Meta Graph API.' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to publish post.');
    }
  };

  const filteredPosts = posts.filter(
    (p) => statusFilter === 'ALL' || p.status === statusFilter
  );

  const columns = [
    {
      header: 'Target Account',
      accessor: 'account_username',
      render: (row) => (
        <span className="font-semibold text-sm text-[#172B24]">
          @{row.account_username || 'account'}
        </span>
      ),
    },
    {
      header: 'Caption',
      accessor: 'caption',
      render: (row) => (
        <span className="text-xs text-[#172B24] line-clamp-1 max-w-sm block" title={row.caption}>
          {row.caption}
        </span>
      ),
    },
    {
      header: 'Media',
      accessor: 'media_type',
      render: (row) => (
        <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
          {row.media_type || 'IMAGE'}
        </span>
      ),
    },
    {
      header: 'Scheduled Date',
      accessor: 'scheduled_at',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {new Date(row.scheduled_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Publishing Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'SCHEDULED' && (
            <SecondaryButton
              size="sm"
              onClick={() => handlePublishNow(row.id)}
              icon={Send}
            >
              Publish Now
            </SecondaryButton>
          )}
          {row.media_url && (
            <a
              href={row.media_url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-[#64748B] hover:text-[#172B24]"
              title="Preview Media"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Publishing & Scheduled Content"
        description="Schedule, queue, and dispatch posts across your verified Instagram fleet via Meta Graph API."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Publishing' },
        ]}
        actions={
          <PrimaryButton
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={Plus}
          >
            Schedule Post
          </PrimaryButton>
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

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-xs flex items-center justify-between">
        <FilterDropdown
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Post Statuses' },
            { value: 'SCHEDULED', label: 'Scheduled' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'FAILED', label: 'Failed' },
            { value: 'PENDING_REVIEW', label: 'Pending Review' },
          ]}
          placeholder=""
        />

        <span className="text-xs text-[#64748B]">
          {filteredPosts.length} posts queued
        </span>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredPosts}
        loading={loading}
        emptyTitle="No scheduled posts found"
        emptyDescription="Create your first scheduled post to broadcast content automatically to Instagram."
        emptyAction={
          <PrimaryButton size="sm" onClick={() => setIsModalOpen(true)} icon={Plus}>
            Schedule New Post
          </PrimaryButton>
        }
      />

      {/* Schedule Post Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Schedule Instagram Post"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleCreatePost} className="space-y-4">
            <FormField label="Target Instagram Account" required id="post_acc">
              <select
                id="post_acc"
                value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                required
                className="enterprise-input w-full cursor-pointer"
              >
                <option value="">Select an account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    @{a.username} ({a.display_name || 'Instagram Profile'})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Caption / Text" required id="post_caption">
              <textarea
                id="post_caption"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="Write caption, hashtags, and mentions..."
                rows={4}
                required
                className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Media Type" required id="post_media_type">
                <select
                  id="post_media_type"
                  value={form.media_type}
                  onChange={(e) => setForm({ ...form, media_type: e.target.value })}
                  className="enterprise-input w-full cursor-pointer"
                >
                  <option value="IMAGE">Image (Single Post)</option>
                  <option value="REELS">Reels / Video</option>
                  <option value="CAROUSEL">Carousel</option>
                </select>
              </FormField>

              <FormField label="Publish Date & Time" required id="post_time">
                <input
                  type="datetime-local"
                  id="post_time"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  required
                  className="enterprise-input w-full text-xs"
                />
              </FormField>
            </div>

            <FormField label="Public Media URL" required id="post_media_url">
              <input
                type="url"
                id="post_media_url"
                value={form.media_url}
                onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                placeholder="https://cdn.company.internal/creatives/post.jpg"
                required
                className="enterprise-input w-full font-mono text-xs"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setIsModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={submitting}>
                Schedule Post
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ScheduledPostsPage;
