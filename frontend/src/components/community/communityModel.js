const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** "Priya: 3 years at Klarves today" / "... on Fri 28 Nov" / "You: 1 year at Klarves tomorrow". */
export const celebrationText = (c, today = new Date()) => {
  const who = c.is_me ? 'You' : c.full_name;
  const when = new Date(`${String(c.date).slice(0, 10)}T00:00:00`);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((when - t0) / 86400000);
  const day = days <= 0 ? 'today' : days === 1 ? 'tomorrow'
    : `on ${when.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  return `${who}: ${plural(c.years, 'year')} at Klarves ${day}`;
};

export const KUDOS_MAX = 280;

export const kudosLine = (k) => (k.for_me
  ? `${k.from_name} → you`
  : k.sent_by_me ? `You → ${k.to_name}` : `${k.from_name} → ${k.to_name}`);
