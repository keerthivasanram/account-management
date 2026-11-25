import { describe, expect, it } from 'vitest';
import { attendanceBar, matchesPerson, plural } from './hrModel';

describe('hr helpers', () => {
  it('plurals', () => {
    expect(plural(1, 'person', 'people')).toBe('1 person');
    expect(plural(3, 'person', 'people')).toBe('3 people');
    expect(plural(0, 'team')).toBe('0 teams');
  });
  it('attendance bar widths', () => {
    expect(attendanceBar({ total: 10, present: 6, on_leave: 1 })).toEqual({ present: 60, leave: 10 });
    expect(attendanceBar({ total: 0, present: 0, on_leave: 0 })).toEqual({ present: 0, leave: 0 });
  });
  it('person search covers name, code, title and email', () => {
    const m = { full_name: 'Sarah Jenkins', employee_code: 'EMP-T004', job_title: 'Content', email: 'sarah@x.com' };
    expect(matchesPerson(m, 'sarah')).toBe(true);
    expect(matchesPerson(m, 't004')).toBe(true);
    expect(matchesPerson(m, 'content')).toBe(true);
    expect(matchesPerson(m, 'ravi')).toBe(false);
    expect(matchesPerson(m, '')).toBe(true);
  });
});
