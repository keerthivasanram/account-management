import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Instagram,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Zap
} from 'lucide-react';

export const EmployeeDashboard = () => {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, accountsRes] = await Promise.all([
        api.employees.getMyDashboardStats(),
        api.employees.getMyAccounts({ limit: 8 }),
      ]);
      setStats(statsRes.data);
      setRecentAccounts(accountsRes.data);
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError('Failed to load dashboard metrics. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const targetAccounts = 60;
  const capacityPercent = Math.min(100, Math.round(((stats.total || 0) / targetAccounts) * 100));

  if (loading && recentAccounts.length === 0) {
    return <LoadingSpinner text="Loading dashboard metrics..." size="lg" />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
              Employee Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">{employee?.employee_code}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {employee?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Track and manage your assigned Instagram accounts. Register new pages or connect official Meta OAuth authorizations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/60 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/register"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-pink-500/25 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register Account</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboardData} className="underline text-xs">Retry</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Accounts"
          value={stats.total}
          icon={Instagram}
          color="indigo"
          subtitle={`Capacity: ${stats.total}/${targetAccounts} target`}
          progress={capacityPercent}
          progressLabel="Account Load"
        />
        <StatCard
          title="Connected"
          value={stats.connected}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Meta OAuth active"
        />
        <StatCard
          title="Pending Connect"
          value={stats.pending_connection}
          icon={Clock}
          color="amber"
          subtitle="Awaiting Meta link"
        />
        <StatCard
          title="Awaiting Approval"
          value={stats.pending_approval}
          icon={AlertTriangle}
          color="purple"
          subtitle="Under admin review"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="rose"
          subtitle="Needs review/remarks"
        />
      </div>

      {/* Recent Accounts Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Recent Accounts</h2>
            <p className="text-xs text-slate-400">Recently registered or assigned Instagram accounts</p>
          </div>
          <Link
            to="/accounts"
            className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
          >
            <span>View All ({stats.total})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentAccounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Instagram className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No registered accounts yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by registering your first assigned Instagram page using the short registration form.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-xl text-xs font-bold hover:bg-pink-500/20 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Account</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Instagram Account</th>
                  <th className="px-6 py-3.5">Client & Campaign</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Registered</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold shrink-0">
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

                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-200">{acc.client_name || '—'}</p>
                        <p className="text-xs text-slate-500">{acc.campaign_name || 'No campaign'}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={acc.status} />
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(acc.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {acc.status === 'pending_connection' ? (
                        <Link
                          to={`/accounts?connect=${acc.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-semibold transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Connect</span>
                        </Link>
                      ) : (
                        <Link
                          to="/accounts"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        >
                          <span>Manage</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
