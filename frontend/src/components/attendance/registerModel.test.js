import { describe, expect, it } from 'vitest';
import { applyWeekOff, canToggleWeekOff, cellTitle, monthLabel, shiftMonth } from './registerModel';

describe('register helpers', () => {
  it('month navigation crosses years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthLabel('2026-11')).toMatch(/November 2026/);
  });
  it('only days with nothing recorded can become week offs', () => {
    for (const c of ['WO', 'NR', 'A', '-']) expect(canToggleWeekOff({ code: c })).toBe(true);
    for (const c of ['P', 'HD', 'L', 'H', 'MO']) expect(canToggleWeekOff({ code: c })).toBe(false);
  });
  it('cell titles read naturally', () => {
    expect(cellTitle('2026-11-20', { code: 'P', hours: 10, late: true })).toMatch(/20 Nov · Present · 10 h · late$/);
  });
  it('optimistic roster updates keep totals right, both directions', () => {
    const reg = { today: '2026-11-25', days: ['2026-11-20', '2026-11-28'], rules: { absent_without_roster: false },
      rows: [{ employee_id: 'e1', days: [{ code: 'NR' }, { code: '-' }], totals: { NR: 1, WO: 0, A: 0 } }] };
    const on = applyWeekOff(reg, 'e1', '2026-11-20', true);
    expect(on.rows[0].days[0].code).toBe('WO');
    expect(on.rows[0].totals).toMatchObject({ NR: 0, WO: 1 });
    const back = applyWeekOff(on, 'e1', '2026-11-20', false);
    expect(back.rows[0].days[0].code).toBe('NR');      // past day returns to "No record"
    const future = applyWeekOff(applyWeekOff(reg, 'e1', '2026-11-28', true), 'e1', '2026-11-28', false);
    expect(future.rows[0].days[1].code).toBe('-');     // future day returns to blank
  });
});
