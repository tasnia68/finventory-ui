import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import {
  createRecurringJournalTemplate,
  createTaxRate,
  getAccounts,
  getJournals,
  getRecurringJournalTemplates,
  getTaxRates,
  getVatReturn,
  runDueRecurringJournalTemplates,
} from '../../services/accountingService';
import { AccountingPage, Stat } from './AccountingShell';
import { formatNumber, toList } from './shared';

const defaultVatFilters = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
};

const AccountingSettings = () => {
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [recurringTemplates, setRecurringTemplates] = useState([]);
  const [vatRows, setVatRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [vatFilters, setVatFilters] = useState(defaultVatFilters);
  const [taxForm, setTaxForm] = useState({
    code: '',
    name: '',
    rate: '0.1500',
    outputAccountId: '',
    inputAccountId: '',
    active: true,
  });
  const [recurringForm, setRecurringForm] = useState({
    templateCode: '',
    templateName: '',
    journalId: '',
    memo: '',
    currency: 'USD',
    cadence: 'MONTHLY',
    nextRunDate: new Date().toISOString().slice(0, 10),
    lines: [
      { accountId: '', description: '', debitAmount: '', creditAmount: '' },
      { accountId: '', description: '', debitAmount: '', creditAmount: '' },
    ],
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [accountsResponse, journalsResponse, taxRatesResponse, recurringResponse, vatResponse] = await Promise.all([
        getAccounts(),
        getJournals(),
        getTaxRates(),
        getRecurringJournalTemplates(),
        getVatReturn(vatFilters),
      ]);
      setAccounts(toList(accountsResponse));
      setJournals(toList(journalsResponse));
      setTaxRates(toList(taxRatesResponse));
      setRecurringTemplates(toList(recurringResponse));
      setVatRows(toList(vatResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load accounting settings' });
    } finally {
      setLoading(false);
    }
  }, [vatFilters]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const liabilityAccounts = useMemo(() => accounts.filter((account) => account.active && account.accountType === 'LIABILITY'), [accounts]);
  const assetAccounts = useMemo(() => accounts.filter((account) => account.active && account.accountType === 'ASSET'), [accounts]);
  const manualAccounts = useMemo(() => accounts.filter((account) => account.active && account.allowManualPosting), [accounts]);
  const manualJournals = useMemo(() => journals.filter((journal) => journal.active && !journal.systemJournal), [journals]);
  const vatTotals = useMemo(() => ({
    outputTax: vatRows.reduce((sum, row) => sum + Number(row.outputTax || 0), 0),
    inputTax: vatRows.reduce((sum, row) => sum + Number(row.inputTax || 0), 0),
    netTaxPayable: vatRows.reduce((sum, row) => sum + Number(row.netTaxPayable || 0), 0),
  }), [vatRows]);

  const handleCreateTaxRate = async () => {
    try {
      setSubmitting(true);
      await createTaxRate({
        code: taxForm.code,
        name: taxForm.name,
        rate: Number(taxForm.rate || 0),
        outputAccountId: taxForm.outputAccountId || null,
        inputAccountId: taxForm.inputAccountId || null,
        active: taxForm.active,
      });
      setTaxForm({ code: '', name: '', rate: '0.1500', outputAccountId: '', inputAccountId: '', active: true });
      setAlert({ type: 'success', message: 'Tax rate created.' });
      await loadSettings();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create tax rate' });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!recurringForm.journalId && manualJournals.length > 0) {
      setRecurringForm((current) => ({ ...current, journalId: manualJournals[0].id }));
    }
  }, [manualJournals, recurringForm.journalId]);

  const handleRecurringLineChange = (index, field, value) => {
    setRecurringForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)),
    }));
  };

  const handleAddRecurringLine = () => {
    setRecurringForm((current) => ({
      ...current,
      lines: [...current.lines, { accountId: '', description: '', debitAmount: '', creditAmount: '' }],
    }));
  };

  const handleCreateRecurringTemplate = async () => {
    try {
      setSubmitting(true);
      await createRecurringJournalTemplate({
        ...recurringForm,
        lines: recurringForm.lines
          .filter((line) => line.accountId)
          .map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debitAmount: line.debitAmount === '' ? 0 : Number(line.debitAmount),
            creditAmount: line.creditAmount === '' ? 0 : Number(line.creditAmount),
          })),
      });
      setRecurringForm({
        templateCode: '',
        templateName: '',
        journalId: manualJournals[0]?.id || '',
        memo: '',
        currency: 'USD',
        cadence: 'MONTHLY',
        nextRunDate: new Date().toISOString().slice(0, 10),
        lines: [
          { accountId: '', description: '', debitAmount: '', creditAmount: '' },
          { accountId: '', description: '', debitAmount: '', creditAmount: '' },
        ],
      });
      setAlert({ type: 'success', message: 'Recurring journal template created.' });
      await loadSettings();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create recurring journal template' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunDueTemplates = async () => {
    try {
      setSubmitting(true);
      const entries = await runDueRecurringJournalTemplates();
      setAlert({ type: 'success', message: `Created ${Array.isArray(entries) ? entries.length : 0} recurring journal entry(s).` });
      await loadSettings();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to run recurring journals' });
    } finally {
      setSubmitting(false);
    }
  };

  const taxColumns = [
    { key: 'code', header: 'Code', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{value}</span> },
    { key: 'name', header: 'Name' },
    { key: 'rate', header: 'Rate', render: (value) => `${(Number(value || 0) * 100).toFixed(2)}%` },
    { key: 'outputAccountName', header: 'Output Account', render: (value) => value || '-' },
    { key: 'inputAccountName', header: 'Input Account', render: (value) => value || '-' },
    { key: 'active', header: 'State', render: (value) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Badge> },
  ];

  const vatColumns = [
    { key: 'code', header: 'Tax Code' },
    { key: 'outputTax', header: 'Output Tax', render: (value) => formatNumber(value) },
    { key: 'inputTax', header: 'Input Tax', render: (value) => formatNumber(value) },
    { key: 'netTaxPayable', header: 'Net Payable', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
  ];

  const recurringColumns = [
    { key: 'templateCode', header: 'Code', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{value}</span> },
    { key: 'templateName', header: 'Name' },
    { key: 'journalCode', header: 'Journal' },
    { key: 'cadence', header: 'Cadence', render: (value) => <Badge variant="primary">{value}</Badge> },
    { key: 'nextRunDate', header: 'Next Run' },
    { key: 'active', header: 'State', render: (value) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <AccountingPage title="Accounting Settings" subtitle="Tax rates, tax accounts, and VAT return summary.">
      {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <Card title="Create Tax Rate" subtitle="Use decimal rates: 0.1500 means 15%.">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Code" value={taxForm.code} onChange={(event) => setTaxForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="VAT15" />
              <Input label="Rate" type="number" step="0.0001" min="0" max="1" value={taxForm.rate} onChange={(event) => setTaxForm((current) => ({ ...current, rate: event.target.value }))} />
            </div>
            <Input label="Name" value={taxForm.name} onChange={(event) => setTaxForm((current) => ({ ...current, name: event.target.value }))} placeholder="VAT 15%" />
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Output tax account
              <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={taxForm.outputAccountId} onChange={(event) => setTaxForm((current) => ({ ...current, outputAccountId: event.target.value }))}>
                <option value="">Select liability account</option>
                {liabilityAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountCode} · {account.accountName}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Input tax account
              <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={taxForm.inputAccountId} onChange={(event) => setTaxForm((current) => ({ ...current, inputAccountId: event.target.value }))}>
                <option value="">Select asset account</option>
                {assetAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountCode} · {account.accountName}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={taxForm.active} onChange={(event) => setTaxForm((current) => ({ ...current, active: event.target.checked }))} />
              Active
            </label>
            <Button className="w-full" icon="add" loading={submitting} onClick={handleCreateTaxRate}>Create tax rate</Button>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden" title="Tax Rates" subtitle="Tenant tax codes and linked ledger accounts">
          <DataTable columns={taxColumns} data={taxRates} loading={loading} emptyMessage="No tax rates configured yet." />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label="Output Tax" value={formatNumber(vatTotals.outputTax)} />
        <Stat label="Input Tax" value={formatNumber(vatTotals.inputTax)} />
        <Stat label="Net Payable" value={formatNumber(vatTotals.netTaxPayable)} />
      </div>

      <Card title="VAT Return" subtitle="Summary from posted journal lines on the configured tax accounts.">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Input type="date" label="From" value={vatFilters.from} onChange={(event) => setVatFilters((current) => ({ ...current, from: event.target.value }))} />
          <Input type="date" label="To" value={vatFilters.to} onChange={(event) => setVatFilters((current) => ({ ...current, to: event.target.value }))} />
          <Button icon="search" loading={loading} onClick={loadSettings}>Apply</Button>
        </div>
        <DataTable columns={vatColumns} data={vatRows} loading={loading} emptyMessage="No VAT return rows available." />
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[32rem_minmax(0,1fr)]">
        <Card title="Create Recurring Journal" subtitle="Schedule balanced journal entries for rent, accruals, depreciation, and subscriptions.">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Template code" value={recurringForm.templateCode} onChange={(event) => setRecurringForm((current) => ({ ...current, templateCode: event.target.value.toUpperCase() }))} placeholder="RENT-MONTHLY" />
              <Input label="Template name" value={recurringForm.templateName} onChange={(event) => setRecurringForm((current) => ({ ...current, templateName: event.target.value }))} placeholder="Monthly rent" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Journal
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={recurringForm.journalId} onChange={(event) => setRecurringForm((current) => ({ ...current, journalId: event.target.value }))}>
                  <option value="">Select journal</option>
                  {manualJournals.map((journal) => <option key={journal.id} value={journal.id}>{journal.journalCode} · {journal.journalName}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Cadence
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={recurringForm.cadence} onChange={(event) => setRecurringForm((current) => ({ ...current, cadence: event.target.value }))}>
                  {['DAILY', 'WEEKLY', 'MONTHLY'].map((cadence) => <option key={cadence} value={cadence}>{cadence}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Next run date" type="date" value={recurringForm.nextRunDate} onChange={(event) => setRecurringForm((current) => ({ ...current, nextRunDate: event.target.value }))} />
              <Input label="Currency" maxLength={3} value={recurringForm.currency} onChange={(event) => setRecurringForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
            </div>
            <Input label="Memo" value={recurringForm.memo} onChange={(event) => setRecurringForm((current) => ({ ...current, memo: event.target.value }))} placeholder="Optional entry memo" />

            <div className="space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              {recurringForm.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Account
                    <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={line.accountId} onChange={(event) => handleRecurringLineChange(index, 'accountId', event.target.value)}>
                      <option value="">Select account</option>
                      {manualAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountCode} · {account.accountName}</option>)}
                    </select>
                  </label>
                  <Input label="Description" value={line.description} onChange={(event) => handleRecurringLineChange(index, 'description', event.target.value)} />
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Input type="number" step="0.000001" label="Debit" value={line.debitAmount} onChange={(event) => handleRecurringLineChange(index, 'debitAmount', event.target.value)} />
                    <Input type="number" step="0.000001" label="Credit" value={line.creditAmount} onChange={(event) => handleRecurringLineChange(index, 'creditAmount', event.target.value)} />
                  </div>
                </div>
              ))}
              <Button variant="secondary" className="w-full" onClick={handleAddRecurringLine}>Add line</Button>
            </div>

            <Button className="w-full" icon="event_repeat" loading={submitting} onClick={handleCreateRecurringTemplate}>Create recurring journal</Button>
          </div>
        </Card>

        <Card
          padding="none"
          className="overflow-hidden"
          title="Recurring Journals"
          subtitle="Templates processed by the daily scheduler or the manual run action"
          action={<Button size="sm" variant="secondary" icon="play_arrow" loading={submitting} onClick={handleRunDueTemplates}>Run due</Button>}
        >
          <DataTable columns={recurringColumns} data={recurringTemplates} loading={loading} emptyMessage="No recurring journal templates configured yet." />
        </Card>
      </div>
    </AccountingPage>
  );
};

export default AccountingSettings;
