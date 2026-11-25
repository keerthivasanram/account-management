import { describe, expect, it } from 'vitest';
import { importRowsToShow, importSummaryText } from './importModel';

describe('import summary', () => {
  it('preview with problems', () => {
    expect(importSummaryText({ dry_run: true, valid: 2, duplicates: 1, errors: 3 }))
      .toBe('2 accounts ready to add · 1 duplicate · 3 rows to fix');
  });
  it('clean preview says nothing is saved yet', () => {
    expect(importSummaryText({ dry_run: true, valid: 1, duplicates: 0, errors: 0 }))
      .toBe('1 account ready to add. Nothing was saved yet.');
  });
  it('preview where nothing can be added', () => {
    expect(importSummaryText({ dry_run: true, valid: 0, duplicates: 2, errors: 0 })).toBe('No rows can be added yet · 2 duplicates');
  });
  it('finished import', () => {
    expect(importSummaryText({ dry_run: false, created: 2, duplicates: 0, errors: 1 })).toBe('2 accounts added · 1 row to fix not added');
  });
  it('filters to rows needing attention', () => {
    const rows = [{ status: 'valid' }, { status: 'duplicate' }, { status: 'error' }, { status: 'created' }];
    expect(importRowsToShow(rows, true).map((r) => r.status)).toEqual(['duplicate', 'error']);
    expect(importRowsToShow(rows, false)).toHaveLength(4);
  });
});
