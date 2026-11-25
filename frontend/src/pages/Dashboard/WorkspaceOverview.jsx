import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CalendarCheck, CalendarClock, CalendarPlus, ChevronRight, Clock, FolderLock, ImagePlus,
  Layers, ListChecks, LogIn, LogOut, Mail, MessageSquare, Plus, Upload, User, UserPlus,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useResource from '../../hooks/useResource';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { Panel, PanelError } from './OverviewPanels';
import { shiftView } from './dashboardModel';
import { attentionItems, capacityLine, todaysWork, upcomingPosts, workspaceSummary } from './workspaceModel';
import { statusLabel } from '../Tasks/tasksModel';
import { STATUS_TEXT, formatSchedule, isVideo } from '../Social/publishingModel';

const linkClass = 'text-xs font-medium text-brand-700 hover:underline shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} aria-hidden="true" />;
const errOf = (...rs) => rs.find((r) => r.error);

// ---------------------------------------------------------------- summary row

const SummaryCard = ({ icon: Icon, label, value, to, tone = 'neutral', loading, note }) => {
  // In-page anchors (e.g. #needs-attention) use a plain link so the browser scrolls to them.
  const Tag = to.startsWith('#') ? 'a' : Link;
  const target = to.startsWith('#') ? { href: to } : { to };
  return (
  <Tag
    {...target}
    className="group bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-4 flex items-center gap-4 hover:border-brand-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
  >
    <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700'}`}>
      <Icon className="w-5 h-5" aria-hidden="true" />
    </span>
    <span className="min-w-0">
      <span className="block text-[13px] text-slate-500">{label}</span>
      {loading
        ? <Skeleton className="h-7 w-10 mt-1" />
        : <span className={`block text-2xl font-semibold tabular-nums ${tone === 'warn' ? 'text-amber-800' : 'text-slate-900'}`}>{value}</span>}
      {note && !loading && <span className="block text-[11px] text-rose-700">{note}</span>}
    </span>
    <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-500" aria-hidden="true" />
  </Tag>
  );
};

// ---------------------------------------------------------------- today's work

const DUE_TEXT = { overdue: ['Overdue', 'text-rose-700 font-medium'], today: ['Today', 'text-amber-800 font-medium'], review: ['In review', 'text-slate-500'] };

const TodaysWork = ({ tasks, className }) => {
  const navigate = useNavigate();
  if (tasks.error) return <Panel title="Today’s work" className={className}><PanelError message={tasks.error} onRetry={tasks.reload} /></Panel>;
  const rows = tasks.data ? todaysWork(tasks.data) : null;
  return (
    <Panel title="Today’s work" subtitle="Overdue and due-today tasks first" className={className} bodyClassName="p-0 pt-3"
      action={<Link to="/tasks" className={linkClass}>All tasks</Link>}>
      {!rows ? (
        <div className="px-5 pb-5 space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
      ) : rows.length === 0 ? (
        <p className="px-5 pb-6 pt-2 text-sm text-slate-500">You’re all caught up. New tasks will appear here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-y border-[#E6EAF0] text-left text-xs text-slate-500">
                <th className="px-5 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium hidden sm:table-cell">Project</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-5 py-2"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => {
                const [dueText, dueClass] = DUE_TEXT[t.due] || [t.due_date ? new Date(`${String(t.due_date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—', 'text-slate-600'];
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <span className="block font-medium text-slate-900">{t.title}</span>
                      <span className="block text-xs text-slate-500">{statusLabel(t.status)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 hidden sm:table-cell">{t.project_name || '—'}</td>
                    <td className={`px-3 py-2.5 whitespace-nowrap ${dueClass}`}>{dueText}</td>
                    <td className="px-5 py-2.5 text-right">
                      <SecondaryButton size="sm" onClick={() => navigate('/tasks')}>
                        {t.status === 'TODO' ? 'Start' : t.status === 'IN_REVIEW' ? 'View' : 'Continue task'}
                      </SecondaryButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- upcoming posts

const Thumb = ({ post }) => {
  const src = post.media_preview_url;
  const cls = 'w-24 h-20 sm:w-32 sm:h-24 rounded-lg object-cover bg-slate-100 shrink-0';
  if (!src) return <div className={`${cls} flex items-center justify-center text-slate-300`}><ImagePlus className="w-5 h-5" aria-hidden="true" /></div>;
  return isVideo(post) ? <video src={src} className={cls} muted playsInline preload="metadata" aria-label="Video" /> : <img src={src} alt="" className={cls} loading="lazy" />;
};

const UpcomingPosts = ({ posts, className }) => {
  const navigate = useNavigate();
  if (posts.error) return <Panel title="Upcoming posts" className={className}><PanelError message={posts.error} onRetry={posts.reload} /></Panel>;
  const list = posts.data ? upcomingPosts(posts.data).slice(0, 3) : null;
  return (
    <Panel title="Upcoming posts" subtitle="Scheduled and awaiting approval" className={className}
      action={<PrimaryButton size="sm" icon={Plus} onClick={() => navigate('/social/posts')}>Create post</PrimaryButton>}>
      {!list ? (
        <div className="space-y-3 mt-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : list.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">No posts coming up. Create one and send it for approval.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {list.map((p) => (
            <li key={p.id}>
              <Link to={`/social/posts?tab=${p.status === 'APPROVED' ? 'scheduled' : 'awaiting'}`}
                className="flex gap-4 py-3 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <Thumb post={p} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-brand-700 truncate">@{p.account_username}</span>
                    <StatusBadge status={p.status === 'APPROVED' ? 'SCHEDULED' : 'PENDING'} text={STATUS_TEXT[p.status]} />
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">{formatSchedule(p.scheduled_at)}</span>
                  <span className="block text-sm text-slate-700 mt-1 line-clamp-2">{p.caption}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- my accounts + needs attention

const MyAccounts = ({ assigned, target, attention, loading, error, onRetry }) => {
  const navigate = useNavigate();
  const cap = capacityLine(assigned, target);
  return (
    <Panel title="My accounts" action={<Link to="/accounts" className={linkClass}>View all</Link>}>
      {error ? <PanelError message={error} onRetry={onRetry} compact /> : loading ? <Skeleton className="h-10 mt-2" /> : (
        <>
          <div className="flex items-baseline justify-between mt-1 text-sm">
            <span className="text-slate-700">{cap.text}</span>
            {cap.percent !== null && <span className="text-slate-500 tabular-nums">{cap.percent}%</span>}
          </div>
          {cap.percent !== null && (
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={cap.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Accounts assigned of company maximum">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${cap.percent}%` }} />
            </div>
          )}
        </>
      )}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <PrimaryButton size="sm" icon={UserPlus} onClick={() => navigate('/accounts/new')} className="justify-center">Add account</PrimaryButton>
        <SecondaryButton size="sm" icon={Upload} onClick={() => navigate('/accounts/import')} className="justify-center">Import accounts</SecondaryButton>
      </div>

      <div id="needs-attention" className="mt-5 pt-4 border-t border-slate-100 scroll-mt-24">
        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" /> Needs attention
        </h3>
        {loading ? <Skeleton className="h-10 mt-2" /> : !attention.length ? (
          <p className="mt-1.5 text-sm text-slate-500">
            {assigned === 0 ? 'No accounts assigned to you yet.' : 'Nothing needs your attention.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {attention.slice(0, 4).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 rounded-lg ring-1 ring-slate-100 px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-slate-900 truncate">{i.title}</span>
                  <span className="block text-xs text-slate-500 truncate">{i.detail}</span>
                </span>
                <Link to={i.to} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">{i.action}</Link>
              </li>
            ))}
            {attention.length > 4 && <li className="text-xs text-slate-500">+{attention.length - 4} more</li>}
          </ul>
        )}
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------- mail & messages previews

const timeShort = (iso) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const MailPreview = ({ notes }) => {
  if (notes.error) return <Panel title="Mail" label="Mail"><PanelError message={notes.error} onRetry={notes.reload} compact /></Panel>;
  const list = notes.data ? notes.data.slice(0, 3) : null;
  const unread = notes.data ? notes.data.filter((n) => !n.is_read).length : 0;
  return (
    <Panel label="Mail" title={<span className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-500" aria-hidden="true" /> Mail {unread > 0 && <span className="text-xs font-medium text-rose-700">{unread} unread</span>}</span>}>
      {!list ? <Skeleton className="h-12 mt-2" /> : list.length === 0 ? <p className="mt-1 text-sm text-slate-500">No mail yet.</p> : (
        <ul className="mt-1 divide-y divide-slate-100">
          {list.map((n) => (
            <li key={n.id} className="py-2.5 flex gap-2.5">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-brand-600'}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2">
                  <span className={`text-[13px] truncate ${n.is_read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{n.title}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{timeShort(n.created_at)}</span>
                </span>
                <span className="block text-xs text-slate-500 line-clamp-2">{n.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

const MessagesPreview = ({ convos, meId }) => {
  if (convos.error) return <Panel title="Team messages"><PanelError message={convos.error} onRetry={convos.reload} compact /></Panel>;
  const list = convos.data
    ? convos.data.filter((c) => c.latest_message).sort((a, b) => new Date(b.latest_message.created_at) - new Date(a.latest_message.created_at)).slice(0, 3)
    : null;
  return (
    <Panel label="Team messages" title={<span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-slate-500" aria-hidden="true" /> Team messages</span>}
      action={<Link to="/chat" className={linkClass}>View all</Link>}>
      {!list ? <Skeleton className="h-12 mt-2" /> : list.length === 0 ? <p className="mt-1 text-sm text-slate-500">No messages yet. Start a conversation from Team messages.</p> : (
        <ul className="mt-1 divide-y divide-slate-100">
          {list.map((c) => {
            const m = c.latest_message;
            const who = m.sender_id === meId ? 'You' : (m.sender?.full_name || 'Someone');
            return (
              <li key={c.id}>
                <Link to="/chat" className="py-2.5 flex gap-3 rounded-lg hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                  <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center shrink-0">{initials(m.sender?.full_name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="text-[13px] font-semibold text-slate-900 truncate">{c.title || who}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{timeShort(m.created_at)}</span>
                    </span>
                    <span className="block text-xs text-slate-600 line-clamp-2">{c.title ? `${who}: ` : ''}{m.is_redacted ? 'Message removed' : m.content}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- quick links (+ shift)

const QuickLinks = ({ shift }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const view = shift.data ? shiftView(shift.data) : null;
  const act = async (fn) => {
    setBusy(true); setErr(null);
    try { await fn(); shift.reload(); } catch (e) { setErr(e?.response?.data?.detail || 'That didn’t go through.'); } finally { setBusy(false); }
  };
  const links = [
    ['/attendance', 'My attendance', Clock],
    ['/attendance?request=leave', 'Request leave', CalendarPlus],
    ['/documents', 'My documents', FolderLock],
    ['/profile', 'My profile', User],
  ];
  return (
    <Panel title="Quick links">
      <div className="mt-1 flex items-center justify-between gap-3 rounded-lg bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5">
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-slate-900">{view ? view.headline : 'Shift'}</span>
          <span className="block text-xs text-slate-500 truncate">{shift.error ? 'Shift status unavailable' : view ? view.detail : '…'}</span>
        </span>
        {view?.action === 'check-in' && <PrimaryButton size="sm" icon={LogIn} loading={busy} onClick={() => act(api.attendance.checkIn)}>Clock in</PrimaryButton>}
        {view?.action === 'check-out' && <SecondaryButton size="sm" icon={LogOut} disabled={busy} onClick={() => act(api.attendance.checkOut)}>Clock out</SecondaryButton>}
      </div>
      {err && <p role="alert" className="mt-2 text-xs text-rose-700">{err}</p>}
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {links.map(([to, label, Icon]) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-2 h-10 px-3 rounded-lg ring-1 ring-slate-200 text-[13px] text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

// ---------------------------------------------------------------- page

export const WorkspaceOverview = ({ teamPanel = null }) => {
  const navigate = useNavigate();
  const { employee } = useAuth();
  // All personal endpoints: the server scopes each one to the caller.
  const stats = useResource(() => api.employees.getMyDashboardStats().then((r) => r.data));
  const accounts = useResource(() => api.employees.getMyAccounts({ limit: 200 }).then((r) => r.data || []));
  const tasks = useResource(() => api.tasks.list({ my_tasks_only: true }).then((r) => r.data || []));
  const posts = useResource(() => api.socialPosts.list().then((r) => r.data || []));
  const notes = useResource(() => api.notifications.list().then((r) => r.data || []));
  const convos = useResource(() => api.chat.listConversations().then((r) => r.data || []));
  const shift = useResource(() => api.attendance.getSummary().then((r) => r.data));

  const attention = attentionItems(accounts.data || [], posts.data || [], employee);
  const assigned = employee?.assigned_accounts_count ?? (accounts.data || []).length;
  const summary = workspaceSummary({ assigned, tasks: tasks.data || [], posts: posts.data || [], attention });
  const accErr = errOf(accounts, stats);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-slate-900">My workspace</h1>
          <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <PrimaryButton icon={ListChecks} onClick={() => navigate('/accounts')}>My accounts</PrimaryButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard icon={Layers} label="Assigned accounts" value={summary.assigned} to="/accounts" loading={!accounts.data && !accounts.error} />
        <SummaryCard icon={CalendarCheck} label="Tasks due today" value={summary.tasksDueToday} to="/tasks" loading={!tasks.data && !tasks.error}
          note={summary.overdue ? `${summary.overdue} overdue` : null} />
        <SummaryCard icon={CalendarClock} label="Posts scheduled today" value={summary.postsToday} to="/social/posts?tab=scheduled" loading={!posts.data && !posts.error} />
        <SummaryCard icon={AlertTriangle} label="Needs attention" value={summary.needsAttention} to="#needs-attention"
          tone={summary.needsAttention ? 'warn' : 'neutral'} loading={(!accounts.data && !accounts.error) || (!posts.data && !posts.error)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <TodaysWork tasks={tasks} />
          <UpcomingPosts posts={posts} />
          {teamPanel}
        </div>
        <div className="space-y-6 min-w-0">
          <MyAccounts
            assigned={assigned}
            target={stats.data?.account_target_max}
            attention={attention}
            loading={!accounts.data && !accErr}
            error={accErr?.error}
            onRetry={() => { accounts.reload(); stats.reload(); }}
          />
          <MailPreview notes={notes} />
          <MessagesPreview convos={convos} meId={employee?.id} />
          <QuickLinks shift={shift} />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceOverview;
