import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ImagePlus, LifeBuoy, MessageSquarePlus, Paperclip, Search, Send, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import { TICKET_CATEGORIES, TICKET_STATUS, searchArticles, ticketCategoryLabel } from './helpContent';
import { mailTime, announceMailChange } from '../Mail/mailModel';

const errText = (err, fallback) => err?.response?.data?.detail || fallback;
const textareaClass = 'w-full text-sm text-slate-900 p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700';
const BADGE = { OPEN: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', RESOLVED: 'RESOLVED', CLOSED: 'INFO' };

// ---------------------------------------------------------------- raise a ticket

const NewTicket = ({ onClose, onCreated, defaultCategory }) => {
  const [form, setForm] = useState({ category: defaultCategory || 'OTHER', subject: '', description: '' });
  const [shot, setShot] = useState(null); // { ref, preview, name }
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const upload = async (file) => {
    if (!file) return;
    setBusy('upload');
    setError(null);
    try {
      const r = await api.support.uploadAttachment(file);
      setShot({ ref: r.data.media_ref, preview: r.data.preview_url, name: file.name });
    } catch (err) {
      setError(errText(err, 'The screenshot could not be attached.'));
    } finally {
      setBusy(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy('send');
    setError(null);
    try {
      const r = await api.support.create({ ...form, subject: form.subject.trim(), description: form.description.trim(), attachment_ref: shot?.ref });
      onCreated(r.data);
    } catch (err) {
      setError(errText(err, 'The ticket could not be sent.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Raise a ticket" maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</p>}
        <FormField label="What is it about?" id="t_cat">
          <select id="t_cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="enterprise-input w-full cursor-pointer">
            {TICKET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </FormField>
        <FormField label="Subject" required id="t_subj">
          <input id="t_subj" value={form.subject} minLength={3} maxLength={200} required onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="e.g. Reel won’t upload for @northstudio" className="enterprise-input w-full" />
        </FormField>
        <FormField label="What happened?" required id="t_desc" helpText="What you tried, what you expected, and any message you saw.">
          <textarea id="t_desc" rows={5} value={form.description} minLength={5} maxLength={5000} required onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaClass} />
        </FormField>
        <div>
          {shot ? (
            <div className="flex items-center gap-3 p-2 rounded-lg ring-1 ring-slate-200">
              {shot.preview && <img src={shot.preview} alt="" className="w-12 h-12 rounded object-cover" />}
              <span className="text-sm text-slate-700 truncate flex-1">{shot.name}</span>
              <button type="button" onClick={() => setShot(null)} aria-label="Remove screenshot" className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label htmlFor="t_shot" className="inline-flex items-center gap-2 text-sm text-brand-700 hover:underline cursor-pointer focus-within:ring-2 focus-within:ring-brand-500 rounded">
              <Paperclip className="w-4 h-4" aria-hidden="true" /> {busy === 'upload' ? 'Attaching…' : 'Attach a screenshot (optional)'}
              <input id="t_shot" type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" icon={Send} loading={busy === 'send'} disabled={busy === 'upload'}>Send ticket</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------- ticket conversation

const TicketView = ({ id, staff, meId, onBack, onChanged }) => {
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try { setT((await api.support.get(id)).data); } catch (err) { setError(errText(err, 'The ticket could not be loaded.')); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    setBusy(true);
    setActionError(null);
    try {
      setT((await fn()).data);
      onChanged();
      announceMailChange();
      return true;
    } catch (err) {
      setActionError(errText(err, 'That didn’t go through.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!t) return <div className="h-40 rounded-xl bg-slate-100 animate-pulse" aria-busy="true" />;
  const mine = t.created_by === meId;

  return (
    <section className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft" aria-label={`Ticket ${t.reference}`}>
      <div className="p-5 border-b border-[#E6EAF0]">
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All tickets
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{t.reference} · {ticketCategoryLabel(t.category)}{staff && !mine ? ` · from ${t.creator_name}` : ''}</p>
            <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{t.subject}</h2>
          </div>
          <div className="flex items-center gap-2">
            {staff ? (
              <select aria-label="Status" value={t.status} disabled={busy} onChange={(e) => act(() => api.support.update(t.id, { status: e.target.value }))} className="enterprise-input cursor-pointer">
                {Object.entries(TICKET_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : (
              <StatusBadge status={BADGE[t.status]} text={TICKET_STATUS[t.status]} />
            )}
            {mine && t.status !== 'CLOSED' && !staff && (
              <SecondaryButton size="sm" disabled={busy} onClick={() => act(() => api.support.update(t.id, { status: 'CLOSED' }))}>Close ticket</SecondaryButton>
            )}
          </div>
        </div>
      </div>

      <ol className="p-5 space-y-4">
        <li className="rounded-lg bg-slate-50 ring-1 ring-slate-100 p-3.5">
          <p className="text-xs text-slate-500">{t.creator_name} · {mailTime(t.created_at)}</p>
          <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">{t.description}</p>
          {t.attachment_url && (
            <a href={t.attachment_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-700 hover:underline">
              <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" /> View screenshot
            </a>
          )}
        </li>
        {t.messages.map((m) => (
          <li key={m.id} className={`rounded-lg p-3.5 ${m.from_support ? 'bg-brand-50 ring-1 ring-brand-100 sm:ml-10' : 'bg-slate-50 ring-1 ring-slate-100 sm:mr-10'}`}>
            <p className="text-xs text-slate-500">{m.author_name}{m.from_support ? ' · Support' : ''} · {mailTime(m.created_at)}</p>
            <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">{m.body}</p>
          </li>
        ))}
      </ol>

      <div className="p-5 border-t border-[#E6EAF0]">
        {actionError && <p role="alert" className="mb-2 text-sm text-rose-700">{actionError}</p>}
        {t.status === 'CLOSED' ? (
          <p className="text-sm text-slate-500">This ticket is closed. Raise a new ticket if you still need help.</p>
        ) : (
          <form onSubmit={async (e) => { e.preventDefault(); if (reply.trim() && await act(() => api.support.reply(t.id, reply.trim()))) setReply(''); }} className="space-y-2">
            <label htmlFor="t_reply" className="sr-only">Reply</label>
            <textarea id="t_reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} className={textareaClass}
              placeholder={t.status === 'RESOLVED' && mine ? 'Still not fixed? Reply and the ticket reopens.' : 'Write a reply'} />
            <div className="flex justify-end"><PrimaryButton type="submit" size="sm" icon={Send} loading={busy} disabled={!reply.trim()}>Send reply</PrimaryButton></div>
          </form>
        )}
      </div>
    </section>
  );
};

// ---------------------------------------------------------------- page

export const HelpPage = () => {
  const { employee, can } = useAuth();
  const staff = can('admin:portal');
  const [params, setParams] = useSearchParams();
  const ticketId = params.get('ticket');
  const scope = staff && params.get('scope') === 'all' ? 'all' : 'mine';

  const [query, setQuery] = useState('');
  const [openArticle, setOpenArticle] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(null);
  const [raising, setRaising] = useState(null); // null | category id
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setTickets((await api.support.list({ scope, status: statusFilter || undefined })).data || []);
    } catch (err) {
      setError(errText(err, 'Tickets could not be loaded.'));
    }
  }, [scope, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const setParam = (patch) => setParams((prev) => {
    const n = new URLSearchParams(prev);
    Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    return n;
  });

  const results = searchArticles(query);

  if (ticketId) {
    return (
      <div className="space-y-5 max-w-3xl">
        <PageHeader title="Help & support" breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Help & support', to: '/help' }, { label: 'Ticket' }]} />
        <TicketView id={ticketId} staff={staff} meId={employee?.id} onBack={() => setParam({ ticket: null })} onChanged={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & support"
        description="Find instructions for account setup, publishing and access, or raise a ticket and track the response."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Help & support' }]}
        actions={<PrimaryButton size="sm" icon={MessageSquarePlus} onClick={() => setRaising('OTHER')}>Raise a ticket</PrimaryButton>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        {/* Articles */}
        <section aria-label="Help articles" className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-5">
          <label className="relative block">
            <span className="sr-only">Search help</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help, e.g. reconnect, upload, sign in" className="enterprise-input w-full !pl-9 !h-11" />
          </label>
          <p className="sr-only" role="status">{results.length} articles</p>
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-700">No articles match “{query}”.</p>
              <SecondaryButton size="sm" className="mt-3" icon={MessageSquarePlus} onClick={() => setRaising('OTHER')}>Ask support instead</SecondaryButton>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {results.map((a) => {
                const open = openArticle === a.id || (query && results.length <= 2);
                return (
                  <li key={a.id}>
                    <button type="button" aria-expanded={Boolean(open)} aria-controls={`art-${a.id}`} onClick={() => setOpenArticle(open ? null : a.id)}
                      className="w-full py-3 flex items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
                      <span>
                        <span className="block text-sm font-medium text-slate-900">{a.title}</span>
                        <span className="block text-xs text-slate-500">{ticketCategoryLabel(a.category)}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {open && (
                      <div id={`art-${a.id}`} className="pb-4">
                        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">{a.body.map((line, i) => <li key={i}>{line}</li>)}</ol>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          {a.to && <Link to={a.to} className="font-medium text-brand-700 hover:underline">{a.action} →</Link>}
                          <button type="button" onClick={() => setRaising(a.category)} className="text-slate-600 hover:text-slate-900 hover:underline">Still stuck? Raise a ticket</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Tickets */}
        <section aria-label={scope === 'all' ? 'All tickets' : 'My tickets'} className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft">
          <div className="p-5 pb-3 flex flex-wrap items-center justify-between gap-2">
            {staff ? (
              <div role="tablist" aria-label="Tickets" className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                {[['mine', 'My tickets'], ['all', 'All tickets']].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={scope === id} onClick={() => setParam({ scope: id === 'mine' ? null : id })}
                    className={`h-8 px-3 rounded-md text-[13px] font-medium ${scope === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{label}</button>
                ))}
              </div>
            ) : <h2 className="text-[15px] font-semibold text-slate-900">My tickets</h2>}
            <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="enterprise-input h-8 text-xs cursor-pointer">
              <option value="">All statuses</option>
              {Object.entries(TICKET_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {error ? <div className="p-5"><ErrorState message={error} onRetry={load} /></div> : !tickets ? (
            <div className="p-5 space-y-2" aria-busy="true"><div className="h-12 rounded bg-slate-100 animate-pulse" /><div className="h-12 rounded bg-slate-100 animate-pulse" /></div>
          ) : tickets.length === 0 ? (
            <EmptyState icon={LifeBuoy} title={statusFilter ? 'No tickets with this status' : 'No tickets yet'}
              description={scope === 'all' ? 'Tickets people raise appear here.' : 'If the articles don’t solve it, raise a ticket and track the reply here.'} />
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setParam({ ticket: t.id })}
                    className="w-full text-left px-5 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 line-clamp-1">{t.subject}</span>
                      <StatusBadge status={BADGE[t.status]} text={TICKET_STATUS[t.status]} />
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {t.reference} · {ticketCategoryLabel(t.category)}{scope === 'all' ? ` · ${t.creator_name}` : ''} · updated {mailTime(t.updated_at)}
                      {t.reply_count ? ` · ${t.reply_count} ${t.reply_count === 1 ? 'reply' : 'replies'}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {raising && (
        <NewTicket defaultCategory={raising} onClose={() => setRaising(null)} onCreated={(t) => {
          setRaising(null);
          load();
          setParam({ ticket: t.id });
        }} />
      )}
    </div>
  );
};

export default HelpPage;
