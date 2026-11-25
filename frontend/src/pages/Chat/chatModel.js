// Internal links inside messages. Only paths into the Klarves app become links; the page they
// open is permission-checked by the server, so sharing never grants access by itself.
const INTERNAL = /(^|\s)(\/(?:accounts|tasks|social\/posts|help|mail|attendance|documents)(?:[/?][^\s]*)?)(?=\s|$)/g;

/** Splits message text into [{ text } | { to }] segments. */
export const splitLinks = (text = '') => {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INTERNAL)) {
    const start = m.index + m[1].length;
    if (start > last) out.push({ text: text.slice(last, start) });
    out.push({ to: m[2] });
    last = start + m[2].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
};

/** Friendly label for a shared path. */
export const linkLabel = (to) => {
  const [path, query = ''] = to.split('?');
  const q = new URLSearchParams(query);
  if (path.startsWith('/accounts')) return q.get('search') ? `@${q.get('search')}` : 'My accounts';
  if (path.startsWith('/tasks')) return 'Tasks';
  if (path.startsWith('/social/posts')) return 'Post';
  if (path.startsWith('/help')) return 'Support ticket';
  if (path.startsWith('/mail')) return 'Mail';
  return path;
};

/** Text inserted by the Share picker. */
export const shareText = (kind, item) => {
  if (kind === 'account') return `/accounts?search=${encodeURIComponent(item.username)}`; // shows as @username
  if (kind === 'task') return `Task “${item.title}” /tasks`;
  if (kind === 'post') {
    const tab = item.status === 'APPROVED' ? 'scheduled' : item.status === 'PUBLISHED' ? 'published' : item.status === 'PENDING_APPROVAL' ? 'awaiting' : 'drafts';
    return `Post for @${item.account_username} /social/posts?tab=${tab}`;
  }
  return '';
};
