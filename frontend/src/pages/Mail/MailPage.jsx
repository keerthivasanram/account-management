import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, ArrowLeft, CheckCheck, ExternalLink, Inbox, Mail, MailOpen, Megaphone, Search, Send, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import { CATEGORIES, announceMailChange, categoryLabel, mailTime, relatedAction } from './mailModel';

const errText = (err, fallback) => err?.response?.data?.detail || fallback;
const textareaClass = 'w-full text-sm text-slate-900 p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700';

// ---------------------------------------------------------------- notice composer (admins)

const NoticeComposer = ({ onClose, onSent }) => {
  const [form, setForm] = useState({ title: '', message: '', department_id: '' });
  const [depts, setDepts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { api.departments.list().then((r) => setDepts(r.data || [])).catch(() => {}); }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.mail.sendNotice({ title: form.title.trim(), message: form.message.trim(), department_id: form.department_id || undefined });
      onSent(`Notice sent to ${r.data.recipients} ${r.data.recipients === 1 ? 'person' : 'people'} (${r.data.audience}).`);
    } catch (err) {
      setError(errText(err, 'The notice could not be sent.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="New company notice" maxWidth="max-w-lg">
      <form onSubmit={send} className="space-y-4">
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</p>}
        <FormField label="Send to" id="n_aud">
          <select id="n_aud" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="enterprise-input w-full cursor-pointer">
            <option value="">Everyone in the company</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name} department</option>)}
          </select>
        </FormField>
        <FormField label="Subject" required id="n_title">
          <input id="n_title" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} className="enterprise-input w-full" required />
        </FormField>
        <FormField label="Message" required id="n_msg">
          <textarea id="n_msg" rows={6} value={form.message} maxLength={5000} onChange={(e) => setForm({ ...form, message: e.target.value })} className={textareaClass} required />
        </FormField>
        <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" icon={Send} loading={busy}>Send notice</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------- reader

const Reader = ({ mail, onBack, onToggleRead, onArchive, busy }) => {
  const navigate = useNavigate();
  const open = relatedAction(mail.link_url);
  return (
    <article className="p-5 sm:p-6" aria-label={mail.title}>
      <button type="button" onClick={onBack} className="lg:hidden mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to mail
      </button>
      <p className="text-xs font-medium text-brand-700">{categoryLabel(mail.category)}</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{mail.title}</h2>
      <p className="text-xs text-slate-500 mt-1">{new Date(mail.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      <p className="mt-5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{mail.message}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {open && <PrimaryButton size="sm" icon={ExternalLink} onClick={() => navigate(mail.link_url)}>{open}</PrimaryButton>}
        <SecondaryButton size="sm" icon={mail.is_read ? Mail : MailOpen} onClick={onToggleRead} disabled={busy}>
          {mail.is_read ? 'Mark as unread' : 'Mark as read'}
        </SecondaryButton>
        <SecondaryButton size="sm" icon={mail.archived ? Inbox : Archive} onClick={onArchive} disabled={busy}>
          {mail.archived ? 'Move to inbox' : 'Archive'}
        </SecondaryButton>
      </div>
    </article>
  );
};

// ---------------------------------------------------------------- page

export const MailPage = () => {
  const { can } = useAuth();
  const isAdmin = can('employees:manage');
  const [params, setParams] = useSearchParams();
  const folder = ['inbox', 'archived', 'sent'].includes(params.get('folder')) ? params.get('folder') : 'inbox';
  const selectedId = params.get('id');

  const [items, setItems] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [composing, setComposing] = useState(false);

  const setParam = (patch) => setParams((prev) => {
    const n = new URLSearchParams(prev);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    return n;
  }, { replace: true });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (folder === 'sent') {
        setSent((await api.mail.sentNotices()).data || []);
      } else {
        const r = await api.mail.list({ folder, q: q.trim() || undefined, category: category || undefined });
        setItems(r.data || []);
      }
    } catch (err) {
      setError(errText(err, 'Mail could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [folder, q, category]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0); // debounce typing
    return () => clearTimeout(t);
  }, [load, q]);

  const selected = items.find((m) => m.id === selectedId) || null;
  const unread = items.filter((m) => !m.is_read).length;

  const patch = async (mail, data) => {
    setBusy(true);
    try {
      const r = await api.mail.update(mail.id, data);
      setItems((prev) => prev.map((m) => (m.id === mail.id ? r.data : m)));
      announceMailChange();
      return r.data;
    } catch (err) {
      setFeedback({ ok: false, text: errText(err, 'That didn’t go through.') });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const openMail = (mail) => {
    setParam({ id: mail.id });
    if (!mail.is_read) patch(mail, { is_read: true });
  };

  const archive = async (mail) => {
    const r = await patch(mail, { archived: !mail.archived });
    if (r) {
      setItems((prev) => prev.filter((m) => m.id !== mail.id)); // it left this folder
      setParam({ id: null });
      setFeedback({ ok: true, text: r.archived ? 'Archived. Find it under Archived.' : 'Moved back to your inbox.' });
    }
  };

  const readAll = async () => {
    try {
      await api.mail.readAll();
      setItems((prev) => prev.map((m) => ({ ...m, is_read: true })));
      announceMailChange();
    } catch (err) {
      setFeedback({ ok: false, text: errText(err, 'Could not mark everything as read.') });
    }
  };

  const folders = [
    ['inbox', 'Inbox', Inbox],
    ['archived', 'Archived', Archive],
    ...(isAdmin ? [['sent', 'Sent notices', Megaphone]] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mail"
        description="Approval decisions, assignment changes, company notices and support replies, kept here so you can find them later."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Mail' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {folder === 'inbox' && unread > 0 && <SecondaryButton size="sm" icon={CheckCheck} onClick={readAll}>Mark all read</SecondaryButton>}
            {isAdmin && <PrimaryButton size="sm" icon={Megaphone} onClick={() => setComposing(true)}>New notice</PrimaryButton>}
          </div>
        }
      />

      {feedback && (
        <div role="status" className={`p-3 rounded-lg border text-sm flex items-center justify-between gap-3 ${feedback.ok ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'}`}>
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message" className="p-1 rounded hover:opacity-75"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div role="tablist" aria-label="Folders" className="flex gap-1 bg-slate-100 p-0.5 rounded-lg w-fit">
          {folders.map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={folder === id}
              onClick={() => setParam({ folder: id === 'inbox' ? null : id, id: null })}
              className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                folder === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
              <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
              {id === 'inbox' && folder === 'inbox' && unread > 0 && <span className="text-xs text-rose-700 tabular-nums">{unread}</span>}
            </button>
          ))}
        </div>
        {folder !== 'sent' && (
          <div className="flex gap-2 flex-1">
            <label className="relative flex-1 min-w-0">
              <span className="sr-only">Search mail</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail" className="enterprise-input w-full !pl-9" />
            </label>
            <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="enterprise-input cursor-pointer">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : folder === 'sent' ? (
        <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft">
          {loading ? <div className="p-5"><div className="h-10 rounded bg-slate-100 animate-pulse" /></div> : sent.length === 0 ? (
            <EmptyState icon={Megaphone} title="No notices sent yet" description="Company notices you send appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {sent.map((n, i) => (
                <li key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 truncate">{n.title}</span>
                    <span className="block text-xs text-slate-500">To {n.audience} · {n.recipients} {n.recipients === 1 ? 'person' : 'people'}</span>
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{mailTime(n.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft overflow-hidden lg:grid lg:grid-cols-[380px_1fr] lg:min-h-[520px]">
          {/* list (hidden on small screens while reading) */}
          <div className={`${selected ? 'hidden lg:block' : 'block'} lg:border-r border-[#E6EAF0] min-w-0`}>
            {loading ? (
              <div className="p-4 space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded bg-slate-100 animate-pulse" />)}</div>
            ) : items.length === 0 ? (
              <EmptyState icon={folder === 'archived' ? Archive : Inbox}
                title={q || category ? 'No mail matches' : folder === 'archived' ? 'Nothing archived' : 'Your inbox is empty'}
                description={q || category ? 'Try a different search or category.' : folder === 'archived' ? 'Mail you archive is kept here.' : 'Approvals, assignments and notices will arrive here.'} />
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
                {items.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => openMail(m)} aria-current={m.id === selectedId ? 'true' : undefined}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
                        m.id === selectedId ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${m.is_read ? 'bg-transparent' : 'bg-brand-600'}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2">
                          <span className={`text-sm truncate ${m.is_read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>
                            {m.title}{!m.is_read && <span className="sr-only"> (unread)</span>}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">{mailTime(m.created_at)}</span>
                        </span>
                        <span className="block text-xs text-slate-500 truncate">{m.message.split('\n')[0]}</span>
                        <span className="block text-[11px] text-brand-700 mt-0.5">{categoryLabel(m.category)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* reader */}
          <div className={`${selected ? 'block' : 'hidden lg:flex'} min-w-0 lg:items-center lg:justify-center`}>
            {selected ? (
              <div className="w-full self-start">
                <Reader mail={selected} busy={busy} onBack={() => setParam({ id: null })}
                  onToggleRead={() => patch(selected, { is_read: !selected.is_read })} onArchive={() => archive(selected)} />
              </div>
            ) : (
              <p className="text-sm text-slate-400 p-8">Select a message to read it.</p>
            )}
          </div>
        </div>
      )}

      {composing && (
        <NoticeComposer onClose={() => setComposing(false)} onSent={(text) => {
          setComposing(false);
          setFeedback({ ok: true, text });
          setParam({ folder: 'sent', id: null });
        }} />
      )}
    </div>
  );
};

export default MailPage;
