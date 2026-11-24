import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import MetricCard from '../../components/ui/MetricCard';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchInput from '../../components/ui/SearchInput';
import FilterDropdown from '../../components/ui/FilterDropdown';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import FormField from '../../components/ui/FormField';
import Modal from '../../components/Modal';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import ErrorState from '../../components/ui/ErrorState';
import Protected from '../../components/ui/Protected';
import { Users, UserPlus, Upload, Download, UserCheck, Mail, LogOut, UserX } from 'lucide-react';

const errText = (err, fallback) => err?.response?.data?.detail || fallback;

const EMPTY_INVITE = { email: '', full_name: '', role: 'employee', department_id: '', manager_id: '', job_title: '', joined_on: '' };

const stripEmpty = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const AdminEmployeesPage = () => {
  const { employee: me, isSuperAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ roles: [], departments: [], managers: [], account_target_min: 50, account_target_max: 60 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const [selected, setSelected] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [offboardTarget, setOffboardTarget] = useState(null);
  const [offboardForm, setOffboardForm] = useState({ reassign_to: '', reason: '' });
  const [confirm, setConfirm] = useState(null); // { kind: 'reactivate' | 'logout', emp }
  const [importResult, setImportResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const minTarget = meta.account_target_min;
  const maxTarget = meta.account_target_max;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, metaRes] = await Promise.all([api.admin.listEmployees(), api.admin.getPeopleMeta()]);
      setEmployees(empRes.data || []);
      setMeta(metaRes.data);
    } catch (err) {
      setError(errText(err, 'Unable to load employees.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (type, text) => setFeedback({ type, text });

  // A super admin can manage anyone; admins cannot manage admins / super admins.
  const canManage = (emp) => isSuperAdmin || !['admin', 'super_admin'].includes(emp.role);

  const openDetails = async (emp) => {
    setSelected(emp);
    setLoadingDetails(true);
    try {
      const res = await api.admin.getEmployeeAccounts(emp.id, { filter_type: 'assigned' });
      setAccounts(res.data || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const submitInvite = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.admin.inviteEmployee(stripEmpty(inviteForm));
      flash('success', `${res.data.full_name} invited as ${res.data.role_label}. They are linked automatically on first sign-in.`);
      setInviteOpen(false);
      setInviteForm(EMPTY_INVITE);
      load();
    } catch (err) {
      flash('error', errText(err, 'Invitation failed.'));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (emp) => {
    setEditTarget(emp);
    setEditForm({
      full_name: emp.full_name || '',
      role: emp.role,
      job_title: emp.job_title || '',
      department_id: emp.department_id || '',
      manager_id: emp.manager_id || '',
      status: emp.status,
      joined_on: emp.joined_on || '',
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      full_name: editForm.full_name,
      job_title: editForm.job_title,
      joined_on: editForm.joined_on || undefined,
    };
    if (editForm.role !== editTarget.role) payload.role = editForm.role;
    if (editForm.status !== editTarget.status && editForm.status !== 'OFFBOARDED') payload.status = editForm.status;
    if (editForm.department_id) payload.department_id = editForm.department_id; else payload.clear_department = true;
    if (editForm.manager_id) payload.manager_id = editForm.manager_id; else payload.clear_manager = true;
    try {
      await api.admin.updateEmployee(editTarget.id, payload);
      flash('success', `${editForm.full_name} updated.`);
      setEditTarget(null);
      load();
    } catch (err) {
      flash('error', errText(err, 'Update failed.'));
    } finally {
      setBusy(false);
    }
  };

  const submitOffboard = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.admin.offboardEmployee(offboardTarget.id, stripEmpty(offboardForm));
      const d = res.data;
      flash('success', `${offboardTarget.full_name} offboarded. ${d.accounts_reassigned} account(s), ${d.tasks_reassigned} task(s) and ${d.reports_moved} report(s) handed over. Sessions revoked.`);
      setOffboardTarget(null);
      setOffboardForm({ reassign_to: '', reason: '' });
      load();
    } catch (err) {
      flash('error', errText(err, 'Offboarding failed.'));
    } finally {
      setBusy(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'reactivate') {
        await api.admin.reactivateEmployee(confirm.emp.id);
        flash('success', `${confirm.emp.full_name} reactivated.`);
      } else {
        await api.admin.revokeSessions(confirm.emp.id);
        flash('success', `All sessions for ${confirm.emp.full_name} were revoked.`);
      }
      setConfirm(null);
      load();
    } catch (err) {
      flash('error', errText(err, 'Action failed.'));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.admin.importEmployees(file);
      setImportResult(res.data);
      load();
    } catch (err) {
      flash('error', errText(err, 'Import failed.'));
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.admin.exportEmployees();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      flash('error', errText(err, 'Export failed.'));
    }
  };

  const filtered = useMemo(() => employees.filter((emp) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (![emp.full_name, emp.email, emp.employee_code].some((v) => v?.toLowerCase().includes(q))) return false;
    }
    if (statusFilter && emp.status !== statusFilter) return false;
    if (roleFilter && emp.role !== roleFilter) return false;
    if (deptFilter && emp.department_id !== deptFilter) return false;
    return true;
  }), [employees, searchQuery, statusFilter, roleFilter, deptFilter]);

  const counts = useMemo(() => ({
    active: employees.filter((e) => e.status === 'ACTIVE').length,
    invited: employees.filter((e) => e.status === 'INVITED').length,
    onLeave: employees.filter((e) => e.status === 'ON_LEAVE').length,
    outOfRange: employees.filter((e) => e.status === 'ACTIVE' && e.role === 'employee'
      && (e.assigned_accounts_count < minTarget || e.assigned_accounts_count > maxTarget)).length,
  }), [employees, minTarget, maxTarget]);

  const successors = (exclude) => employees.filter((e) => e.is_active && e.id !== exclude?.id);

  const columns = [
    {
      header: 'Employee',
      accessor: 'full_name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#166534] font-semibold text-xs shrink-0">
            {row.full_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[#172B24] truncate">{row.full_name}</p>
            <span className="text-[11px] text-[#64748B]">{row.job_title || row.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Code',
      accessor: 'employee_code',
      render: (row) => (
        <span className="font-mono text-xs text-[#172B24] font-medium bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
          {row.employee_code}
        </span>
      ),
    },
    { header: 'Role', accessor: 'role', render: (row) => <StatusBadge status={row.role} text={row.role_label} /> },
    {
      header: 'Department / Manager',
      accessor: 'department_name',
      render: (row) => (
        <div className="text-xs">
          <p className="text-[#172B24]">{row.department_name || '—'}</p>
          <p className="text-[#64748B]">{row.manager_name ? `Reports to ${row.manager_name}` : 'No manager'}</p>
        </div>
      ),
    },
    {
      header: 'Accounts',
      accessor: 'assigned_accounts_count',
      render: (row) => {
        const count = row.assigned_accounts_count || 0;
        const pct = Math.min(100, Math.round((count / maxTarget) * 100));
        const over = count > maxTarget;
        const under = row.role === 'employee' && count < minTarget;
        return (
          <div className="w-32">
            <div className="flex justify-between text-xs mb-1">
              <span className={`font-medium ${over ? 'text-[#DC2626]' : 'text-[#172B24]'}`}>{count}</span>
              <span className="text-[#64748B]">{minTarget}–{maxTarget}</span>
            </div>
            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${over ? 'bg-[#DC2626]' : under ? 'bg-[#D97706]' : 'bg-[#166534]'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const manageable = canManage(row) && row.id !== me?.id;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canManage(row) && <SecondaryButton size="sm" onClick={() => openEdit(row)}>Edit</SecondaryButton>}
            {manageable && row.status !== 'OFFBOARDED' && (
              <>
                <SecondaryButton size="sm" icon={LogOut} title="Force logout" aria-label="Force logout" onClick={() => setConfirm({ kind: 'logout', emp: row })} />
                <SecondaryButton size="sm" danger onClick={() => { setOffboardTarget(row); setOffboardForm({ reassign_to: row.manager_id || '', reason: '' }); }}>
                  Offboard
                </SecondaryButton>
              </>
            )}
            {manageable && row.status === 'OFFBOARDED' && (
              <SecondaryButton size="sm" onClick={() => setConfirm({ kind: 'reactivate', emp: row })}>Reactivate</SecondaryButton>
            )}
          </div>
        );
      },
    },
  ];

  const selectCls = 'enterprise-input w-full';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Management"
        description="Onboard, organise and offboard people. Every change is permission-checked and audit-logged."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Management' }, { label: 'Employees' }]}
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
            <SecondaryButton icon={Download} onClick={handleExport}>Export</SecondaryButton>
            <SecondaryButton icon={Upload} onClick={() => fileRef.current?.click()} disabled={busy}>Import CSV</SecondaryButton>
            <PrimaryButton icon={UserPlus} onClick={() => setInviteOpen(true)}>Invite employee</PrimaryButton>
          </>
        }
      />

      {feedback && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${feedback.type === 'success' ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'}`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="p-0.5 hover:opacity-75" aria-label="Dismiss">✕</button>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active" value={counts.active} icon={UserCheck} subtext="Currently working" />
        <MetricCard label="Invited" value={counts.invited} icon={Mail} subtext="Not signed in yet" />
        <MetricCard label="On leave" value={counts.onLeave} icon={Users} subtext="Status ON_LEAVE" />
        <MetricCard label="Outside account target" value={counts.outOfRange} icon={UserX} subtext={`Employees outside ${minTarget}–${maxTarget}`} />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="w-full lg:w-80">
          <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, email, or code..." />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="All statuses"
            options={['INVITED', 'ACTIVE', 'ON_LEAVE', 'OFFBOARDED'].map((s) => ({ value: s, label: s.replace('_', ' ').toLowerCase() }))} />
          <FilterDropdown value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} placeholder="All roles"
            options={(meta.all_roles || []).map((r) => ({ value: r.value, label: r.label }))} />
          <FilterDropdown value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} placeholder="All departments"
            options={meta.departments.map((d) => ({ value: d.id, label: d.name }))} />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyTitle="No employees found"
        emptyDescription="No employee profiles match your filters."
        onRowClick={openDetails}
      />

      {/* Details */}
      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} title={`${selected.full_name} — profile & workload`} maxWidth="max-w-2xl">
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {[
                ['Email', <Protected type="employee" id={selected.id} field="email">{selected.email}</Protected>],
                ['Phone', selected.phone_number ? <Protected type="employee" id={selected.id} field="phone_number">{selected.phone_number}</Protected> : '—'],
                ['Employee ID', selected.employee_code],
                ['Role', selected.role_label],
                ['Status', selected.status],
                ['Department', selected.department_name || '—'],
                ['Manager', selected.manager_name || '—'],
                ['Direct reports', selected.direct_reports_count],
                ['Job title', selected.job_title || '—'],
                ['Joined', selected.joined_on || (selected.created_at && new Date(selected.created_at).toLocaleDateString()) || '—'],
                ['Last login', selected.last_login_at ? new Date(selected.last_login_at).toLocaleString() : 'Never'],
              ].map(([k, v]) => (
                <div key={k} className="p-3 bg-white border border-[#E5E7EB] rounded-md">
                  <span className="text-[#64748B] block mb-0.5">{k}</span>
                  <span className="text-[#172B24] font-medium break-words">{v}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-[#172B24] uppercase tracking-wider">Assigned Instagram accounts ({accounts.length})</h5>
              <div className="max-h-56 overflow-y-auto divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg bg-white">
                {loadingDetails ? (
                  <div className="p-4 text-center text-xs text-[#64748B]">Loading…</div>
                ) : accounts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#64748B]">No accounts assigned.</div>
                ) : accounts.map((acc) => (
                  <div key={acc.id} className="p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#172B24]">@{acc.username}</span>
                      <p className="text-[11px] text-[#64748B]">{acc.client_name || 'No client'}</p>
                    </div>
                    <StatusBadge status={acc.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Invite */}
      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite an employee" maxWidth="max-w-xl">
        <form onSubmit={submitInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Work email" required>
              <input type="email" required className={selectCls} value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </FormField>
            <FormField label="Full name" required>
              <input required className={selectCls} value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} />
            </FormField>
            <FormField label="Role" helpText={isSuperAdmin ? undefined : 'Only super admins can grant admin roles.'}>
              <select className={selectCls} value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                {meta.roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </FormField>
            <FormField label="Job title">
              <input className={selectCls} value={inviteForm.job_title} onChange={(e) => setInviteForm({ ...inviteForm, job_title: e.target.value })} />
            </FormField>
            <FormField label="Department">
              <select className={selectCls} value={inviteForm.department_id} onChange={(e) => setInviteForm({ ...inviteForm, department_id: e.target.value })}>
                <option value="">—</option>
                {meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FormField>
            <FormField label="Reports to">
              <select className={selectCls} value={inviteForm.manager_id} onChange={(e) => setInviteForm({ ...inviteForm, manager_id: e.target.value })}>
                <option value="">—</option>
                {meta.managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </FormField>
            <FormField label="Start date">
              <input type="date" className={selectCls} value={inviteForm.joined_on} onChange={(e) => setInviteForm({ ...inviteForm, joined_on: e.target.value })} />
            </FormField>
          </div>
          <p className="text-xs text-[#64748B]">The person signs in with this email; their profile is linked automatically and moves from Invited to Active.</p>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setInviteOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" loading={busy}>Send invite</PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      {editTarget && (
        <Modal isOpen onClose={() => setEditTarget(null)} title={`Edit ${editTarget.full_name}`} maxWidth="max-w-xl">
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full name" required>
                <input required className={selectCls} value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </FormField>
              <FormField label="Job title">
                <input className={selectCls} value={editForm.job_title} onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })} />
              </FormField>
              <FormField label="Role" helpText={editTarget.id === me?.id ? 'You cannot change your own role.' : undefined}>
                <select className={selectCls} disabled={editTarget.id === me?.id} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  {[...meta.roles, ...(meta.roles.some((r) => r.value === editTarget.role) ? [] : [{ value: editTarget.role, label: editTarget.role_label }])]
                    .map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select className={selectCls} value={editForm.status} disabled={editTarget.status === 'OFFBOARDED'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  {['INVITED', 'ACTIVE', 'ON_LEAVE'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  {editTarget.status === 'OFFBOARDED' && <option value="OFFBOARDED">OFFBOARDED</option>}
                </select>
              </FormField>
              <FormField label="Department">
                <select className={selectCls} value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}>
                  <option value="">—</option>
                  {meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </FormField>
              <FormField label="Reports to">
                <select className={selectCls} value={editForm.manager_id} onChange={(e) => setEditForm({ ...editForm, manager_id: e.target.value })}>
                  <option value="">—</option>
                  {meta.managers.filter((m) => m.id !== editTarget.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </FormField>
              <FormField label="Start date">
                <input type="date" className={selectCls} value={editForm.joined_on} onChange={(e) => setEditForm({ ...editForm, joined_on: e.target.value })} />
              </FormField>
            </div>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setEditTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" loading={busy}>Save changes</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Offboard */}
      {offboardTarget && (
        <Modal isOpen onClose={() => setOffboardTarget(null)} title={`Offboard ${offboardTarget.full_name}`} maxWidth="max-w-lg">
          <form onSubmit={submitOffboard} className="space-y-4">
            <div className="p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
              <p>This will, in one step:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>hand over {offboardTarget.assigned_accounts_count} Instagram account(s) and all open tasks to the successor</li>
                <li>move direct reports to {offboardTarget.manager_name || 'the successor (if a manager)'}</li>
                <li>revoke every session and trusted device and block sign-in</li>
              </ul>
              <p>History (completed tasks, audit trail) is kept.</p>
            </div>
            <FormField label="Successor" helpText="Required if they still own accounts or open tasks.">
              <select className={selectCls} value={offboardForm.reassign_to} onChange={(e) => setOffboardForm({ ...offboardForm, reassign_to: e.target.value })}>
                <option value="">—</option>
                {successors(offboardTarget).map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code}) · {e.assigned_accounts_count} accounts</option>)}
              </select>
            </FormField>
            <FormField label="Reason">
              <input className={selectCls} maxLength={500} value={offboardForm.reason} onChange={(e) => setOffboardForm({ ...offboardForm, reason: e.target.value })} placeholder="e.g. Resigned, contract ended" />
            </FormField>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setOffboardTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" loading={busy} className="!bg-[#DC2626] hover:!bg-[#B91C1C]">Offboard</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Import result */}
      {importResult && (
        <Modal isOpen onClose={() => setImportResult(null)} title="CSV import finished" maxWidth="max-w-lg">
          <div className="space-y-3 text-sm">
            <p><strong>{importResult.created}</strong> invited · <strong>{importResult.skipped}</strong> skipped (already exist or blank)</p>
            {importResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-xs text-[#991B1B] space-y-1">
                {importResult.errors.map((e) => <p key={e}>{e}</p>)}
              </div>
            )}
            <p className="text-xs text-[#64748B]">Columns: email, full_name, role, department_code, manager_email, job_title, joined_on (YYYY-MM-DD).</p>
          </div>
        </Modal>
      )}

      <ConfirmationDialog
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title={confirm?.kind === 'reactivate' ? 'Reactivate employee' : 'Force logout'}
        message={confirm?.kind === 'reactivate'
          ? `Restore access for ${confirm?.emp.full_name}? They will be able to sign in again.`
          : `Sign ${confirm?.emp.full_name} out of every device now? They can sign in again immediately.`}
        confirmText={confirm?.kind === 'reactivate' ? 'Reactivate' : 'Revoke sessions'}
        danger={confirm?.kind === 'logout'}
        loading={busy}
      />
    </div>
  );
};

export default AdminEmployeesPage;
