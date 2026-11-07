import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Bell,
  Check,
  ShieldAlert,
  X,
  Search,
  ExternalLink,
  LogOut,
  User,
  Shield,
  ChevronDown
} from 'lucide-react';

export const AppHeader = ({ title = 'Overview' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { employee, logout, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeSecurityToast, setActiveSecurityToast] = useState(null);
  const [dismissedToastIds, setDismissedToastIds] = useState(new Set());

  const fetchNotifications = async () => {
    if (!employee) return;
    try {
      const res = await api.notifications.list({ unread_only: false });
      const notifs = res.data;
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);

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

  useEffect(() => {
    fetchNotifications();
    const intervalTime = isAdmin ? 4000 : 15000;
    const interval = setInterval(fetchNotifications, intervalTime);
    return () => clearInterval(interval);
  }, [employee, isAdmin, dismissedToastIds]);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setActiveSecurityToast(null);
    } catch (_) {}
  };

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
  const breadcrumbSection = pathParts[0] === 'admin' ? 'Administration' : 'Main';

  return (
    <>
      {/* Enterprise Security Breach Toast for Administrators */}
      {isAdmin && activeSecurityToast && (
        <aside
          aria-label="Security Alert Toast"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-xl animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-4 shadow-lg flex items-center justify-between gap-4 text-[#172B24]">
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
                className="p-1 text-[#64748B] hover:text-[#172B24] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main AppHeader (Height 64px, White, Clean Borders) */}
      <header className="h-16 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
        {/* Left: Breadcrumbs & Page Context */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>{breadcrumbSection}</span>
            <span>/</span>
          </div>
          <h2 className="text-sm font-semibold text-[#172B24] truncate">
            {title}
          </h2>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative hidden md:block w-52">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search platform..."
              className="w-full h-8 pl-8 pr-2.5 text-xs text-[#172B24] placeholder-[#94A3B8] bg-[#F8FAFC] border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  navigate(`/accounts?search=${encodeURIComponent(e.target.value)}`);
                }
              }}
            />
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2 text-[#64748B] hover:text-[#172B24] hover:bg-[#F8FAFC] rounded-md transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#166534]" />
              )}
            </button>

            {showNotifs && (
              <div
                className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-lg shadow-dropdown z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
                  <span className="text-xs font-semibold text-[#172B24]">
                    Notifications ({unreadCount} new)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-medium text-[#166534] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7EB]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#64748B]">
                      No notifications to display
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 text-xs flex items-start justify-between gap-2 transition-colors ${
                          notif.is_read ? 'bg-white' : 'bg-[#F0FDF4]/30'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-[#172B24] truncate">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-[#64748B] line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-[#94A3B8] font-mono">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <button
                            onClick={(e) => handleMarkOneRead(notif.id, e)}
                            className="text-[#94A3B8] hover:text-[#166534] p-1 shrink-0"
                            title="Mark read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-[#E5E7EB]" />

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-[#F8FAFC] rounded-md transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-xs font-semibold text-[#166534]">
                {employee?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-[#172B24] leading-none">
                  {employee?.full_name || 'User'}
                </p>
                <p className="text-[10px] text-[#64748B] font-mono mt-0.5">
                  {employee?.role || 'Staff'}
                </p>
              </div>
              <ChevronDown className="w-3 h-3 text-[#94A3B8] hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-dropdown z-50 py-1 text-xs text-[#172B24] animate-in fade-in zoom-in-95 duration-100"
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
