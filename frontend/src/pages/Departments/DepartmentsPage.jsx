import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import {
  Building2,
  Users,
  Briefcase,
  Plus
} from 'lucide-react';

export const DepartmentsPage = () => {
  const { isAdmin } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
  });

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.departments.list();
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
      setError('Failed to fetch departments from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Department Code and Name are required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.departments.create(formData);
      setFeedback({ type: 'success', text: `Department "${formData.name}" established.` });
      setIsModalOpen(false);
      setFormData({ code: '', name: '', description: '' });
      fetchDepartments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q);
  });

  const columns = [
    {
      header: 'Department Name',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-[#166534] shrink-0" />
          <span className="font-semibold text-sm text-[#172B24]">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Department Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-[#172B24] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
          {row.code}
        </span>
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
        title="Departments & Organization"
        description="Corporate operational structure, business divisions, and team allocation units."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Workspace' },
          { label: 'Departments' },
        ]}
        actions={
          isAdmin && (
            <PrimaryButton size="sm" onClick={() => setIsModalOpen(true)} icon={Plus}>
              Add Department
            </PrimaryButton>
          )
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

      {error && <ErrorState message={error} onRetry={fetchDepartments} />}

      {/* Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-xs flex items-center justify-between">
        <div className="w-full sm:w-80">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments..."
          />
        </div>
        <span className="text-xs text-[#64748B]">
          {filteredDepartments.length} divisions active
        </span>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredDepartments}
        loading={loading}
        emptyTitle="No departments found"
        emptyDescription="Create your first department unit to organize employees and campaigns."
        emptyAction={
          isAdmin && (
            <PrimaryButton size="sm" onClick={() => setIsModalOpen(true)} icon={Plus}>
              Create Department
            </PrimaryButton>
          )
        }
      />

      {/* Create Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add New Department"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateDepartment} className="space-y-4">
            <FormField label="Department Code" required id="dep_code">
              <input
                type="text"
                id="dep_code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MKTG, OPS, ENG"
                maxLength={8}
                required
                className="enterprise-input w-full font-mono uppercase"
              />
            </FormField>

            <FormField label="Department Name" required id="dep_name">
              <input
                type="text"
                id="dep_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Growth Marketing"
                required
                className="enterprise-input w-full"
              />
            </FormField>

            <FormField label="Description (Optional)" id="dep_desc">
              <textarea
                id="dep_desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Operational scope, team mandate..."
                rows={3}
                className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setIsModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={submitting}>
                Save Department
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DepartmentsPage;
