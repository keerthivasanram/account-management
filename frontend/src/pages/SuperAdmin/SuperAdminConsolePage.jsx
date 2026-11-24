import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import FormField from '../../components/ui/FormField';
import { Crown, ShieldCheck, AlertTriangle, Info, Database, Siren, Users, CheckCircle2, XCircle } from 'lucide-react';

const TABS = [
  ['overview', 'Overview'],
  ['admins', 'Admins & roles'],
  ['settings', 'Company policy'],
  ['health', 'System health'],
  ['audit', 'Audit search'],
];

const errText = (err, fb) => err?.response?.data?.detail || fb;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');
const Panel = ({ title, children, action }) => (
  <section className="bg-white border border-[#E5E7EB] rounded-lg p-5">
    <header className="flex items-center justify-between mb-4 gap-3">
      <h2 className="text-sm font-semibold text-[#172B24]">{title}</h2>
      {action}
    </header>
    {children}
  </section>
);

/* ------------------------------------------------------------------ Overview */
const OverviewTab = ({ flash }) => {
  const [data, setData] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.superAdmin.getOverview().then((r) => setData(r.data)).catch((e) => flash(false, errText(e, 'Failed to load.'))); }, []);
  if (!data) return <LoadingState message="Loading governance overview..." />;

  const revokeAll = async () => {
    setBusy(true);
    try {
      const r = await api.superAdmin.revokeAllSessions();
      flash(true, `Signed out ${r.data.employees_affected} employee(s). ${r.data.note}`);
      setConfirm(false);
    } catch (e) {
      flash(false, errText(e, 'Revocation failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.roles.map((r) => <MetricCard key={r.role} label={r.label + 's'} value={r.count} icon={r.role === 'super_admin' ? Crown : Users} />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Configuration & security posture">
          <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
            <div className="p-3 rounded-md border border-[#E5E7EB]"><p className="text-[#64748B]">Open incidents</p><p className="text-lg font-semibold text-[#172B24] tabular-nums">{data.security.open_incidents}</p></div>
            <div className="p-3 rounded-md border border-[#E5E7EB]"><p className="text-[#64748B]">Incidents (7d)</p><p className="text-lg font-semibold text-[#172B24] tabular-nums">{data.security.incidents_7d}</p></div>
            <div className="p-3 rounded-md border border-[#E5E7EB]"><p className="text-[#64748B]">MFA required</p><p className="text-lg font-semibold text-[#172B24]">{data.security.require_mfa ? 'Yes' : 'No'}</p></div>
          </div>
          {data.warnings.length === 0 ? (
            <p className="text-xs text-[#15803D] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> No configuration warnings.</p>
          ) : (
            <ul className="space-y-2">
              {data.warnings.map((w) => (
                <li key={w.text} className={`text-xs p-2.5 rounded-md border flex gap-2 ${w.level === 'warning' ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]' : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#475569]'}`}>
                  {w.level === 'warning' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
                  <span>{w.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Privileged changes" action={<span className="text-[11px] text-[#64748B]">roles, onboarding, offboarding, policy</span>}>
          {data.privileged_events.length === 0 ? <p className="text-xs text-[#64748B]">No privileged changes yet.</p> : (
            <ul className="divide-y divide-[#F1F5F9]">
              {data.privileged_events.map((e) => (
                <li key={e.id} className="py-2 text-xs flex justify-between gap-3">
                  <span className="min-w-0 truncate"><span className="font-medium text-[#172B24]">{e.actor_name}</span> <span className="text-[#64748B]">{e.action.replace(/_/g, ' ')}</span></span>
                  <span className="text-[#94A3B8] shrink-0">{fmt(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Emergency actions">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#64748B] max-w-xl">Suspect a leaked session or a compromised device? Sign every employee out immediately. You stay signed in. Supabase sessions also need revoking in the Supabase dashboard.</p>
          <SecondaryButton danger icon={Siren} onClick={() => setConfirm(true)}>Sign everyone out</SecondaryButton>
        </div>
      </Panel>
      <ConfirmationDialog isOpen={confirm} onClose={() => setConfirm(false)} onConfirm={revokeAll} danger loading={busy}
        title="Sign out every employee?" confirmText="Sign everyone out"
        message="All backend-issued sessions except yours are revoked now. Employees must sign in again." />
    </div>
  );
};

/* ------------------------------------------------------------------ Admins */
const AdminsTab = ({ flash }) => {
  const { employee: me } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [everyone, setEveryone] = useState([]);
  const [promote, setPromote] = useState({ id: '', role: 'admin' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [ov, emps] = await Promise.all([api.superAdmin.getOverview(), api.admin.listEmployees({ status: 'ACTIVE' })]);
    setAdmins(ov.data.admins);
    setEveryone(emps.data.filter((e) => !['admin', 'super_admin'].includes(e.role)));
  };
  useEffect(() => { load().catch((e) => flash(false, errText(e, 'Failed to load admins.'))); }, []);

  const setRole = async (id, role, name) => {
    setBusy(true);
    try {
      await api.admin.updateEmployee(id, { role });
      flash(true, `${name} is now ${role.replace('_', ' ')}.`);
      setPromote({ id: '', role: 'admin' });
      await load();
    } catch (e) {
      flash(false, errText(e, 'Role change failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Grant admin access">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <FormField label="Employee" className="flex-1">
            <select className="enterprise-input w-full" value={promote.id} onChange={(e) => setPromote({ ...promote, id: e.target.value })}>
              <option value="">Choose an active employee…</option>
              {everyone.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code}) · {e.role_label}</option>)}
            </select>
          </FormField>
          <FormField label="Role">
            <select className="enterprise-input" value={promote.role} onChange={(e) => setPromote({ ...promote, role: e.target.value })}>
              <option value="admin">Admin (HR / Ops)</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </FormField>
          <PrimaryButton disabled={!promote.id} loading={busy}
            onClick={() => setRole(promote.id, promote.role, everyone.find((e) => e.id === promote.id)?.full_name)}>Grant</PrimaryButton>
        </div>
        <p className="text-xs text-[#64748B] mt-3">Admins run people and accounts but cannot touch other admins, company policy or system settings. Every change is audit-logged.</p>
      </Panel>
      <Panel title={`Admins (${admins.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#64748B] border-b border-[#E5E7EB]">
              <th className="py-2 pr-3 font-medium">Person</th><th className="py-2 pr-3 font-medium">Role</th><th className="py-2 pr-3 font-medium">Last login</th><th className="py-2 font-medium text-right">Change</th>
            </tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-[#F1F5F9]">
                  <td className="py-2.5 pr-3"><p className="font-medium text-[#172B24]">{a.full_name}</p><p className="text-xs text-[#64748B]">{a.email}</p></td>
                  <td className="py-2.5 pr-3"><StatusBadge status={a.role} text={a.role_label} />{!a.is_active && <StatusBadge status="OFFBOARDED" className="ml-1" />}</td>
                  <td className="py-2.5 pr-3 text-xs text-[#64748B]">{fmt(a.last_login_at)}</td>
                  <td className="py-2.5 text-right">
                    {a.id === me?.id ? <span className="text-xs text-[#94A3B8]">You</span> : (
                      <select className="enterprise-input !h-8 text-xs" value={a.role} disabled={busy}
                        onChange={(e) => setRole(a.id, e.target.value, a.full_name)}>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Demote to Manager</option>
                        <option value="employee">Demote to Employee</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

/* ------------------------------------------------------------------ Settings */
const SettingsTab = ({ flash }) => {
  const [items, setItems] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const load = () => api.superAdmin.getSettings().then((r) => {
    setItems(r.data);
    setDraft(Object.fromEntries(r.data.map((s) => [s.key, s.value])));
  });
  useEffect(() => { load().catch((e) => flash(false, errText(e, 'Failed to load settings.'))); }, []);
  if (!items) return <LoadingState message="Loading policy..." />;

  const changed = items.filter((s) => JSON.stringify(s.value) !== JSON.stringify(draft[s.key]));
  const save = async () => {
    setBusy(true);
    try {
      await api.superAdmin.updateSettings(Object.fromEntries(changed.map((s) => [s.key, draft[s.key]])));
      flash(true, `Saved ${changed.length} setting(s).`);
      await load();
    } catch (e) {
      flash(false, errText(e, 'Could not save settings.'));
    } finally {
      setBusy(false);
    }
  };

  const input = (s) => {
    const v = draft[s.key];
    if (typeof s.default === 'boolean') {
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#166534]" checked={!!v} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.checked })} />
          <span className="text-sm text-[#172B24]">{v ? 'On' : 'Off'}</span>
        </label>
      );
    }
    if (typeof s.default === 'number') {
      return <input type="number" className="enterprise-input w-40" value={v} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value === '' ? '' : Number(e.target.value) })} />;
    }
    if (typeof s.default === 'object') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.keys(s.default).map((k) => (
            <label key={k} className="text-xs text-[#64748B] space-y-1">
              <span className="block capitalize">{k.toLowerCase()}</span>
              <input type="number" min={0} max={365} className="enterprise-input w-full" value={v[k]}
                onChange={(e) => setDraft({ ...draft, [s.key]: { ...v, [k]: Number(e.target.value) } })} />
            </label>
          ))}
        </div>
      );
    }
    return <input className="enterprise-input w-full max-w-sm" value={v} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} />;
  };

  return (
    <Panel title="Company policy" action={<PrimaryButton disabled={!changed.length} loading={busy} onClick={save}>Save {changed.length ? `(${changed.length})` : ''}</PrimaryButton>}>
      <div className="divide-y divide-[#F1F5F9]">
        {items.map((s) => (
          <div key={s.key} className="py-4 grid grid-cols-1 md:grid-cols-[18rem_1fr] gap-3">
            <div>
              <p className="text-sm font-medium text-[#172B24]">{s.key.replace(/_/g, ' ')}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{s.description}</p>
            </div>
            <div>{input(s)}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ Health */
const Check = ({ ok, label, detail }) => (
  <li className="flex items-start gap-2 py-2">
    {ok === null || ok === undefined ? <Info className="w-4 h-4 text-[#64748B] mt-0.5" /> : ok ? <CheckCircle2 className="w-4 h-4 text-[#15803D] mt-0.5" /> : <XCircle className="w-4 h-4 text-[#DC2626] mt-0.5" />}
    <div><p className="text-sm text-[#172B24]">{label}</p>{detail && <p className="text-xs text-[#64748B]">{detail}</p>}</div>
  </li>
);

const HealthTab = ({ flash }) => {
  const [h, setH] = useState(null);
  const load = () => api.superAdmin.getHealth().then((r) => setH(r.data)).catch((e) => flash(false, errText(e, 'Health check failed.')));
  useEffect(() => { load(); }, []);
  if (!h) return <LoadingState message="Running health checks..." />;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Panel title="Checks" action={<SecondaryButton size="sm" onClick={load}>Re-run</SecondaryButton>}>
        <ul className="divide-y divide-[#F1F5F9]">
          <Check ok={h.database.ok} label={`Database reachable (${h.database.dialect})`} detail={`${h.database.latency_ms} ms round trip`} />
          <Check ok={h.database.migrations_up_to_date} label="Migrations up to date"
            detail={`current ${h.database.migration_current || 'none (schema created without Alembic)'} · head ${h.database.migration_head}`} />
          <Check ok={h.integrations.supabase_auth} label="Supabase Auth configured" />
          <Check ok={h.integrations.meta_oauth} label="Meta OAuth configured" />
          <Check ok={!h.auth.dev_shortcuts_enabled} label="Development shortcuts disabled" detail={`environment: ${h.environment}`} />
          <Check ok={!h.auth.auto_provision || h.auth.allowed_domains.length > 0} label="Sign-up restricted"
            detail={h.auth.auto_provision ? `auto-provision on · domains: ${h.auth.allowed_domains.join(', ') || 'any'}` : 'invite-only'} />
        </ul>
      </Panel>
      <Panel title="Runtime">
        <dl className="grid grid-cols-2 gap-3 text-xs">
          {[['Status', h.status], ['API version', h.version], ['Python', h.python], ['Checked', fmt(h.checked_at)],
            ...Object.entries(h.row_counts).map(([k, v]) => [k.replace('_', ' '), v.toLocaleString()])].map(([k, v]) => (
            <div key={k} className="p-3 rounded-md border border-[#E5E7EB]"><dt className="text-[#64748B] capitalize">{k}</dt><dd className="font-semibold text-[#172B24] tabular-nums">{v}</dd></div>
          ))}
        </dl>
      </Panel>
    </div>
  );
};

/* ------------------------------------------------------------------ Audit */
const AuditTab = ({ flash }) => {
  const [filters, setFilters] = useState({ action: '', privileged_only: false, date_from: '', date_to: '' });
  const [page, setPage] = useState(0);
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(null);
  const limit = 25;
  const run = (p = 0) => {
    const params = { limit, offset: p * limit, privileged_only: filters.privileged_only };
    if (filters.action) params.action = filters.action;
    if (filters.date_from) params.date_from = `${filters.date_from}T00:00:00`;
    if (filters.date_to) params.date_to = `${filters.date_to}T23:59:59`;
    api.superAdmin.searchAudit(params).then((r) => { setRes(r.data); setPage(p); }).catch((e) => flash(false, errText(e, 'Search failed.')));
  };
  useEffect(() => { run(0); }, []);
  return (
    <Panel title="Audit search">
      <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => { e.preventDefault(); run(0); }}>
        <FormField label="Action contains"><input className="enterprise-input" placeholder="e.g. offboard, role, leave" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} /></FormField>
        <FormField label="From"><input type="date" className="enterprise-input" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></FormField>
        <FormField label="To"><input type="date" className="enterprise-input" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></FormField>
        <label className="inline-flex items-center gap-2 text-sm text-[#172B24] h-[38px]">
          <input type="checkbox" className="accent-[#166534]" checked={filters.privileged_only} onChange={(e) => setFilters({ ...filters, privileged_only: e.target.checked })} /> Privileged only
        </label>
        <PrimaryButton type="submit">Search</PrimaryButton>
      </form>
      {!res ? <LoadingState message="Searching..." /> : (
        <>
          <p className="text-xs text-[#64748B] mb-2">{res.total.toLocaleString()} event(s)</p>
          <ul className="divide-y divide-[#F1F5F9] border border-[#E5E7EB] rounded-md">
            {res.items.map((a) => (
              <li key={a.id} className="text-xs">
                <button className="w-full text-left px-3 py-2 flex justify-between gap-3 hover:bg-[#F8FAFC]" onClick={() => setOpen(open === a.id ? null : a.id)}>
                  <span className="min-w-0 truncate"><span className="font-medium text-[#172B24]">{a.actor_name}</span> <span className="text-[#64748B]">{a.action.replace(/_/g, ' ')} · {a.entity_type}</span></span>
                  <span className="text-[#94A3B8] shrink-0">{fmt(a.created_at)}</span>
                </button>
                {open === a.id && <pre className="px-3 pb-3 text-[11px] text-[#475569] whitespace-pre-wrap break-all">{JSON.stringify(a.metadata, null, 2)}</pre>}
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2 mt-3">
            <SecondaryButton size="sm" disabled={page === 0} onClick={() => run(page - 1)}>Previous</SecondaryButton>
            <SecondaryButton size="sm" disabled={(page + 1) * limit >= res.total} onClick={() => run(page + 1)}>Next</SecondaryButton>
          </div>
        </>
      )}
    </Panel>
  );
};

/* ------------------------------------------------------------------ Page */
export const SuperAdminConsolePage = () => {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'overview';
  const [feedback, setFeedback] = useState(null);
  const flash = (ok, text) => setFeedback({ ok, text });
  const Tab = { overview: OverviewTab, admins: AdminsTab, settings: SettingsTab, health: HealthTab, audit: AuditTab }[tab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Control Center"
        description="Who holds power, how the company is configured, and whether the platform is healthy."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Super Admin' }]}
        actions={<span className="inline-flex items-center gap-1.5 text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-full px-3 py-1"><ShieldCheck className="w-3.5 h-3.5" /> Every action here is audit-logged</span>}
      />
      {feedback && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${feedback.ok ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'}`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
      <div className="flex gap-1 border-b border-[#E5E7EB] overflow-x-auto">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => { setFeedback(null); setParams(key === 'overview' ? {} : { tab: key }); }}
            className={`px-4 py-2 text-sm -mb-px border-b-2 whitespace-nowrap transition-colors ${tab === key ? 'border-[#166534] text-[#166534] font-medium' : 'border-transparent text-[#64748B] hover:text-[#172B24]'}`}>
            {label}
          </button>
        ))}
      </div>
      <Tab key={tab} flash={flash} />
    </div>
  );
};

export default SuperAdminConsolePage;
