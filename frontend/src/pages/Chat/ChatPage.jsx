import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Hash, Link2, MessageSquare, PartyPopper, Plus, Send, Users, X } from 'lucide-react';
import GiveKudos from '../../components/community/GiveKudos';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import Modal from '../../components/Modal';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import { linkLabel, shareText, splitLinks } from './chatModel';
import { mailTime } from '../Mail/mailModel';

const errText = (err, fallback) => err?.response?.data?.detail || fallback;
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

const MessageText = ({ text, mine }) => (
  <>
    {splitLinks(text).map((seg, i) => (seg.to ? (
      <Link key={i} to={seg.to} className={`inline-flex items-center gap-1 underline underline-offset-2 font-medium ${mine ? 'text-white' : 'text-brand-700'}`}>
        <Link2 className="w-3 h-3" aria-hidden="true" />{linkLabel(seg.to)}
      </Link>
    ) : <span key={i}>{seg.text}</span>))}
  </>
);

// ---------------------------------------------------------------- new conversation

const NewConversation = ({ canGroup, isAdmin, onClose, onCreated }) => {
  const [mode, setMode] = useState('DIRECT');
  const [contacts, setContacts] = useState(null);
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [groupType, setGroupType] = useState('PROJECT');
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.chat.contacts().then((r) => setContacts(r.data || [])).catch((err) => { setContacts([]); setError(errText(err, 'People could not be loaded.')); });
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = mode === 'DIRECT'
        ? { type: 'DIRECT', member_ids: [target] }
        : { type: groupType, title: title.trim(), member_ids: members };
      const r = await api.chat.createConversation(payload);
      onCreated(r.data);
    } catch (err) {
      setError(errText(err, 'The conversation could not be started.'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id) => setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <Modal isOpen onClose={onClose} title="New conversation" maxWidth="max-w-md">
      <form onSubmit={create} className="space-y-4">
        {canGroup && (
          <div role="tablist" aria-label="Conversation type" className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-lg text-sm">
            {[['DIRECT', 'Direct message'], ['GROUP', 'Group']].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
                className={`py-1.5 rounded-md font-medium ${mode === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{label}</button>
            ))}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">{error}</p>}
        {!contacts ? <div className="h-10 rounded bg-slate-100 animate-pulse" /> : contacts.length === 0 ? (
          <p className="text-sm text-slate-600">There’s nobody you can message yet. You can message your manager and your department once an administrator sets them on your profile.</p>
        ) : mode === 'DIRECT' ? (
          <FormField label="Message" required id="c_to">
            <select id="c_to" value={target} onChange={(e) => setTarget(e.target.value)} required className="enterprise-input w-full cursor-pointer">
              <option value="">Choose a person</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.is_manager ? ' (your manager)' : ''}{c.job_title ? ` · ${c.job_title}` : ''}</option>)}
            </select>
          </FormField>
        ) : (
          <>
            <FormField label="Group name" required id="c_title">
              <input id="c_title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="e.g. Winter launch" className="enterprise-input w-full" />
            </FormField>
            <FormField label="Kind" id="c_kind">
              <select id="c_kind" value={groupType} onChange={(e) => setGroupType(e.target.value)} className="enterprise-input w-full cursor-pointer">
                <option value="PROJECT">Project group</option>
                <option value="DEPARTMENT">Department group</option>
                {isAdmin && <option value="ANNOUNCEMENT">Announcements</option>}
              </select>
            </FormField>
            <fieldset>
              <legend className="text-sm font-medium text-slate-700 mb-1.5">Members</legend>
              <div className="max-h-48 overflow-y-auto rounded-lg ring-1 ring-slate-200 divide-y divide-slate-100">
                {contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={members.includes(c.id)} onChange={() => toggle(c.id)} className="accent-brand-700" />
                    {c.full_name}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" loading={busy} disabled={!contacts?.length || (mode === 'DIRECT' ? !target : !title.trim() || !members.length)}>Start</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------- share picker

const SharePicker = ({ onPick, onClose }) => {
  const [tab, setTab] = useState('account');
  const [data, setData] = useState({});
  const [error, setError] = useState(null);
  useEffect(() => {
    if (data[tab]) return;
    const load = {
      account: () => api.employees.getMyAccounts({ limit: 100 }),
      task: () => api.tasks.list({ my_tasks_only: true }),
      post: () => api.socialPosts.list({ mine: true }),
    }[tab];
    load().then((r) => setData((d) => ({ ...d, [tab]: r.data || [] }))).catch((err) => setError(errText(err, 'Could not load your items.')));
  }, [tab, data]);
  const items = data[tab];
  const label = (it) => (tab === 'account' ? `@${it.username}` : tab === 'task' ? it.title : `@${it.account_username} · ${it.caption?.slice(0, 40) || ''}`);

  return (
    <Modal isOpen onClose={onClose} title="Share a link" maxWidth="max-w-md">
      <div role="tablist" aria-label="What to share" className="grid grid-cols-3 bg-slate-100 p-0.5 rounded-lg text-sm mb-3">
        {[['account', 'Account'], ['task', 'Task'], ['post', 'Post']].map(([id, l]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`py-1.5 rounded-md font-medium ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l}</button>
        ))}
      </div>
      <p className="text-xs text-slate-500 mb-2">The other person only sees it if they have access to it.</p>
      {error ? <p className="text-sm text-rose-700">{error}</p> : !items ? <div className="h-24 rounded bg-slate-100 animate-pulse" /> : items.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">Nothing to share here yet.</p>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
          {items.slice(0, 50).map((it) => (
            <li key={it.id}>
              <button type="button" onClick={() => onPick(shareText(tab, it))} className="w-full text-left px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-50 truncate">{label(it)}</button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

// ---------------------------------------------------------------- page

export const ChatPage = () => {
  const { employee, can } = useAuth();
  const [convos, setConvos] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [msgError, setMsgError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [kudos, setKudos] = useState(false);
  const [notice, setNotice] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const loadConvos = useCallback(async () => {
    try {
      setConvos((await api.chat.listConversations()).data || []);
      setError(null);
    } catch (err) {
      setError(errText(err, 'Conversations could not be loaded.'));
    }
  }, []);
  useEffect(() => { loadConvos(); }, [loadConvos]);

  const active = convos?.find((c) => c.id === activeId) || null;

  useEffect(() => {
    if (!activeId) return undefined;
    let alive = true;
    const pull = () => api.chat.getMessages(activeId)
      .then((r) => { if (alive) { setMessages(r.data || []); setMsgError(null); } })
      .catch((err) => alive && setMsgError(errText(err, 'Messages could not be loaded.')));
    setMessages([]);
    pull();
    const t = setInterval(pull, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [activeId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !active) return;
    setSending(true);
    setMsgError(null);
    try {
      const r = await api.chat.sendMessage(active.id, content);
      setMessages((m) => [...m, r.data]);
      setText('');
      loadConvos();
    } catch (err) {
      setMsgError(errText(err, 'The message wasn’t sent.'));
    } finally {
      setSending(false);
    }
  };

  const sorted = (convos || []).slice().sort((a, b) =>
    new Date(b.latest_message?.created_at || b.created_at) - new Date(a.latest_message?.created_at || a.created_at));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team messages"
        description="Talk with your manager, your team and project groups. Share links to accounts, tasks and posts."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Team messages' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton size="sm" icon={PartyPopper} onClick={() => setKudos(true)}>Give kudos</SecondaryButton>
            <PrimaryButton size="sm" icon={Plus} onClick={() => setCreating(true)}>New conversation</PrimaryButton>
          </div>
        }
      />
      {notice && <p role="status" className="text-sm text-[#15803D]">{notice}</p>}

      {error ? <ErrorState message={error} onRetry={loadConvos} /> : (
        <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft overflow-hidden h-[calc(100vh-15rem)] min-h-[480px] md:grid md:grid-cols-[300px_1fr]">
          {/* conversation list */}
          <nav aria-label="Conversations" className={`${active ? 'hidden md:flex' : 'flex'} flex-col h-full md:border-r border-[#E6EAF0] min-w-0`}>
            {!convos ? (
              <div className="p-4 space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded bg-slate-100 animate-pulse" />)}</div>
            ) : sorted.length === 0 ? (
              <div className="p-6 text-center my-auto">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-900">No conversations yet</p>
                <p className="text-xs text-slate-500 mt-1">Start one with your manager or a teammate.</p>
                <SecondaryButton size="sm" icon={Plus} className="mt-3" onClick={() => setCreating(true)}>New conversation</SecondaryButton>
              </div>
            ) : (
              <ul className="overflow-y-auto divide-y divide-slate-100">
                {sorted.map((c) => {
                  const m = c.latest_message;
                  const group = c.type !== 'DIRECT';
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => setActiveId(c.id)} aria-current={c.id === activeId ? 'true' : undefined}
                        className={`w-full text-left px-4 py-3 flex gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${c.id === activeId ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                        <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center shrink-0">
                          {group ? <Hash className="w-4 h-4" aria-hidden="true" /> : initials(c.title)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex justify-between gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">{c.title}</span>
                            {m && <span className="text-[11px] text-slate-400 shrink-0">{mailTime(m.created_at)}</span>}
                          </span>
                          <span className="block text-xs text-slate-500 truncate">
                            {m ? `${m.sender_id === employee?.id ? 'You' : m.sender?.full_name?.split(' ')[0]}: ${m.is_redacted ? 'Message removed' : m.content}` : group ? `${c.member_count} members` : 'No messages yet'}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          {/* conversation */}
          <section aria-label={active ? active.title : 'Conversation'} className={`${active ? 'flex' : 'hidden md:flex'} flex-col h-full min-w-0`}>
            {!active ? (
              <p className="m-auto text-sm text-slate-400">Choose a conversation.</p>
            ) : (
              <>
                <header className="h-14 px-4 border-b border-[#E6EAF0] flex items-center gap-3 shrink-0">
                  <button type="button" onClick={() => setActiveId(null)} aria-label="Back to conversations" className="md:hidden p-1.5 -ml-1 rounded text-slate-600 hover:bg-slate-100"><ArrowLeft className="w-4 h-4" /></button>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{active.title}</span>
                    <span className="block text-[11px] text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3" aria-hidden="true" /> {active.members.map((m) => m.full_name).join(', ')}
                    </span>
                  </span>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" aria-live="polite">
                  {messages.length === 0 && !msgError && <p className="text-center text-sm text-slate-400 mt-10">No messages yet. Say hello.</p>}
                  {messages.map((m) => {
                    const mine = m.sender_id === employee?.id;
                    return (
                      <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        <span className="text-[11px] text-slate-500 mb-0.5">{mine ? 'You' : m.sender?.full_name} · {mailTime(m.created_at)}</span>
                        <div className={`px-3 py-2 rounded-2xl max-w-[85%] sm:max-w-md text-sm leading-relaxed whitespace-pre-line break-words ${mine ? 'bg-brand-700 text-white rounded-br-md' : 'bg-white ring-1 ring-slate-200 text-slate-900 rounded-bl-md'}`}>
                          {m.is_redacted ? <em className="opacity-80">Message removed (it contained sensitive data)</em> : <MessageText text={m.content} mine={mine} />}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                {msgError && <p role="alert" className="px-4 py-2 text-xs text-rose-700 bg-rose-50 border-t border-rose-200 flex justify-between">{msgError}<button type="button" onClick={() => setMsgError(null)} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button></p>}
                <form onSubmit={send} className="p-3 border-t border-[#E6EAF0] flex items-center gap-2">
                  <button type="button" onClick={() => setSharing(true)} aria-label="Share a link to an account, task or post" title="Share a link"
                    className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center">
                    <Link2 className="w-4 h-4" />
                  </button>
                  <label htmlFor="chat-input" className="sr-only">Message</label>
                  <input id="chat-input" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Write a message" className="enterprise-input flex-1 min-w-0 h-10" autoComplete="off" />
                  <PrimaryButton type="submit" icon={Send} loading={sending} disabled={!text.trim()}><span className="hidden sm:inline">Send</span></PrimaryButton>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {creating && (
        <NewConversation canGroup={can('manager:portal')} isAdmin={can('admin:portal')} onClose={() => setCreating(false)}
          onCreated={(c) => { setCreating(false); loadConvos().then(() => setActiveId(c.id)); }} />
      )}
      {kudos && <GiveKudos onClose={() => setKudos(false)} onSent={(t) => { setKudos(false); setNotice(t); }} />}
      {sharing && (
        <SharePicker onClose={() => setSharing(false)} onPick={(snippet) => {
          setSharing(false);
          setText((t) => (t.trim() ? `${t.trim()} ${snippet}` : snippet));
          setTimeout(() => inputRef.current?.focus(), 0);
        }} />
      )}
    </div>
  );
};

export default ChatPage;
