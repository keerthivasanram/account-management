import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react';
import { api } from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import SecondaryButton from '../../components/ui/SecondaryButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { importRowsToShow, importSummaryText } from './importModel';

const COLUMNS = [
  ['username', 'Required. The Instagram handle, with or without @.'],
  ['account_type', 'BUSINESS or CREATOR. Defaults to BUSINESS. Personal accounts can’t be added.'],
  ['niche', 'Optional, e.g. Home decor.'],
  ['client', 'Optional. Must match a client name in Klarves.'],
  ['campaign', 'Optional. Must match a campaign name (of that client, if given).'],
  ['display_name', 'Optional. Defaults to the username.'],
];

const ROW_BADGE = {
  valid: { status: 'ACTIVE', text: 'Ready' },
  created: { status: 'ACTIVE', text: 'Added' },
  duplicate: { status: 'PENDING', text: 'Duplicate' },
  error: { status: 'ERROR', text: 'Needs fixing' },
};

const rowDetail = (r) => r.message || (r.status === 'created' ? 'Added and assigned to you' : 'Will be added');

const errText = (err, fallback) => err?.response?.data?.detail || fallback;

const Card = ({ step, title, children }) => (
  <section className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft p-5" aria-label={title}>
    <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
      {step && <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold inline-flex items-center justify-center">{step}</span>}
      {title}
    </h2>
    <div className="mt-3">{children}</div>
  </section>
);

/**
 * Import accounts: download template -> choose file -> preview (nothing saved) -> add valid rows.
 * The server runs every row through the same checks as "Add account".
 */
export const ImportAccountsPage = () => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // dry-run result
  const [result, setResult] = useState(null);   // real import result
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [attentionOnly, setAttentionOnly] = useState(false);

  const downloadTemplate = async () => {
    setError(null);
    try {
      const res = await api.accounts.importTemplate();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'klarves-accounts-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errText(err, 'The template could not be downloaded.'));
    }
  };

  const choose = async (f) => {
    if (!f) return;
    setFile(f);
    setPreview(null);
    setResult(null);
    setError(null);
    setBusy(true);
    try {
      const res = await api.accounts.importCsv(f, true);
      setPreview(res.data);
      setAttentionOnly(false);
    } catch (err) {
      setError(errText(err, 'The file could not be read.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.accounts.importCsv(file, false);
      setResult(res.data);
      setPreview(null);
      setAttentionOnly(true);
    } catch (err) {
      setError(errText(err, 'The import did not finish. Nothing after the error was added; check My accounts.'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const shown = result || preview;
  const rows = shown ? importRowsToShow(shown.rows, attentionOnly) : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Import accounts"
        description="Add several Instagram accounts at once from a CSV file. You’ll see a preview before anything is saved."
        breadcrumbs={[{ label: 'Overview', to: '/dashboard' }, { label: 'My accounts', to: '/accounts' }, { label: 'Import accounts' }]}
      />

      {error && (
        <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
        </div>
      )}

      {!result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card step="1" title="Download the template">
            <p className="text-sm text-slate-600">Fill in one account per row. Only <strong className="font-medium text-slate-900">username</strong> is required.</p>
            <SecondaryButton size="sm" icon={Download} onClick={downloadTemplate} className="mt-3">Download CSV template</SecondaryButton>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-brand-700 font-medium">Column guide</summary>
              <dl className="mt-2 space-y-1.5">
                {COLUMNS.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
                    <dt className="font-mono text-xs text-slate-900 pt-0.5">{k}</dt>
                    <dd className="text-xs text-slate-600">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Card>

          <Card step="2" title="Choose your file">
            <label
              htmlFor="import-file"
              className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-center px-4 focus-within:ring-2 focus-within:ring-brand-500"
            >
              <FileSpreadsheet className="w-6 h-6 text-slate-400" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-900">{file ? file.name : 'Choose a .csv file'}</span>
              <span className="text-xs text-slate-500">Up to 500 accounts, 1 MB</span>
              <input
                id="import-file"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => choose(e.target.files?.[0])}
              />
            </label>
            {busy && !preview && <p className="mt-3 text-sm text-slate-500" role="status">Checking your file…</p>}
          </Card>
        </div>
      )}

      {shown && (
        <section className="bg-white border border-[#E6EAF0] rounded-xl shadow-soft overflow-hidden" aria-label={result ? 'Import result' : 'Preview'}>
          <div className="p-5 border-b border-[#E6EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                {result ? <><CheckCircle2 className="w-5 h-5 text-brand-700" aria-hidden="true" /> Import finished</> : <><span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold inline-flex items-center justify-center">3</span> Check the preview</>}
              </h2>
              <p className="text-sm text-slate-600 mt-1" role="status">{importSummaryText(shown)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result ? (
                <>
                  <SecondaryButton size="sm" icon={RotateCcw} onClick={reset}>Import another file</SecondaryButton>
                  <Link to="/accounts" className="inline-flex items-center h-9 px-3.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200">
                    Go to My accounts
                  </Link>
                </>
              ) : (
                <>
                  <SecondaryButton size="sm" onClick={reset} disabled={busy}>Choose another file</SecondaryButton>
                  <PrimaryButton size="sm" icon={Upload} loading={busy} disabled={!preview.valid} onClick={confirm}>
                    {preview.valid ? `Add ${preview.valid} account${preview.valid === 1 ? '' : 's'}` : 'Nothing to add'}
                  </PrimaryButton>
                </>
              )}
            </div>
          </div>

          {shown.rows.some((r) => r.status === 'duplicate' || r.status === 'error') && (
            <label className="flex items-center gap-2 px-5 py-2.5 text-sm text-slate-700 border-b border-[#E6EAF0] bg-slate-50">
              <input type="checkbox" checked={attentionOnly} onChange={(e) => setAttentionOnly(e.target.checked)} className="accent-brand-700" />
              Only show rows that need attention
            </label>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#E6EAF0] text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-3 sm:px-5 py-2.5 font-semibold w-12 sm:w-16">Row</th>
                  <th className="px-3 sm:px-5 py-2.5 font-semibold">Username</th>
                  <th className="px-3 sm:px-5 py-2.5 font-semibold">Result</th>
                  <th className="hidden sm:table-cell px-5 py-2.5 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.line}>
                    <td className="px-3 sm:px-5 py-2.5 text-slate-500 tabular-nums align-top">{r.line}</td>
                    <td className="px-3 sm:px-5 py-2.5 align-top min-w-0">
                      <span className="font-medium text-slate-900 break-all">{r.username ? `@${r.username}` : '—'}</span>
                      {/* on phones the reason sits under the username */}
                      <span className="sm:hidden block text-xs text-slate-600 mt-0.5">{rowDetail(r)}</span>
                    </td>
                    <td className="px-3 sm:px-5 py-2.5 align-top whitespace-nowrap"><StatusBadge status={ROW_BADGE[r.status]?.status} text={ROW_BADGE[r.status]?.text} /></td>
                    <td className="hidden sm:table-cell px-5 py-2.5 text-slate-600">{rowDetail(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default ImportAccountsPage;
