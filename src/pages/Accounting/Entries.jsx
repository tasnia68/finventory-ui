import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import { AccountingPage } from './AccountingShell';
import {
  createManualJournalEntry,
  getAccounts,
  getJournalEntries,
  getJournals,
  postPendingFinancialEvents,
  reverseJournalEntry,
} from '../../services/accountingService';
import { emptyManualLine, formatNumber, toList } from './shared';

const Entries = () => {
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [reverseMemoByEntry, setReverseMemoByEntry] = useState({});
  const [manualEntryForm, setManualEntryForm] = useState({
    journalId: '',
    memo: '',
    currency: 'USD',
    lines: [emptyManualLine(), emptyManualLine()],
  });

  const loadEntries = async () => {
    try {
      setLoading(true);
      const [accountsResponse, journalsResponse, entriesResponse] = await Promise.all([
        getAccounts(),
        getJournals(),
        getJournalEntries(),
      ]);
      setAccounts(toList(accountsResponse));
      setJournals(toList(journalsResponse));
      setEntries(toList(entriesResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load journal entries' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const manualJournals = useMemo(() => journals.filter((journal) => !journal.systemJournal && journal.active), [journals]);
  const manualPostingAccounts = useMemo(() => accounts.filter((account) => account.allowManualPosting && account.active), [accounts]);

  useEffect(() => {
    if (!manualEntryForm.journalId && manualJournals.length > 0) {
      setManualEntryForm((current) => ({ ...current, journalId: manualJournals[0].id }));
    }
  }, [manualEntryForm.journalId, manualJournals]);

  const handleManualLineChange = (index, field, value) => {
    setManualEntryForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)),
    }));
  };

  const handleAddManualLine = () => {
    setManualEntryForm((current) => ({
      ...current,
      lines: [...current.lines, emptyManualLine()],
    }));
  };

  const handleRemoveManualLine = (index) => {
    setManualEntryForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const handleCreateManualEntry = async () => {
    try {
      setSubmitting(true);
      await createManualJournalEntry({
        journalId: manualEntryForm.journalId || null,
        memo: manualEntryForm.memo,
        currency: manualEntryForm.currency,
        lines: manualEntryForm.lines
          .filter((line) => line.accountId)
          .map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debitAmount: line.debitAmount === '' ? 0 : Number(line.debitAmount),
            creditAmount: line.creditAmount === '' ? 0 : Number(line.creditAmount),
          })),
      });
      setManualEntryForm({
        journalId: manualJournals[0]?.id || '',
        memo: '',
        currency: 'USD',
        lines: [emptyManualLine(), emptyManualLine()],
      });
      setAlert({ type: 'success', message: 'Manual journal entry created.' });
      await loadEntries();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create manual journal entry' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostPending = async () => {
    try {
      setSubmitting(true);
      const posted = await postPendingFinancialEvents();
      setAlert({
        type: 'success',
        message: `Posted ${Array.isArray(posted) ? posted.length : 0} pending financial event(s).`,
      });
      await loadEntries();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to post pending financial events' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseEntry = async (entryId) => {
    try {
      setSubmitting(true);
      await reverseJournalEntry(entryId, { memo: reverseMemoByEntry[entryId] || '' });
      setReverseMemoByEntry((current) => ({ ...current, [entryId]: '' }));
      setAlert({ type: 'success', message: 'Journal entry reversed.' });
      await loadEntries();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to reverse journal entry' });
    } finally {
      setSubmitting(false);
    }
  };

  const entryColumns = [
    {
      key: 'entryNumber',
      header: 'Entry',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {row.sourceDocumentType} · {row.sourceDocumentNumber || row.sourceDocumentId}
          </div>
        </div>
      ),
    },
    { key: 'journalCode', header: 'Journal' },
    { key: 'status', header: 'Status', render: (value) => <Badge variant={value === 'POSTED' ? 'success' : 'default'}>{value}</Badge> },
    { key: 'totalDebits', header: 'Debits', render: (value) => formatNumber(value) },
    { key: 'totalCredits', header: 'Credits', render: (value) => formatNumber(value) },
    { key: 'postedAt', header: 'Posted At', render: (value) => (value ? new Date(value).toLocaleString() : 'Not posted') },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex min-w-[16rem] items-center gap-2">
          <input
            type="text"
            value={reverseMemoByEntry[row.id] || ''}
            onChange={(event) => setReverseMemoByEntry((current) => ({ ...current, [row.id]: event.target.value }))}
            placeholder="Reversal memo"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={submitting || row.status !== 'POSTED' || row.reversalOfEntryId}
            onClick={() => handleReverseEntry(row.id)}
          >
            Reverse
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AccountingPage title="Journal Entries" subtitle="Create manual entries, post pending events, and reverse posted entries.">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[28rem_minmax(0,1fr)]">
          <Card title="Manual Journal Entry" subtitle="Create a balanced finance-led journal entry from manual posting accounts">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Journal
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={manualEntryForm.journalId} onChange={(event) => setManualEntryForm((current) => ({ ...current, journalId: event.target.value }))}>
                  <option value="">Select journal</option>
                  {manualJournals.map((journal) => <option key={journal.id} value={journal.id}>{journal.journalCode} · {journal.journalName}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Memo" value={manualEntryForm.memo} onChange={(event) => setManualEntryForm((current) => ({ ...current, memo: event.target.value }))} placeholder="Period-end adjustment" />
                <Input label="Currency" value={manualEntryForm.currency} onChange={(event) => setManualEntryForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} placeholder="USD" />
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                {manualEntryForm.lines.map((line, index) => (
                  <div key={`${index}-${line.accountId}`} className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Line {index + 1}</span>
                      <Button size="sm" variant="ghost" disabled={manualEntryForm.lines.length <= 2} onClick={() => handleRemoveManualLine(index)}>
                        Remove
                      </Button>
                    </div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Account
                      <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={line.accountId} onChange={(event) => handleManualLineChange(index, 'accountId', event.target.value)}>
                        <option value="">Select account</option>
                        {manualPostingAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountCode} · {account.accountName}</option>)}
                      </select>
                    </label>
                    <Input label="Description" value={line.description} onChange={(event) => handleManualLineChange(index, 'description', event.target.value)} placeholder="Optional line memo" />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input type="number" step="0.000001" label="Debit amount" value={line.debitAmount} onChange={(event) => handleManualLineChange(index, 'debitAmount', event.target.value)} placeholder="0.00" />
                      <Input type="number" step="0.000001" label="Credit amount" value={line.creditAmount} onChange={(event) => handleManualLineChange(index, 'creditAmount', event.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                ))}
                <Button variant="secondary" className="w-full" onClick={handleAddManualLine}>
                  Add line
                </Button>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" icon="edit_note" loading={submitting} onClick={handleCreateManualEntry}>
                  Create entry
                </Button>
                <Button variant="secondary" className="flex-1" icon="publish" loading={submitting} onClick={handlePostPending}>
                  Post pending
                </Button>
              </div>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden" title="Journal Entries" subtitle="Native accounting entries posted from inventory, AP, AR, and manual accounting flows">
            <DataTable columns={entryColumns} data={entries} loading={loading} emptyMessage="No journal entries have been posted yet." />
          </Card>
        </div>
    </AccountingPage>
  );
};

export default Entries;
