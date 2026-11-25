import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import MetricCard from '../../components/ui/MetricCard';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import ColumnChart from '../../components/charts/ColumnChart';
import BarList from '../../components/charts/BarList';
import { Users, UserCheck, Inbox, Instagram, KeyRound, UserPlus, AlertTriangle, ChevronRight } from 'lucide-react';

const Card = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-5 ${className}`}>
    <header className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

const shortDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const humanAction = (a) => a.replace(/_/g, ' ');
const timeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const res = await api.admin.getOverview();
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load the admin overview.');
    }
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingState message="Loading company overview..." />;

  const { people, attendance_today: att, approvals, accounts, workload, meta_tokens: tokens } = data;
  const targetBand = workload.distribution.find((b) => b.band.includes('target'))?.band;

  const queue = [
    { label: 'Instagram account registrations', count: approvals.accounts, to: '/admin/accounts?filter=pending' },
    { label: 'Leave requests', count: approvals.leave, to: '/manager?tab=approvals' },
    { label: 'Task deliverables in review', count: approvals.tasks, to: '/manager?tab=approvals' },
    { label: 'Scheduled posts', count: approvals.posts, to: '/social/posts' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview"
        description="People, attendance, approvals and Instagram account health across the company."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Administration' }]}
        actions={
          <>
            <SecondaryButton onClick={() => navigate('/admin/accounts')} icon={Instagram}>Accounts</SecondaryButton>
            <PrimaryButton onClick={() => navigate('/admin/employees')} icon={UserPlus}>Manage people</PrimaryButton>
          </>
        }
      />

      <div className="stat-group grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard label="Active employees" value={people.active.toLocaleString()} icon={Users}
          subtext={`${people.invited} invited · +${people.joined_last_30d} / −${people.left_last_30d} in 30 days`} />
        <MetricCard label="In today" value={att.rate === null ? '—' : `${att.rate}%`} icon={UserCheck}
          subtext={`${att.checked_in} checked in · ${att.on_leave} on leave · ${att.not_checked_in} missing`} />
        <MetricCard label="Waiting for approval" value={approvals.total} icon={Inbox}
          subtext={`${approvals.accounts} accounts · ${approvals.leave} leave · ${approvals.tasks} tasks`} />
        <MetricCard label="Instagram accounts" value={accounts.total.toLocaleString()} icon={Instagram}
          subtext={`${accounts.unassigned} unassigned`} />
        <MetricCard label="Token expiries" value={tokens.expiring_count} icon={KeyRound}
          subtext={`within ${tokens.warning_days} days · ${tokens.expired_count} already expired`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card title="Daily check-ins" subtitle="Employees who checked in, last 14 days" className="xl:col-span-2">
          <ColumnChart data={att.trend} valueKey="checked_in" labelKey="date" formatLabel={shortDay} title="Daily check-ins, last 14 days" />
        </Card>

        <Card title="Approvals queue" subtitle="Oldest items first on each screen">
          <ul className="divide-y divide-[#F1F5F9]">
            {queue.map((q) => (
              <li key={q.label}>
                <Link to={q.to} className="flex items-center justify-between py-2.5 group">
                  <span className="text-sm text-slate-900">{q.label}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold tabular-nums ${q.count ? 'text-slate-900' : 'text-[#94A3B8]'}`}>{q.count}</span>
                    <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-brand-700" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {people.without_manager > 0 && (
            <p className="mt-3 text-xs text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-md p-2.5 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{people.without_manager} employee(s) have no manager, so their leave falls back to admins. <Link to="/admin/employees" className="underline">Assign managers</Link></span>
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Account workload per employee" subtitle={`Employees by assigned Instagram accounts · target ${workload.target_min}–${workload.target_max}`}>
          <BarList rows={workload.distribution} labelKey="band" valueKey="count" highlight={targetBand} />
          <div className="grid grid-cols-2 gap-4 mt-5">
            {[['Over target', workload.over], ['Under target', workload.under]].map(([label, list]) => (
              <div key={label}>
                <h3 className="text-[11px] uppercase tracking-wider text-[#64748B] mb-1.5">{label}</h3>
                {list.length === 0 ? <p className="text-xs text-[#94A3B8]">None</p> : (
                  <ul className="space-y-1">
                    {list.map((e) => (
                      <li key={e.id} className="flex justify-between text-xs">
                        <span className="text-slate-900 truncate">{e.full_name}</span>
                        <span className="tabular-nums font-semibold text-slate-900">{e.assigned}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Headcount by department" subtitle="Active employees">
          <BarList rows={people.by_department} labelKey="name" valueKey="count" emptyText="No departments yet" />
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-5 text-xs text-[#64748B]">
            {people.by_role.map((r) => (
              <span key={r.role}><span className="font-semibold text-slate-900 tabular-nums">{r.count}</span> {r.label.toLowerCase()}{r.count === 1 ? '' : 's'}</span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Instagram accounts by status">
          <BarList rows={accounts.by_status.map((s) => ({ ...s, label: s.status.replace(/_/g, ' ') }))} labelKey="label" valueKey="count" />
          {tokens.expiring.length > 0 && (
            <div className="mt-5">
              <h3 className="text-[11px] uppercase tracking-wider text-[#64748B] mb-1.5">Tokens expiring soon</h3>
              <ul className="space-y-1">
                {tokens.expiring.map((t) => (
                  <li key={t.account_id} className="flex justify-between text-xs">
                    <span className="text-slate-900">@{t.username}</span>
                    <span className="text-[#92400E]">{t.days_left === 0 ? 'today' : `${t.days_left} day(s)`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Recent activity" action={<Link to="/admin/audit-logs" className="text-xs text-brand-700 hover:underline">Full audit log</Link>}>
          {data.recent_activity.length === 0 ? <p className="text-xs text-[#64748B]">No activity yet.</p> : (
            <ul className="divide-y divide-[#F1F5F9]">
              {data.recent_activity.map((a) => (
                <li key={a.id} className="py-2 flex justify-between gap-3 text-xs">
                  <span className="text-slate-900 min-w-0 truncate">
                    <span className="font-medium">{a.actor_name}</span> <span className="text-[#64748B]">{humanAction(a.action)}</span>
                  </span>
                  <span className="text-[#94A3B8] shrink-0">{timeAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
