import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import FilterDropdown from '../../components/ui/FilterDropdown';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import Modal from '../../components/Modal';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import ErrorState from '../../components/ui/ErrorState';
import {
  Users,
  Shield,
  User,
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  ExternalLink,
  Instagram,
  Clock,
  Briefcase,
  Activity,
  Layers
} from 'lucide-react';

export const AdminEmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Employee Details Modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [employeeAccounts, setEmployeeAccounts] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusToggleTarget, setStatusToggleTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.listEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setError('Unable to fetch employees from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSelectEmployee = async (emp) => {
    setSelectedEmployee(emp);
    setLoadingDetails(true);
    try {
      const [detailRes, accRes] = await Promise.all([
        api.admin.getEmployee(emp.id).catch(() => ({ data: { employee: emp } })),
        api.admin.getEmployeeAccounts(emp.id, { filter_type: 'all' }).catch(() => ({ data: [] })),
      ]);
      setEmployeeDetails(detailRes.data);
      setEmployeeAccounts(accRes.data || []);
    } catch (err) {
      console.error('Failed to load employee details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusToggleTarget) return;
    setActionLoading(true);
    try {
      const newStatus = statusToggleTarget.is_active ? false : true;
      await api.admin.updateEmployeeStatus(statusToggleTarget.id, newStatus);
      setFeedback({
        type: 'success',
        text: `Employee ${statusToggleTarget.full_name} is now ${newStatus ? 'Active' : 'Inactive'}.`,
      });
      fetchEmployees();
      setStatusToggleTarget(null);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update employee status.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.full_name?.toLowerCase().includes(q);
        const matchEmail = emp.email?.toLowerCase().includes(q);
        const matchCode = emp.employee_code?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCode) return false;
      }
      if (statusFilter) {
        if (statusFilter === 'active' && !emp.is_active) return false;
        if (statusFilter === 'inactive' && emp.is_active) return false;
      }
      return true;
    });
  }, [employees, searchQuery, statusFilter]);

  const targetAccounts = 60;

  const columns = [
    {
      header: 'Employee Name',
      accessor: 'full_name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#166534] font-semibold text-xs shrink-0">
            {row.full_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[#172B24] truncate">{row.full_name}</p>
            <span className="text-[11px] text-[#64748B] capitalize">{row.role || 'Staff'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Employee ID',
      accessor: 'employee_code',
      render: (row) => (
        <span className="font-mono text-xs text-[#172B24] font-medium bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
          {row.employee_code || 'EMP-XXXX'}
        </span>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row) => <span className="text-xs text-[#64748B]">{row.email}</span>,
    },
    {
      header: 'Assigned Accounts',
      accessor: 'assigned_count',
      render: (row) => {
        const count = row.assigned_accounts_count || row.accounts_count || 0;
        const pct = Math.min(100, Math.round((count / targetAccounts) * 100));
        return (
          <div className="w-36">
            <div className="flex justify-between text-xs text-[#172B24] mb-1">
              <span className="font-medium">{count}</span>
              <span className="text-[#64748B]">{targetAccounts} max</span>
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
      header: 'Active Accounts',
      accessor: 'active_count',
      render: (row) => (
        <span className="text-xs font-semibold text-[#15803D]">
          {row.active_accounts_count || 0} active
        </span>
      ),
    },
    {
      header: 'Employee Status',
      accessor: 'is_active',
      render: (row) => (
        <StatusBadge status={row.is_active ? 'ACTIVE' : 'SUSPENDED'} />
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <SecondaryButton
            size="sm"
            onClick={() => handleSelectEmployee(row)}
          >
            Details
          </SecondaryButton>
          <SecondaryButton
            size="sm"
            danger={row.is_active}
            onClick={() => setStatusToggleTarget(row)}
          >
            {row.is_active ? 'Deactivate' : 'Activate'}
          </SecondaryButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Employee Management"
        description="Structured employee directory, account capacity allocation, and workload governance."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Management' },
          { label: 'Employees' },
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

      {error && <ErrorState message={error} onRetry={fetchEmployees} />}

      {/* 2. Search & Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or code..."
          />
        </div>

        <div className="flex items-center gap-2">
          <FilterDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'active', label: 'Active Employees' },
              { value: 'inactive', label: 'Inactive / Suspended' },
            ]}
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* 3. Employee Data Table */}
      <DataTable
        columns={columns}
        data={filteredEmployees}
        loading={loading}
        emptyTitle="No employees found"
        emptyDescription="There are no employee profiles matching your filter criteria."
        onRowClick={(row) => handleSelectEmployee(row)}
      />

      {/* 4. Employee Detail Drawer / Modal */}
      {selectedEmployee && (
        <Modal
          isOpen={Boolean(selectedEmployee)}
          onClose={() => setSelectedEmployee(null)}
          title={`${selectedEmployee.full_name} — Details & Workload`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Employee Information */}
            <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#166534] font-semibold text-sm">
                  {selectedEmployee.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#172B24]">{selectedEmployee.full_name}</h4>
                  <p className="text-xs text-[#64748B]">{selectedEmployee.email}</p>
                </div>
              </div>
              <StatusBadge status={selectedEmployee.is_active ? 'ACTIVE' : 'INACTIVE'} />
            </div>

            {/* Quick Metadata */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-md">
                <span className="text-[#64748B] block mb-0.5">Employee ID</span>
                <span className="font-mono text-[#172B24] font-semibold">{selectedEmployee.employee_code}</span>
              </div>
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-md">
                <span className="text-[#64748B] block mb-0.5">System Role</span>
                <span className="font-semibold text-[#172B24] capitalize">{selectedEmployee.role || 'Staff'}</span>
              </div>
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-md">
                <span className="text-[#64748B] block mb-0.5">Joined</span>
                <span className="text-[#172B24]">
                  {selectedEmployee.created_at
                    ? new Date(selectedEmployee.created_at).toLocaleDateString()
                    : '—'}
                </span>
              </div>
            </div>

            {/* Workload Overview */}
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#172B24]">Workload &amp; Capacity</span>
                <span className="font-medium text-[#64748B]">
                  {employeeAccounts.length} / {targetAccounts} Accounts Target
                </span>
              </div>
              <div className="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#166534] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((employeeAccounts.length / targetAccounts) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-[#64748B]">
                Each employee maintains an optimal operational quota of 50–60 accounts.
              </p>
            </div>

            {/* Assigned Accounts List */}
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-[#172B24] uppercase tracking-wider">
                Assigned Instagram Accounts ({employeeAccounts.length})
              </h5>
              <div className="max-h-56 overflow-y-auto divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg bg-white">
                {loadingDetails ? (
                  <div className="p-4 text-center text-xs text-[#64748B]">Loading account roster...</div>
                ) : employeeAccounts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#64748B]">
                    No accounts currently assigned to this employee.
                  </div>
                ) : (
                  employeeAccounts.map((acc) => (
                    <div key={acc.id} className="p-3 text-xs flex items-center justify-between hover:bg-[#F8FAFC]">
                      <div>
                        <span className="font-semibold text-[#172B24]">@{acc.username}</span>
                        <p className="text-[11px] text-[#64748B]">{acc.client_name || 'No client'}</p>
                      </div>
                      <StatusBadge status={acc.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(statusToggleTarget)}
        onClose={() => setStatusToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={statusToggleTarget?.is_active ? 'Deactivate Employee' : 'Activate Employee'}
        message={`Are you sure you want to ${statusToggleTarget?.is_active ? 'deactivate' : 'activate'} ${statusToggleTarget?.full_name}?`}
        confirmText={statusToggleTarget?.is_active ? 'Deactivate' : 'Activate'}
        danger={statusToggleTarget?.is_active}
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminEmployeesPage;
