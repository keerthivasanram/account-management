import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import MetricCard from '../../components/ui/MetricCard';
import DataTable from '../../components/ui/DataTable';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import {
  Instagram,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAdminData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, empsRes] = await Promise.all([
          api.admin.getStats(),
          api.admin.listEmployees(),
        ]);
        setStats(statsRes.data);
        setEmployees(empsRes.data || []);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
        setError('Failed to fetch platform metrics.');
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading administrative metrics..." />;
  }

  const targetSystemCapacity = 5000;
  const totalAcc = stats?.total_accounts || 0;
  const connectedAcc = stats?.connected_accounts || 0;
  const scalingPercent = Math.min(100, Math.round((totalAcc / targetSystemCapacity) * 100));

  const employeeColumns = [
    {
      header: 'Employee Name',
      accessor: 'full_name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#166534] font-semibold text-xs">
            {row.full_name?.charAt(0) || 'U'}
          </div>
          <span className="font-semibold text-sm text-[#172B24]">{row.full_name}</span>
        </div>
      ),
    },
    {
      header: 'Code',
      accessor: 'employee_code',
      render: (row) => (
        <span className="font-mono text-xs text-[#172B24] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
          {row.employee_code}
        </span>
      ),
    },
    {
      header: 'Workload (Max 60)',
      accessor: 'assigned_count',
      render: (row) => {
        const count = row.assigned_accounts_count || row.accounts_count || 0;
        const pct = Math.min(100, Math.round((count / 60) * 100));
        return (
          <div className="w-36">
            <div className="flex justify-between text-xs text-[#172B24] mb-1">
              <span className="font-medium">{count} / 60</span>
              <span className="text-[#64748B]">{pct}%</span>
            </div>
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct > 90 ? 'bg-[#DC2626]' : 'bg-[#166534]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'SUSPENDED'} />,
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <SecondaryButton
          size="sm"
          onClick={() => navigate('/admin/employees')}
        >
          Inspect
        </SecondaryButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Administration Overview"
        description="Enterprise platform health, 5,000-account scaling capacity, and employee workload governance."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Administration' },
        ]}
        actions={
          <PrimaryButton
            size="sm"
            onClick={() => navigate('/admin/accounts')}
            icon={Layers}
          >
            Manage Accounts
          </PrimaryButton>
        }
      />

      {error && <ErrorState message={error} />}

      {/* 2. Key Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Managed Accounts"
          value={totalAcc}
          icon={Instagram}
          subtext={`Target scaling: 5,000 accounts`}
          trend={`${scalingPercent}% progress`}
          trendDirection="neutral"
        />
        <MetricCard
          label="Meta OAuth Connected"
          value={connectedAcc}
          icon={CheckCircle2}
          subtext="Valid Graph API token"
          trend={`${totalAcc > 0 ? Math.round((connectedAcc / totalAcc) * 100) : 0}% connected`}
          trendDirection="up"
        />
        <MetricCard
          label="Active Staff Members"
          value={stats?.total_employees || employees.length}
          icon={Users}
          subtext="Workload balanced at ~50/staff"
          trend="Capacity OK"
          trendDirection="neutral"
        />
        <MetricCard
          label="Client Accounts"
          value={stats?.total_clients || 0}
          icon={Briefcase}
          subtext="Corporate client portfolios"
          trend="Enterprise"
          trendDirection="neutral"
        />
      </div>

      {/* 3. 5,000 Fleet Capacity Scaling Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#172B24]">
              5,000 Target Accounts Scaling Progress
            </h3>
            <p className="text-xs text-[#64748B]">
              Overall enterprise account growth across all departments
            </p>
          </div>
          <div className="text-sm font-medium text-[#172B24]">
            <span className="text-base font-semibold text-[#166534]">{totalAcc}</span> / 5,000 accounts ({scalingPercent}%)
          </div>
        </div>

        <div className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-[#166534] h-full rounded-full transition-all duration-300"
            style={{ width: `${scalingPercent}%` }}
          />
        </div>
      </div>

      {/* 4. Employee Workload Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#172B24]">Employee Capacity &amp; Roster</h3>
            <p className="text-xs text-[#64748B]">Active workload distribution per employee</p>
          </div>
          <SecondaryButton
            size="sm"
            onClick={() => navigate('/admin/employees')}
          >
            View All Employees
          </SecondaryButton>
        </div>

        <DataTable
          columns={employeeColumns}
          data={employees.slice(0, 8)}
          emptyTitle="No employees registered"
          emptyDescription="Add employee profiles to begin account allocations."
        />
      </div>
    </div>
  );
};

export default AdminDashboardPage;
