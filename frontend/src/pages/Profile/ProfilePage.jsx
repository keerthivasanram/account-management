import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import FormField from '../../components/ui/FormField';
import PrimaryButton from '../../components/ui/PrimaryButton';
import StatusBadge from '../../components/ui/StatusBadge';

export const ProfilePage = () => {
  const { employee, refreshProfile } = useAuth();
  const [form, setForm] = useState({ phone_number: '', emergency_contact: '', bio: '' });
  const [balance, setBalance] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (employee) {
      setForm({
        phone_number: employee.phone_number || '',
        emergency_contact: employee.emergency_contact || '',
        bio: employee.bio || '',
      });
    }
  }, [employee?.id]);

  useEffect(() => {
    api.attendance.getLeaveBalance().then((r) => setBalance(r.data)).catch(() => setBalance(null));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.employees.updateMyProfile(form);
      await refreshProfile();
      setMsg({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err?.response?.data?.detail || 'Could not save profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  const facts = [
    ['Employee ID', employee.employee_code],
    ['Role', employee.role_label || employee.role],
    ['Department', employee.department_name || '—'],
    ['Manager', employee.manager_name || '—'],
    ['Job title', employee.job_title || '—'],
    ['Joined', employee.joined_on || '—'],
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="My Profile"
        description="Your details as HR sees them. Role, department and manager are managed by administrators."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'My Profile' }]}
      />

      <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-semibold">
            {employee.full_name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900 truncate">{employee.full_name}</p>
            <p className="text-xs text-[#64748B] truncate">{employee.email}</p>
          </div>
        </div>
        <StatusBadge status={employee.status || 'ACTIVE'} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        {facts.map(([k, v]) => (
          <div key={k} className="p-3 bg-white border border-[#E5E7EB] rounded-md">
            <span className="text-[#64748B] block mb-0.5">{k}</span>
            <span className="text-slate-900 font-medium">{v}</span>
          </div>
        ))}
      </div>

      {balance && (
        <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Leave balance · {balance.year}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {balance.balances.map((b) => (
              <div key={b.leave_type} className="p-3 rounded-md border border-[#E5E7EB] bg-[#F8FAFC]">
                <p className="text-[11px] uppercase tracking-wider text-[#64748B]">{b.leave_type.toLowerCase()}</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">{b.remaining}<span className="text-xs text-[#64748B] font-normal"> / {b.allowance} days</span></p>
                {b.pending > 0 && <p className="text-[11px] text-[#D97706]">{b.pending} pending</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={save} className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Contact details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Phone number">
            <input className="enterprise-input w-full" maxLength={50} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </FormField>
          <FormField label="Emergency contact" helpText="Name and phone number">
            <input className="enterprise-input w-full" maxLength={255} value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
          </FormField>
        </div>
        <FormField label="About me">
          <textarea className="enterprise-input w-full min-h-[90px]" maxLength={2000} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </FormField>
        <div className="flex items-center justify-end gap-3">
          {msg && <span className={`text-xs ${msg.ok ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>{msg.text}</span>}
          <PrimaryButton type="submit" loading={saving}>Save</PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
