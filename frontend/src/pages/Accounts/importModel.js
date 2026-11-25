const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One-line summary of an import preview or result. */
export const importSummaryText = (r) => {
  if (!r) return '';
  const attention = [
    r.duplicates ? plural(r.duplicates, 'duplicate') : null,
    r.errors ? `${plural(r.errors, 'row')} to fix` : null,
  ].filter(Boolean);
  if (r.dry_run) {
    const lead = r.valid ? `${plural(r.valid, 'account')} ready to add` : 'No rows can be added yet';
    return attention.length ? `${lead} · ${attention.join(' · ')}` : `${lead}. Nothing was saved yet.`;
  }
  const lead = `${plural(r.created, 'account')} added`;
  return attention.length ? `${lead} · ${attention.join(' · ')} not added` : `${lead}.`;
};

/** Rows for the table; "attention only" keeps duplicates and errors. */
export const importRowsToShow = (rows = [], attentionOnly = false) =>
  attentionOnly ? rows.filter((r) => r.status === 'duplicate' || r.status === 'error') : rows;
