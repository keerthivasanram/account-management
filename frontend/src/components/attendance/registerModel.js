// Day codes from the backend register, with how they look and read.
export const CODES = {
  P: { label: 'Present', short: 'P', cls: 'bg-brand-600 text-white' },
  HD: { label: 'Half day', short: '½', cls: 'bg-brand-200 text-brand-900' },
  S: { label: 'Short day', short: 'S', cls: 'bg-amber-100 text-amber-900' },
  MO: { label: 'Missed clock-out', short: '!', cls: 'bg-rose-100 text-rose-800' },
  IN: { label: 'On shift now', short: '•', cls: 'bg-brand-100 text-brand-800' },
  L: { label: 'Leave', short: 'L', cls: 'bg-sky-100 text-sky-800' },
  WO: { label: 'Week off', short: 'WO', cls: 'bg-slate-200 text-slate-700' },
  H: { label: 'Holiday', short: 'H', cls: 'bg-violet-100 text-violet-800' },
  A: { label: 'Absent', short: 'A', cls: 'bg-rose-600 text-white' },
  NR: { label: 'No record', short: '·', cls: 'bg-white text-slate-300 ring-1 ring-inset ring-slate-200' },
  '-': { label: '', short: '', cls: 'bg-transparent' },
};

export const LEGEND = ['P', 'HD', 'S', 'MO', 'L', 'WO', 'H', 'NR'];

/** A roster cell can be switched to / from a week off when nothing real happened that day. */
export const canToggleWeekOff = (cell) => ['WO', 'NR', 'A', '-'].includes(cell.code);

/** "2026-11" shifted by n months. */
export const shiftMonth = (month, n) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const currentMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Cell tooltip: "Fri 20 Nov · Present · 10 h · late". */
export const cellTitle = (iso, cell) => {
  const day = new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return [day, CODES[cell.code]?.label, cell.hours != null ? `${cell.hours} h` : null, cell.late ? 'late' : null]
    .filter(Boolean).join(' · ');
};

/** Applies a roster change to a register locally (optimistic update). */
export const applyWeekOff = (register, employeeId, iso, off) => ({
  ...register,
  rows: register.rows.map((r) => {
    if (r.employee_id !== employeeId) return r;
    const i = register.days.indexOf(iso);
    const prev = r.days[i].code;
    const next = off ? 'WO' : (iso < register.today ? (register.rules.absent_without_roster ? 'A' : 'NR') : '-');
    const days = r.days.map((c, j) => (j === i ? { code: next } : c));
    const totals = { ...r.totals };
    if (prev in totals) totals[prev] -= 1;
    if (next in totals) totals[next] += 1;
    return { ...r, days, totals };
  }),
});
