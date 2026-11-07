import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import FilterDropdown from '../../components/ui/FilterDropdown';
import SearchInput from '../../components/ui/SearchInput';
import ErrorState from '../../components/ui/ErrorState';
import {
  ShieldAlert,
  ShieldCheck,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Camera,
  Lock,
  Smartphone
} from 'lucide-react';

export const AdminSecurityPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' | 'devices' | 'policies'
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const fetchSecurityData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [incRes, devRes] = await Promise.all([
        api.security.listIncidents(),
        api.security.listDevices(),
      ]);
      setIncidents(incRes.data || []);
      setDevices(devRes.data || []);
    } catch (err) {
      console.error('Failed to load security telemetry:', err);
      setError('Failed to fetch security telemetry from the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveIncident = async (incidentId) => {
    try {
      await api.security.updateIncidentStatus(incidentId, 'RESOLVED');
      setActionMessage('Incident marked as reviewed and resolved.');
      fetchSecurityData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve incident.');
    }
  };

  const handleSimulateScreenshot = async () => {
    try {
      await api.security.reportIncident({
        event_type: 'SCREENSHOT_KEY_DETECTED',
        route: window.location.pathname,
        key_combination: 'PrintScreen (Simulation)'
      });
      setActionMessage('Simulated screenshot alert triggered. Broadcasted to admin channels.');
      fetchSecurityData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err) {
      alert('Failed to simulate alert: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSeverity = filterSeverity === 'ALL' || inc.severity === filterSeverity;
    const matchesSearch =
      !searchQuery.trim() ||
      (inc.actor_name && inc.actor_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inc.actor_code && inc.actor_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inc.key_combination && inc.key_combination.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inc.route && inc.route.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED').length;
  const activeDevicesCount = devices.filter((d) => d.status === 'ACTIVE').length;

  const incidentColumns = [
    {
      header: 'Detected Time',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-[#64748B] font-mono">
          {new Date(row.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Event Type',
      accessor: 'event_type',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-[#172B24]">
            {row.event_type}
          </span>
          {row.key_combination && (
            <span className="text-[10px] text-[#64748B] font-mono bg-[#F1F5F9] px-1.5 py-0.2 rounded">
              {row.key_combination}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Employee Actor',
      accessor: 'actor_name',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-[#172B24]">{row.actor_name || 'Unknown User'}</p>
          <p className="text-[10px] text-[#64748B] font-mono">{row.actor_code}</p>
        </div>
      ),
    },
    {
      header: 'Route Attempted',
      accessor: 'route',
      render: (row) => (
        <span className="font-mono text-xs text-[#64748B]">{row.route || '/'}</span>
      ),
    },
    {
      header: 'Severity',
      accessor: 'severity',
      render: (row) => (
        <StatusBadge
          status={row.severity === 'CRITICAL' ? 'ERROR' : row.severity === 'HIGH' ? 'WARNING' : 'INFO'}
          text={row.severity}
        />
      ),
    },
    {
      header: 'Incident Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'OPEN'} />,
    },
    {
      header: 'Action',
      align: 'right',
      render: (row) => (
        <div>
          {row.status !== 'RESOLVED' ? (
            <SecondaryButton
              size="sm"
              onClick={() => handleResolveIncident(row.id)}
            >
              Resolve
            </SecondaryButton>
          ) : (
            <span className="text-xs text-[#15803D] font-medium">Resolved</span>
          )}
        </div>
      ),
    },
  ];

  const deviceColumns = [
    {
      header: 'Device Name',
      accessor: 'device_name',
      render: (row) => (
        <span className="font-semibold text-sm text-[#172B24]">{row.device_name || 'Workstation'}</span>
      ),
    },
    {
      header: 'Bound Employee',
      accessor: 'employee_name',
      render: (row) => (
        <span className="text-xs font-medium text-[#172B24]">{row.employee_name || 'Staff'}</span>
      ),
    },
    {
      header: 'Device Fingerprint',
      accessor: 'device_fingerprint',
      render: (row) => (
        <span className="font-mono text-xs text-[#64748B]">
          {row.device_fingerprint?.substring(0, 16)}...
        </span>
      ),
    },
    {
      header: 'Status',
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
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Security & Settings"
        description="Zero-trust screenshot interception, hardware device trust certificates, and data loss prevention."
        breadcrumbs={[
          { label: 'Overview', to: '/dashboard' },
          { label: 'Administration' },
          { label: 'Security & Settings' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              size="sm"
              onClick={handleSimulateScreenshot}
              icon={Camera}
            >
              Simulate Alert
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              onClick={fetchSecurityData}
              disabled={refreshing}
              icon={RefreshCw}
            >
              Refresh
            </SecondaryButton>
          </div>
        }
      />

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="p-0.5 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchSecurityData} />}

      {/* 2. Compact Security Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Intercepted Incidents"
          value={incidents.length}
          icon={ShieldAlert}
          subtext="Screenshot & DevTools alarms"
          trend={`${openIncidents} open`}
          trendDirection={openIncidents > 0 ? 'down' : 'up'}
        />
        <MetricCard
          label="Active Hardware Devices"
          value={activeDevicesCount}
          icon={Laptop}
          subtext="Hardware certificates bound"
          trend="Enforced"
          trendDirection="neutral"
        />
        <MetricCard
          label="Token Security Level"
          value="AES-128"
          icon={Lock}
          subtext="Fernet encrypted on backend"
          trend="Active"
          trendDirection="up"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] gap-6">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
            activeTab === 'incidents'
              ? 'border-[#166534] text-[#166534]'
              : 'border-transparent text-[#64748B] hover:text-[#172B24]'
          }`}
        >
          Security Incidents ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
            activeTab === 'devices'
              ? 'border-[#166534] text-[#166534]'
              : 'border-transparent text-[#64748B] hover:text-[#172B24]'
          }`}
        >
          Trusted Devices ({devices.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'incidents' ? (
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="w-full sm:w-72">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search incidents by actor or route..."
              />
            </div>
            <FilterDropdown
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Severities' },
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
              ]}
              placeholder=""
            />
          </div>

          <DataTable
            columns={incidentColumns}
            data={filteredIncidents}
            loading={loading}
            emptyTitle="No security incidents detected"
            emptyDescription="All zero-trust screen protection checks are operating normally without violations."
          />
        </div>
      ) : (
        <DataTable
          columns={deviceColumns}
          data={devices}
          loading={loading}
          emptyTitle="No registered hardware devices"
          emptyDescription="Device certificates will appear as employees log in from verified workstations."
        />
      )}
    </div>
  );
};

export default AdminSecurityPage;
