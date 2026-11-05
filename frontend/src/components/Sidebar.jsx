import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Instagram,
  UserPlus,
  Users,
  Briefcase,
  History,
  ShieldCheck,
  Settings,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { employee, isAdmin } = useAuth();

  const employeeLinks = [
    { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/accounts', label: 'My Accounts', icon: Instagram },
    { to: '/register', label: 'Register Account', icon: UserPlus },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Admin Overview', icon: ShieldCheck },
    { to: '/admin/accounts', label: 'All Accounts', icon: Layers },
    { to: '/admin/employees', label: 'Employees & Capacity', icon: Users },
    { to: '/admin/clients', label: 'Clients & Campaigns', icon: Briefcase },
    { to: '/admin/audit-logs', label: 'Audit Trail', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
          <Instagram className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            Klarves IG <span className="text-xs px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">v1.0</span>
          </h1>
          <p className="text-[10px] text-slate-400">Account Management</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
        {/* Employee Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Workspace
          </div>
          <nav className="space-y-1">
            {employeeLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Admin Section (Visible to Admins) */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              <span>Administration</span>
              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">Admin</span>
            </div>
            <nav className="space-y-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Employee Quick Info Badge */}
      <div className="p-4 border-t border-slate-800">
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-between">
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-200 truncate">{employee?.full_name || 'Logged In'}</p>
            <p className="text-[11px] text-slate-400 font-mono">{employee?.employee_code || 'EMP-XXXX'}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-bold text-pink-400">
              {employee?.assigned_accounts_count || 0}
            </span>
            <span className="text-[10px] text-slate-500">/60</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
