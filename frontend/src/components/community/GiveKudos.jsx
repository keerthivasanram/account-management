import React, { useEffect, useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { api } from '../../services/api';
import Modal from '../Modal';
import FormField from '../ui/FormField';
import PrimaryButton from '../ui/PrimaryButton';
import SecondaryButton from '../ui/SecondaryButton';
import { KUDOS_MAX } from './communityModel';

const SUGGESTIONS = ['Thanks for the quick review!', 'That carousel looked great.', 'Thanks for covering for me today.'];

/** Thank a colleague. Recipients are the people you work with (same list as Team messages). */
export const GiveKudos = ({ onClose, onSent, defaultTo = '' }) => {
  const [people, setPeople] = useState(null);
  const [to, setTo] = useState(defaultTo);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.chat.contacts().then((r) => setPeople(r.data || [])).catch(() => { setPeople([]); setError('People could not be loaded.'); });
  }, []);

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.community.giveKudos({ to_id: to, message: message.trim() });
      const name = people.find((p) => p.id === to)?.full_name || 'them';
      onSent(`Kudos sent to ${name}.`);
    } catch (err) {
      setError(err?.response?.data?.detail || 'The kudos could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Give kudos" maxWidth="max-w-md">
      <form onSubmit={send} className="space-y-4">
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</p>}
        {people && people.length === 0 && !error ? (
          <p className="text-sm text-slate-600">There’s nobody to thank yet. You can give kudos to your manager, department and team.</p>
        ) : (
          <>
            <FormField label="Who" required id="k_to">
              <select id="k_to" value={to} required onChange={(e) => setTo(e.target.value)} className="enterprise-input w-full cursor-pointer" disabled={!people}>
                <option value="">{people ? 'Choose a colleague' : 'Loading…'}</option>
                {(people || []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </FormField>
            <FormField label="What did they do well?" required id="k_msg">
              <textarea id="k_msg" rows={3} maxLength={KUDOS_MAX} required value={message} onChange={(e) => setMessage(e.target.value)}
                className="w-full text-sm text-slate-900 p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700" />
              <span className="flex justify-between items-start gap-2 mt-1">
                <span className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setMessage(s)} className="text-[11px] px-2 py-0.5 rounded-full ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50">{s}</button>
                  ))}
                </span>
                <span className="text-xs text-slate-400 tabular-nums shrink-0">{message.length}/{KUDOS_MAX}</span>
              </span>
            </FormField>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" icon={PartyPopper} loading={busy} disabled={!to || !message.trim()}>Send kudos</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};

export default GiveKudos;
