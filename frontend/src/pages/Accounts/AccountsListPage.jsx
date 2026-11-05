import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Instagram,
  Search,
  Filter,
  ExternalLink,
  Zap,
  RefreshCw,
  Link2Off,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building2,
  FolderGit2,
  ShieldCheck,
  Calendar,
  X
} from 'lucide-react';

export const AccountsListPage = () => {
  const { employee, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await api.accounts.list(params);
      setAccounts(res.data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Unable to fetch accounts from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [statusFilter]);

  // Handle URL connect param if user arrived with ?connect={id}
  useEffect(() => {
    const connectId = searchParams.get('connect');
    if (connectId && accounts.length > 0) {
      const match = accounts.find((a) => a.id === connectId);
      if (match) setSelectedAccount(match);
    }
  }, [searchParams, accounts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAccounts();
  };

  const handleConnectOAuth = async (account) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.integrations.getAuthorizeUrl(account.id);
      window.location.href = res.data.authorization_url;
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail || 'Failed to initiate Meta OAuth.' });
      setActionLoading(false);
    }
  };

  const handleValidateConnection = async (account) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.integrations.validate(account.id);
      setFeedback({
        type: res.data.is_valid ? 'success' : 'error',
        text: `Validation: ${res.data.message}`,
      });
      fetchAccounts();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Validation request failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (account) => {
    if (!window.confirm(`Disconnect Meta OAuth for @${account.username}?`)) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await api.integrations.disconnect(account.id);
      setFeedback({ type: 'success', text: 'Instagram connection removed successfully.' });
      fetchAccounts();
      if (selectedAccount?.id === account.id) {
        setSelectedAccount(null);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Disconnect failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Instagram Accounts</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Browsing platform-wide account directory' : 'Assigned & registered accounts for your portfolio'}
          </p>
        </div>

        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all self-start sm:self-auto"
        >
          <span>+ Register Account</span>
        </Link>
      </div>

      {/* Global Feedback Banner */}
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

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: '', label: 'All' },
            { id: 'connected', label: 'Connected' },
            { id: 'pending_connection', label: 'Pending Connect' },
            { id: 'pending_approval', label: 'Awaiting Approval' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner text="Fetching accounts..." />
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Instagram className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No matching accounts found</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Instagram Account</th>
                  <th className="px-6 py-3.5">Client & Campaign</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Assigned To</th>
                  <th className="px-6 py-3.5">Meta Health</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accounts.map((acc) => {
                  const connStatus = (acc.connection?.connection_status || 'NOT_CONNECTED').toUpperCase();
                  const isConnected = connStatus === 'CONNECTED';
                  const needsReauth = ['TOKEN_EXPIRED', 'ACCESS_REVOKED', 'REAUTHORIZATION_REQUIRED'].includes(connStatus);
                  return (
                    <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Account Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold shrink-0">
                            @
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">@{acc.username}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                (acc.account_type || 'BUSINESS') === 'BUSINESS'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}>
                                {acc.account_type || 'BUSINESS'}
                              </span>
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
                            <div className="flex items-center gap-2 mt-0.5">
                              {acc.niche && (
                                <span className="inline-block text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                  {acc.niche}
                                </span>
                              )}
                              {acc.instagram_user_id && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ID: {acc.instagram_user_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client & Campaign */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-200">{acc.client_name || '—'}</p>
                          <p className="text-xs text-slate-500">{acc.campaign_name || 'No campaign'}</p>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <StatusBadge status={acc.status} />
                      </td>

                      {/* Assigned Employee */}
                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <p className="font-semibold text-slate-200">
                            {acc.active_assignment?.employee_name || 'Unassigned'}
                          </p>
                          <p className="text-slate-500 font-mono text-[10px]">
                            {acc.active_assignment?.employee_code}
                          </p>
                        </div>
                      </td>

                      {/* Meta Connection Info */}
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          <StatusBadge status={connStatus} />
                          {acc.connection?.last_validated_at && (
                            <p className="text-[10px] text-slate-500">
                              Validated: {new Date(acc.connection.last_validated_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isConnected && !needsReauth && (
                            <button
                              onClick={() => handleConnectOAuth(acc)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-semibold transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Connect Instagram</span>
                            </button>
                          )}

                          {needsReauth && (
                            <button
                              onClick={() => handleConnectOAuth(acc)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reconnect</span>
                            </button>
                          )}

                          {isConnected && (
                            <>
                              <button
                                onClick={() => handleValidateConnection(acc)}
                                disabled={actionLoading}
                                title="Test Token Health"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDisconnect(acc)}
                                disabled={actionLoading}
                                title="Disconnect Meta OAuth"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              >
                                <Link2Off className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedAccount(acc)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Details Modal */}
      {selectedAccount && (
        <Modal
          isOpen={Boolean(selectedAccount)}
          onClose={() => setSelectedAccount(null)}
          title={`@${selectedAccount.username} — Account Details`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Header Bio */}
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                  @
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">@{selectedAccount.username}</h4>
                  <p className="text-xs text-slate-400">{selectedAccount.display_name}</p>
                  <a
                    href={selectedAccount.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-pink-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>{selectedAccount.profile_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <StatusBadge status={selectedAccount.status} />
            </div>

            {/* Grid of properties */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Assigned Employee</span>
                <span className="font-semibold text-white">
                  {selectedAccount.active_assignment?.employee_name || 'None'}
                </span>
                <span className="text-slate-400 block font-mono">
                  {selectedAccount.active_assignment?.employee_code}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Registered By</span>
                <span className="font-semibold text-white">{selectedAccount.registered_by_name || 'System'}</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Client</span>
                <span className="font-semibold text-white">{selectedAccount.client_name || 'No Client'}</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Campaign</span>
                <span className="font-semibold text-white">{selectedAccount.campaign_name || 'No Campaign'}</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Account Creation Date</span>
                <span className="font-semibold text-white">{selectedAccount.account_created_date}</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Official Instagram ID</span>
                <span className="font-mono text-slate-300">
                  {selectedAccount.instagram_user_id || 'Awaiting Meta Connection'}
                </span>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                System Verifications
              </h5>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  {selectedAccount.verification?.profile_verified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Profile Valid</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  {selectedAccount.verification?.connection_verified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Meta Verified</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  {selectedAccount.verification?.ownership_verified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Ownership Valid</span>
                </div>
              </div>
              {selectedAccount.verification?.remarks && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-500">Admin Remarks: </span>
                  <span className="text-slate-300">{selectedAccount.verification.remarks}</span>
                </div>
              )}
            </div>

            {/* Meta Connection Section */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Meta Authorization Status
                </h5>
                <span className="text-[11px] font-mono text-emerald-400">
                  {selectedAccount.connection?.connection_status || 'Disconnected'}
                </span>
              </div>
              {selectedAccount.connection ? (
                <div className="text-xs space-y-1 text-slate-400">
                  <p>Provider: <strong className="text-white">{selectedAccount.connection.provider}</strong></p>
                  <p>Token Status: <strong className="text-emerald-400">Encrypted (Fernet) on Backend</strong></p>
                  {selectedAccount.connection.token_expires_at && (
                    <p>Token Expires: {new Date(selectedAccount.connection.token_expires_at).toLocaleString()}</p>
                  )}
                  {selectedAccount.connection.last_validated_at && (
                    <p>Last Validated: {new Date(selectedAccount.connection.last_validated_at).toLocaleString()}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No Meta OAuth token has been connected yet. Click Connect to authorize official Graph API access.
                </p>
              )}

              <div className="pt-2 flex items-center gap-2">
                {(() => {
                  const mConn = (selectedAccount.connection?.connection_status || 'NOT_CONNECTED').toUpperCase();
                  if (mConn === 'CONNECTED') {
                    return (
                      <>
                        <button
                          onClick={() => handleValidateConnection(selectedAccount)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Test Token Health
                        </button>
                        <button
                          onClick={() => handleDisconnect(selectedAccount)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Disconnect Account
                        </button>
                      </>
                    );
                  }
                  if (['TOKEN_EXPIRED', 'ACCESS_REVOKED', 'REAUTHORIZATION_REQUIRED'].includes(mConn)) {
                    return (
                      <button
                        onClick={() => handleConnectOAuth(selectedAccount)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reconnect Instagram</span>
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => handleConnectOAuth(selectedAccount)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Authorize Meta OAuth</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AccountsListPage;
