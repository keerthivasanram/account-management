import React, { useState } from 'react';
import { api } from '../../services/api';
import Modal from '../Modal';
import FormField from '../ui/FormField';
import PrimaryButton from '../ui/PrimaryButton';
import SecondaryButton from '../ui/SecondaryButton';

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * "Fix a day": ask for a clock-in / clock-out to be corrected. `people` (optional) lets HR or a
 * team lead file it for someone else; the team lead or Senior HR then approves it.
 */
export const CorrectionModal = ({ onClose, onSent, people = null, defaults = {} }) => {
  const [form, setForm] = useState({ employee_id: defaults.employee_id || '', date: defaults.date || yesterday(),
    check_in: '09:00', check_out: '19:00', reason: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.attendance.requestCorrection({ ...form, employee_id: form.employee_id || undefined, reason: form.reason.trim() });
      onSent('Correction sent. You’ll get Mail when it’s approved or rejected.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'The correction could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Fix a day" maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">Forgot to clock in or out? Enter the real times. Your team lead or HR approves it.</p>
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</p>}
        {people && (
          <FormField label="For" id="c_emp">
            <select id="c_emp" value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} className="enterprise-input w-full cursor-pointer">
              <option value="">Myself</option>
              {people.map((p) => <option key={p.employee_id} value={p.employee_id}>{p.full_name}</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Day" required id="c_day">
          <input id="c_day" type="date" required max={todayIso()} value={form.date} onChange={(e) => set('date', e.target.value)} className="enterprise-input w-full" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Clock-in" required id="c_in">
            <input id="c_in" type="time" required value={form.check_in} onChange={(e) => set('check_in', e.target.value)} className="enterprise-input w-full" />
          </FormField>
          <FormField label="Clock-out" required id="c_out">
            <input id="c_out" type="time" required value={form.check_out} onChange={(e) => set('check_out', e.target.value)} className="enterprise-input w-full" />
          </FormField>
        </div>
        <FormField label="What happened?" required id="c_reason">
          <textarea id="c_reason" rows={3} required minLength={3} maxLength={1000} value={form.reason} onChange={(e) => set('reason', e.target.value)}
            placeholder="e.g. Forgot to clock out after the client call" className="enterprise-input w-full min-h-[80px]" />
        </FormField>
        <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" loading={busy}>Send for approval</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};

export default CorrectionModal;
