import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import FilterDropdown from '../../components/ui/FilterDropdown';
import StatusBadge from '../../components/ui/StatusBadge';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import {
  FolderLock,
  FileText,
  Download,
  Plus,
  Eye,
  Trash2,
  Lock
} from 'lucide-react';

export const DocumentsPage = () => {
  const { employee, isAdmin } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterClass, setFilterClass] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'POLICY',
    classification: 'INTERNAL',
    file_url: '',
    mime_type: 'application/pdf',
    file_size_bytes: 1048576,
  });
  const [submitting, setSubmitting] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.documents.list();
      setDocuments(res.data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to fetch company documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.title.trim() || !uploadForm.file_url.trim()) {
      alert('Please provide a document title and file URL.');
      return;
    }

    try {
      setSubmitting(true);
      await api.documents.create(uploadForm);
      setFeedback({ type: 'success', text: 'Document uploaded to company vault successfully.' });
      setIsUploadOpen(false);
      setUploadForm({
        title: '',
        category: 'POLICY',
        classification: 'INTERNAL',
        file_url: '',
        mime_type: 'application/pdf',
        file_size_bytes: 1048576,
      });
      fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Delete document "${title}"?`)) return;
    try {
      await api.documents.delete(docId);
      setFeedback({ type: 'success', text: `Document "${title}" removed.` });
      fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete document.');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery.trim() ||
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'ALL' || doc.classification === filterClass;
    return matchesSearch && matchesClass;
  });

  const columns = [
    {
      header: 'Document Name',
      accessor: 'title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-[#166534] shrink-0" />
          <span className="font-semibold text-sm text-[#172B24]">{row.title}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <span className="text-xs text-[#64748B] capitalize">{row.category?.toLowerCase()}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: 'classification',
      render: (row) => (
        <StatusBadge
          status={row.classification === 'CONFIDENTIAL' ? 'WARNING' : 'INFO'}
          text={row.classification}
        />
      ),
    },
    {
      header: 'Uploaded Date',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <SecondaryButton
            size="sm"
            onClick={() => setViewingDoc(row)}
            icon={Eye}
          >
            Inspect
          </SecondaryButton>
          {isAdmin && (
            <SecondaryButton
              size="sm"
              danger
              onClick={() => handleDelete(row.id, row.title)}
              icon={Trash2}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Company Vault & Documents"
        description="Encrypted corporate documentation, policy manuals, and compliance guidelines."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Workspace' },
          { label: 'Documents' },
        ]}
        actions={
          <PrimaryButton size="sm" onClick={() => setIsUploadOpen(true)} icon={Plus}>
            Upload Document
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

      {error && <ErrorState message={error} onRetry={fetchDocuments} />}

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title..."
          />
        </div>

        <FilterDropdown
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Classifications' },
            { value: 'INTERNAL', label: 'Internal Use' },
            { value: 'CONFIDENTIAL', label: 'Confidential' },
            { value: 'PUBLIC', label: 'Public' },
          ]}
          placeholder=""
        />
      </div>

      {/* Documents Data Table */}
      <DataTable
        columns={columns}
        data={filteredDocs}
        loading={loading}
        emptyTitle="No documents found"
        emptyDescription="Upload files to populate the corporate documentation vault."
        emptyAction={
          <PrimaryButton size="sm" onClick={() => setIsUploadOpen(true)} icon={Plus}>
            Upload First Document
          </PrimaryButton>
        }
      />

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <Modal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Upload Corporate Document"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpload} className="space-y-4">
            <FormField label="Document Title" required id="d_title">
              <input
                type="text"
                id="d_title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g. Meta Graph API Security Policy 2026"
                required
                className="enterprise-input w-full"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category" required id="d_cat">
                <select
                  id="d_cat"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="enterprise-input w-full cursor-pointer"
                >
                  <option value="POLICY">Corporate Policy</option>
                  <option value="BRAND_GUIDELINES">Brand Guidelines</option>
                  <option value="CONTRACT">Client Contract</option>
                  <option value="TRAINING">Staff Training</option>
                </select>
              </FormField>

              <FormField label="Security Classification" required id="d_class">
                <select
                  id="d_class"
                  value={uploadForm.classification}
                  onChange={(e) => setUploadForm({ ...uploadForm, classification: e.target.value })}
                  className="enterprise-input w-full cursor-pointer"
                >
                  <option value="INTERNAL">Internal Staff</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </FormField>
            </div>

            <FormField label="File Resource URL" required id="d_url">
              <input
                type="url"
                id="d_url"
                value={uploadForm.file_url}
                onChange={(e) => setUploadForm({ ...uploadForm, file_url: e.target.value })}
                placeholder="https://storage.company.internal/docs/policy.pdf"
                required
                className="enterprise-input w-full font-mono text-xs"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setIsUploadOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={submitting}>
                Save to Vault
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Inspect Document Modal */}
      {viewingDoc && (
        <Modal
          isOpen={Boolean(viewingDoc)}
          onClose={() => setViewingDoc(null)}
          title={viewingDoc.title}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-md space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Classification:</span>
                <span className="font-semibold text-[#172B24]">{viewingDoc.classification}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Category:</span>
                <span className="text-[#172B24]">{viewingDoc.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Uploaded:</span>
                <span className="text-[#172B24]">{new Date(viewingDoc.created_at).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[#64748B]">
              This corporate file is protected under the Zero-Trust Security Shield. Screen watermarks are dynamically active during view.
            </p>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setViewingDoc(null)}>
                Close
              </SecondaryButton>
              <PrimaryButton
                onClick={() => window.open(viewingDoc.file_url, '_blank')}
                icon={Download}
              >
                Open File
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DocumentsPage;
