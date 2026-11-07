import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import MetricCard from '../../components/ui/MetricCard';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import {
  Instagram,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Zap,
  Share2,
  CheckSquare,
  Activity,
  Layers
} from 'lucide-react';

export const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    connected: 0,
    pending_connection: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0,
  });
  const [recentAccounts, setRecentAccounts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, accountsRes] = await Promise.all([
        api.employees.getMyDashboardStats(),
        api.employees.getMyAccounts({ limit: 6 }),
      ]);
      setStats(statsRes.data);
      setRecentAccounts(accountsRes.data || []);

      // Fetch optional publishing and attendance in background
      try {
        const postsRes = await api.socialPosts.list({ limit: 5 });
        setRecentPosts(postsRes.data || []);
      } catch (_) {}

      try {
        const attRes = await api.attendance.getSummary();
        setAttendanceSummary(attRes.data);
      } catch (_) {}
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError('Failed to load operational metrics. Please verify server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const targetAccounts = 60;
  const capacityPercent = Math.min(100, Math.round(((stats.total || 0) / targetAccounts) * 100));
  const connectedPercent = stats.total > 0 ? Math.round((stats.connected / stats.total) * 100) : 0;

  const accountColumns = [
    {
      header: 'Instagram Account',
      accessor: 'username',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#172B24] font-medium text-xs shrink-0">
            @
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-[#172B24]">@{row.username}</span>
              {row.profile_url && (
                <a
                  href={row.profile_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#94A3B8] hover:text-[#172B24]"
                  title="Open profile"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className="text-xs text-[#64748B] truncate">{row.display_name || 'No display name'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Client & Campaign',
      accessor: 'client_name',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-[#172B24]">{row.client_name || '—'}</p>
          <p className="text-[11px] text-[#64748B]">{row.campaign_name || 'Unassigned'}</p>
        </div>
      ),
    },
    {
      header: 'Connection Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Registered',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-[#64748B]">
          {new Date(row.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'pending_connection' ? (
            <SecondaryButton
              size="sm"
              onClick={() => navigate(`/accounts?connect=${row.id}`)}
              icon={Zap}
              className="text-[#166534] border-[#BBF7D0] hover:bg-[#F0FDF4]"
            >
              Connect
            </SecondaryButton>
          ) : (
            <SecondaryButton
              size="sm"
              onClick={() => navigate('/accounts')}
            >
              View
            </SecondaryButton>
          )}
        </div>
      ),
    },
  ];

  if (loading && recentAccounts.length === 0) {
    return <LoadingState message="Loading operational dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Overview"
        description="Operational metrics, fleet connection health, and account activity."
        actions={
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-[#E5E7EB] text-xs text-[#64748B]">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-[#94A3B8]" />
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <SecondaryButton
              size="sm"
              onClick={fetchDashboardData}
              icon={RefreshCw}
              title="Refresh metrics"
            />
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

      {error && <ErrorState message={error} onRetry={fetchDashboardData} />}

      {/* 2. Four Compact Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Accounts"
          value={stats.total}
          icon={Instagram}
          subtext={`Target workload: ${stats.total}/${targetAccounts} accounts`}
          trend={`${capacityPercent}% capacity`}
          trendDirection="neutral"
        />
        <MetricCard
          label="Connected Accounts"
          value={stats.connected}
          icon={CheckCircle2}
          subtext="Meta OAuth token verified"
          trend={`${connectedPercent}% connected`}
          trendDirection={connectedPercent >= 80 ? 'up' : 'neutral'}
        />
        <MetricCard
          label="Pending Connections"
          value={stats.pending_connection}
          icon={Clock}
          subtext="Requires Facebook/Meta auth"
          trend={stats.pending_approval > 0 ? `${stats.pending_approval} under review` : 'None pending review'}
          trendDirection={stats.pending_connection > 0 ? 'down' : 'neutral'}
        />
        <MetricCard
          label="Publishing Failures"
          value={stats.rejected || 0}
          icon={AlertTriangle}
          subtext="Requires credential refresh"
          trend={stats.rejected > 0 ? 'Action needed' : 'All systems clear'}
          trendDirection={stats.rejected > 0 ? 'down' : 'up'}
        />
      </div>

      {/* 3. Operational Detail Panels (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Account Registrations (Takes 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-semibold text-[#172B24]">Recent Account Registrations</h3>
                <p className="text-xs text-[#64748B]">Recently added or allocated Instagram profiles</p>
              </div>
              <Link
                to="/accounts"
                className="text-xs font-medium text-[#166534] hover:underline inline-flex items-center gap-1"
              >
                <span>View all ({stats.total})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <DataTable
              columns={accountColumns}
              data={recentAccounts}
              emptyTitle="No Instagram accounts registered"
              emptyDescription="You currently have no registered accounts in this workspace. Register your first account to begin operations."
              emptyAction={
                <PrimaryButton size="sm" onClick={() => navigate('/register')} icon={UserPlus}>
                  Register Account
                </PrimaryButton>
              }
            />
          </div>
        </div>

        {/* Right Column: Connection Status & Workload Overview (Takes 1 col) */}
        <div className="space-y-6">
          {/* Account Connection Status */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-[#172B24] mb-1">
              Account Connection Status
            </h3>
            <p className="text-xs text-[#64748B] mb-4">
              Real-time authorization status of your fleet
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[#172B24] font-medium mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#15803D]" />
                    Connected &amp; Active
                  </span>
                  <span>{stats.connected} accounts</span>
                </div>
                <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#15803D] h-full rounded-full transition-all duration-300"
                    style={{ width: `${connectedPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#172B24] font-medium mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                    Pending Connection
                  </span>
                  <span>{stats.pending_connection} accounts</span>
                </div>
                <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#D97706] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${stats.total > 0 ? (stats.pending_connection / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#172B24] font-medium mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                    Pending Approval / Rejected
                  </span>
                  <span>{(stats.pending_approval || 0) + (stats.rejected || 0)} accounts</span>
                </div>
                <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#DC2626] h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${stats.total > 0 ? (((stats.pending_approval || 0) + (stats.rejected || 0)) / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#64748B]">
              <span>Overall Fleet Health</span>
              <span className="font-semibold text-[#15803D]">
                {connectedPercent >= 80 ? 'Optimal (80%+)' : 'Attention Recommended'}
              </span>
            </div>
          </div>

          {/* Employee Workload Summary */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-[#172B24] mb-1">
              Employee Workload Summary
            </h3>
            <p className="text-xs text-[#64748B] mb-4">
              Capacity allocation and attendance status
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-md">
                <div className="flex justify-between text-[#172B24] font-medium mb-1">
                  <span>Assigned Account Load</span>
                  <span>{stats.total} / {targetAccounts} max</span>
                </div>
                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      capacityPercent > 90 ? 'bg-[#DC2626]' : 'bg-[#166534]'
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#64748B] mt-1.5">
                  {capacityPercent >= 100
                    ? 'Maximum capacity reached. Reallocate new accounts.'
                    : `${targetAccounts - stats.total} account slots remaining.`}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[#64748B]">Shift Status</span>
                <span className="font-medium text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
                  {attendanceSummary?.today_status || 'Active Shift'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Employee Code</span>
                <span className="font-mono text-[#172B24] font-medium">
                  {employee?.employee_code || 'EMP-XXXX'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
