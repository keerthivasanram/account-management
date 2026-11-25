// Single source of truth for authenticated navigation.
// Both layouts (Operations sidebar, Team top nav) read from here, so a destination
// added once is reachable everywhere its permission allows. UI checks are cosmetic:
// every route is re-checked by RequirePermission and every API call by the backend.
import {
  LayoutDashboard,
  Instagram,
  UserPlus,
  Share2,
  Clock,
  Users,
  Layers,
  Briefcase,
  CheckCircle,
  History,
  Shield,
  MessageSquare,
  CheckSquare,
  FolderLock,
  Building2,
  UsersRound,
  Inbox,
  Crown,
  Settings2,
  Activity,
  CalendarDays,
} from 'lucide-react';

export const PERM = {
  ADMIN_PORTAL: 'admin:portal',
  MANAGER_PORTAL: 'manager:portal',
  HR_PORTAL: 'hr:portal',
  SETTINGS_MANAGE: 'settings:manage',
};

/**
 * Which dashboard shell a user gets.
 *  - 'operations': admins, super admins and HR (A · Operations, dark sidebar)
 *  - 'team':       managers and employees (B · Team workspace, top navigation)
 *  - 'error':      permissions could not be read; never guess, show a recoverable error
 */
export const layoutVariantFor = (employee) => {
  if (!employee || !Array.isArray(employee.permissions)) return 'error';
  const p = employee.permissions;
  return p.includes(PERM.ADMIN_PORTAL) || p.includes(PERM.HR_PORTAL) ? 'operations' : 'team';
};

const SECTIONS = [
  {
    id: 'main',
    label: 'Main',
    links: [
      { to: '/dashboard', label: 'Overview', teamLabel: 'Dashboard', icon: LayoutDashboard },
      { to: '/accounts', label: 'Instagram Accounts', teamLabel: 'My accounts', icon: Instagram },
      // Employees reach Add / Import from the My accounts page, so the team bar hides it.
      { to: '/accounts/new', label: 'Add account', icon: UserPlus, teamHidden: true },
      { to: '/social/posts', label: 'Publishing', icon: Share2 },
    ],
  },
  {
    id: 'team',
    label: 'My Team',
    perm: PERM.MANAGER_PORTAL,
    links: [
      { to: '/manager', label: 'My Team', icon: UsersRound },
      { to: '/manager?tab=approvals', label: 'Approvals Inbox', icon: Inbox },
      { to: '/attendance/register', label: 'Team attendance', icon: CalendarDays },
    ],
  },
  {
    id: 'people',
    label: 'People',
    perm: PERM.HR_PORTAL,
    links: [
      { to: '/hr', label: 'HR Overview', icon: Activity },
      { to: '/hr/teams', label: 'Teams', icon: UsersRound },
      { to: '/attendance/register', label: 'Attendance register', icon: CalendarDays },
      { to: '/admin/employees', label: 'Employees', icon: Users },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    perm: PERM.ADMIN_PORTAL,
    links: [
      { to: '/admin/accounts', label: 'Assignments', icon: Layers },
      { to: '/admin/clients', label: 'Clients & Campaigns', icon: Briefcase },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    perm: PERM.ADMIN_PORTAL,
    links: [
      { to: '/admin', label: 'Admin Overview', icon: LayoutDashboard },
      { to: '/admin/accounts?filter=pending', label: 'Approvals', icon: CheckCircle },
      { to: '/admin/audit-logs', label: 'Activity Logs', icon: History },
      { to: '/admin/security', label: 'Security & Settings', icon: Shield, badgeKey: 'incidents' },
    ],
  },
  {
    id: 'super',
    label: 'Super Admin',
    perm: PERM.SETTINGS_MANAGE,
    links: [
      { to: '/super-admin', label: 'Control Center', icon: Crown },
      { to: '/super-admin?tab=admins', label: 'Admins & Roles', icon: Users },
      { to: '/super-admin?tab=settings', label: 'Company Policy', icon: Settings2 },
      { to: '/super-admin?tab=health', label: 'System Health', icon: Activity },
      { to: '/super-admin?tab=audit', label: 'Audit Search', icon: History },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    links: [
      { to: '/tasks', label: 'Tasks', icon: CheckSquare },
      { to: '/chat', label: 'Team messages', icon: MessageSquare },
      { to: '/documents', label: 'Documents', icon: FolderLock },
      { to: '/attendance', label: 'Attendance', icon: Clock },
      { to: '/departments', label: 'Departments', icon: Building2 },
    ],
  },
];

/** Sidebar sections the user may see, with optional badge counts filled in. */
export const navSectionsFor = (permissions = [], badges = {}) => {
  const seen = new Set();
  return SECTIONS.filter((s) => !s.perm || permissions.includes(s.perm)).map((s) => ({
    ...s,
    links: s.links
      .filter((l) => (seen.has(l.to) ? false : (seen.add(l.to), true)))
      .map((l) => ({ ...l, badge: l.badgeKey ? badges[l.badgeKey] || 0 : 0 })),
  })).filter((s) => s.links.length);
};

// Team workspace: the few daily destinations stay in the bar, the rest go under "More".
const TEAM_PRIMARY = ['/dashboard', '/accounts', '/social/posts', '/chat', '/manager'];

/** Top-nav links for the Team workspace: { primary, more }. Nothing permitted is dropped
 *  (teamHidden links are reached from inside their parent page). */
export const teamNavFor = (permissions = []) => {
  const all = navSectionsFor(permissions).flatMap((s) => s.links).filter((l) => !l.teamHidden)
    .map((l) => ({ ...l, label: l.teamLabel || l.label }));
  const primary = TEAM_PRIMARY.map((to) => all.find((l) => l.to === to)).filter(Boolean);
  const more = all.filter((l) => !TEAM_PRIMARY.includes(l.to));
  return { primary, more };
};

/** Active-state rule shared by both navs (query-string links match exactly). */
export const isNavLinkActive = (to, location) =>
  to.includes('?')
    ? location.pathname + location.search === to
    : location.pathname === to && !location.search.includes('tab=') && !location.search.includes('filter=');
