import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { connectionHealth, workloadSummary } from './dashboardModel';
import { AccountsPanel, ConnectionPanel, StatsRow, WorkloadPanel } from './OverviewPanels';

const EMPTY_STATS = { total: 0, connected: 0, pending_connection: 0, pending_approval: 0, approved: 0, rejected: 0 };
const ok = (data) => ({ data, error: null, loading: false, reload: () => {} });
const failed = (error = 'Could not reach the server.') => ({ data: null, error, loading: false, reload: () => {} });
const loading = () => ({ data: null, error: null, loading: true, reload: () => {} });
const html = (el) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);
const ITEMS = [{ label: 'Total accounts', icon: Instagram, value: (s) => s.total }];

describe('connectionHealth', () => {
  it('distinguishes error, empty, healthy and attention', () => {
    expect(connectionHealth(null, 'boom').state).toBe('error');
    expect(connectionHealth(EMPTY_STATS, null)).toEqual({ state: 'empty', label: 'No accounts to assess' });
    expect(connectionHealth({ ...EMPTY_STATS, total: 10, connected: 9 }, null).state).toBe('healthy');
    expect(connectionHealth({ ...EMPTY_STATS, total: 10, connected: 2 }, null).state).toBe('attention');
  });
});

describe('workloadSummary', () => {
  it('shows the count alone when capacity is unknown', () => {
    expect(workloadSummary(4, null)).toMatchObject({ text: '4 assigned', max: null, percent: null });
  });

  it('uses the configured capacity when known', () => {
    expect(workloadSummary(30, { min: 50, max: 60 })).toMatchObject({ text: '30 / 60', percent: 50, state: 'under' });
    expect(workloadSummary(65, { min: 50, max: 60 })).toMatchObject({ state: 'over', percent: 100 });
  });
});

describe('empty versus error rendering', () => {
  it('StatsRow shows an error with retry, never zeros, when the request fails', () => {
    const out = html(<StatsRow resource={failed()} items={ITEMS} label="t" />);
    expect(out).toContain('Couldn&#x27;t load this panel.');
    expect(out).toContain('Retry');
    expect(out).not.toContain('>0<');
  });

  it('StatsRow shows real zeros for an empty organization', () => {
    const out = html(<StatsRow resource={ok(EMPTY_STATS)} items={ITEMS} label="t" />);
    expect(out).toContain('>0<');
    expect(out).not.toContain('Retry');
  });

  it('StatsRow shows placeholders while loading', () => {
    const out = html(<StatsRow resource={loading()} items={ITEMS} label="t" />);
    expect(out).toContain('animate-pulse');
    expect(out).not.toContain('>0<');
  });

  it('ConnectionPanel never reports a failed request as healthy', () => {
    const out = html(<ConnectionPanel resource={failed()} />);
    expect(out).toContain('Retry');
    expect(out).not.toMatch(/connected|All systems clear|Attention recommended/i);
  });

  it('ConnectionPanel shows one neutral message for an empty dataset', () => {
    const out = html(<ConnectionPanel resource={ok(EMPTY_STATS)} />);
    expect(out).toContain('No accounts to assess');
    expect(out).not.toContain('Attention recommended');
  });

  it('AccountsPanel hides "View all" when empty and shows the empty message', () => {
    const out = html(
      <AccountsPanel resource={ok([])} total={0} title="Recent" emptyTitle="No Instagram accounts registered" emptyText="x" />,
    );
    expect(out).toContain('No Instagram accounts registered');
    expect(out).not.toContain('View all');
  });

  it('AccountsPanel shows an error, not the empty message, when the request fails', () => {
    const out = html(
      <AccountsPanel resource={failed()} total={5} title="Recent" emptyTitle="No Instagram accounts registered" emptyText="x" />,
    );
    expect(out).toContain('Retry');
    expect(out).not.toContain('No Instagram accounts registered');
    expect(out).not.toContain('View all');
  });

  it('WorkloadPanel shows the assigned count alone without a capacity source', () => {
    const out = html(<WorkloadPanel profile={ok({ assigned_accounts_count: 3 })} capacity={null} />);
    expect(out).toContain('Your assigned accounts');
    expect(out).not.toContain('max');
  });
});
