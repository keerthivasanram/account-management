import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, ChevronRight, Clock, Mail, PartyPopper, Plane, RefreshCw, UserCheck, UserMinus,
  UserPlus, Users, UsersRound,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useResource from '../../hooks/useResource';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import ErrorState from '../../components/ui/ErrorState';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import { Panel } from '../Dashboard/OverviewPanels';
import { attendanceBar, plural, shortDate } from './hrModel';

const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} aria-hidden="true" />;
const linkClass = 'text-xs font-medium text-brand-700 hover:underline shrink-0';

const Stat = ({ icon: Icon, label, value, note, tone = 'neutral', to }) => {
  const body = (
    <>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700'}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-slate-500">{label}</span>
        <span className="block text-2xl font-semibold tabular-nums text-slate-900">{value}</span>
        {note && <span className="block text-[11px] text-slate-500 truncate">{note}</span>}
      </span>
    </>
  );
  const cls = 'bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-4 flex items-center gap-3.5';
  return to ? <Link to={to} className={`${cls} hover:border-brand-200`}>{body}</Link> : <div className={cls}>{body}</div>;
};

// ---------------------------------------------------------------- today by department

const TodayPanel = ({ today }) => (
  <Panel title="Today" subtitle="Attendance by department" className="lg:col-span-2 min-w-0">
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 mt-1 mb-3">
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-600" aria-hidden="true" />Present</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400" aria-hidden="true" />On leave</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200" aria-hidden="true" />Not clocked in</span>
    </div>
    {today.departments.length === 0 ? <p className="text-sm text-slate-500">No active employees yet.</p> : (
      <ul className="space-y-3">
        {today.departments.map((d) => {
          const bar = attendanceBar(d);
          return (
            <li key={d.id || 'none'}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-slate-800">{d.name}</span>
                <span className="text-slate-500 tabular-nums">{d.present} of {d.total} in · {d.on_leave} on leave · {d.not_checked_in} not in</span>
              </div>
              <div className="mt-1 h-2.5 rounded-full bg-slate-200 overflow-hidden flex gap-[2px]" role="img"
                aria-label={`${d.name}: ${d.present} present, ${d.on_leave} on leave, ${d.not_checked_in} not clocked in`}>
                {bar.present > 0 && <span className="h-full bg-brand-600" style={{ width: `${bar.present}%` }} />}
                {bar.leave > 0 && <span className="h-full bg-sky-400" style={{ width: `${bar.leave}%` }} />}
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </Panel>
);

// ---------------------------------------------------------------- waiting on HR

const WaitingPanel = ({ waiting, onChanged }) => {
  const [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const decide = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.attendance.reviewLeave(decision.leave.id, { status: decision.action, remarks: remarks.trim() || undefined });
      setMsg({ ok: true, text: `Leave ${decision.action === 'APPROVED' ? 'approved' : 'rejected'}. ${decision.leave.employee_name} was notified.` });
      setDecision(null);
      onChanged();
    } catch (err) {
      setMsg({ ok: false, text: err?.response?.data?.detail || 'That didn’t go through.' });
    } finally {
      setBusy(false);
    }
  };

  const resend = async (inv) => {
    try {
      const r = await api.admin.resendInvite(inv.id);
      setMsg({ ok: true, text: r.data?.emailed ? `Invitation sent again to ${inv.email}.` : `Re-issued. Email isn't set up yet, so tell ${inv.full_name} to sign in with ${inv.email}.` });
    } catch (err) {
      setMsg({ ok: false, text: err?.response?.data?.detail || 'That didn’t go through.' });
    }
  };

  const corrections = waiting.corrections || [];
  const empty = !waiting.leaves.length && !waiting.invites.length && !waiting.missed_checkouts.length && !corrections.length;
  return (
    <Panel title="Waiting on HR" subtitle="Leave, corrections, unused invitations, missed clock-outs">
      {msg && <p role="status" className={`mt-1 text-xs ${msg.ok ? 'text-[#15803D]' : 'text-rose-700'}`}>{msg.text}</p>}
      {empty ? <p className="mt-2 text-sm text-slate-500">Nothing waiting. 🎉</p> : (
        <div className="mt-2 space-y-4">
          {waiting.leaves.length > 0 && (
            <section aria-label="Leave requests">
              <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Plane className="w-3.5 h-3.5" aria-hidden="true" /> Leave requests ({waiting.leaves.length})</h3>
              <ul className="mt-1.5 space-y-2">
                {waiting.leaves.slice(0, 5).map((l) => (
                  <li key={l.id} className="rounded-lg ring-1 ring-slate-100 p-2.5">
                    <p className="text-[13px] font-medium text-slate-900">{l.employee_name} · {plural(l.days, 'day')} {l.leave_type.toLowerCase()}</p>
                    <p className="text-xs text-slate-500">{shortDate(l.start_date)} → {shortDate(l.end_date)} · “{l.reason}”</p>
                    <div className="mt-2 flex gap-2">
                      <SecondaryButton size="sm" danger onClick={() => { setRemarks(''); setDecision({ leave: l, action: 'REJECTED' }); }}>Reject</SecondaryButton>
                      <PrimaryButton size="sm" onClick={() => { setRemarks(''); setDecision({ leave: l, action: 'APPROVED' }); }}>Approve</PrimaryButton>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {corrections.length > 0 && (
            <section aria-label="Attendance corrections">
              <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> Attendance corrections ({corrections.length})</h3>
              <ul className="mt-1.5 text-[13px] text-slate-700 space-y-1">
                {corrections.slice(0, 4).map((c) => <li key={c.id}>{c.employee_name} · {shortDate(c.date)} · {c.check_in}–{c.check_out}</li>)}
              </ul>
              <Link to="/attendance/register?tab=corrections" className={`${linkClass} inline-block mt-1`}>Review corrections</Link>
            </section>
          )}
          {waiting.invites.length > 0 && (
            <section aria-label="Unused invitations">
              <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" aria-hidden="true" /> Not signed in yet ({waiting.invites.length})</h3>
              <ul className="mt-1.5 divide-y divide-slate-100">
                {waiting.invites.slice(0, 5).map((i) => (
                  <li key={i.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[13px] text-slate-900 truncate">{i.full_name} · {i.role_label}</span>
                      <span className="block text-xs text-slate-500 truncate">{i.email} · invited {plural(i.days_waiting, 'day')} ago</span>
                    </span>
                    <button type="button" onClick={() => resend(i)} className={linkClass}>Resend</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {waiting.missed_checkouts.length > 0 && (
            <section aria-label="Missed clock-outs">
              <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> Missed clock-out, last 7 days ({waiting.missed_checkouts.length})</h3>
              <ul className="mt-1.5 text-[13px] text-slate-700 space-y-1">
                {waiting.missed_checkouts.slice(0, 5).map((m) => <li key={`${m.employee_id}-${m.date}`}>{m.full_name} · {shortDate(m.date)}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}
      {decision && (
        <Modal isOpen onClose={() => setDecision(null)} title={`${decision.action === 'APPROVED' ? 'Approve' : 'Reject'} leave for ${decision.leave.employee_name}`} maxWidth="max-w-md">
          <form onSubmit={decide} className="space-y-4">
            <FormField label={decision.action === 'REJECTED' ? 'Reason (shared with them)' : 'Note (optional)'} id="hr_leave_note">
              <textarea id="hr_leave_note" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="enterprise-input w-full min-h-[80px]" />
            </FormField>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setDecision(null)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" loading={busy}>Confirm</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- page

export const HrOverviewPage = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const res = useResource(() => api.hr.overview().then((r) => r.data));
  const d = res.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Overview"
        description="Everyone at a glance: who's in today, what's waiting on HR, team structure and workload."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'People' }, { label: 'HR Overview' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton size="sm" icon={RefreshCw} onClick={res.reload} aria-label="Refresh" title="Refresh" />
            {can('hr:portal') && <SecondaryButton size="sm" icon={UsersRound} onClick={() => navigate('/hr/teams')}>Teams</SecondaryButton>}
            {(can('employees:invite') || can('employees:manage')) && (
              <PrimaryButton size="sm" icon={UserPlus} onClick={() => navigate('/admin/employees?invite=1')}>Invite employee</PrimaryButton>
            )}
          </div>
        }
      />

      {res.error ? <ErrorState message={res.error} onRetry={res.reload} /> : !d ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat icon={Users} label="Active people" value={d.headcount.active} note={`${plural(d.headcount.team_leads, 'team lead')}`} to="/admin/employees" />
            <Stat icon={UserCheck} label="In today" value={d.today.present} note={`${d.today.on_shift} on shift now`} />
            <Stat icon={Plane} label="On leave" value={d.today.on_leave} />
            <Stat icon={Clock} label="Not clocked in" value={d.today.not_checked_in} tone={d.today.not_checked_in ? 'warn' : 'neutral'} />
            <Stat icon={Mail} label="Invites pending" value={d.headcount.invited} tone={d.headcount.invited ? 'warn' : 'neutral'} to="/admin/employees?status=INVITED" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <TodayPanel today={d.today} />
            <WaitingPanel waiting={d.waiting} onChanged={res.reload} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <Panel title="Team structure" subtitle={`${plural(d.org.departments, 'department')} · ${plural(d.org.team_leads, 'team lead')}`}
              action={<Link to="/hr/teams" className={linkClass}>Open Teams</Link>}>
              <ul className="mt-2 space-y-2 text-[13px]">
                <li className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${d.org.unassigned.length ? 'text-amber-600' : 'text-slate-300'}`} aria-hidden="true" />
                  <span>
                    <span className="font-medium text-slate-900">{plural(d.org.unassigned.length, 'person', 'people')} without a team lead</span>
                    {d.org.unassigned.length > 0 && <span className="block text-xs text-slate-500">{d.org.unassigned.slice(0, 4).map((u) => u.full_name).join(', ')}{d.org.unassigned.length > 4 ? '…' : ''}</span>}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <UsersRound className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span><span className="font-medium text-slate-900">{plural(d.org.leads_without_team.length, 'team lead')}</span> with nobody on their team</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span><span className="font-medium text-slate-900">{plural(d.org.departments_without_head.length, 'department')}</span> without a head</span>
                </li>
              </ul>
            </Panel>

            <Panel title="People movement" subtitle="This month">
              <dl className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 ring-1 ring-slate-100 py-2"><dt className="text-[11px] text-slate-500">Joined</dt><dd className="text-lg font-semibold tabular-nums text-slate-900">{d.headcount.joined_this_month}</dd></div>
                <div className="rounded-lg bg-slate-50 ring-1 ring-slate-100 py-2"><dt className="text-[11px] text-slate-500">Left</dt><dd className="text-lg font-semibold tabular-nums text-slate-900">{d.headcount.left_this_month}</dd></div>
              </dl>
              {d.movement.joiners.length > 0 && (
                <p className="mt-3 text-xs text-slate-600 flex items-start gap-1.5"><UserPlus className="w-3.5 h-3.5 mt-0.5" aria-hidden="true" />{d.movement.joiners.map((j) => j.full_name).join(', ')}</p>
              )}
              {d.movement.leavers.length > 0 && (
                <p className="mt-1.5 text-xs text-slate-600 flex items-start gap-1.5"><UserMinus className="w-3.5 h-3.5 mt-0.5" aria-hidden="true" />{d.movement.leavers.map((j) => j.full_name).join(', ')}</p>
              )}
              <h3 className="mt-4 text-xs font-semibold text-slate-500 flex items-center gap-1.5"><PartyPopper className="w-3.5 h-3.5" aria-hidden="true" /> Anniversaries, next 30 days</h3>
              {d.movement.anniversaries.length === 0 ? <p className="mt-1 text-xs text-slate-500">None.</p> : (
                <ul className="mt-1 text-[13px] text-slate-700 space-y-1">
                  {d.movement.anniversaries.map((a) => <li key={a.id}>{a.full_name} · {plural(a.years, 'year')} on {shortDate(a.date)}</li>)}
                </ul>
              )}
            </Panel>

            <Panel title="Workload" subtitle={`Account target ${d.workload.target_min}–${d.workload.target_max} per person`}>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 ring-1 ring-slate-100 py-2"><dt className="text-[11px] text-slate-500">Over target</dt><dd className={`text-lg font-semibold tabular-nums ${d.workload.over_count ? 'text-rose-700' : 'text-slate-900'}`}>{d.workload.over_count}</dd></div>
                <div className="rounded-lg bg-slate-50 ring-1 ring-slate-100 py-2"><dt className="text-[11px] text-slate-500">Under target</dt><dd className="text-lg font-semibold tabular-nums text-slate-900">{d.workload.under_count}</dd></div>
              </dl>
              {d.workload.over.length > 0 && (
                <ul className="mt-3 text-[13px] space-y-1">
                  {d.workload.over.map((w) => <li key={w.id} className="flex justify-between"><span className="text-slate-700">{w.full_name}</span><span className="text-rose-700 tabular-nums">{w.accounts}</span></li>)}
                </ul>
              )}
              <Link to="/attendance/register" className="mt-3 text-xs font-medium text-brand-700 hover:underline flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />Open the attendance register</Link>
            </Panel>
          </div>
          <Link to="/admin/employees" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Full employee directory <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </>
      )}
    </div>
  );
};

export default HrOverviewPage;
