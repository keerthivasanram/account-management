import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarPlus, ChevronRight, LogIn, LogOut, MessageSquareWarning } from 'lucide-react';
import { api } from '../../services/api';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { Panel, PanelError } from './OverviewPanels';
import { dueState, isoDay, myTaskSummary, statusLabel } from '../Tasks/tasksModel';
import { leaveSummary, shiftView } from './dashboardModel';

const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} aria-hidden="true" />;

const linkClass = 'text-xs font-medium text-brand-700 hover:underline shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

// ---------------------------------------------------------------- Today (shift)

export const TodayPanel = ({ resource, className = '' }) => {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const act = async (fn) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      resource.reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || 'That didn’t go through. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (resource.error) {
    return <Panel title="Today" className={className}><PanelError message={resource.error} onRetry={resource.reload} /></Panel>;
  }
  const view = resource.data ? shiftView(resource.data) : null;

  return (
    <Panel title="Today" subtitle="Your shift" className={className} action={<Link to="/attendance" className={linkClass}>Attendance</Link>}>
      {!view ? (
        <div aria-busy="true"><Skeleton className="h-7 w-32 mt-2" /><Skeleton className="h-9 w-full mt-4" /></div>
      ) : (
        <>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${view.tone === 'on' ? 'bg-brand-600' : 'bg-slate-300'}`} aria-hidden="true" />
            <p className="text-lg font-semibold text-slate-900">{view.headline}</p>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{view.detail}</p>

          {actionError && <p role="alert" className="mt-3 text-xs text-rose-700">{actionError}</p>}

          <div className="mt-4">
            {view.action === 'check-in' && (
              <PrimaryButton size="sm" icon={LogIn} loading={busy} onClick={() => act(api.attendance.checkIn)} className="w-full justify-center">
                Clock in
              </PrimaryButton>
            )}
            {view.action === 'check-out' && (
              <SecondaryButton size="sm" icon={LogOut} disabled={busy} onClick={() => act(api.attendance.checkOut)} className="w-full justify-center">
                Clock out
              </SecondaryButton>
            )}
          </div>
        </>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- My tasks

const MAX_TASKS = 5;

const TaskRow = ({ task, today }) => {
  const due = task.status === 'IN_REVIEW' ? 'none' : dueState(task, today);
  let note = null;
  if (task.status === 'CHANGES_REQUESTED') {
    note = <span className="inline-flex items-center gap-1 text-amber-800"><MessageSquareWarning className="w-3.5 h-3.5" aria-hidden="true" />Changes requested</span>;
  } else if (due === 'overdue') note = <span className="text-rose-700 font-medium">Overdue</span>;
  else if (due === 'today') note = <span className="text-amber-800 font-medium">Due today</span>;
  else if (task.due_date) note = <span className="text-slate-500">Due {new Date(`${String(task.due_date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>;

  return (
    <li>
      <Link
        to="/tasks"
        className="flex items-center justify-between gap-3 py-2.5 px-1 -mx-1 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-900 truncate">{task.title}</span>
          <span className="block text-xs mt-0.5">{note || <span className="text-slate-400">No due date</span>}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <StatusBadge status={task.status} text={statusLabel(task.status)} />
          <ChevronRight className="w-4 h-4 text-slate-300" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
};

export const MyTasksPanel = ({ resource, className = '' }) => {
  const today = isoDay();
  if (resource.error) {
    return <Panel title="My tasks" className={className}><PanelError message={resource.error} onRetry={resource.reload} /></Panel>;
  }
  const s = resource.data ? myTaskSummary(resource.data, today) : null;
  const counts = s && [
    ['Open', s.open, 'text-slate-900'],
    ['Due today', s.dueToday, s.dueToday ? 'text-amber-800' : 'text-slate-900'],
    ['Overdue', s.overdue, s.overdue ? 'text-rose-700' : 'text-slate-900'],
    ['Changes', s.changes, s.changes ? 'text-amber-800' : 'text-slate-900'],
  ];

  return (
    <Panel
      title="My tasks"
      subtitle="What needs your attention first"
      className={className}
      action={<Link to="/tasks" className={linkClass}>All tasks{s?.open ? ` (${s.open})` : ''}</Link>}
    >
      {!s ? (
        <div aria-busy="true" className="space-y-3 mt-2"><Skeleton className="h-12" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
      ) : s.open === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium text-slate-900">You’re all caught up</p>
          <p className="text-xs text-slate-500 mt-1">No open tasks. New assignments will show up here and in your notifications.</p>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-4 gap-2 mt-1">
            {counts.map(([k, v, cls]) => (
              <div key={k} className="rounded-lg bg-slate-50 ring-1 ring-slate-100 py-2 text-center">
                <dt className="text-[11px] text-slate-500">{k}</dt>
                <dd className={`text-lg font-semibold tabular-nums ${cls}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-3 divide-y divide-slate-100">
            {s.ordered.slice(0, MAX_TASKS).map((t) => <TaskRow key={t.id} task={t} today={today} />)}
          </ul>
        </>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- Leave

export const LeavePanel = ({ resource }) => {
  if (resource.error) {
    return <Panel title="Leave"><PanelError message={resource.error} onRetry={resource.reload} /></Panel>;
  }
  const s = resource.data ? leaveSummary(resource.data) : null;
  return (
    <Panel
      title="Leave"
      subtitle={s ? `${s.year} balance` : 'Your balance'}
      action={<Link to="/attendance?tab=leaves" className={linkClass}>History</Link>}
    >
      {!s ? (
        <div aria-busy="true" className="space-y-2 mt-2"><Skeleton className="h-6" /><Skeleton className="h-6" /></div>
      ) : (
        <>
          <ul className="mt-1 space-y-2.5">
            {s.types.map((t) => (
              <li key={t.leave_type}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-slate-700">{t.label}</span>
                  <span className="tabular-nums text-slate-900">
                    <span className="font-semibold">{t.remaining}</span>
                    <span className="text-slate-400"> / {t.allowance} days</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${t.allowance ? (t.remaining / t.allowance) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {s.pending > 0 && (
            <p className="mt-3 text-xs text-amber-800">{s.pending} day{s.pending === 1 ? '' : 's'} waiting for approval</p>
          )}
          <Link
            to="/attendance?request=leave"
            className="mt-4 flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <CalendarPlus className="w-4 h-4" aria-hidden="true" /> Request leave
          </Link>
        </>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- Updates (notifications)

const MAX_UPDATES = 4;

const ago = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};

export const UpdatesPanel = ({ resource }) => {
  if (resource.error) {
    return <Panel title="Recent updates"><PanelError message={resource.error} onRetry={resource.reload} /></Panel>;
  }
  const items = resource.data ? resource.data.slice(0, MAX_UPDATES) : null;
  return (
    <Panel title="Recent updates" subtitle="Assignments, approvals and replies">
      {!items ? (
        <div aria-busy="true" className="space-y-2 mt-2"><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
      ) : items.length === 0 ? (
        <p className="py-4 text-sm text-slate-500 flex items-center gap-2"><Bell className="w-4 h-4 text-slate-300" aria-hidden="true" /> Nothing new.</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-100">
          {items.map((n) => {
            const body = (
              <>
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-brand-600'}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className={`block text-[13px] truncate ${n.is_read ? 'text-slate-700' : 'font-medium text-slate-900'}`}>
                    {n.title}{!n.is_read && <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">{n.message}</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">{ago(n.created_at)}</span>
                </span>
              </>
            );
            return (
              <li key={n.id}>
                {n.link_url && n.link_url.startsWith('/') ? (
                  <Link to={n.link_url} className="flex gap-2.5 py-2.5 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">{body}</Link>
                ) : (
                  <div className="flex gap-2.5 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};
