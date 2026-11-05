import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Search,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  X
} from 'lucide-react';

export const AdminAccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [reviewAccount, setReviewAccount] = useState(null); // Account to review
  const [reassignAccount, setReassignAccount] = useState(null); // Account to reassign
  const [approvalStatus, setApprovalStatus] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchAccountsAndEmployees = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const [accsRes, empsRes] = await Promise.all([
        api.admin.listAccounts(params),
        api.admin.listEmployees(),
      ]);
      setAccounts(accsRes.data);
      setEmployees(empsRes.data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndEmployees();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAccountsAndEmployees();
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewAccount) return;
    setIsSubmitting(true);
    try {
      await api.admin.reviewAccount(reviewAccount.id, {
        approval_status: approvalStatus,
        remarks: remarks.trim() || undefined,
      });
      setFeedback({ type: 'success', text: `Account @${reviewAccount.username} marked as ${approvalStatus}.` });
      setReviewAccount(null);
      setRemarks('');
      fetchAccountsAndEmployees();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail || 'Approval review update failed.' });
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
      setFeedback({ type: 'success', text: `Account @${reassignAccount.username} reassigned successfully.` });
      setReassignAccount(null);
      setTargetEmployeeId('');
      fetchAccountsAndEmployees();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail || 'Reassignment failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Platform Accounts Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Review, approve, reject, or reassign accounts across all employees</p>
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

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all accounts..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: '', label: 'All Accounts' },
            { id: 'pending_approval', label: 'Needs Approval' },
            { id: 'connected', label: 'Connected' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner text="Loading accounts directory..." />
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No accounts found</h3>
            <p className="text-xs text-slate-500 mt-1">No accounts match the current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Instagram Account</th>
                  <th className="px-6 py-3.5">Registered By</th>
                  <th className="px-6 py-3.5">Assigned Employee</th>
                  <th className="px-6 py-3.5">Client & Campaign</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Account */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                          @
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">@{acc.username}</span>
                            <a
                              href={acc.profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-slate-300"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <p className="text-xs text-slate-400">{acc.display_name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Registered By */}
                    <td className="px-6 py-4 text-xs">
                      <p className="font-semibold text-slate-200">{acc.registered_by_name || 'System'}</p>
                      <p className="text-slate-500 font-mono text-[10px]">
                        {new Date(acc.created_at).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Assigned To */}
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">
                            {acc.active_assignment?.employee_name || 'Unassigned'}
                          </p>
                          <p className="text-slate-400 font-mono text-[10px]">
                            {acc.active_assignment?.employee_code}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setReassignAccount(acc);
                            setTargetEmployeeId(acc.active_assignment?.employee_id || '');
                          }}
                          title="Reassign to another employee"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-purple-300 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Client & Campaign */}
                    <td className="px-6 py-4 text-xs">
                      <p className="font-medium text-slate-200">{acc.client_name || '—'}</p>
                      <p className="text-slate-500">{acc.campaign_name || 'No campaign'}</p>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={acc.status} />
                    </td>

                    {/* Admin Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setReviewAccount(acc);
                            setApprovalStatus(acc.verification?.approval_status || 'approved');
                            setRemarks(acc.verification?.remarks || '');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-semibold transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal (Approve / Reject) */}
      {reviewAccount && (
        <Modal
          isOpen={Boolean(reviewAccount)}
          onClose={() => setReviewAccount(null)}
          title={`Review Registration: @${reviewAccount.username}`}
        >
          <form onSubmit={handleReviewSubmit} className="space-y-5">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <p>Registered by: <strong className="text-white">{reviewAccount.registered_by_name}</strong></p>
              <p>Display Name: <strong className="text-white">{reviewAccount.display_name}</strong></p>
              <p>Profile URL: <a href={reviewAccount.profile_url} target="_blank" rel="noreferrer" className="text-pink-400 hover:underline">{reviewAccount.profile_url}</a></p>
              <p>Meta Connection: <strong className={reviewAccount.connection?.connection_status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>{reviewAccount.connection?.connection_status || 'Disconnected'}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Approval Decision
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setApprovalStatus('approved')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    approvalStatus === 'approved'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Registration</span>
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalStatus('rejected')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    approvalStatus === 'rejected'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Registration</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Review Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Reason or notes for employee..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewAccount(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs transition-colors shadow-lg shadow-purple-500/25"
              >
                {isSubmitting ? 'Saving Decision...' : 'Confirm Decision'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reassign Modal */}
      {reassignAccount && (
        <Modal
          isOpen={Boolean(reassignAccount)}
          onClose={() => setReassignAccount(null)}
          title={`Reassign Account: @${reassignAccount.username}`}
        >
          <form onSubmit={handleReassignSubmit} className="space-y-5">
            <p className="text-xs text-slate-400">
              Select an employee to take responsibility for this Instagram account. The registration record and history will remain intact.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Assignee Employee
              </label>
              <select
                required
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select Employee...</option>
                {employees
                  .filter((emp) => emp.is_active)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) — {emp.assigned_accounts_count || 0}/60 accounts
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReassignAccount(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !targetEmployeeId}
                className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs transition-colors shadow-lg shadow-purple-500/25 disabled:opacity-50"
              >
                {isSubmitting ? 'Reassigning...' : 'Assign Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminAccountsPage;
