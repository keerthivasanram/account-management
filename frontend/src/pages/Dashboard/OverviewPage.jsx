import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Instagram, CheckCircle2, Clock, XCircle, UserPlus, RefreshCw, Inbox, CalendarDays,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import useResource from '../../hooks/useResource';
import { layoutVariantFor } from '../../layouts/navConfig';
import { overviewKindFor } from './dashboardModel';
import { AccountsPanel, ConnectionPanel, Panel, PanelError, StatsRow, WorkloadPanel } from './OverviewPanels';
import { LeavePanel, MyTasksPanel, TodayPanel, UpdatesPanel } from './WorkdayPanels';

const RECENT_LIMIT = 6;

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

/**
 * Headline numbers. The same four items serve both dashboards; the backend decides scope
 * (/employees/me/stats is company-wide for admins and personal for everyone else).
 * Pills are omitted for an empty dataset so it never shows "all clear" and a warning at once.
 */
const statItems = (firstLabel) => [
  {
    label: firstLabel,
    icon: Instagram,
    value: (s) => s.total,
    pill: (s) => (s.total && s.pending_approval ? { text: `${s.pending_approval} awaiting approval`, tone: 'warning' } : null),
  },
  {
    label: 'Connected',
    icon: CheckCircle2,
    value: (s) => s.connected,
    pill: (s) => (s.total ? { text: `${pct(s.connected, s.total)}% connected`, tone: pct(s.connected, s.total) >= 80 ? 'good' : 'neutral' } : null),
  },
  {
    label: 'Pending connection',
    icon: Clock,
    value: (s) => s.pending_connection,
    pill: (s) => (s.total ? (s.pending_connection ? { text: 'Needs Meta login', tone: 'warning' } : { text: 'None pending', tone: 'neutral' }) : null),
  },
  {
    label: 'Rejected',
    icon: XCircle,
    value: (s) => s.rejected,
    pill: (s) => (s.total ? (s.rejected ? { text: 'Review needed', tone: 'critical' } : { text: 'None rejected', tone: 'good' }) : null),
  },
];

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const DatePill = () => (
  <span className="hidden sm:inline-flex items-center h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-600">
    <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-slate-400" aria-hidden="true" />
    {todayLabel()}
  </span>
);

const useCommonResources = () => {
  const stats = useResource(() => api.employees.getMyDashboardStats().then((r) => r.data));
  const accounts = useResource(() => api.employees.getMyAccounts({ limit: RECENT_LIMIT }).then((r) => r.data || []));
  const profile = useResource(() => api.employees.getMyProfile().then((r) => r.data));
  return { stats, accounts, profile };
};

// ============================================================== A · Operations

const OperationsOverview = () => {
  const navigate = useNavigate();
  const { stats, accounts, profile } = useCommonResources();
  const capacity = useResource(() => api.admin.getPeopleMeta().then((r) => ({
    min: r.data?.account_target_min, max: r.data?.account_target_max,
  })));
  const reloadAll = () => [stats, accounts, profile, capacity].forEach((r) => r.reload());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Company-wide Instagram accounts, connection health and recent registrations."
        actions={
          <div className="flex items-center gap-2.5">
            <DatePill />
            <SecondaryButton size="sm" onClick={reloadAll} icon={RefreshCw} aria-label="Refresh overview" title="Refresh" />
            <PrimaryButton size="sm" onClick={() => navigate('/register')} icon={UserPlus}>Register account</PrimaryButton>
          </div>
        }
      />

      <StatsRow resource={stats} items={statItems('Total accounts')} label="Company account totals" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <AccountsPanel
          className="lg:col-span-2 min-w-0"
          resource={accounts}
          total={stats.data?.total}
          title="Recent account registrations"
          subtitle="Latest Instagram accounts across the company"
          emptyTitle="No Instagram accounts registered"
          emptyText="Nobody has registered an Instagram account yet. Register the first one to start connecting and assigning accounts."
          emptyAction={<PrimaryButton size="sm" onClick={() => navigate('/register')} icon={UserPlus}>Register account</PrimaryButton>}
        />
        <div className="space-y-6 lg:col-start-3 lg:row-start-1">
          <ConnectionPanel resource={stats} subtitle="All company accounts" />
          <WorkloadPanel profile={profile} capacity={capacity} />
        </div>
      </div>
    </div>
  );
};

// ============================================================== B · Team workspace

const TeamPanel = ({ team }) => {
  if (team.error) {
    return <Panel title="Your team"><PanelError message={team.error} onRetry={team.reload} /></Panel>;
  }
  const t = team.data;
  const waiting = t ? (t.pending_task_reviews || 0) + (t.pending_leave_requests || 0) : 0;
  return (
    <Panel
      title="Your team"
      subtitle="People who report to you"
      action={<Link to="/manager" className="text-xs font-medium text-brand-700 hover:underline shrink-0">Open My Team</Link>}
    >
      {!t ? (
        <div className="animate-pulse h-14 rounded-md bg-slate-100 mt-1" aria-busy="true" />
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3 mt-1 text-center">
            {[
              ['Team size', t.team_size],
              ['In today', t.present_today],
              ['On leave', t.on_leave_today],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 ring-1 ring-slate-100 py-2.5">
                <dt className="text-[11px] text-slate-500">{k}</dt>
                <dd className="text-lg font-semibold text-slate-900 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/manager?tab=approvals"
            className="mt-3 flex items-center justify-between h-10 px-3 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span className="flex items-center gap-2 text-slate-700"><Inbox className="w-4 h-4 text-slate-400" aria-hidden="true" /> Waiting on you</span>
            <span className={`font-semibold tabular-nums ${waiting ? 'text-amber-800' : 'text-slate-500'}`}>
              {waiting ? `${waiting} to review` : 'Nothing waiting'}
            </span>
          </Link>
        </>
      )}
    </Panel>
  );
};

const TeamOverview = ({ isManager }) => {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { stats, accounts, profile } = useCommonResources();
  // Managers may read their own team snapshot (which also carries the company account target).
  const team = useResource(() => api.manager.getOverview().then((r) => r.data), [], { enabled: isManager });
  const capacity = isManager
    ? { ...team, data: team.data ? { min: team.data.account_target_min, max: team.data.account_target_max } : null }
    : null;

  // The workday: all personal endpoints (the server scopes them to the caller).
  const shift = useResource(() => api.attendance.getSummary().then((r) => r.data));
  const myTasks = useResource(() => api.tasks.list({ my_tasks_only: true }).then((r) => r.data || []));
  const leave = useResource(() => api.attendance.getLeaveBalance().then((r) => r.data));
  const updates = useResource(() => api.notifications.list().then((r) => r.data || []));

  const first = (employee?.full_name || '').split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={first ? `${first}'s workspace` : 'My workspace'}
        description={isManager
          ? 'Your day, your team and what is waiting on you.'
          : 'Your shift, your tasks, your leave and your Instagram accounts.'}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DatePill />
            <SecondaryButton size="sm" onClick={() => navigate('/register')} icon={UserPlus}>Register account</SecondaryButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <MyTasksPanel resource={myTasks} className="lg:col-span-2 min-w-0" />
        {/* On phones the shift panel comes first: clocking in is the first thing in the day */}
        <div className="contents lg:block lg:space-y-6">
          <TodayPanel resource={shift} className="order-first lg:order-none" />
          <LeavePanel resource={leave} />
        </div>
      </div>

      <StatsRow resource={stats} items={statItems('My accounts')} label="Your account totals" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <AccountsPanel
          className="lg:col-span-2 min-w-0"
          resource={accounts}
          total={stats.data?.total}
          title="Your accounts"
          subtitle="Instagram accounts you registered or are assigned to"
          emptyTitle="No accounts assigned to you yet."
          emptyText="When an admin assigns you an Instagram account it will appear here. If you manage an account that isn't in Klarves yet, you can register it."
          emptyAction={<SecondaryButton size="sm" onClick={() => navigate('/register')} icon={UserPlus}>Register an account</SecondaryButton>}
        />
        <div className="space-y-6 lg:col-start-3 lg:row-start-1">
          {isManager && <TeamPanel team={team} />}
          <UpdatesPanel resource={updates} />
          <WorkloadPanel profile={profile} capacity={capacity} />
          <ConnectionPanel resource={stats} subtitle="Your accounts only" />
        </div>
      </div>
    </div>
  );
};

// ============================================================== entry

export const OverviewPage = () => {
  const { employee, isManager } = useAuth();
  const kind = overviewKindFor(layoutVariantFor(employee));
  return kind === 'operations' ? <OperationsOverview /> : <TeamOverview isManager={isManager} />;
};

export default OverviewPage;

