import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ShieldCheck,
  Instagram,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  HardDrive
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminData = async () => {
      setLoading(true);
      try {
        const [statsRes, empsRes] = await Promise.all([
          api.admin.getStats(),
          api.admin.listEmployees(),
        ]);
        setStats(statsRes.data);
        setEmployees(empsRes.data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading system metrics..." size="lg" />;
  }

  const targetSystemCapacity = 5000;
  const systemCapacityPercent = Math.min(
    100,
    Math.round(((stats?.total_accounts || 0) / targetSystemCapacity) * 100)
  );

  return (
    <div className="space-y-8">
      {/* Admin Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              System Administrator Portal
            </span>
            <span className="text-xs text-slate-400">Company Capacity & Oversight</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Platform Infrastructure Overview
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Monitoring {stats?.total_accounts || 0} registered Instagram accounts across {stats?.total_employees || 0} employees. Target platform scale: 5,000 accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/accounts"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Manage All Accounts</span>
          </Link>
        </div>
      </div>

      {/* Target Capacity Tracker Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">5,000 Target Accounts Scaling Progress</h3>
              <p className="text-xs text-slate-400">Total company Instagram portfolio growth</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-white">{stats?.total_accounts || 0}</span>
            <span className="text-xs text-slate-500"> / 5,000 accounts ({systemCapacityPercent}%)</span>
          </div>
        </div>

        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(2, systemCapacityPercent)}%` }}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Accounts"
          value={stats?.total_accounts || 0}
          icon={Instagram}
          color="indigo"
          subtitle="Across all employees"
        />
        <StatCard
          title="Connected Accounts"
          value={stats?.connected_accounts || 0}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Valid Meta OAuth tokens"
        />
        <StatCard
          title="Pending Accounts"
          value={stats?.pending_accounts || 0}
          icon={Clock}
          color="amber"
          subtitle="Connection or approval pending"
        />
        <StatCard
          title="Total Employees"
          value={stats?.total_employees || 0}
          icon={Users}
          color="purple"
          subtitle="Active workforce"
        />
      </div>

      {/* Employee Capacity / Allocation Tracker (50-60 accounts per employee target) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Employee Workload Distribution</h2>
            <p className="text-xs text-slate-400">Tracking employee allocation towards the target 50–60 accounts per person</p>
          </div>
          <Link
            to="/admin/employees"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>View All Employees</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.slice(0, 6).map((emp) => {
            const count = emp.assigned_accounts_count || 0;
            const percent = Math.min(100, Math.round((count / 60) * 100));
            return (
              <div
                key={emp.id}
                className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white truncate">{emp.full_name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{emp.employee_code}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    emp.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {emp.role}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Load: <strong className="text-slate-200">{count}</strong> / 60 accounts</span>
                    <span className="font-mono text-purple-400">{percent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percent >= 80 ? 'bg-emerald-500' : percent >= 40 ? 'bg-pink-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.max(2, percent)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
