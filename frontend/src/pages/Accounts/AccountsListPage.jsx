import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import ErrorState from '../../components/ui/ErrorState';
import {
  Instagram,
  UserPlus,
  ExternalLink,
  Zap,
  RefreshCw,
  Link2Off,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';

export const AccountsListPage = () => {
  const navigate = useNavigate();
  const { employee, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [connectionFilter, setConnectionFilter] = useState(searchParams.get('connection') || '');
  const [approvalFilter, setApprovalFilter] = useState(searchParams.get('status') || '');

  // Selection & Pagination & Sorting
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [sortField, setSortField] = useState('username');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals & Actions
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (approvalFilter) params.status = approvalFilter;

      const res = await api.accounts.list(params);
      setAccounts(res.data || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Unable to fetch accounts from backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [approvalFilter]);

  // Handle URL connect query parameter e.g. /accounts?connect={id}
  useEffect(() => {
    const connectId = searchParams.get('connect');
    if (connectId && accounts.length > 0) {
      const match = accounts.find((a) => a.id === connectId);
      if (match) setSelectedAccount(match);
    }
  }, [searchParams, accounts]);

  // Dynamic filter options extracted from accounts data
  const filterOptions = useMemo(() => {
    const employees = new Set();
    const clients = new Set();
    const campaigns = new Set();

    accounts.forEach((acc) => {
      if (acc.active_assignment?.employee_name) {
        employees.add(acc.active_assignment.employee_name);
      }
      if (acc.client_name) clients.add(acc.client_name);
      if (acc.campaign_name) campaigns.add(acc.campaign_name);
    });

    return {
      employees: Array.from(employees).sort(),
      clients: Array.from(clients).sort(),
      campaigns: Array.from(campaigns).sort(),
    };
  }, [accounts]);

  // Client-side filtering & sorting
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((acc) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchU = acc.username?.toLowerCase().includes(q);
          const matchD = acc.display_name?.toLowerCase().includes(q);
          if (!matchU && !matchD) return false;
        }

        if (employeeFilter) {
          if (acc.active_assignment?.employee_name !== employeeFilter) return false;
        }

        if (clientFilter) {
          if (acc.client_name !== clientFilter) return false;
        }

        if (campaignFilter) {
          if (acc.campaign_name !== campaignFilter) return false;
        }

        if (connectionFilter) {
          const connStatus = (acc.connection?.connection_status || 'NOT_CONNECTED').toLowerCase();
          if (connStatus !== connectionFilter.toLowerCase()) return false;
        }

        if (approvalFilter) {
          if (acc.status?.toLowerCase() !== approvalFilter.toLowerCase()) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [accounts, searchQuery, employeeFilter, clientFilter, campaignFilter, connectionFilter, approvalFilter, sortField, sortAsc]);

  // Pagination calculation
  const totalItems = filteredAccounts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedAccounts.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Meta OAuth Actions
  const handleConnectOAuth = async (account) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.integrations.getAuthorizeUrl(account.id);
      window.location.href = res.data.authorization_url;
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to initiate Meta OAuth authorization flow.',
      });
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
        text: `Validation Result: ${res.data.message}`,
      });
      fetchAccounts();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Validation request failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    setActionLoading(true);
    try {
      await api.integrations.disconnect(disconnectTarget.id);
      setFeedback({ type: 'success', text: `Instagram account @${disconnectTarget.username} disconnected successfully.` });
      fetchAccounts();
      if (selectedAccount?.id === disconnectTarget.id) {
        setSelectedAccount(null);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to disconnect account.' });
    } finally {
      setActionLoading(false);
      setDisconnectTarget(null);
    }
  };

  // Table Columns Definition according to Design Requirements
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={paginatedAccounts.length > 0 && selectedIds.size === paginatedAccounts.length}
          onChange={handleSelectAll}
          className="rounded border-[#E5E7EB] text-[#166534] focus:ring-[#166534] cursor-pointer"
        />
      ),
      width: '40px',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleRow(row.id);
          }}
          className="rounded border-[#E5E7EB] text-[#166534] focus:ring-[#166534] cursor-pointer"
        />
      ),
    },
    {
      header: (
        <button
          onClick={() => handleSort('username')}
          className="inline-flex items-center gap-1 font-semibold text-xs text-[#64748B] uppercase tracking-wider hover:text-[#172B24]"
        >
          <span>Instagram Account</span>
          <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
        </button>
      ),
      accessor: 'username',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#172B24]">@{row.username}</span>
          {row.profile_url && (
            <a
              href={row.profile_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#94A3B8] hover:text-[#172B24] transition-colors"
              title="Open Instagram"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ),
    },
    {
      header: 'Display Name',
      accessor: 'display_name',
      render: (row) => (
        <span className="text-xs text-[#64748B] truncate max-w-[140px] block">
          {row.display_name || '—'}
        </span>
      ),
    },
    {
      header: 'Employee',
      accessor: 'employee',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-[#172B24]">
            {row.active_assignment?.employee_name || 'Unassigned'}
          </p>
          {row.active_assignment?.employee_code && (
            <p className="text-[10px] text-[#64748B] font-mono">
              {row.active_assignment.employee_code}
            </p>
          )}
        </div>
      ),
    },
    {
      header: (
        <button
          onClick={() => handleSort('client_name')}
          className="inline-flex items-center gap-1 font-semibold text-xs text-[#64748B] uppercase tracking-wider hover:text-[#172B24]"
        >
          <span>Client</span>
          <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
        </button>
      ),
      accessor: 'client_name',
      render: (row) => (
        <span className="text-xs text-[#172B24] font-medium">
          {row.client_name || '—'}
        </span>
      ),
    },
    {
      header: 'Campaign',
      accessor: 'campaign_name',
      render: (row) => (
        <span className="text-xs text-[#64748B]">
          {row.campaign_name || '—'}
        </span>
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
      header: 'Last Activity',
      accessor: 'last_activity',
      render: (row) => {
        const dateVal = row.connection?.last_validated_at || row.updated_at || row.created_at;
        return (
          <span className="text-xs text-[#64748B] font-mono">
            {dateVal
              ? new Date(dateVal).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const connStatus = (row.connection?.connection_status || 'NOT_CONNECTED').toUpperCase();
        const isConnected = connStatus === 'CONNECTED';
        const needsReauth = ['TOKEN_EXPIRED', 'ACCESS_REVOKED', 'REAUTHORIZATION_REQUIRED'].includes(connStatus);

        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {!isConnected && !needsReauth && (
              <SecondaryButton
                size="sm"
                onClick={() => handleConnectOAuth(row)}
                disabled={actionLoading}
                icon={Zap}
                className="text-[#166534] border-[#BBF7D0] hover:bg-[#F0FDF4]"
              >
                Connect
              </SecondaryButton>
            )}

            {needsReauth && (
              <SecondaryButton
                size="sm"
                onClick={() => handleConnectOAuth(row)}
                disabled={actionLoading}
                icon={RefreshCw}
                className="text-[#D97706] border-[#FDE68A] hover:bg-[#FFFBEB]"
              >
                Reconnect
              </SecondaryButton>
            )}

            {isConnected && (
              <>
                <SecondaryButton
                  size="sm"
                  onClick={() => handleValidateConnection(row)}
                  disabled={actionLoading}
                  title="Verify token health"
                  icon={RefreshCw}
                />
                <SecondaryButton
                  size="sm"
                  danger
                  onClick={() => setDisconnectTarget(row)}
                  disabled={actionLoading}
                  title="Disconnect account"
                  icon={Link2Off}
                />
              </>
            )}

            <SecondaryButton
              size="sm"
              onClick={() => setSelectedAccount(row)}
            >
              Details
            </SecondaryButton>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Instagram Accounts"
        description={
          isAdmin
            ? 'Complete enterprise directory of managed accounts, employee allocations, and Meta OAuth tokens.'
            : 'Assigned accounts allocated to your portfolio with official Meta OAuth status.'
        }
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Instagram Accounts' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <span className="text-xs text-[#64748B] font-medium px-2 py-1 bg-white border border-[#E5E7EB] rounded-md">
                {selectedIds.size} selected
              </span>
            )}
            <PrimaryButton
              size="sm"
              onClick={() => navigate('/register')}
              icon={UserPlus}
            >
              Register Account
            </PrimaryButton>
          </div>
        }
      />

      {/* Global Feedback Banner */}
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
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchAccounts} />}

      {/* 2. Search & Multi-Filter Control Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="w-full lg:w-72">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or name..."
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.employees.length > 0 && (
            <FilterDropdown
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              options={filterOptions.employees}
              placeholder="All Employees"
            />
          )}

          {filterOptions.clients.length > 0 && (
            <FilterDropdown
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              options={filterOptions.clients}
              placeholder="All Clients"
            />
          )}

          {filterOptions.campaigns.length > 0 && (
            <FilterDropdown
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              options={filterOptions.campaigns}
              placeholder="All Campaigns"
            />
          )}

          <FilterDropdown
            value={connectionFilter}
            onChange={(e) => setConnectionFilter(e.target.value)}
            options={[
              { value: 'connected', label: 'Connected' },
              { value: 'not_connected', label: 'Not Connected' },
              { value: 'token_expired', label: 'Token Expired' },
            ]}
            placeholder="All Connections"
          />

          <FilterDropdown
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            options={[
              { value: 'approved', label: 'Approved' },
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'pending_connection', label: 'Pending Connect' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            placeholder="All Approvals"
          />

          {(searchQuery || employeeFilter || clientFilter || campaignFilter || connectionFilter || approvalFilter) && (
            <SecondaryButton
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setEmployeeFilter('');
                setClientFilter('');
                setCampaignFilter('');
                setConnectionFilter('');
                setApprovalFilter('');
              }}
              className="text-[#64748B]"
            >
              Reset
            </SecondaryButton>
          )}
        </div>
      </div>

      {/* 3. Structured Data Table */}
      <DataTable
        columns={columns}
        data={paginatedAccounts}
        loading={loading}
        emptyTitle="No matching Instagram accounts found"
        emptyDescription="Try adjusting your search terms or active filters to view results."
        emptyAction={
          <SecondaryButton
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setEmployeeFilter('');
              setClientFilter('');
              setCampaignFilter('');
              setConnectionFilter('');
              setApprovalFilter('');
            }}
          >
            Clear All Filters
          </SecondaryButton>
        }
        pagination={{
          currentPage,
          totalPages,
          totalItems,
          pageSize,
          onPageChange: setCurrentPage,
        }}
        onRowClick={(row) => setSelectedAccount(row)}
      />

      {/* Account Details Modal */}
      {selectedAccount && (
        <Modal
          isOpen={Boolean(selectedAccount)}
          onClose={() => setSelectedAccount(null)}
          title={`@${selectedAccount.username} — Account Details`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[#172B24]">
                  @{selectedAccount.username}
                </h4>
                <p className="text-xs text-[#64748B]">{selectedAccount.display_name || 'No display name'}</p>
                {selectedAccount.profile_url && (
                  <a
                    href={selectedAccount.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#166534] hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                  >
                    <span>View on Instagram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <StatusBadge status={selectedAccount.status} />
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-md">
                <span className="text-[#64748B] block mb-0.5">Assigned Employee</span>
                <span className="font-semibold text-[#172B24]">
                  {selectedAccount.active_assignment?.employee_name || 'Unassigned'}
                </span>
                <span className="text-[11px] text-[#64748B] block font-mono">
                  {selectedAccount.active_assignment?.employee_code}
                </span>
              </div>

              <div className="p-3 bg-white border border-[#E5E7EB] rounded-md">
                <span className="text-[#64748B] block mb-0.5">Client &amp; Campaign</span>
                <span className="font-semibold text-[#172B24]">
                  {selectedAccount.client_name || 'No Client'}
                </span>
                <span className="text-[11px] text-[#64748B] block">
                  {selectedAccount.campaign_name || 'No Campaign'}
                </span>
              </div>

              <div className="p-3 bg-white border border-[#E5E7EB] rounded-md">
                <span className="text-[#64748B] block mb-0.5">Account Type</span>
                <span className="font-semibold text-[#172B24]">
                  {selectedAccount.account_type || 'BUSINESS'}
                </span>
              </div>

              <div className="p-3 bg-white border border-[#E5E7EB] rounded-md">
                <span className="text-[#64748B] block mb-0.5">Official Instagram ID</span>
                <span className="font-mono text-[#172B24]">
                  {selectedAccount.instagram_user_id || 'Not connected yet'}
                </span>
              </div>
            </div>

            {/* Meta OAuth Status Card */}
            <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#172B24]">Meta Authorization</span>
                <StatusBadge
                  status={(selectedAccount.connection?.connection_status || 'NOT_CONNECTED').toUpperCase()}
                />
              </div>

              {selectedAccount.connection ? (
                <div className="text-xs text-[#64748B] space-y-1">
                  <p>Provider: <strong className="text-[#172B24]">{selectedAccount.connection.provider}</strong></p>
                  <p>Security: <strong className="text-[#15803D]">Fernet AES-128 Encrypted on Server</strong></p>
                  {selectedAccount.connection.last_validated_at && (
                    <p>Last Validated: {new Date(selectedAccount.connection.last_validated_at).toLocaleString()}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#64748B]">
                  No active Meta OAuth connection. Connect this account to enable automatic Graph API synchronization.
                </p>
              )}

              <div className="pt-2 flex items-center gap-2">
                {(selectedAccount.connection?.connection_status || '').toUpperCase() === 'CONNECTED' ? (
                  <>
                    <SecondaryButton
                      size="sm"
                      onClick={() => handleValidateConnection(selectedAccount)}
                      disabled={actionLoading}
                      icon={RefreshCw}
                    >
                      Verify Token Health
                    </SecondaryButton>
                    <SecondaryButton
                      size="sm"
                      danger
                      onClick={() => setDisconnectTarget(selectedAccount)}
                      disabled={actionLoading}
                      icon={Link2Off}
                    >
                      Disconnect
                    </SecondaryButton>
                  </>
                ) : (
                  <PrimaryButton
                    size="sm"
                    onClick={() => handleConnectOAuth(selectedAccount)}
                    disabled={actionLoading}
                    icon={Zap}
                  >
                    Connect Meta OAuth
                  </PrimaryButton>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Disconnect Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(disconnectTarget)}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={confirmDisconnect}
        title="Disconnect Instagram Account"
        message={`Are you sure you want to disconnect Meta OAuth tokens for @${disconnectTarget?.username}? Publishing and automated sync will be suspended until reconnected.`}
        confirmText="Disconnect Account"
        danger
        loading={actionLoading}
      />
    </div>
  );
};

export default AccountsListPage;
