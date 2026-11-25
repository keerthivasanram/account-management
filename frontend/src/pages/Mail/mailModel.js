export const CATEGORIES = [
  { id: '', label: 'All mail' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'notices', label: 'Company notices' },
  { id: 'support', label: 'Support' },
  { id: 'security', label: 'Security' },
  { id: 'other', label: 'Other' },
];

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'Other';

/** Button text for the item a mail points to; null when there's nothing in-app to open. */
export const relatedAction = (linkUrl) => {
  if (!linkUrl || !linkUrl.startsWith('/')) return null;
  const path = linkUrl.split('?')[0];
  if (path.startsWith('/accounts')) return 'Open account';
  if (path.startsWith('/tasks')) return 'Open task';
  if (path.startsWith('/social/posts')) return 'Open post';
  if (path.startsWith('/help')) return 'Open ticket';
  if (path.startsWith('/attendance')) return 'Open leave';
  if (path.startsWith('/admin/security')) return 'Open security';
  return 'Open';
};

/** "10:24 am" today, "Yesterday", or "24 Nov". */
export const mailTime = (iso, now = new Date()) => {
  const d = new Date(iso);
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
};

export const announceMailChange = () => {
  try { window.dispatchEvent(new Event('klarves-mail-changed')); } catch { /* non-browser */ }
};
