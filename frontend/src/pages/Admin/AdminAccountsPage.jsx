import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
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
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';

export const AdminAccountsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') === 'pending' ? 'pending_approval' : '');

  // Review & Reassignment Modals
  const [reviewAccount, setReviewAccount] = useState(null);
  const [reassignAccount, setReassignAccount] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const fetchAccountsAndEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const [accsRes, empsRes] = await Promise.all([
        api.admin.listAccounts(params),
        api.admin.listEmployees(),
      ]);
      setAccounts(accsRes.data || []);
      setEmployees(empsRes.data || []);
    } catch (err) {
      console.error('Failed to load admin accounts:', err);
      setError('Unable to fetch account list from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndEmployees();
  }, [statusFilter]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewAccount) return;
    setIsSubmitting(true);
    try {
      await api.admin.reviewAccount(reviewAccount.id, {
        approval_status: approvalStatus,
        remarks: remarks.trim() || undefined,
      });
      setFeedback({
        type: 'success',
        text: `Account @${reviewAccount.username} marked as ${approvalStatus}.`,
      });
      setReviewAccount(null);
      setRemarks('');
      fetchAccountsAndEmployees();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Approval review failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignAccount || !targetEmployeeId) return;
    setIsSubmitting(true);
    try {
      await api.admin.assignAccount(reassignAccount.id, targetEmployeeId);
      setFeedback({
        type: 'success',
        text: `Account @${reassignAccount.username} successfully reassigned.`,
      });
      setReassignAccount(null);
      setTargetEmployeeId('');
      fetchAccountsAndEmployees();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Account reassignment failed.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (acc) =>
        acc.username?.toLowerCase().includes(q) ||
        acc.display_name?.toLowerCase().includes(q) ||
        acc.client_name?.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const totalItems = filteredAccounts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  const columns = [
    {
      header: 'Instagram Account',
      accessor: 'username',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#172B24]">@{row.username}</span>
          {row.profile_url && (
            <a
              href={row.profile_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#94A3B8] hover:text-[#172B24]"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ),
    },
    {
      header: 'Client & Campaign',
      accessor: 'client_name',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-[#172B24]">{row.client_name || '—'}</p>
          <p className="text-[11px] text-[#64748B]">{row.campaign_name || 'No campaign'}</p>
        </div>
      ),
    },
    {
      header: 'Assigned Employee',
      accessor: 'employee',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-[#172B24]">
            {row.active_assignment?.employee_name || 'Unassigned'}
          </p>
          <p className="text-[10px] text-[#64748B] font-mono">
            {row.active_assignment?.employee_code}
          </p>
        </div>
      ),
    },
    {
      header: 'Connection Status',
      accessor: 'connection_status',
      render: (row) => {
        const conn = (row.connection?.connection_status || 'NOT_CONNECTED').toUpperCase();
        return <StatusBadge status={conn} />;
      },
    },
    {
      header: 'Approval Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Registered',
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
            onClick={() => {
              setReviewAccount(row);
              setApprovalStatus(row.status === 'rejected' ? 'approved' : 'rejected');
              setRemarks(row.verification?.remarks || '');
            }}
          >
            Review
          </SecondaryButton>
          <SecondaryButton
            size="sm"
            onClick={() => {
              setReassignAccount(row);
              setTargetEmployeeId(row.active_assignment?.employee_id || '');
            }}
          >
            Reassign
          </SecondaryButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Account Assignments & Approvals"
        description="Verify pending account registrations, reassign workloads, and inspect fleet connections."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Administration' },
          { label: 'Assignments' },
        ]}
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

      {error && <ErrorState message={error} onRetry={fetchAccountsAndEmployees} />}

      {/* 2. Search & Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts, clients..."
          />
        </div>

        <div className="flex items-center gap-2">
          <FilterDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'approved', label: 'Approved Accounts' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'pending_connection', label: 'Pending Connect' },
            ]}
            placeholder="All Approval States"
          />
        </div>
      </div>

      {/* 3. Data Table */}
      <DataTable
        columns={columns}
        data={paginatedAccounts}
        loading={loading}
        emptyTitle="No accounts found"
        emptyDescription="There are no accounts matching the specified filter."
        pagination={{
          currentPage,
          totalPages,
          totalItems,
          pageSize,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Review Modal */}
      {reviewAccount && (
        <Modal
          isOpen={Boolean(reviewAccount)}
          onClose={() => setReviewAccount(null)}
          title={`Review @${reviewAccount.username}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <FormField label="Decision" required>
              <div className="flex gap-3">
                <label
                  className={`flex-1 p-3 rounded-md border flex items-center justify-center gap-2 cursor-pointer text-xs font-medium ${
                    approvalStatus === 'approved'
                      ? 'bg-[#F0FDF4] border-[#166534] text-[#166534]'
                      : 'bg-white border-[#E5E7EB] text-[#64748B]'
                  }`}
                >
                  <input
                    type="radio"
                    name="approvalStatus"
                    value="approved"
                    checked={approvalStatus === 'approved'}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                    className="sr-only"
                  />
                  <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                  <span>Approve</span>
                </label>

                <label
                  className={`flex-1 p-3 rounded-md border flex items-center justify-center gap-2 cursor-pointer text-xs font-medium ${
                    approvalStatus === 'rejected'
                      ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]'
                      : 'bg-white border-[#E5E7EB] text-[#64748B]'
                  }`}
                >
                  <input
                    type="radio"
                    name="approvalStatus"
                    value="rejected"
                    checked={approvalStatus === 'rejected'}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                    className="sr-only"
                  />
                  <XCircle className="w-4 h-4 text-[#DC2626]" />
                  <span>Reject</span>
                </label>
              </div>
            </FormField>

            <FormField label="Verification Remarks" id="remarks">
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes or feedback for the employee..."
                rows={3}
                className="w-full text-xs text-[#172B24] p-2.5 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setReviewAccount(null)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting}>
                Submit Decision
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Reassignment Modal */}
      {reassignAccount && (
        <Modal
          isOpen={Boolean(reassignAccount)}
          onClose={() => setReassignAccount(null)}
          title={`Reassign @${reassignAccount.username}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleReassignSubmit} className="space-y-4">
            <FormField label="Select Target Employee" required id="employeeSelect">
              <select
                id="employeeSelect"
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="enterprise-input w-full cursor-pointer"
                required
              >
                <option value="">Select an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code}) — {emp.assigned_accounts_count || 0}/60 accounts
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <SecondaryButton onClick={() => setReassignAccount(null)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting} disabled={!targetEmployeeId}>
                Confirm Reassignment
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminAccountsPage;
