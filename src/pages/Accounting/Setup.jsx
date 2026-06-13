import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import {
  createAccount,
  createJournal,
  createManualJournalEntry,
  createTaxRate,
  createTreasuryAccount,
  getAccounts,
  getJournals,
  getTaxRates,
  getTreasuryAccounts,
} from '../../services/accountingService';
import { AccountingPage, Stat } from './AccountingShell';
import { formatNumber, toList } from './shared';

const ACCOUNT_TEMPLATE = [
  { accountCode: '1100', accountName: 'Cash on Hand', accountType: 'ASSET', description: 'Cash held in tills or petty cash' },
  { accountCode: '1110', accountName: 'Operating Bank', accountType: 'ASSET', description: 'Primary bank account' },
  { accountCode: '1200', accountName: 'Accounts Receivable', accountType: 'ASSET', description: 'Customer balances due' },
  { accountCode: '1300', accountName: 'Inventory', accountType: 'ASSET', description: 'Stock value on hand' },
  { accountCode: '1410', accountName: 'VAT Input', accountType: 'ASSET', description: 'Recoverable VAT paid to suppliers' },
  { accountCode: '2100', accountName: 'Accounts Payable', accountType: 'LIABILITY', description: 'Supplier balances payable' },
  { accountCode: '2200', accountName: 'VAT Output', accountType: 'LIABILITY', description: 'VAT collected from customers' },
  { accountCode: '3000', accountName: 'Owner Equity', accountType: 'EQUITY', description: 'Owner capital and retained funds' },
  { accountCode: '3001', accountName: 'Opening Balance Equity', accountType: 'EQUITY', description: 'Balancing account for first setup opening balances' },
  { accountCode: '4000', accountName: 'Sales Revenue', accountType: 'REVENUE', description: 'Product and service sales' },
  { accountCode: '5000', accountName: 'Cost of Goods Sold', accountType: 'EXPENSE', description: 'Cost of inventory sold' },
  { accountCode: '5200', accountName: 'Rent Expense', accountType: 'EXPENSE', description: 'Shop, office, or warehouse rent' },
];

const OPENING_BALANCE_CODES = ['1100', '1110', '1200', '1300', '1410', '2100', '2200', '3000'];

const todayIso = () => new Date().toISOString().slice(0, 10);

const defaultFiscalStart = () => {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-07-01`;
};

const naturalSide = (accountType) => (['ASSET', 'EXPENSE'].includes(accountType) ? 'debitAmount' : 'creditAmount');

const Setup = () => {
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [form, setForm] = useState({
    template: 'BANGLADESH_SME',
    fiscalYearStart: defaultFiscalStart(),
    currency: 'BDT',
    configureVat: true,
    vatRate: '0.1500',
    createCashTreasury: true,
    createBankTreasury: true,
    openingBalances: Object.fromEntries(OPENING_BALANCE_CODES.map((code) => [code, ''])),
  });

  const loadSetupState = async () => {
    try {
      setLoading(true);
      const [accountsResponse, journalsResponse, taxRatesResponse, treasuryResponse] = await Promise.all([
        getAccounts(),
        getJournals(),
        getTaxRates(),
        getTreasuryAccounts(),
      ]);
      setAccounts(toList(accountsResponse));
      setJournals(toList(journalsResponse));
      setTaxRates(toList(taxRatesResponse));
      setTreasuryAccounts(toList(treasuryResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load accounting setup state' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetupState();
  }, []);

  const accountByCode = useMemo(() => new Map(accounts.map((account) => [account.accountCode, account])), [accounts]);
  const taxByCode = useMemo(() => new Map(taxRates.map((rate) => [rate.code, rate])), [taxRates]);
  const treasuryByCode = useMemo(() => new Map(treasuryAccounts.map((account) => [account.accountCode, account])), [treasuryAccounts]);
  const templateCreated = ACCOUNT_TEMPLATE.filter((account) => accountByCode.has(account.accountCode)).length;

  const openingRows = ACCOUNT_TEMPLATE.filter((account) => OPENING_BALANCE_CODES.includes(account.accountCode));
  const openingTotals = useMemo(() => {
    return openingRows.reduce((totals, account) => {
      const amount = Number(form.openingBalances[account.accountCode] || 0);
      if (!amount) return totals;
      const side = naturalSide(account.accountType);
      return {
        debit: totals.debit + (side === 'debitAmount' ? amount : 0),
        credit: totals.credit + (side === 'creditAmount' ? amount : 0),
      };
    }, { debit: 0, credit: 0 });
  }, [form.openingBalances, openingRows]);

  const setOpeningBalance = (accountCode, value) => {
    setForm((current) => ({
      ...current,
      openingBalances: { ...current.openingBalances, [accountCode]: value },
    }));
  };

  const ensureAccount = async (definition, accountMap) => {
    const existing = accountMap.get(definition.accountCode);
    if (existing) return existing;
    const created = await createAccount({ ...definition, active: true, allowManualPosting: true });
    accountMap.set(created.accountCode, created);
    return created;
  };

  const ensureManualJournal = async (journalList) => {
    const existing = journalList.find((journal) => journal.active && !journal.systemJournal);
    if (existing) return existing;
    return createJournal({
      journalCode: 'GENERAL',
      journalName: 'General Journal',
      description: 'Manual journal used for setup and finance adjustments',
      active: true,
    });
  };

  const createOpeningEntry = async (accountMap, journal) => {
    const lines = openingRows
      .map((definition) => {
        const amount = Number(form.openingBalances[definition.accountCode] || 0);
        const account = accountMap.get(definition.accountCode);
        if (!amount || !account) return null;
        const side = naturalSide(definition.accountType);
        return {
          accountId: account.id,
          description: 'Opening balance',
          debitAmount: side === 'debitAmount' ? amount : 0,
          creditAmount: side === 'creditAmount' ? amount : 0,
        };
      })
      .filter(Boolean);

    if (lines.length === 0) return false;

    const debitTotal = lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0);
    const creditTotal = lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0);
    const difference = Number((debitTotal - creditTotal).toFixed(6));
    if (difference !== 0) {
      const equityAccount = accountMap.get('3001');
      lines.push({
        accountId: equityAccount.id,
        description: 'Opening balance offset',
        debitAmount: difference < 0 ? Math.abs(difference) : 0,
        creditAmount: difference > 0 ? difference : 0,
      });
    }

    await createManualJournalEntry({
      journalId: journal.id,
      entryDate: `${form.fiscalYearStart}T00:00:00`,
      memo: `Opening balances as of ${form.fiscalYearStart}`,
      currency: form.currency,
      lines,
    });
    return true;
  };

  const handleRunSetup = async () => {
    try {
      setSubmitting(true);
      setAlert(null);
      setCompleted([]);

      const accountMap = new Map(accounts.map((account) => [account.accountCode, account]));
      const createdAccounts = [];
      for (const definition of ACCOUNT_TEMPLATE) {
        if (!accountMap.has(definition.accountCode)) {
          const account = await ensureAccount(definition, accountMap);
          createdAccounts.push(account.accountCode);
        }
      }
      setCompleted((current) => [...current, `Chart of accounts ready (${createdAccounts.length} new account${createdAccounts.length === 1 ? '' : 's'})`]);

      const journal = await ensureManualJournal(journals);
      setCompleted((current) => [...current, `Manual journal ready (${journal.journalCode})`]);

      if (form.configureVat && !taxByCode.has('VAT15')) {
        await createTaxRate({
          code: 'VAT15',
          name: 'VAT 15%',
          rate: Number(form.vatRate || 0.15),
          outputAccountId: accountMap.get('2200')?.id || null,
          inputAccountId: accountMap.get('1410')?.id || null,
          active: true,
        });
        setCompleted((current) => [...current, 'VAT 15% tax rate created']);
      } else if (form.configureVat) {
        setCompleted((current) => [...current, 'VAT 15% tax rate already exists']);
      }

      if (form.createCashTreasury && !treasuryByCode.has('CASH-MAIN')) {
        await createTreasuryAccount({ accountCode: 'CASH-MAIN', accountName: 'Main Cash Till', accountType: 'CASH', currency: form.currency, notes: 'Created by accounting setup' });
        setCompleted((current) => [...current, 'Cash treasury account created']);
      }

      if (form.createBankTreasury && !treasuryByCode.has('BANK-MAIN')) {
        await createTreasuryAccount({ accountCode: 'BANK-MAIN', accountName: 'Main Operating Bank', accountType: 'BANK', currency: form.currency, notes: 'Created by accounting setup' });
        setCompleted((current) => [...current, 'Bank treasury account created']);
      }

      const postedOpening = await createOpeningEntry(accountMap, journal);
      if (postedOpening) {
        setCompleted((current) => [...current, 'Opening balance journal created']);
      }

      setAlert({ type: 'success', message: 'Accounting setup completed.' });
      await loadSetupState();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Accounting setup failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const accountColumns = [
    { key: 'accountCode', header: 'Code', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{value}</span> },
    { key: 'accountName', header: 'Account' },
    { key: 'accountType', header: 'Type', render: (value) => <Badge variant="primary">{value}</Badge> },
    { key: 'status', header: 'Status', render: (_, row) => <Badge variant={accountByCode.has(row.accountCode) ? 'success' : 'warning'}>{accountByCode.has(row.accountCode) ? 'Ready' : 'Missing'}</Badge> },
  ];

  return (
    <AccountingPage
      title="Setup"
      subtitle="Create the baseline chart, tax setup, treasury accounts, and opening balances for a new tenant."
      actions={<Button icon="task_alt" loading={submitting} onClick={handleRunSetup}>Run setup</Button>}
    >
      {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Stat label="Template Accounts" value={`${templateCreated}/${ACCOUNT_TEMPLATE.length}`} hint="Bangladesh SME" />
        <Stat label="Tax Rates" value={taxRates.length} hint="Configured codes" />
        <Stat label="Treasury Accounts" value={treasuryAccounts.length} hint="Cash and bank" />
        <Stat label="Opening Difference" value={formatNumber(openingTotals.debit - openingTotals.credit)} hint="Auto-offset to equity" />
      </div>

      {completed.length > 0 ? (
        <Card title="Completed Actions" subtitle="Latest setup run results">
          <div className="flex flex-wrap gap-2">
            {completed.map((item) => <Badge key={item} variant="success">{item}</Badge>)}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Tenant Defaults" subtitle="Used when creating setup records">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                COA template
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={form.template} onChange={(event) => setForm((current) => ({ ...current, template: event.target.value }))}>
                  <option value="BANGLADESH_SME">Bangladesh SME default</option>
                </select>
              </label>
              <Input type="date" label="Fiscal year start" value={form.fiscalYearStart} onChange={(event) => setForm((current) => ({ ...current, fiscalYearStart: event.target.value || todayIso() }))} />
              <Input label="Currency" value={form.currency} maxLength={3} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.configureVat} onChange={(event) => setForm((current) => ({ ...current, configureVat: event.target.checked }))} />
                Create VAT 15% tax rate
              </label>
              <Input type="number" step="0.0001" min="0" max="1" label="VAT rate" value={form.vatRate} onChange={(event) => setForm((current) => ({ ...current, vatRate: event.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.createCashTreasury} onChange={(event) => setForm((current) => ({ ...current, createCashTreasury: event.target.checked }))} />
                Create main cash account
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.createBankTreasury} onChange={(event) => setForm((current) => ({ ...current, createBankTreasury: event.target.checked }))} />
                Create main bank account
              </label>
            </div>
          </Card>

          <Card title="Opening Balances" subtitle="Optional first-day balances">
            <div className="space-y-3">
              {openingRows.map((account) => (
                <Input
                  key={account.accountCode}
                  type="number"
                  step="0.000001"
                  min="0"
                  label={`${account.accountCode} · ${account.accountName}`}
                  value={form.openingBalances[account.accountCode]}
                  onChange={(event) => setOpeningBalance(account.accountCode, event.target.value)}
                  placeholder="0.00"
                />
              ))}
            </div>
          </Card>
        </div>

        <Card padding="none" className="overflow-hidden" title="COA Template" subtitle="Accounts that the setup run will ensure exist">
          <DataTable columns={accountColumns} data={ACCOUNT_TEMPLATE} loading={loading} emptyMessage="No template accounts configured." />
        </Card>
      </div>
    </AccountingPage>
  );
};

export default Setup;
