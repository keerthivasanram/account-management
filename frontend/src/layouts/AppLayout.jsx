import React, { useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import SecurityWatermark from '../components/SecurityWatermark';
import SecurityShield from '../components/SecurityShield';
import useDisclosure from '../hooks/useDisclosure';
import { useApplyTheme } from '../hooks/useTheme';
import { layoutVariantFor, teamNavFor, isNavLinkActive } from './navConfig';

const TITLES = [
  ['/dashboard', 'Overview'],
  ['/tasks', 'Tasks & Deliverables'],
  ['/projects', 'Projects'],
  ['/departments', 'Departments'],
  ['/accounts/new', 'Add account'],
  ['/accounts/import', 'Import accounts'],
  ['/accounts', 'Instagram Accounts'],
  ['/social/posts', 'Publishing & Scheduled Content'],
  ['/chat', 'Team messages'],
  ['/mail', 'Mail'],
  ['/help', 'Help & support'],
  ['/documents', 'Company Vault & Documents'],
  ['/attendance', 'Attendance & Shifts'],
  ['/admin/security', 'Security & Settings'],
  ['/admin/accounts', 'Account Assignments'],
  ['/admin/employees', 'Employee Management'],
  ['/admin/clients', 'Clients & Campaigns'],
  ['/admin/audit-logs', 'Activity Logs'],
  ['/admin', 'Administrator Overview'],
  ['/manager', 'My Team'],
  ['/super-admin', 'Super Admin Control Center'],
  ['/profile', 'My Profile'],
];

/** Shown when /employees/me fails: no navigation is rendered until permissions are known. */
const ProfileErrorScreen = ({ message, onRetry, onSignOut }) => (
  <div className="min-h-screen bg-[#F5F6F9] flex items-center justify-center p-4">
    <div role="alert" className="w-full max-w-md bg-white border border-[#E6EAF0] rounded-2xl shadow-soft p-7 text-center">
      <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 ring-1 ring-amber-100 text-amber-700 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">We couldn&apos;t load your access</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Your role and permissions didn&apos;t load, so the workspace is paused to avoid showing the wrong screens.
      </p>
      {message && <p className="mt-3 text-xs text-slate-400 break-words">{message}</p>}
      <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-200"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-100"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  </div>
);

export const AppLayout = () => {
  const { employee, loading, profileError, retryProfile, logout, permissions } = useAuth();
  const location = useLocation();
  const nav = useDisclosure();
  useApplyTheme(); // dark mode applies inside the signed-in app only

  // Close the drawer / menu whenever the route changes
  useEffect(() => { nav.close(); }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F9] flex items-center justify-center">
        <LoadingSpinner text="Authenticating session..." size="lg" />
      </div>
    );
  }

  if (profileError) {
    return <ProfileErrorScreen message={profileError} onRetry={retryProfile} onSignOut={logout} />;
  }

  if (!employee) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const variant = layoutVariantFor(employee);
  if (variant === 'error') {
    return <ProfileErrorScreen message="Permissions were missing from your profile." onRetry={retryProfile} onSignOut={logout} />;
  }

  const title = (TITLES.find(([prefix]) => location.pathname.startsWith(prefix)) || [null, 'Overview'])[1];

  const page = (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-7 min-w-0">
      <div className="max-w-[1400px] mx-auto">
        <Outlet />
      </div>
    </main>
  );

  if (variant === 'operations') {
    return (
      <SecurityShield>
        <div className="flex min-h-screen bg-[#F5F6F9] text-slate-900 relative">
          <SecurityWatermark />
          {/* Desktop sidebar */}
          <Sidebar className="hidden lg:flex h-screen sticky top-0" />

          {/* Mobile drawer */}
          {nav.open && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-slate-900/50" aria-hidden="true" onClick={nav.close} />
              <div
                id="app-nav-drawer"
                ref={nav.panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation"
                className="absolute inset-y-0 left-0 flex max-w-[85vw]"
              >
                <Sidebar onClose={nav.close} className="flex h-full shadow-2xl" />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 relative z-10">
            <Navbar
              title={title}
              variant="operations"
              menuOpen={nav.open}
              onMenuClick={nav.toggle}
              menuTriggerRef={nav.triggerRef}
              menuControls="app-nav-drawer"
            />
            {page}
          </div>
        </div>
      </SecurityShield>
    );
  }

  // B · Team workspace
  const { primary, more } = teamNavFor(permissions);
  return (
    <SecurityShield>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-[#F4F7F5] text-slate-900 relative">
        <SecurityWatermark />
        <div className="relative z-10 flex flex-col flex-1">
          <Navbar
            title={title}
            variant="team"
            menuOpen={nav.open}
            onMenuClick={nav.toggle}
            menuTriggerRef={nav.triggerRef}
            menuControls="team-nav-panel"
          />

          {/* Mobile / tablet menu: every permitted destination */}
          {nav.open && (
            <nav
              id="team-nav-panel"
              ref={nav.panelRef}
              aria-label="Workspace"
              className="lg:hidden sticky top-16 z-20 bg-white border-b border-[#E6EAF0] shadow-soft px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-1"
            >
              {[...primary, ...more].map((l) => {
                const Icon = l.icon;
                const active = isNavLinkActive(l.to, location);
                return (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    aria-current={active ? 'page' : undefined}
                    className={`h-11 px-3 flex items-center gap-3 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon aria-hidden="true" className={`w-[18px] h-[18px] ${active ? 'text-brand-700' : 'text-slate-400'}`} />
                    {l.label}
                  </NavLink>
                );
              })}
            </nav>
          )}

          {page}
        </div>
      </div>
    </SecurityShield>
  );
};

export default AppLayout;
