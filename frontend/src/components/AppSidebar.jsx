import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import logoMark from '../logo-mark.png';
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
  ExternalLink,
  UsersRound,
  Inbox,
  Crown,
  Settings2,
  Activity
} from 'lucide-react';

export const AppSidebar = () => {
  const { employee, isAdmin, isManager, can, logout } = useAuth();
  const location = useLocation();
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);

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

  // Manager workspace (managers, admins, super admins)
  const teamLinks = [
    { to: '/manager', label: 'My Team', icon: UsersRound },
    { to: '/manager?tab=approvals', label: 'Approvals Inbox', icon: Inbox },
  ];

  // Super admin console
  const superAdminLinks = [
    { to: '/super-admin', label: 'Control Center', icon: Crown },
    { to: '/super-admin?tab=admins', label: 'Admins & Roles', icon: Users },
    { to: '/super-admin?tab=settings', label: 'Company Policy', icon: Settings2 },
    { to: '/super-admin?tab=health', label: 'System Health', icon: Activity },
    { to: '/super-admin?tab=audit', label: 'Audit Search', icon: History },
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

  const sections = [
    { id: 'main', label: 'Main', links: mainLinks, show: true },
    { id: 'team', label: 'My Team', links: teamLinks, show: isManager },
    { id: 'management', label: 'Management', links: managementLinks, show: isAdmin },
    { id: 'administration', label: 'Administration', links: administrationLinks, show: isAdmin },
    { id: 'super', label: 'Super Admin', links: superAdminLinks, show: can('settings:manage') },
    { id: 'workspace', label: 'Workspace', links: collaborationLinks, show: true },
  ].filter((sec) => sec.show);

  const isLinkActive = (item) =>
    item.to.includes('?')
      ? location.pathname + location.search === item.to
      : location.pathname === item.to && !location.search.includes('tab=');

  // Sections remember whether they are collapsed; the one holding the current page always opens.
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nav_collapsed') || '{}'); } catch { return {}; }
  });
  const toggleSection = (id) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('nav_collapsed', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const renderNavLink = (item) => {
    const Icon = item.icon;
    const active = isLinkActive(item);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={`group relative h-9 pl-3 pr-2.5 flex items-center justify-between rounded-lg text-[13px] transition-colors duration-150 ${
          active
            ? 'bg-brand-600 text-white font-medium shadow-sm shadow-black/20'
            : 'text-emerald-50/75 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-[17px] h-[17px] shrink-0 ${active ? 'text-white' : 'text-emerald-100/60 group-hover:text-white'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[11px] font-semibold rounded-full bg-rose-500 text-white">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  const initials = (employee?.full_name || 'U')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  return (
    <aside className="w-64 bg-shell-900 flex flex-col shrink-0 h-screen sticky top-0 select-none border-r border-white/5">
      {/* Brand */}
      <div className="h-16 px-5 flex items-center justify-between gap-2.5 border-b border-white/10">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <img src={logoMark} alt="" className="h-7 w-7 object-contain" />
          <span className="leading-none">
            <span className="block text-white font-bold tracking-[0.08em] text-[15px]">KLARVES</span>
            <span className="block text-[9.5px] text-emerald-100/60 mt-1">Employee Platform</span>
          </span>
        </NavLink>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-emerald-50/80">v3.2</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto sidebar-scroll">
        {sections.map((sec) => {
          const holdsActive = sec.links.some(isLinkActive);
          const open = holdsActive || !collapsed[sec.id];
          return (
            <div key={sec.id}>
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className="w-full px-3 mb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-emerald-100/50 uppercase flex items-center justify-between hover:text-white transition-colors cursor-pointer"
              >
                <span>{sec.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
              </button>
              {open && <nav className="space-y-0.5">{sec.links.map(renderNavLink)}</nav>}
            </div>
          );
        })}
      </div>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className="p-2.5 rounded-xl bg-white/[0.06] flex items-center justify-between gap-2">
          <NavLink to="/profile" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-brand-600 ring-2 ring-white/10 flex items-center justify-center text-white font-semibold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white truncate">
                {employee?.full_name || 'Signed in'}
              </p>
              <p className="text-[11px] text-emerald-100/60 truncate">
                {employee?.role_label || employee?.employee_code || ''}
              </p>
            </div>
          </NavLink>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 text-emerald-100/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
