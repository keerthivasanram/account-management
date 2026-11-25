import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Check, Clock, ImagePlus, Instagram, Link2, MessageSquareWarning, Pencil, Plus, Send, Trash2, Undo2, X,
} from 'lucide-react';
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
import {
  CAPTION_MAX, MEDIA_TYPES, STATUS_TEXT, TABS, formatSchedule, fromLocalInput, isVideo, postActionsFor,
  tabById, toLocalInput, validateComposer,
} from './publishingModel';

const errText = (err, fallback) => err?.response?.data?.detail || fallback;
const BADGE = { DRAFT: 'INFO', REJECTED: 'WARNING', PENDING_APPROVAL: 'PENDING', APPROVED: 'SCHEDULED', PUBLISHED: 'PUBLISHED', FAILED: 'FAILED' };
const textareaClass = 'w-full text-sm text-slate-900 p-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700';

const Media = ({ post, className = '' }) => {
  const src = post.media_preview_url;
  if (!src) {
    return (
      <div className={`bg-slate-100 flex items-center justify-center text-slate-400 ${className}`}>
        <ImagePlus className="w-6 h-6" aria-hidden="true" /><span className="sr-only">No preview</span>
      </div>
    );
  }
  return isVideo(post)
    ? <video src={src} className={`object-cover bg-slate-900 ${className}`} muted playsInline preload="metadata" aria-label="Video preview" />
    : <img src={src} alt="" className={`object-cover bg-slate-100 ${className}`} loading="lazy" />;
};

// ---------------------------------------------------------------- composer

const EMPTY = { account_id: '', caption: '', media_url: '', media_preview_url: '', media_type: 'IMAGE', scheduled_at: '' };

const Composer = ({ initial, accounts, onClose, onSaved }) => {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState(() => (initial ? {
    account_id: initial.account_id, caption: initial.caption, media_url: initial.media_url,
    media_preview_url: initial.media_preview_url, media_type: initial.media_type || 'IMAGE',
    scheduled_at: toLocalInput(initial.scheduled_at),
  } : EMPTY));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null); // 'upload' | 'draft' | 'submit'
  const [serverError, setServerError] = useState(null);
  const [linkMode, setLinkMode] = useState(false);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e)); // a fixed field drops its message
  };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const account = accounts.find((a) => a.id === form.account_id);

  const upload = async (file) => {
    if (!file) return;
    setBusy('upload');
    setServerError(null);
    try {
      const res = await api.socialPosts.uploadMedia(file);
      setForm((f) => ({
        ...f, media_url: res.data.media_ref, media_preview_url: res.data.preview_url,
        media_type: res.data.kind === 'VIDEO' && f.media_type === 'IMAGE' ? 'REELS' : f.media_type,
      }));
      setErrors((e) => ({ ...e, media_url: undefined }));
    } catch (err) {
      setServerError(errText(err, 'The file could not be uploaded.'));
    } finally {
      setBusy(null);
    }
  };

  const save = async (submit) => {
    const v = validateComposer({ ...form, scheduled_at: fromLocalInput(form.scheduled_at) }, { submit });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(submit ? 'submit' : 'draft');
    setServerError(null);
    const payload = {
      caption: form.caption.trim(), media_url: form.media_url, media_type: form.media_type,
      scheduled_at: fromLocalInput(form.scheduled_at), submit,
    };
    try {
      const res = editing
        ? await api.socialPosts.update(initial.id, payload)
        : await api.socialPosts.create({ ...payload, account_id: form.account_id });
      onSaved(res.data, submit ? 'Sent for approval. You’ll get a notification when it’s reviewed.' : 'Draft saved.');
    } catch (err) {
      setServerError(errText(err, 'The post could not be saved.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Edit post' : 'Create post'} maxWidth="max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">
        <div className="space-y-4">
          {initial?.review_note && (
            <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <MessageSquareWarning className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p><span className="font-medium">Reviewer asked for changes:</span> {initial.review_note}</p>
            </div>
          )}
          {serverError && (
            <p role="alert" className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {serverError}
            </p>
          )}

          <FormField label="Account" required id="p_account" error={errors.account_id}>
            <select
              id="p_account"
              value={form.account_id}
              disabled={editing}
              onChange={(e) => set('account_id', e.target.value)}
              className="enterprise-input w-full cursor-pointer disabled:opacity-70"
            >
              <option value="">{accounts.length ? 'Choose an account' : 'No accounts assigned to you'}</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}
            </select>
          </FormField>

          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1.5">Photo or video <span className="text-rose-600">*</span></span>
            {!linkMode ? (
              <label
                htmlFor="p_media"
                className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer focus-within:ring-2 focus-within:ring-brand-500"
              >
                <ImagePlus className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="text-sm text-slate-700">
                  {busy === 'upload' ? 'Uploading…' : form.media_url ? 'Replace file' : 'Upload a JPG, PNG, MP4 or MOV (up to 50 MB)'}
                </span>
                <input id="p_media" type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime" className="sr-only"
                  onChange={(e) => upload(e.target.files?.[0])} />
              </label>
            ) : (
              <input
                type="url"
                aria-label="Media link"
                value={form.media_url.startsWith('storage:') ? '' : form.media_url}
                onChange={(e) => { set('media_url', e.target.value); setForm((f) => ({ ...f, media_preview_url: e.target.value })); }}
                placeholder="https://…"
                className="enterprise-input w-full"
              />
            )}
            <button type="button" onClick={() => setLinkMode((m) => !m)} className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
              <Link2 className="w-3.5 h-3.5" aria-hidden="true" /> {linkMode ? 'Upload a file instead' : 'Use a link instead'}
            </button>
            {errors.media_url && <p className="mt-1 text-xs text-rose-700">{errors.media_url}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Format" id="p_type">
              <select id="p_type" value={form.media_type} onChange={(e) => set('media_type', e.target.value)} className="enterprise-input w-full cursor-pointer">
                {MEDIA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Publish at" required id="p_when" error={errors.scheduled_at} helpText={`Your time zone: ${tz}`}>
              <input id="p_when" type="datetime-local" value={form.scheduled_at} onChange={(e) => set('scheduled_at', e.target.value)} className="enterprise-input w-full" />
            </FormField>
          </div>

          <FormField label="Caption" required id="p_caption" error={errors.caption}>
            <textarea id="p_caption" rows={5} value={form.caption} maxLength={CAPTION_MAX + 200}
              onChange={(e) => set('caption', e.target.value)} placeholder="Write the caption, hashtags and mentions" className={textareaClass} />
            <p className={`mt-1 text-right text-xs tabular-nums ${form.caption.length > CAPTION_MAX ? 'text-rose-700' : 'text-slate-400'}`}>
              {form.caption.length} / {CAPTION_MAX}
            </p>
          </FormField>
        </div>

        {/* Preview */}
        <aside aria-label="Preview" className="hidden md:block">
          <p className="text-xs font-medium text-slate-500 mb-2">Preview</p>
          <div className="rounded-xl border border-[#E6EAF0] bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center"><Instagram className="w-4 h-4" aria-hidden="true" /></span>
              <span className="text-[13px] font-semibold text-slate-900 truncate">{account ? account.username : 'your_account'}</span>
            </div>
            <Media post={{ media_preview_url: form.media_preview_url, media_url: form.media_url, media_type: form.media_type }}
              className={`w-full ${form.media_type === 'IMAGE' ? 'aspect-square' : 'aspect-[9/16] max-h-80'}`} />
            <p className="px-3 py-2.5 text-xs text-slate-700 whitespace-pre-line line-clamp-6">
              {account && <span className="font-semibold text-slate-900">{account.username} </span>}
              {form.caption || <span className="text-slate-400">Your caption appears here.</span>}
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <SecondaryButton onClick={() => save(false)} loading={busy === 'draft'} disabled={Boolean(busy)}>Save draft</SecondaryButton>
        <PrimaryButton onClick={() => save(true)} loading={busy === 'submit'} disabled={Boolean(busy)} icon={Send}>Submit for approval</PrimaryButton>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------- post card

const PostCard = ({ post, actions, onEdit, onSubmit, onRemove, onApprove, onSendBack, busy }) => (
  <article className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft overflow-hidden flex flex-col" aria-label={`Post for @${post.account_username}`}>
    <Media post={post} className="w-full aspect-[4/3]" />
    <div className="p-4 flex-1 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-brand-700 truncate">@{post.account_username}</p>
        <StatusBadge status={BADGE[post.status]} text={STATUS_TEXT[post.status]} />
      </div>
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        {post.status === 'PUBLISHED' && post.published_at ? `Published ${formatSchedule(post.published_at)}` : formatSchedule(post.scheduled_at)}
      </p>
      <p className="text-sm text-slate-700 line-clamp-3 whitespace-pre-line">{post.caption}</p>
      {post.review_note && (
        <p className="text-xs p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900"><span className="font-medium">Changes needed:</span> {post.review_note}</p>
      )}
      {post.error_message && (
        <p className="text-xs p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700"><span className="font-medium">Couldn’t publish:</span> {post.error_message}</p>
      )}
      <p className="text-[11px] text-slate-400 mt-auto">By {post.creator_name}</p>
      {(actions.edit || actions.submit || actions.remove || actions.review) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {actions.edit && <SecondaryButton size="sm" icon={Pencil} onClick={onEdit}>Edit</SecondaryButton>}
          {actions.submit && <PrimaryButton size="sm" icon={Send} onClick={onSubmit} disabled={busy}>Submit</PrimaryButton>}
          {actions.review && <PrimaryButton size="sm" icon={Check} onClick={onApprove} disabled={busy}>Approve</PrimaryButton>}
          {actions.review && <SecondaryButton size="sm" icon={Undo2} onClick={onSendBack} disabled={busy}>Send back</SecondaryButton>}
          {actions.remove && (
            <SecondaryButton size="sm" icon={Trash2} onClick={onRemove} disabled={busy} aria-label={post.status === 'PENDING_APPROVAL' ? 'Withdraw post' : 'Delete draft'}>
              {post.status === 'PENDING_APPROVAL' ? 'Withdraw' : 'Delete'}
            </SecondaryButton>
          )}
        </div>
      )}
    </div>
  </article>
);

// ---------------------------------------------------------------- page

const EMPTY_TEXT = {
  drafts: ['No drafts', 'Posts you save without submitting, and posts sent back for changes, appear here.'],
  awaiting: ['Nothing awaiting approval', 'Submitted posts wait here until an admin reviews them.'],
  scheduled: ['Nothing scheduled', 'Approved posts appear here with their publish time.'],
  published: ['Nothing published yet', 'Published posts appear here.'],
  failed: ['No failed posts', 'If Instagram rejects a post when publishing, it appears here with the reason.'],
};

export const ScheduledPostsPage = () => {
  const { employee, can } = useAuth();
  const reviewer = can('accounts:manage_all');
  const [params, setParams] = useSearchParams();
  const tab = tabById(params.get('tab')).id;

  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [composer, setComposer] = useState(null); // null | {} (new) | post (edit)
  const [sendBack, setSendBack] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, a] = await Promise.all([
        api.socialPosts.list(),
        api.accounts.list({ limit: 200 }).catch(() => ({ data: [] })),
      ]);
      setPosts(p.data || []);
      // You can only post to accounts you can use; admins get everything from the same endpoint.
      setAccounts((a.data || []).filter((x) => x.status !== 'rejected'));
    } catch (err) {
      setError(errText(err, 'Posts could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, posts.filter((p) => t.statuses.includes(p.status)).length])), [posts]);
  const shown = posts.filter((p) => tabById(tab).statuses.includes(p.status));

  const setTab = (id) => setParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', id); return n; }, { replace: true });

  const act = async (post, fn, okText, nextTab) => {
    setBusyId(post.id);
    setFeedback(null);
    try {
      await fn();
      setFeedback({ ok: true, text: okText });
      await load();
      if (nextTab) setTab(nextTab);
    } catch (err) {
      setFeedback({ ok: false, text: errText(err, 'That didn’t go through.') });
    } finally {
      setBusyId(null);
    }
  };

  const confirmSendBack = async () => {
    if (!remarks.trim()) return;
    const post = sendBack;
    setSendBack(null);
    await act(post, () => api.socialPosts.review(post.id, { status: 'REJECTED', remarks: remarks.trim() }), 'Sent back to the author with your note.');
    setRemarks('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publishing"
        description={reviewer ? 'Create posts, review what your people submit, and follow what’s scheduled.' : 'Create posts for your accounts, send them for approval, and follow them until they’re live.'}
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'Publishing' }]}
        actions={<PrimaryButton size="sm" icon={Plus} onClick={() => setComposer({})}>Create post</PrimaryButton>}
      />

      {feedback && (
        <div role="status" className={`p-3.5 rounded-lg border text-sm flex items-center justify-between gap-3 ${feedback.ok ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'}`}>
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message" className="p-1 rounded hover:opacity-75"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div role="tablist" aria-label="Post status" className="flex gap-1 overflow-x-auto border-b border-[#E6EAF0] -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-t ${
              tab === t.id ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t.label}
            {counts[t.id] > 0 && <span className="ml-1.5 text-xs tabular-nums text-slate-500">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft">
          <EmptyState title={EMPTY_TEXT[tab][0]} description={EMPTY_TEXT[tab][1]}
            action={tab === 'drafts' ? <PrimaryButton size="sm" icon={Plus} onClick={() => setComposer({})}>Create post</PrimaryButton> : null} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {shown.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              busy={busyId === post.id}
              actions={postActionsFor(post, employee, reviewer)}
              onEdit={() => setComposer(post)}
              onSubmit={() => act(post, () => api.socialPosts.update(post.id, { submit: true }), 'Sent for approval.', 'awaiting')}
              onRemove={() => act(post, () => api.socialPosts.remove(post.id), post.status === 'PENDING_APPROVAL' ? 'Post withdrawn.' : 'Draft deleted.')}
              onApprove={() => act(post, () => api.socialPosts.review(post.id, { status: 'APPROVED' }), 'Approved. The author has been notified.')}
              onSendBack={() => { setRemarks(''); setSendBack(post); }}
            />
          ))}
        </div>
      )}

      {composer && (
        <Composer
          initial={composer.id ? composer : null}
          accounts={accounts}
          onClose={() => setComposer(null)}
          onSaved={(saved, text) => {
            setComposer(null);
            setFeedback({ ok: true, text });
            load().then(() => setTab(saved.status === 'PENDING_APPROVAL' ? 'awaiting' : 'drafts'));
          }}
        />
      )}

      {sendBack && (
        <Modal isOpen onClose={() => setSendBack(null)} title={`Send back @${sendBack.account_username}`} maxWidth="max-w-md">
          <div className="space-y-4">
            <FormField label="What needs to change?" required id="sb_note">
              <textarea id="sb_note" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={textareaClass}
                placeholder="e.g. Shorter hook, and add the price in the caption" />
            </FormField>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setSendBack(null)}>Cancel</SecondaryButton>
              <PrimaryButton icon={Undo2} disabled={!remarks.trim()} onClick={confirmSendBack}>Send back</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ScheduledPostsPage;
