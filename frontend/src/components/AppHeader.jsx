import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import logoMark from '../logo-mark.png';
import { teamNavFor, isNavLinkActive } from '../layouts/navConfig';
import useDisclosure from '../hooks/useDisclosure';
import ThemeSwitcher from './ThemeSwitcher';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Check,
  HelpCircle,
  Mail as MailIcon,
  ShieldAlert,
  X,
  Search,
  ExternalLink,
  LogOut,
  User,
  Shield,
  ChevronDown,
  Menu
} from 'lucide-react';

/**
 * variant 'operations': breadcrumb bar beside the sidebar (menu button opens the drawer below lg).
 * variant 'team': light top navigation for the Team workspace (menu button opens the link panel below lg).
 * The menu button's state lives in AppLayout so the drawer/panel and focus return share one disclosure.
 */
export const AppHeader = ({ title = 'Overview', variant = 'operations', menuOpen = false, onMenuClick, menuTriggerRef, menuControls }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { employee, logout, isAdmin, permissions } = useAuth();
  const more = useDisclosure();
  const team = variant === 'team';
  const teamNav = team ? teamNavFor(permissions) : { primary: [], more: [] };
  const moreActive = teamNav.more.some((l) => isNavLinkActive(l.to, location));

  // Close the "More" menu after navigating
  useEffect(() => { more.close(); }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps
  const [notifications, setNotifications] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeSecurityToast, setActiveSecurityToast] = useState(null);
  const [dismissedToastIds, setDismissedToastIds] = useState(new Set());

  const fetchNotifications = async () => {
    if (!employee) return;
    try {
      const count = await api.mail.unreadCount();
      setUnreadCount(count.data?.unread || 0);
      if (!isAdmin) return;
      const res = await api.notifications.list({ unread_only: false });
      const notifs = res.data;
      setNotifications(notifs);

      if (isAdmin) {
        const latestBreach = notifs.find(
          (n) => !n.is_read && n.type === 'SECURITY_ALERT' && !dismissedToastIds.has(n.id)
        );
        if (latestBreach) {
          setActiveSecurityToast(latestBreach);
        }
      }
    } catch (_) {}
  };

  // Mail page announces reads/archives so the badge updates straight away
  useEffect(() => {
    const onMail = () => fetchNotifications();
    window.addEventListener('klarves-mail-changed', onMail);
    return () => window.removeEventListener('klarves-mail-changed', onMail);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchNotifications();
    const intervalTime = isAdmin ? 4000 : 15000;
    const interval = setInterval(fetchNotifications, intervalTime);
    return () => clearInterval(interval);
  }, [employee, isAdmin, dismissedToastIds]);

  const handleMarkOneRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (activeSecurityToast?.id === id) {
        setActiveSecurityToast(null);
      }
    } catch (_) {}
  };

  const handleDismissToast = (id) => {
    setDismissedToastIds((prev) => new Set([...prev, id]));
    setActiveSecurityToast(null);
  };

  // Derive simple breadcrumb
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbSection = { admin: 'Administration', manager: 'My Team', 'super-admin': 'Super Admin', profile: 'Account' }[pathParts[0]] || 'Main';

  return (
    <>
      {/* Enterprise Security Breach Toast for Administrators */}
      {isAdmin && activeSecurityToast && (
        <aside
          aria-label="Security Alert Toast"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-xl animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-4 shadow-lg flex items-center justify-between gap-4 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#FEE2E2] flex items-center justify-center text-[#DC2626] shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#DC2626] bg-[#FECACA]/60 px-1.5 py-0.2 rounded">
                    Security Incident
                  </span>
                  <span className="text-[11px] text-[#64748B] font-mono">
                    {new Date(activeSecurityToast.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#991B1B] truncate">
                  {activeSecurityToast.title}
                </p>
                <p className="text-xs text-[#64748B] line-clamp-1">
                  {activeSecurityToast.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  handleMarkOneRead(activeSecurityToast.id);
                  navigate('/admin/security');
                }}
                className="px-2.5 py-1.5 rounded text-xs font-medium bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors"
              >
                Inspect
              </button>
              <button
                onClick={() => handleDismissToast(activeSecurityToast.id)}
                className="p-1 text-[#64748B] hover:text-slate-900 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main AppHeader (Height 64px, White, Clean Borders) */}
      <header className="h-16 bg-white/90 backdrop-blur-md border-b border-[#E6EAF0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
        {/* Left: menu button + page context (operations) or brand + links (team) */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={onMenuClick}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls={menuControls}
            className="lg:hidden -ml-1 w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {team ? (
            <>
              <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0 mr-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <img src={logoMark} alt="" className="h-7 w-7 object-contain" />
                <span className="leading-none">
                  <span className="block text-slate-900 font-bold tracking-[0.08em] text-[15px]">KLARVES</span>
                  <span className="hidden sm:block text-[9.5px] text-slate-500 mt-1">Employee Platform</span>
                </span>
              </NavLink>
              <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mr-3">v3.2</span>
              <nav aria-label="Workspace" className="hidden lg:flex items-center gap-1">
                {teamNav.primary.map((l) => {
                  const active = isNavLinkActive(l.to, location);
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      aria-current={active ? 'page' : undefined}
                      className={`h-9 px-3 inline-flex items-center rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {l.label}
                    </NavLink>
                  );
                })}
                {teamNav.more.length > 0 && (
                  <div className="relative">
                    <button
                      ref={more.triggerRef}
                      type="button"
                      onClick={more.toggle}
                      aria-expanded={more.open}
                      aria-controls="team-more-menu"
                      className={`h-9 px-3 inline-flex items-center gap-1 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        moreActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      More <ChevronDown aria-hidden="true" className={`w-3.5 h-3.5 transition-transform ${more.open ? 'rotate-180' : ''}`} />
                    </button>
                    {more.open && (
                      <div
                        id="team-more-menu"
                        ref={more.panelRef}
                        className="absolute left-0 mt-2 w-56 bg-white border border-[#E6EAF0] rounded-xl shadow-lift py-1.5 z-50"
                      >
                        {teamNav.more.map((l) => {
                          const Icon = l.icon;
                          const active = isNavLinkActive(l.to, location);
                          return (
                            <NavLink
                              key={l.to}
                              to={l.to}
                              aria-current={active ? 'page' : undefined}
                              className={`mx-1.5 px-2.5 h-9 flex items-center gap-2.5 rounded-lg text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <Icon aria-hidden="true" className="w-4 h-4 text-slate-400" />
                              {l.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-slate-400">
                <span>{breadcrumbSection}</span>
                <span className="text-slate-300">/</span>
              </div>
              <h2 className="text-[13px] font-semibold text-slate-900 truncate">
                {title}
              </h2>
            </>
          )}
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className={`relative w-72 ${team ? 'hidden' : 'hidden xl:block'}`}>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search accounts, handles…"
              className="w-full h-10 pl-10 pr-3 text-[13px] text-slate-900 placeholder-slate-400 bg-slate-100/80 border border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  navigate(`/accounts?search=${encodeURIComponent(e.target.value)}`);
                }
              }}
            />
          </div>

          {/* Mail (internal inbox) and Help & support */}
          <NavLink
            to="/mail"
            title="Mail"
            aria-label={unreadCount > 0 ? `Mail, ${unreadCount} unread` : 'Mail'}
            className={({ isActive }) => `relative h-10 px-2.5 flex items-center gap-2 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <MailIcon className="w-[18px] h-[18px]" aria-hidden="true" />
            <span className="hidden md:inline font-medium">Mail</span>
            {unreadCount > 0 && (
              <>
                {/* small screens: dot-badge on the icon; md+: count pill after the label */}
                <span aria-hidden="true" className="md:hidden absolute top-1 left-5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold leading-4 text-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
                <span aria-hidden="true" className="hidden md:inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-semibold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/help"
            title="Help & support"
            aria-label="Help and support"
            className={({ isActive }) => `h-10 px-2.5 flex items-center gap-2 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <HelpCircle className="w-[18px] h-[18px]" aria-hidden="true" />
            <span className="hidden md:inline font-medium">Help</span>
          </NavLink>

          <div className="h-6 w-px bg-slate-200" />

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="Account menu"
              aria-expanded={showProfileMenu}
              className="flex items-center gap-2.5 pl-1.5 pr-2 py-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-brand-50 ring-1 ring-brand-200 flex items-center justify-center text-xs font-semibold text-brand-700">
                {(employee?.full_name || 'U').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-medium text-slate-900 leading-none">
                  {employee?.full_name || 'User'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {employee?.role_label || employee?.role || 'Staff'}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-[#94A3B8] hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div
                className="absolute right-0 mt-2 w-60 bg-white border border-[#E6EAF0] rounded-xl shadow-soft shadow-dropdown z-50 py-1 text-xs text-slate-900 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-[#E5E7EB]">
                  <p className="font-semibold truncate">{employee?.full_name}</p>
                  <p className="text-[11px] text-[#64748B] font-mono truncate">{employee?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/dashboard');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Dashboard Overview</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>My Profile</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/admin/security');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Security Center</span>
                  </button>
                )}
                <div className="border-t border-[#E5E7EB] my-1" />
                <ThemeSwitcher className="px-3 py-2" />
                <div className="border-t border-[#E5E7EB] my-1" />
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default AppHeader;
