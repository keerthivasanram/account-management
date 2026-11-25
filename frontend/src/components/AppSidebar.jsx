import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import logoMark from '../logo-mark.png';
import { ChevronDown, LogOut, X } from 'lucide-react';
import { navSectionsFor, isNavLinkActive } from '../layouts/navConfig';

/**
 * A · Operations sidebar. Rendered fixed on large screens and inside a drawer on
 * small ones (AppLayout passes onClose for the drawer).
 */
export const AppSidebar = ({ onClose, className = '' }) => {
  const { employee, isAdmin, permissions, logout } = useAuth();
  const location = useLocation();
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const fetchIncidents = async () => {
      try {
        const res = await api.security.getSummary();
        setOpenIncidentsCount(res.data.open_incidents || 0);
      } catch (_) { /* badge is optional */ }
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 8000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const sections = navSectionsFor(permissions, { incidents: openIncidentsCount });
  const isLinkActive = (item) => isNavLinkActive(item.to, location);

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
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        className={`group relative h-9 pl-3 pr-2.5 flex items-center justify-between rounded-lg text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent ${
          active
            ? 'bg-brand-700 text-white font-medium ring-1 ring-inset ring-brand-600 shadow-sm shadow-black/30'
            : 'text-shell-text/80 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon aria-hidden="true" className={`w-[17px] h-[17px] shrink-0 ${active ? 'text-white' : 'text-shell-muted group-hover:text-white'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[11px] font-semibold rounded-full bg-rose-500 text-white">
            {item.badge}<span className="sr-only"> open incidents</span>
          </span>
        )}
      </NavLink>
    );
  };

  const initials = (employee?.full_name || 'U')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  return (
    <aside
      aria-label="Main navigation"
      className={`w-64 bg-shell-900 flex flex-col shrink-0 select-none border-r border-white/5 ${className}`}
    >
      {/* Brand */}
      <div className="h-16 px-5 flex items-center justify-between gap-2.5 border-b border-white/10">
        <NavLink to="/dashboard" onClick={onClose} className="flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent">
          <img src={logoMark} alt="" className="h-7 w-7 object-contain" />
          <span className="leading-none">
            <span className="block text-white font-bold tracking-[0.08em] text-[15px]">KLARVES</span>
            <span className="block text-[9.5px] text-shell-muted mt-1">Employee Platform</span>
          </span>
        </NavLink>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="p-2 -mr-2 text-shell-muted hover:text-white hover:bg-white/10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-shell-600 text-shell-text/80">v3.2</span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto sidebar-scroll">
        {sections.map((sec) => {
          const holdsActive = sec.links.some(isLinkActive);
          const open = holdsActive || !collapsed[sec.id];
          const listId = `nav-section-${sec.id}`;
          return (
            <div key={sec.id}>
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                aria-expanded={open}
                aria-controls={listId}
                className="w-full px-3 mb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-shell-muted uppercase flex items-center justify-between hover:text-white transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent"
              >
                <span>{sec.label}</span>
                <ChevronDown aria-hidden="true" className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
              </button>
              {open && <nav id={listId} aria-label={sec.label} className="space-y-0.5">{sec.links.map(renderNavLink)}</nav>}
            </div>
          );
        })}
      </div>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className="p-2.5 rounded-xl bg-white/[0.06] flex items-center justify-between gap-2">
          <NavLink to="/profile" onClick={onClose} className="flex items-center gap-2.5 min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent">
            <div className="w-9 h-9 rounded-full bg-brand-700 ring-2 ring-white/10 flex items-center justify-center text-white font-semibold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white truncate">{employee?.full_name || 'Signed in'}</p>
              <p className="text-[11px] text-shell-muted truncate">{employee?.role_label || employee?.employee_code || ''}</p>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="p-2 text-shell-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
