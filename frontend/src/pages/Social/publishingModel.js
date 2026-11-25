// Publishing rules for the UI. The backend enforces all of them; these decide what to offer.

export const TABS = [
  { id: 'drafts', label: 'Drafts', statuses: ['DRAFT', 'REJECTED'] },
  { id: 'awaiting', label: 'Awaiting approval', statuses: ['PENDING_APPROVAL'] },
  { id: 'scheduled', label: 'Scheduled', statuses: ['APPROVED'] },
  { id: 'published', label: 'Published', statuses: ['PUBLISHED'] },
  { id: 'failed', label: 'Failed', statuses: ['FAILED'] },
];

export const tabById = (id) => TABS.find((t) => t.id === id) || TABS[0];
export const tabForStatus = (status) => TABS.find((t) => t.statuses.includes(status))?.id || 'drafts';

export const STATUS_TEXT = {
  DRAFT: 'Draft',
  REJECTED: 'Needs changes',
  PENDING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Scheduled',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
};

// Composer offers single-media formats; carousels need several files (not supported yet).
export const MEDIA_TYPES = [
  { value: 'IMAGE', label: 'Feed post' },
  { value: 'REELS', label: 'Reel' },
  { value: 'STORY', label: 'Story' },
];

export const CAPTION_MAX = 2200;

/** What the viewer can do with a post. The server says per post whether you may review it
 *  (admins: anyone's; team leads: their team's; never your own); `reviewer` is a fallback. */
export const postActionsFor = (post, me, reviewer = false) => {
  const mine = Boolean(me && post.created_by === me.id);
  const editable = post.status === 'DRAFT' || post.status === 'REJECTED';
  return {
    edit: mine && editable,
    submit: mine && editable,
    remove: mine && (editable || post.status === 'PENDING_APPROVAL'),
    review: !mine && post.status === 'PENDING_APPROVAL' && (post.can_review ?? reviewer),
  };
};

/** "Wed, 26 Nov 2026, 1:00 PM IST" in the viewer's own timezone. */
export const formatSchedule = (iso, locale = 'en-IN', timeZone = undefined) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(locale, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone,
  });
};

/** ISO instant <-> value for <input type="datetime-local"> (local wall-clock time). */
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

/**
 * Composer validation. Drafts only need an account, a caption and media;
 * sending for approval also needs a future time.
 */
export const validateComposer = (form, { submit = false, now = new Date() } = {}) => {
  const errors = {};
  if (!form.account_id) errors.account_id = 'Choose one of your accounts.';
  if (!form.caption?.trim()) errors.caption = 'Write a caption.';
  else if (form.caption.length > CAPTION_MAX) errors.caption = `Keep it under ${CAPTION_MAX} characters.`;
  if (!form.media_url) errors.media_url = 'Add a photo or video.';
  if (!form.scheduled_at) errors.scheduled_at = 'Pick a date and time.';
  else if (submit && new Date(form.scheduled_at) <= now) errors.scheduled_at = 'Pick a time in the future.';
  return errors;
};

export const isVideo = (post) => post.media_type === 'REELS' || /\.(mp4|mov)(\?|$)/i.test(post.media_url || '');
