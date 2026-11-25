import { describe, expect, it } from 'vitest';
import { layoutVariantFor, navSectionsFor, teamNavFor, isNavLinkActive } from './navConfig';

const EMPLOYEE = ['accounts:read_own'];
const MANAGER = ['accounts:read_own', 'manager:portal'];
const ADMIN = ['accounts:read_own', 'manager:portal', 'admin:portal'];
const SUPER = [...ADMIN, 'settings:manage'];

const allPaths = (sections) => sections.flatMap((s) => s.links.map((l) => l.to));

describe('layoutVariantFor', () => {
  it('gives admins and super admins the Operations layout', () => {
    expect(layoutVariantFor({ permissions: ADMIN })).toBe('operations');
    expect(layoutVariantFor({ permissions: SUPER })).toBe('operations');
  });

  it('gives managers and employees the Team workspace', () => {
    expect(layoutVariantFor({ permissions: MANAGER })).toBe('team');
    expect(layoutVariantFor({ permissions: EMPLOYEE })).toBe('team');
  });

  it('never guesses a layout when permissions are missing', () => {
    expect(layoutVariantFor(null)).toBe('error');
    expect(layoutVariantFor({ role: 'super_admin' })).toBe('error');
    expect(layoutVariantFor({ permissions: 'admin:portal' })).toBe('error');
  });
});

describe('navSectionsFor', () => {
  it('hides privileged sections from employees', () => {
    const paths = allPaths(navSectionsFor(EMPLOYEE));
    expect(paths).toContain('/dashboard');
    expect(paths).not.toContain('/manager');
    expect(paths.some((p) => p.startsWith('/admin'))).toBe(false);
    expect(paths.some((p) => p.startsWith('/super-admin'))).toBe(false);
  });

  it('shows super admin tools only with settings:manage', () => {
    expect(allPaths(navSectionsFor(ADMIN)).some((p) => p.startsWith('/super-admin'))).toBe(false);
    expect(allPaths(navSectionsFor(SUPER))).toContain('/super-admin');
  });

  it('fills the incident badge', () => {
    const link = navSectionsFor(ADMIN, { incidents: 3 }).flatMap((s) => s.links).find((l) => l.to === '/admin/security');
    expect(link.badge).toBe(3);
  });
});

describe('teamNavFor', () => {
  it('keeps every permitted destination reachable (bar + More)', () => {
    for (const perms of [EMPLOYEE, MANAGER]) {
      const { primary, more } = teamNavFor(perms);
      const reachable = [...primary, ...more].map((l) => l.to).sort();
      expect(reachable).toEqual(allPaths(navSectionsFor(perms)).sort());
    }
  });

  it('puts My Team in the bar for managers only', () => {
    expect(teamNavFor(MANAGER).primary.map((l) => l.to)).toContain('/manager');
    expect(teamNavFor(EMPLOYEE).primary.map((l) => l.to)).not.toContain('/manager');
  });
});

describe('isNavLinkActive', () => {
  it('matches query-string links exactly', () => {
    const loc = { pathname: '/manager', search: '?tab=approvals' };
    expect(isNavLinkActive('/manager?tab=approvals', loc)).toBe(true);
    expect(isNavLinkActive('/manager', loc)).toBe(false);
  });
});
