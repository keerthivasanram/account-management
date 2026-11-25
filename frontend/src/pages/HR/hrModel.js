export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export const shortDate = (d) =>
  (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');

/** Percent widths for a department's "today" bar (present, on leave; the rest is not clocked in). */
export const attendanceBar = (d) => {
  if (!d.total) return { present: 0, leave: 0 };
  return { present: Math.round((d.present / d.total) * 100), leave: Math.round((d.on_leave / d.total) * 100) };
};

/** Filter a team's members (or the unassigned list) by a search string on name, code or job title. */
export const matchesPerson = (m, q) => {
  const s = (q || '').trim().toLowerCase();
  if (!s) return true;
  return [m.full_name, m.employee_code, m.job_title, m.email].filter(Boolean).some((v) => v.toLowerCase().includes(s));
};
