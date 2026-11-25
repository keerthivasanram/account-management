import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import MetricCard from '../../components/ui/MetricCard';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import { UsersRound, UserCheck, Plane, Inbox, AlertTriangle, CheckSquare } from 'lucide-react';

const TODAY_LABEL = {
  PRESENT: { text: 'At work', status: 'ACTIVE' },
  CHECKED_OUT: { text: 'Checked out', status: 'COMPLETED' },
  ON_LEAVE: { text: 'On leave', status: 'ON_LEAVE' },
  NOT_CHECKED_IN: { text: 'Not checked in', status: 'PENDING' },
  NOT_STARTED: { text: 'Not started', status: 'INFO' },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

export const ManagerDashboardPage = () => {
  const { employee } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'approvals' ? 'approvals' : 'team';

  const [overview, setOverview] = useState(null);
  const [inbox, setInbox] = useState({ tasks: [], leaves: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [decision, setDecision] = useState(null); // { kind: 'leave'|'task', item, action }
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, ap] = await Promise.all([api.manager.getOverview(), api.manager.getApprovals()]);
      setOverview(ov.data);
      setInbox(ap.data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load your team.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDecision = (kind, item, action) => {
    setRemarks('');
    setDecision({ kind, item, action });
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    const { kind, item, action } = decision;
    if (kind === 'task' && action === 'changes' && !remarks.trim()) return;
    setBusy(true);
    try {
      if (kind === 'leave') {
        await api.attendance.reviewLeave(item.id, { status: action === 'approve' ? 'APPROVED' : 'REJECTED', remarks: remarks || undefined });
      } else if (action === 'approve') {
        await api.tasks.approve(item.id, { remarks: remarks || undefined });
      } else {
        await api.tasks.requestChanges(item.id, { remarks });
      }
      setFeedback({ ok: true, text: 'Decision recorded and the employee was notified.' });
      setDecision(null);
      load();
    } catch (err) {
      setFeedback({ ok: false, text: err?.response?.data?.detail || 'Could not record decision.' });
    } finally {
      setBusy(false);
    }
  };

  const memberColumns = useMemo(() => [
    {
      header: 'Team member',
      accessor: 'full_name',
      render: (m) => (
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{m.full_name}</p>
          <p className="text-[11px] text-[#64748B] truncate">
            {m.employee_code} · {m.job_title || m.role_label}{m.reports_directly ? '' : ' · via department'}
          </p>
        </div>
      ),
    },
    {
      header: 'Today',
      accessor: 'today',
      render: (m) => <StatusBadge status={TODAY_LABEL[m.today].status} text={TODAY_LABEL[m.today].text} />,
    },
    {
      header: 'Open tasks',
      accessor: 'open_tasks',
      render: (m) => (
        <span className="text-xs tabular-nums">
          <span className="font-semibold text-slate-900">{m.open_tasks}</span>
          {m.overdue_tasks > 0 && <span className="ml-1.5 text-[#DC2626]">({m.overdue_tasks} overdue)</span>}
        </span>
      ),
    },
    {
      header: `Accounts (${overview?.account_target_min ?? 50}–${overview?.account_target_max ?? 60})`,
      accessor: 'assigned_accounts',
      render: (m) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-slate-900">{m.assigned_accounts}</span>
          {m.workload === 'OVER' && <StatusBadge status="OVERLOADED" text="over" />}
          {m.workload === 'UNDER' && <StatusBadge status="UNDER" text="under" />}
        </div>
      ),
    },
    { header: 'Status', accessor: 'status', render: (m) => <StatusBadge status={m.status} /> },
  ], [overview]);

  const pendingTotal = inbox.tasks.length + inbox.leaves.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team"
        description={`Who's in today, who is overloaded, and what is waiting on you, ${employee?.full_name?.split(' ')[0] || ''}.`}
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'My Team' }]}
      />

      {feedback && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${feedback.ok ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'}`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {error && <ErrorState message={error} onRetry={load} />}

      {overview && (
        <div className="stat-group grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard label="Team size" value={overview.team_size} icon={UsersRound} />
          <MetricCard label="In today" value={overview.present_today} icon={UserCheck}
            subtext={`${overview.not_checked_in} not checked in`} />
          <MetricCard label="On leave" value={overview.on_leave_today} icon={Plane} />
          <MetricCard label="Waiting on you" value={pendingTotal} icon={Inbox}
            subtext={`${overview.pending_task_reviews} tasks · ${overview.pending_leave_requests} leave`} />
          <MetricCard label="Needs attention" value={overview.overdue_tasks + overview.workload_flags} icon={AlertTriangle}
            subtext={`${overview.overdue_tasks} overdue · ${overview.workload_flags} workload`} />
        </div>
      )}

      <div className="flex gap-1 border-b border-[#E5E7EB]">
        {[['team', 'Team roster'], ['approvals', `Approvals (${pendingTotal})`]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setParams(key === 'team' ? {} : { tab: key })}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${tab === key ? 'border-brand-700 text-brand-700 font-medium' : 'border-transparent text-[#64748B] hover:text-slate-900'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <DataTable
          columns={memberColumns}
          data={overview?.members || []}
          loading={loading}
          emptyTitle="No team members yet"
          emptyDescription="People appear here when an admin sets you as their manager or makes you head of their department."
        />
      )}

      {tab === 'approvals' && !loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft">
            <header className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#64748B]" />
              <h2 className="text-sm font-semibold text-slate-900">Task reviews ({inbox.tasks.length})</h2>
            </header>
            {inbox.tasks.length === 0 ? (
              <EmptyState title="Nothing to review" description="Submitted deliverables from your team land here." />
            ) : (
              <ul className="divide-y divide-[#E5E7EB]">
                {inbox.tasks.map((t) => (
                  <li key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                      <p className="text-xs text-[#64748B]">
                        {t.assignee_name} · {t.project_name || 'No project'} · due {fmtDate(t.due_date)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <SecondaryButton size="sm" onClick={() => openDecision('task', t, 'changes')}>Request changes</SecondaryButton>
                      <PrimaryButton size="sm" onClick={() => openDecision('task', t, 'approve')}>Approve</PrimaryButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft">
            <header className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
              <Plane className="w-4 h-4 text-[#64748B]" />
              <h2 className="text-sm font-semibold text-slate-900">Leave requests ({inbox.leaves.length})</h2>
            </header>
            {inbox.leaves.length === 0 ? (
              <EmptyState title="No pending leave" description="Leave requests from your reports land here." />
            ) : (
              <ul className="divide-y divide-[#E5E7EB]">
                {inbox.leaves.map((l) => (
                  <li key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {l.employee_name} · {l.days} day{l.days === 1 ? '' : 's'} {l.leave_type.toLowerCase()}
                      </p>
                      <p className="text-xs text-[#64748B]">{fmtDate(l.start_date)} → {fmtDate(l.end_date)} · “{l.reason}”</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <SecondaryButton size="sm" danger onClick={() => openDecision('leave', l, 'reject')}>Reject</SecondaryButton>
                      <PrimaryButton size="sm" onClick={() => openDecision('leave', l, 'approve')}>Approve</PrimaryButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {decision && (
        <Modal isOpen onClose={() => setDecision(null)} title={
          decision.kind === 'leave'
            ? `${decision.action === 'approve' ? 'Approve' : 'Reject'} leave for ${decision.item.employee_name}`
            : `${decision.action === 'approve' ? 'Approve' : 'Request changes on'} “${decision.item.title}”`
        }>
          <form onSubmit={submitDecision} className="space-y-4">
            <FormField
              label={decision.action === 'changes' ? 'What needs to change?' : 'Remarks (optional)'}
              required={decision.action === 'changes'}
            >
              <textarea
                className="enterprise-input w-full min-h-[90px]"
                value={remarks}
                maxLength={1000}
                required={decision.action === 'changes'}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setDecision(null)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" loading={busy}>Confirm</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ManagerDashboardPage;
