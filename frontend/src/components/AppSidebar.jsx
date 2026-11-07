import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import logoLight from '../logo-light.png';
import {
  LayoutDashboard,
  Instagram,
  UserPlus,
  Share2,
  Clock,
  Users,
  Layers,
  Briefcase,
  Flag,
  CheckCircle,
  History,
  Shield,
  MessageSquare,
  CheckSquare,
  FolderLock,
  Building2,
  ChevronDown,
  LogOut,
  ExternalLink
} from 'lucide-react';

export const AppSidebar = () => {
  const { employee, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);
  const [collaborationOpen, setCollaborationOpen] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchIncidents = async () => {
      try {
        const res = await api.security.getSummary();
        setOpenIncidentsCount(res.data.open_incidents || 0);
      } catch (_) {}
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 8000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Main navigation items
  const mainLinks = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/accounts', label: 'Instagram Accounts', icon: Instagram },
    { to: '/register', label: 'Register Account', icon: UserPlus },
    { to: '/social/posts', label: 'Publishing', icon: Share2 },
  ];

  // Management navigation items (authorized users & admins)
  const managementLinks = [
    { to: '/admin/employees', label: 'Employees', icon: Users, adminOnly: true },
    { to: '/admin/accounts', label: 'Assignments', icon: Layers, adminOnly: true },
    { to: '/admin/clients', label: 'Clients & Campaigns', icon: Briefcase, adminOnly: true },
  ];

  // Administration navigation items (admin only)
  const administrationLinks = [
    { to: '/admin/accounts?filter=pending', label: 'Approvals', icon: CheckCircle },
    { to: '/admin/audit-logs', label: 'Activity Logs', icon: History },
    { to: '/admin/security', label: 'Security & Settings', icon: Shield, badge: openIncidentsCount },
  ];

  // Workspace Collaboration modules
  const collaborationLinks = [
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/chat', label: 'Company Chat', icon: MessageSquare },
    { to: '/documents', label: 'Documents', icon: FolderLock },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/departments', label: 'Departments', icon: Building2 },
  ];

  const renderNavLink = (item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to || (item.to.includes('?') && location.pathname + location.search === item.to);

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={`h-9 px-3 flex items-center justify-between rounded-md text-sm transition-colors duration-150 ${
          isActive
            ? 'bg-[#F0FDF4] text-[#166534] font-medium border-l-2 border-[#166534]'
            : 'text-[#64748B] hover:text-[#172B24] hover:bg-[#F8FAFC]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#166534]' : 'text-[#64748B]'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge > 0 && (
          <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="w-60 bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E5E7EB] bg-white">
        <NavLink to="/dashboard" className="flex items-center gap-2 group">
          <img
            src={logoLight}
            alt="Klarves"
            className="h-8 object-contain"
          />
        </NavLink>
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
          v3.2
        </span>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {/* MAIN */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-[#64748B] uppercase">
            Main
          </div>
          <nav className="space-y-0.5">
            {mainLinks.map(renderNavLink)}
          </nav>
        </div>

        {/* MANAGEMENT */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-[#64748B] uppercase">
              Management
            </div>
            <nav className="space-y-0.5">
              {managementLinks.map(renderNavLink)}
            </nav>
          </div>
        )}

        {/* ADMINISTRATION */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-[#64748B] uppercase">
              Administration
            </div>
            <nav className="space-y-0.5">
              {administrationLinks.map(renderNavLink)}
            </nav>
          </div>
        )}

        {/* WORKSPACE & COLLABORATION */}
        <div>
          <button
            type="button"
            onClick={() => setCollaborationOpen(!collaborationOpen)}
            className="w-full px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-[#64748B] uppercase flex items-center justify-between hover:text-[#172B24] transition-colors"
          >
            <span>Workspace</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                collaborationOpen ? '' : '-rotate-90'
              }`}
            />
          </button>
          {collaborationOpen && (
            <nav className="space-y-0.5">
              {collaborationLinks.map(renderNavLink)}
            </nav>
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#E5E7EB] bg-white">
        <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#166534] font-semibold text-xs shrink-0">
              {employee?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#172B24] truncate">
                {employee?.full_name || 'Authenticated User'}
              </p>
              <p className="text-[11px] text-[#64748B] font-mono truncate">
                {employee?.employee_code || (isAdmin ? 'ADMIN' : 'STAFF')}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
