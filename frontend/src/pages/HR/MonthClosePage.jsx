import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Info, Lock, Unlock, X, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import { currentMonth, monthLabel, shiftMonth } from '../../components/attendance/registerModel';
import { closeBlocked, fmtDays, hasWarnings } from './monthCloseModel';

const errText = (err, fallback) => err?.response?.data?.detail || fallback;
const ISSUE_ICON = { block: XCircle, warn: AlertTriangle, info: Info };
const ISSUE_CLS = {
  block: 'border-rose-200 bg-rose-50 text-rose-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
};
const COLS = [
  ['days_employed', 'Days'], ['present_days', 'Present'], ['half_days', 'Half'], ['short_days', 'Short'],
  ['missed_clock_outs', 'Missed out'], ['paid_leave_days', 'Leave'], ['week_offs', 'Week off'], ['holidays', 'Holiday'],
  ['absent_days', 'Absent'], ['unaccounted_days', 'No record'], ['lop_days', 'Unpaid'], ['payable_days', 'Payable'],
  ['worked_hours', 'Hours'], ['late_marks', 'Late'],
];

export const MonthClosePage = () => {
  const { can } = useAuth();
  const manage = can('attendance:manage');
  const [month, setMonth] = useState(shiftMonth(currentMonth(), -1)); // last month is the one to close
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [msg, setMsg] = useState(null);
  const [dialog, setDialog] = useState(null); // 'lock' | 'reopen'
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, list] = await Promise.all([api.payroll.preview(month), api.payroll.periods()]);
      setData(p.data);
      setPeriods(list.data || []);
    } catch (err) {
      setError(errText(err, 'The month could not be loaded.'));
    }
  }, [month]);
  useEffect(() => { setData(null); load(); }, [load]);

  const act = async () => {
    setBusy(true);
    try {
      if (dialog === 'lock') {
        await api.payroll.lock(month, { note: note.trim() || undefined, acknowledge_warnings: ack });
        setMsg({ ok: true, text: `${monthLabel(month)} is closed. Its numbers are frozen and ready to export.` });
      } else {
        await api.payroll.reopen(month, note.trim());
        setMsg({ ok: true, text: `${monthLabel(month)} reopened. Founders were notified.` });
      }
      setDialog(null);
      load();
    } catch (err) {
      setMsg({ ok: false, text: errText(err, 'That didn’t go through.') });
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      const r = await api.payroll.exportCsv(month);
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `klarves-payroll-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMsg({ ok: false, text: 'The export could not be downloaded.' });
    }
  };

  const locked = data?.status === 'LOCKED';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Month close"
        description="Check the month’s attendance, close it so the numbers can’t change, and export them for payroll."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'People' }, { label: 'Month close' }]}
        actions={manage && data && (
          <div className="flex flex-wrap gap-2">
            {locked && <SecondaryButton size="sm" icon={Unlock} onClick={() => { setNote(''); setDialog('reopen'); }}>Reopen</SecondaryButton>}
            {locked && <PrimaryButton size="sm" icon={Download} onClick={download}>Download CSV</PrimaryButton>}
            {!locked && <PrimaryButton size="sm" icon={Lock} disabled={!data.can_lock} onClick={() => { setNote(''); setAck(false); setDialog('lock'); }}>Close month</PrimaryButton>}
          </div>
        )}
      />

      {msg && (
        <div role="status" className={`p-3 rounded-lg border text-sm flex items-center justify-between gap-3 ${msg.ok ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'}`}>
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Dismiss message"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <SecondaryButton size="sm" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="w-4 h-4" /></SecondaryButton>
          <span className="w-40 text-center text-sm font-semibold text-slate-900" aria-live="polite">{monthLabel(month)}</span>
          <SecondaryButton size="sm" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="w-4 h-4" /></SecondaryButton>
        </div>
        {data && (
          <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium ${locked ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : data.status === 'REOPENED' ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-600'}`}>
            {locked ? <Lock className="w-3.5 h-3.5" aria-hidden="true" /> : <Unlock className="w-3.5 h-3.5" aria-hidden="true" />}
            {locked ? `Closed by ${data.locked_by || 'HR'}` : data.status === 'REOPENED' ? 'Reopened' : 'Open'}
          </span>
        )}
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : !data ? (
        <div className="h-64 rounded-xl bg-slate-100 animate-pulse" aria-busy="true" />
      ) : (
        <>
          {data.status === 'REOPENED' && data.reopen_reason && (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">Reopened: “{data.reopen_reason}”. Close it again once it’s fixed.</p>
          )}
          {locked && data.note && <p className="text-sm text-slate-600">Note: “{data.note}”</p>}

          {!locked && data.issues.length > 0 && (
            <ul className="space-y-2" aria-label="Before closing">
              {data.issues.map((i) => {
                const Icon = ISSUE_ICON[i.severity];
                return (
                  <li key={i.kind} className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${ISSUE_CLS[i.severity]}`}>
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{i.message}</span>
                    {i.link && <Link to={i.link} className="font-medium underline shrink-0">Review</Link>}
                  </li>
                );
              })}
            </ul>
          )}

          <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[['People', data.totals.people], ['Payable days', fmtDays(data.totals.payable_days)], ['Unpaid days', fmtDays(data.totals.lop_days)],
              ['Paid leave', fmtDays(data.totals.paid_leave_days)], ['No record', fmtDays(data.totals.unaccounted_days)], ['Hours worked', data.totals.worked_hours]].map(([k, v]) => (
              <div key={k} className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-3.5">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="text-xl font-semibold tabular-nums text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />{data.rules}</p>

          {data.rows.length === 0 ? (
            <div className="bg-white border border-[#E6EAF0] rounded-xl"><EmptyState title="Nobody to pay this month" description="No active people had days in this month." /></div>
          ) : (
            <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-[#E6EAF0] text-slate-500">
                    <th scope="col" className="text-left px-3 py-2 font-semibold sticky left-0 bg-slate-50 min-w-[180px]">Person</th>
                    {COLS.map(([k, l]) => <th key={k} scope="col" className="px-2 py-2 font-semibold text-right whitespace-nowrap">{l}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((r) => (
                    <tr key={r.employee_id}>
                      <th scope="row" className="text-left px-3 py-2 font-normal sticky left-0 bg-white">
                        <span className="block text-[13px] font-medium text-slate-900">{r.full_name}</span>
                        <span className="block text-[10px] text-slate-500">{r.employee_code}{r.department ? ` · ${r.department}` : ''}</span>
                      </th>
                      {COLS.map(([k]) => (
                        <td key={k} className={`px-2 py-2 text-right tabular-nums ${k === 'payable_days' ? 'font-semibold text-slate-900' : k === 'lop_days' && r[k] ? 'text-rose-700' : 'text-slate-700'}`}>
                          {k !== 'worked_hours' && typeof r[k] === 'number' && !Number.isInteger(r[k]) ? fmtDays(r[k]) : r[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {periods.length > 0 && (
            <section aria-label="Closed months" className="text-sm">
              <h2 className="text-xs font-semibold text-slate-500 mb-1.5">History</h2>
              <ul className="flex flex-wrap gap-2">
                {periods.map((p) => (
                  <li key={p.month}>
                    <button type="button" onClick={() => setMonth(p.month)} className={`h-8 px-3 rounded-full text-xs ring-1 ${p.status === 'LOCKED' ? 'ring-brand-200 text-brand-700' : 'ring-amber-200 text-amber-800'} hover:bg-slate-50`}>
                      {monthLabel(p.month)} · {p.status === 'LOCKED' ? 'closed' : 'reopened'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {dialog && (
        <Modal isOpen onClose={() => setDialog(null)} title={dialog === 'lock' ? `Close ${monthLabel(month)}` : `Reopen ${monthLabel(month)}`} maxWidth="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {dialog === 'lock'
                ? 'Closing freezes this month: nobody can change its attendance, week offs, holidays or leave until it’s reopened. The numbers shown are what gets exported.'
                : 'Reopening lets people change this month again. The export is unavailable until you close it again. Founders get a Mail with your reason.'}
            </p>
            <FormField label={dialog === 'lock' ? 'Note (optional)' : 'Why are you reopening it?'} required={dialog === 'reopen'} id="mc_note">
              <textarea id="mc_note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="enterprise-input w-full min-h-[80px]" maxLength={500} />
            </FormField>
            {dialog === 'lock' && hasWarnings(data) && (
              <label className="flex items-start gap-2 text-sm text-amber-900">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-brand-700" />
                I’ve reviewed the open items above and want to close the month anyway.
              </label>
            )}
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setDialog(null)}>Cancel</SecondaryButton>
              <PrimaryButton loading={busy} icon={dialog === 'lock' ? Lock : Unlock}
                disabled={dialog === 'lock' ? closeBlocked(data, ack) : note.trim().length < 3} onClick={act}>
                {dialog === 'lock' ? 'Close month' : 'Reopen'}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MonthClosePage;
