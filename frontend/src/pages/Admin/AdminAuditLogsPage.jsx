import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import FilterDropdown from '../../components/ui/FilterDropdown';
import StatusBadge from '../../components/ui/StatusBadge';
import SecondaryButton from '../../components/ui/SecondaryButton';
import ErrorState from '../../components/ui/ErrorState';
import { History, RefreshCw } from 'lucide-react';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      const res = await api.admin.listAuditLogs(params);
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Failed to fetch system audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const totalItems = logs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {new Date(row.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => (
        <span className="font-mono text-xs font-medium text-[#172B24] uppercase">
          {row.action?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Performed By',
      accessor: 'employee_name',
      render: (row) => (
        <span className="text-xs font-medium text-[#172B24]">
          {row.employee_name || 'System Actor'}
        </span>
      ),
    },
    {
      header: 'Entity / Target',
      accessor: 'entity_type',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {row.entity_type} {row.entity_id ? `(${row.entity_id.substring(0, 8)}...)` : ''}
        </span>
      ),
    },
    {
      header: 'Event Details',
      accessor: 'details',
      render: (row) => {
        let text = typeof row.details === 'object' ? JSON.stringify(row.details) : row.details || '—';
        return (
          <span className="text-xs text-[#64748B] font-mono truncate max-w-xs block" title={text}>
            {text}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Activity & Audit Logs"
        description="Immutable record of user registrations, OAuth authorizations, reassignments, and approvals."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Administration' },
          { label: 'Activity Logs' },
        ]}
        actions={
          <SecondaryButton size="sm" onClick={fetchLogs} icon={RefreshCw}>
            Refresh
          </SecondaryButton>
        }
      />

      {error && <ErrorState message={error} onRetry={fetchLogs} />}

      {/* Filter Tabs */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-xs flex items-center justify-between">
        <FilterDropdown
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          options={[
            { value: 'account_registered', label: 'Registrations' },
            { value: 'instagram_connected', label: 'OAuth Connects' },
            { value: 'account_assigned', label: 'Assignments' },
            { value: 'account_approved', label: 'Approvals' },
            { value: 'account_rejected', label: 'Rejections' },
          ]}
          placeholder="All Activity Types"
        />

        <span className="text-xs text-[#64748B]">
          {logs.length} logged events
        </span>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={paginatedLogs}
        loading={loading}
        emptyTitle="No audit log entries recorded"
        emptyDescription="System operations and audit logs will appear here as team members take actions."
        pagination={{
          currentPage,
          totalPages,
          totalItems,
          pageSize,
          onPageChange: setCurrentPage,
        }}
      />
    </div>
  );
};

export default AdminAuditLogsPage;
