import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Search, UserMinus, UsersRound, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import ErrorState from '../../components/ui/ErrorState';
import StatusBadge from '../../components/ui/StatusBadge';
import { matchesPerson, plural } from './hrModel';

const errText = (err, fallback) => err?.response?.data?.detail || fallback;

const Person = ({ m, selectable, checked, onToggle }) => (
  <li>
    <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${selectable ? 'cursor-pointer hover:bg-slate-50' : ''} ${checked ? 'bg-brand-50' : ''}`}>
      {selectable && <input type="checkbox" checked={checked} onChange={onToggle} className="accent-brand-700 w-4 h-4" aria-label={`Select ${m.full_name}`} />}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-slate-900 truncate">{m.full_name}</span>
        <span className="block text-[11px] text-slate-500 truncate">{m.employee_code}{m.job_title ? ` · ${m.job_title}` : ''}{m.department_name ? ` · ${m.department_name}` : ''}</span>
      </span>
      {m.status !== 'ACTIVE' && <StatusBadge status={m.status} />}
    </label>
  </li>
);

/**
 * Team routing: every team lead with their team, plus people without one. Senior HR / admins tick
 * people and move them to a team lead (optionally a department) or out of a team; Junior HR reads.
 */
export const TeamsPage = () => {
  const { can } = useAuth();
  const canMove = can('employees:manage');
  // Junior HR: same picker, but it sends a request to Senior HR instead of moving people
  const canRequest = !canMove && can('hr:portal');
  const selectable = canMove || canRequest;
  const [reason, setReason] = useState('');
  const [org, setOrg] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [target, setTarget] = useState('');
  const [dept, setDept] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try { setOrg((await api.hr.org()).data); } catch (err) { setError(errText(err, 'Teams could not be loaded.')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clear = () => { setSelected(new Set()); setTarget(''); setDept(''); };

  const allPeople = useMemo(() => (org ? [...org.unassigned, ...org.teams.flatMap((t) => t.members)] : []), [org]);
  const nameOf = (id) => allPeople.find((p) => p.id === id)?.full_name;

  const requestMove = async (managerId) => {
    if (reason.trim().length < 3) { setMsg({ ok: false, text: 'Add a short reason for Senior HR.' }); return; }
    setBusy(true);
    setMsg(null);
    try {
      for (const id of selected) {
        // eslint-disable-next-line no-await-in-loop
        await api.hr.requestChange({ employee_id: id, kind: 'TEAM', manager_id: managerId || undefined, remove_from_team: !managerId,
          department_id: dept || undefined, reason: reason.trim() });
      }
      setMsg({ ok: true, text: `${plural(selected.size, 'request')} sent to Senior HR. You’ll get Mail when they decide.` });
      clear();
      setReason('');
    } catch (err) {
      setMsg({ ok: false, text: errText(err, 'The request didn’t go through.') });
    } finally {
      setBusy(false);
    }
  };

  const move = async (managerId) => {
    if (canRequest) return requestMove(managerId);
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.hr.move({ employee_ids: [...selected], manager_id: managerId || null, department_id: dept || undefined });
      setMsg({ ok: true, text: managerId
        ? `${plural(r.data.moved, 'person', 'people')} moved to ${r.data.team_lead}'s team. Everyone affected got Mail.`
        : `${plural(r.data.moved, 'person', 'people')} removed from their team.` });
      clear();
      await load();
    } catch (err) {
      setMsg({ ok: false, text: errText(err, 'The move didn’t go through.') });
    } finally {
      setBusy(false);
    }
  };

  const teams = org ? org.teams.map((t) => ({ ...t, shown: t.members.filter((m) => matchesPerson(m, q)) }))
    .filter((t) => !q || matchesPerson(t.lead, q) || t.shown.length) : [];
  const unassigned = org ? org.unassigned.filter((m) => matchesPerson(m, q)) : [];

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        title="Teams"
        description={canMove ? 'Who reports to whom. Tick people to move them to another team lead or department.' : 'Who reports to whom. Tick people to ask Senior HR to move them.'}
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'People' }, { label: 'Teams' }]}
      />

      {msg && (
        <div role="status" className={`p-3 rounded-lg border text-sm flex items-center justify-between gap-3 ${msg.ok ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'}`}>
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Dismiss message"><X className="w-4 h-4" /></button>
        </div>
      )}

      {error ? <ErrorState message={error} onRetry={load} /> : !org ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <label className="relative flex-1 max-w-md">
              <span className="sr-only">Find a person</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person, code or job title" className="enterprise-input w-full !pl-9" />
            </label>
            <p className="text-sm text-slate-500">
              {plural(org.teams.length, 'team')} · {plural(org.departments.length, 'department')} · {plural(org.unassigned.length, 'person', 'people')} without a team lead
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
            <section aria-label="Without a team lead" className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
              <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2"><UserMinus className="w-4 h-4 text-amber-700" aria-hidden="true" /> Without a team lead ({org.unassigned.length})</h2>
              {unassigned.length === 0 ? <p className="mt-2 text-sm text-slate-500">{q ? 'No matches.' : 'Everyone has a team lead.'}</p> : (
                <ul className="mt-2 space-y-0.5">
                  {unassigned.map((m) => <Person key={m.id} m={m} selectable={selectable} checked={selected.has(m.id)} onToggle={() => toggle(m.id)} />)}
                </ul>
              )}
            </section>

            {teams.map((t) => (
              <section key={t.lead.id} aria-label={`${t.lead.full_name}'s team`} className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-slate-900 truncate flex items-center gap-2"><UsersRound className="w-4 h-4 text-brand-700 shrink-0" aria-hidden="true" />{t.lead.full_name}</h2>
                    <p className="text-xs text-slate-500">Team Lead{t.lead.department_name ? ` · ${t.lead.department_name}` : ''} · {plural(t.members.length, 'member')}</p>
                  </div>
                  {selectable && selected.size > 0 && (
                    <SecondaryButton size="sm" icon={ArrowRightLeft} disabled={busy} onClick={() => move(t.lead.id)}>{canRequest ? 'Request here' : 'Move here'}</SecondaryButton>
                  )}
                </div>
                {t.shown.length === 0 ? <p className="mt-2 text-sm text-slate-500">{q ? 'No matches.' : 'Nobody on this team yet.'}</p> : (
                  <ul className="mt-2 space-y-0.5">
                    {t.shown.map((m) => <Person key={m.id} m={m} selectable={selectable} checked={selected.has(m.id)} onToggle={() => toggle(m.id)} />)}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {/* action bar */}
      {selectable && selected.size > 0 && org && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] z-40 w-[calc(100%-2rem)] max-w-3xl bg-white border border-[#E6EAF0] rounded-xl shadow-lift p-3 flex flex-col md:flex-row md:items-center gap-3" role="region" aria-label="Move selected people">
          <p className="text-sm text-slate-900 font-medium md:mr-auto">
            {plural(selected.size, 'person', 'people')} selected
            <span className="block text-xs font-normal text-slate-500 truncate max-w-xs">{[...selected].slice(0, 3).map(nameOf).join(', ')}{selected.size > 3 ? '…' : ''}</span>
          </p>
          <select aria-label="Move to team lead" value={target} onChange={(e) => setTarget(e.target.value)} className="enterprise-input h-9 text-sm cursor-pointer">
            <option value="">Move to…</option>
            {org.teams.map((t) => <option key={t.lead.id} value={t.lead.id}>{t.lead.full_name}’s team</option>)}
          </select>
          <select aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value)} className="enterprise-input h-9 text-sm cursor-pointer">
            <option value="">Keep department</option>
            {org.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {canRequest && (
            <input aria-label="Reason for Senior HR" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000}
              placeholder="Reason for Senior HR" className="enterprise-input h-9 text-sm md:w-48" />
          )}
          <div className="flex gap-2">
            <PrimaryButton size="sm" icon={ArrowRightLeft} loading={busy} disabled={!target} onClick={() => move(target)}>{canRequest ? 'Request move' : 'Move'}</PrimaryButton>
            <SecondaryButton size="sm" disabled={busy} onClick={() => move(null)}>{canRequest ? 'Request removal' : 'Remove from team'}</SecondaryButton>
            <SecondaryButton size="sm" onClick={clear} aria-label="Clear selection"><X className="w-4 h-4" /></SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
