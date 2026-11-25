import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Info, Plus, Trash2, Wrench, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import CorrectionModal from '../../components/attendance/CorrectionModal';
import {
  CODES, LEGEND, applyWeekOff, canToggleWeekOff, cellTitle, currentMonth, monthLabel, shiftMonth,
} from '../../components/attendance/registerModel';

const errText = (err, fallback) => err?.response?.data?.detail || fallback;
const TABS = [['register', 'Register'], ['corrections', 'Corrections'], ['holidays', 'Holidays']];

// ---------------------------------------------------------------- register grid

const RegisterTab = ({ month, setMonth, flash }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [rosterMode, setRosterMode] = useState(false);
  const [dept, setDept] = useState('');
  const [depts, setDepts] = useState([]);
  const { can } = useAuth();

  const load = useCallback(async () => {
    setError(null);
    try {
      setData((await api.attendance.register({ month, department_id: dept || undefined })).data);
    } catch (err) {
      setError(errText(err, 'The register could not be loaded.'));
    }
  }, [month, dept]);
  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => {
    if (can('attendance:read_all')) api.departments.list().then((r) => setDepts(r.data || [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (row, iso, cell) => {
    if (!rosterMode || !row.can_roster || !canToggleWeekOff(cell)) return;
    const off = cell.code !== 'WO';
    setData((d) => applyWeekOff(d, row.employee_id, iso, off));
    try {
      await api.attendance.setWeekOff({ employee_id: row.employee_id, date: iso, week_off: off });
    } catch (err) {
      setData((d) => applyWeekOff(d, row.employee_id, iso, !off));
      flash(false, errText(err, 'The week off could not be saved.'));
    }
  };

  const canRosterAny = data?.rows.some((r) => r.can_roster);
  const showLate = Boolean(data?.rules.shift_start_time);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <SecondaryButton size="sm" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="w-4 h-4" /></SecondaryButton>
          <span className="w-40 text-center text-sm font-semibold text-slate-900" aria-live="polite">{monthLabel(month)}</span>
          <SecondaryButton size="sm" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="w-4 h-4" /></SecondaryButton>
        </div>
        {depts.length > 0 && (
          <select aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value)} className="enterprise-input h-9 text-sm cursor-pointer">
            <option value="">All departments</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        {canRosterAny && (
          <button type="button" aria-pressed={rosterMode} onClick={() => setRosterMode((m) => !m)}
            className={`ml-auto h-9 px-3 rounded-lg text-sm font-medium inline-flex items-center gap-2 ring-1 transition-colors ${rosterMode ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>
            <CalendarOff className="w-4 h-4" aria-hidden="true" /> {rosterMode ? 'Planning week offs: click days' : 'Plan week offs'}
          </button>
        )}
      </div>

      {data && (
        <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Full day {data.rules.shift_hours} h · half day {data.rules.half_day_hours} h ·{' '}
            {data.rules.shift_start_time ? `start ${data.rules.shift_start_time} (+${data.rules.late_grace_minutes} min grace)` : 'no fixed start, so late marks are off'} ·{' '}
            {data.rules.absent_without_roster ? 'no-shows count as absent' : 'no-shows show as “No record” until week offs are planned'}.
          </span>
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600" aria-label="Legend">
        {LEGEND.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded text-[10px] font-semibold inline-flex items-center justify-center ${CODES[c].cls}`} aria-hidden="true">{CODES[c].short}</span>
            {CODES[c].label}
          </span>
        ))}
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : !data ? (
        <div className="h-64 rounded-xl bg-slate-100 animate-pulse" aria-busy="true" />
      ) : data.rows.length === 0 ? (
        <div className="bg-white border border-[#E6EAF0] rounded-xl"><EmptyState title="Nobody to show" description="No active people match this view." /></div>
      ) : (
        <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft overflow-x-auto">
          <table className="text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-white text-left px-3 py-2 font-semibold text-slate-500 border-b border-[#E6EAF0] min-w-[180px]">Person</th>
                {data.days.map((iso) => {
                  const d = new Date(`${iso}T00:00:00`);
                  const isToday = iso === data.today;
                  const holiday = data.holidays.find((h) => h.date === iso);
                  return (
                    <th key={iso} scope="col" title={holiday?.name} className={`px-0.5 py-1.5 font-medium border-b border-[#E6EAF0] text-center ${isToday ? 'text-brand-700' : 'text-slate-500'}`}>
                      <span className="block text-[10px]">{d.toLocaleDateString('en-IN', { weekday: 'narrow' })}</span>
                      <span className="block">{d.getDate()}</span>
                    </th>
                  );
                })}
                {['Worked', 'Leave', 'Off', 'Hours', ...(showLate ? ['Late'] : []), data.rules.absent_without_roster ? 'Absent' : 'No rec.'].map((h) => (
                  <th key={h} scope="col" className="px-2 py-2 font-semibold text-slate-500 border-b border-[#E6EAF0] text-right whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.employee_id}>
                  <th scope="row" className="sticky left-0 z-10 bg-white text-left px-3 py-1.5 border-b border-slate-100 font-normal">
                    <span className="block text-[13px] font-medium text-slate-900 truncate max-w-[170px]">{r.full_name}</span>
                    <span className="block text-[10px] text-slate-500">{r.employee_code}{r.department_name ? ` · ${r.department_name}` : ''}</span>
                  </th>
                  {r.days.map((c, i) => {
                    const iso = data.days[i];
                    const meta = CODES[c.code] || CODES['-'];
                    const clickable = rosterMode && r.can_roster && canToggleWeekOff(c);
                    const content = (
                      <span className={`w-6 h-6 rounded text-[10px] font-semibold inline-flex items-center justify-center relative ${meta.cls}`}>
                        {meta.short}
                        {c.late && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />}
                      </span>
                    );
                    return (
                      <td key={iso} className="px-0.5 py-1 border-b border-slate-100 text-center">
                        {clickable ? (
                          <button type="button" onClick={() => toggle(r, iso, c)} title={`${cellTitle(iso, c)} · click to ${c.code === 'WO' ? 'remove the' : 'plan a'} week off`}
                            aria-label={`${r.full_name}, ${cellTitle(iso, c)}. ${c.code === 'WO' ? 'Remove week off' : 'Plan week off'}`}
                            className="rounded hover:ring-2 hover:ring-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                            {content}
                          </button>
                        ) : (
                          <span title={cellTitle(iso, c)} aria-label={cellTitle(iso, c)}>{content}</span>
                        )}
                      </td>
                    );
                  })}
                  {[r.totals.worked_days, r.totals.L, r.totals.WO + r.totals.H, r.totals.hours, ...(showLate ? [r.totals.late] : []),
                    data.rules.absent_without_roster ? r.totals.A : r.totals.NR].map((v, i) => (
                    <td key={i} className="px-2 py-1 border-b border-slate-100 text-right tabular-nums text-slate-800">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- corrections

const CorrectionsTab = ({ flash, people }) => {
  const [pending, setPending] = useState(null);
  const [mine, setMine] = useState(null);
  const [error, setError] = useState(null);
  const [asking, setAsking] = useState(false);
  const [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, m] = await Promise.all([
        api.attendance.corrections({ scope: 'review', status: 'PENDING' }),
        api.attendance.corrections({ scope: 'mine' }),
      ]);
      setPending(p.data || []);
      setMine(m.data || []);
    } catch (err) {
      setError(errText(err, 'Corrections could not be loaded.'));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.attendance.reviewCorrection(decision.c.id, { status: decision.action, remarks: remarks.trim() || undefined });
      flash(true, `Correction ${decision.action === 'APPROVED' ? 'approved' : 'rejected'}. ${decision.c.employee_name} was notified.`);
      setDecision(null);
      load();
    } catch (err) {
      flash(false, errText(err, 'That didn’t go through.'));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <section aria-label="Waiting for your approval" className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft">
        <header className="px-4 py-3 border-b border-[#E6EAF0]"><h2 className="text-sm font-semibold text-slate-900">Waiting for your approval{pending ? ` (${pending.length})` : ''}</h2></header>
        {!pending ? <div className="p-4"><div className="h-12 rounded bg-slate-100 animate-pulse" /></div> : pending.length === 0 ? (
          <EmptyState title="Nothing to approve" description="Corrections your team or HR send appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.map((c) => (
              <li key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{c.employee_name} · {c.date} · {c.check_in}–{c.check_out} ({c.hours} h)</p>
                  <p className="text-xs text-slate-500">“{c.reason}”{c.requested_by_name && c.requested_by_name !== c.employee_name ? ` · filed by ${c.requested_by_name}` : ''}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <SecondaryButton size="sm" danger onClick={() => { setRemarks(''); setDecision({ c, action: 'REJECTED' }); }}>Reject</SecondaryButton>
                  <PrimaryButton size="sm" onClick={() => { setRemarks(''); setDecision({ c, action: 'APPROVED' }); }}>Approve</PrimaryButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="My corrections" className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft">
        <header className="px-4 py-3 border-b border-[#E6EAF0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">My corrections</h2>
          <SecondaryButton size="sm" icon={Wrench} onClick={() => setAsking(true)}>Fix a day</SecondaryButton>
        </header>
        {!mine ? <div className="p-4"><div className="h-12 rounded bg-slate-100 animate-pulse" /></div> : mine.length === 0 ? (
          <EmptyState title="No corrections" description="If you forget to clock in or out, fix the day here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {mine.map((c) => (
              <li key={c.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900">{c.date} · {c.check_in}–{c.check_out}</p>
                  <p className="text-xs text-slate-500">“{c.reason}”{c.remarks ? ` · ${c.remarks}` : ''}</p>
                </div>
                <StatusBadge status={c.status === 'APPROVED' ? 'APPROVED' : c.status === 'REJECTED' ? 'REJECTED' : 'PENDING'} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {asking && <CorrectionModal people={people} onClose={() => setAsking(false)} onSent={(t) => { setAsking(false); flash(true, t); load(); }} />}
      {decision && (
        <Modal isOpen onClose={() => setDecision(null)} title={`${decision.action === 'APPROVED' ? 'Approve' : 'Reject'} correction for ${decision.c.employee_name}`} maxWidth="max-w-md">
          <form onSubmit={decide} className="space-y-4">
            <p className="text-sm text-slate-600">{decision.c.date}: {decision.c.check_in}–{decision.c.check_out} ({decision.c.hours} h). Approving replaces that day’s clock times.</p>
            <FormField label={decision.action === 'REJECTED' ? 'Reason' : 'Note (optional)'} required={decision.action === 'REJECTED'} id="corr_note">
              <textarea id="corr_note" rows={3} required={decision.action === 'REJECTED'} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="enterprise-input w-full min-h-[80px]" />
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

// ---------------------------------------------------------------- holidays

const HolidaysTab = ({ flash }) => {
  const { can } = useAuth();
  const manage = can('attendance:manage');
  const [year, setYear] = useState(new Date().getFullYear());
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ date: '', name: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setList((await api.attendance.holidays(year)).data || []); } catch (err) { flash(false, errText(err, 'Holidays could not be loaded.')); setList([]); }
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setList(null); load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.attendance.addHoliday({ date: form.date, name: form.name.trim() });
      setForm({ date: '', name: '' });
      flash(true, 'Holiday added. It shows on everyone’s register.');
      load();
    } catch (err) {
      flash(false, errText(err, 'The holiday could not be added.'));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (h) => {
    if (!window.confirm(`Remove ${h.name} (${h.date})?`)) return;
    try { await api.attendance.removeHoliday(h.id); load(); } catch (err) { flash(false, errText(err, 'Could not remove it.')); }
  };

  return (
    <section aria-label="Holidays" className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft max-w-2xl">
      <header className="px-4 py-3 border-b border-[#E6EAF0] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-500" aria-hidden="true" /> Company holidays</h2>
        <div className="flex items-center gap-1">
          <SecondaryButton size="sm" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="w-4 h-4" /></SecondaryButton>
          <span className="w-14 text-center text-sm font-semibold">{year}</span>
          <SecondaryButton size="sm" aria-label="Next year" onClick={() => setYear((y) => y + 1)}><ChevronRight className="w-4 h-4" /></SecondaryButton>
        </div>
      </header>
      {manage && (
        <form onSubmit={add} className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2">
          <input type="date" required aria-label="Holiday date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="enterprise-input" />
          <input required maxLength={120} aria-label="Holiday name" placeholder="e.g. Diwali" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="enterprise-input flex-1" />
          <PrimaryButton type="submit" size="sm" icon={Plus} loading={busy}>Add</PrimaryButton>
        </form>
      )}
      {!list ? <div className="p-4"><div className="h-10 rounded bg-slate-100 animate-pulse" /></div> : list.length === 0 ? (
        <EmptyState title={`No holidays for ${year}`} description={manage ? 'Add the company holidays so they show on the register.' : 'HR hasn’t added holidays for this year yet.'} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((h) => (
            <li key={h.id} className="px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-slate-900">{new Date(`${h.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {h.name}</span>
              {manage && <button type="button" onClick={() => remove(h)} aria-label={`Remove ${h.name}`} className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

// ---------------------------------------------------------------- page

export const AttendanceRegisterPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'register';
  const [month, setMonth] = useState(params.get('month') || currentMonth());
  const [msg, setMsg] = useState(null);
  const [people, setPeople] = useState(null);
  const flash = (ok, text) => setMsg({ ok, text });

  useEffect(() => {
    // people this viewer may file corrections for (from this month's register)
    api.attendance.register({ month: currentMonth() }).then((r) => setPeople(r.data.rows.length > 1 ? r.data.rows : null)).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance register"
        description="Each person’s month at a glance, rotational week offs, corrections and company holidays."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Attendance register' }]}
      />
      {msg && (
        <div role="status" className={`p-3 rounded-lg border text-sm flex items-center justify-between gap-3 ${msg.ok ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'}`}>
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Dismiss message"><X className="w-4 h-4" /></button>
        </div>
      )}
      <div role="tablist" aria-label="Attendance" className="flex gap-1 border-b border-[#E6EAF0]">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', id); return n; }, { replace: true })}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === id ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'register' && <RegisterTab month={month} setMonth={setMonth} flash={flash} />}
      {tab === 'corrections' && <CorrectionsTab flash={flash} people={people} />}
      {tab === 'holidays' && <HolidaysTab flash={flash} />}
    </div>
  );
};

export default AttendanceRegisterPage;
