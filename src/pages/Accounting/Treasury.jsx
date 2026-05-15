import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import { AccountingPage } from './AccountingShell';
import {
  completeTreasuryReconciliation,
  createTreasuryAccount,
  createTreasuryReconciliation,
  getTreasuryAccounts,
  getTreasuryReconciliations,
} from '../../services/accountingService';
import { formatNumber, toList } from './shared';

const Treasury = () => {
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [treasuryReconciliations, setTreasuryReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [reconciliationCompletionNotes, setReconciliationCompletionNotes] = useState({});
  const [treasuryAccountForm, setTreasuryAccountForm] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'BANK',
    currency: 'USD',
    notes: '',
  });
  const [treasuryReconciliationForm, setTreasuryReconciliationForm] = useState({
    treasuryAccountId: '',
    businessDate: '',
    statementBalance: '',
    notes: '',
  });

  const loadTreasury = async () => {
    try {
      setLoading(true);
      const [accountsResponse, reconciliationsResponse] = await Promise.all([
        getTreasuryAccounts(),
        getTreasuryReconciliations(),
      ]);
      setTreasuryAccounts(toList(accountsResponse));
      setTreasuryReconciliations(toList(reconciliationsResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load treasury workspace' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreasury();
  }, []);

  const handleCreateTreasuryAccount = async () => {
    try {
      setSubmitting(true);
      await createTreasuryAccount({
        accountCode: treasuryAccountForm.accountCode,
        accountName: treasuryAccountForm.accountName,
        accountType: treasuryAccountForm.accountType,
        currency: treasuryAccountForm.currency,
        notes: treasuryAccountForm.notes || null,
      });
      setTreasuryAccountForm({
        accountCode: '',
        accountName: '',
        accountType: 'BANK',
        currency: 'USD',
        notes: '',
      });
      setAlert({ type: 'success', message: 'Treasury account created.' });
      await loadTreasury();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create treasury account' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReconciliation = async () => {
    try {
      setSubmitting(true);
      await createTreasuryReconciliation({
        treasuryAccountId: treasuryReconciliationForm.treasuryAccountId || null,
        businessDate: treasuryReconciliationForm.businessDate || null,
        statementBalance: treasuryReconciliationForm.statementBalance === '' ? 0 : Number(treasuryReconciliationForm.statementBalance),
        notes: treasuryReconciliationForm.notes || null,
      });
      setTreasuryReconciliationForm({
        treasuryAccountId: '',
        businessDate: '',
        statementBalance: '',
        notes: '',
      });
      setAlert({ type: 'success', message: 'Treasury reconciliation created.' });
      await loadTreasury();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create treasury reconciliation' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteReconciliation = async (reconciliationId) => {
    try {
      setSubmitting(true);
      await completeTreasuryReconciliation(reconciliationId, {
        notes: reconciliationCompletionNotes[reconciliationId] || null,
      });
      setReconciliationCompletionNotes((current) => ({ ...current, [reconciliationId]: '' }));
      setAlert({ type: 'success', message: 'Treasury reconciliation completed.' });
      await loadTreasury();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to complete treasury reconciliation' });
    } finally {
      setSubmitting(false);
    }
  };

  const treasuryAccountColumns = [
    { key: 'accountCode', header: 'Code', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{value}</span> },
    { key: 'accountName', header: 'Account' },
    { key: 'accountType', header: 'Type', render: (value) => <Badge variant="info">{value}</Badge> },
    { key: 'currency', header: 'Currency' },
    { key: 'active', header: 'State', render: (value) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Badge> },
  ];

  const treasuryLineSummary = (lines = []) => {
    const count = Array.isArray(lines) ? lines.length : 0;
    if (!count) return 'No matched activity';
    const total = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    return `${count} lines · ${formatNumber(total)}`;
  };

  const treasuryReconciliationColumns = [
    {
      key: 'treasuryAccountCode',
      header: 'Account',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.treasuryAccountName}</div>
        </div>
      ),
    },
    { key: 'businessDate', header: 'Date' },
    { key: 'status', header: 'Status', render: (value) => <Badge variant={value === 'COMPLETED' ? 'success' : 'warning'}>{value}</Badge> },
    { key: 'statementBalance', header: 'Statement', render: (value) => formatNumber(value) },
    { key: 'systemBalance', header: 'System', render: (value) => formatNumber(value) },
    { key: 'differenceAmount', header: 'Difference', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
    { key: 'lines', header: 'Matched Activity', render: (value) => treasuryLineSummary(value) },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex min-w-[16rem] items-center gap-2">
          <input
            type="text"
            value={reconciliationCompletionNotes[row.id] || ''}
            onChange={(event) => setReconciliationCompletionNotes((current) => ({ ...current, [row.id]: event.target.value }))}
            placeholder="Completion note"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <Button size="sm" variant="secondary" disabled={submitting || row.status === 'COMPLETED'} onClick={() => handleCompleteReconciliation(row.id)}>
            Complete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AccountingPage title="Treasury" subtitle="Cash and bank accounts plus reconciliation runs.">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Create Treasury Account" subtitle="Register a cash, bank, wallet, or clearing account for reconciliation">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input label="Account code" value={treasuryAccountForm.accountCode} onChange={(event) => setTreasuryAccountForm((current) => ({ ...current, accountCode: event.target.value.toUpperCase() }))} placeholder="BANK-MAIN" />
                <Input label="Account name" value={treasuryAccountForm.accountName} onChange={(event) => setTreasuryAccountForm((current) => ({ ...current, accountName: event.target.value }))} placeholder="Main Operating Bank" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Treasury type
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={treasuryAccountForm.accountType} onChange={(event) => setTreasuryAccountForm((current) => ({ ...current, accountType: event.target.value }))}>
                    {['BANK', 'CASH', 'WALLET', 'CLEARING'].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <Input label="Currency" value={treasuryAccountForm.currency} onChange={(event) => setTreasuryAccountForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} placeholder="USD" maxLength={3} />
              </div>
              <Input label="Notes" value={treasuryAccountForm.notes} onChange={(event) => setTreasuryAccountForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional treasury account notes" />
              <Button className="w-full" icon="account_balance" loading={submitting} onClick={handleCreateTreasuryAccount}>Create treasury account</Button>
            </div>
          </Card>

          <Card title="Create Reconciliation" subtitle="Compare external statement balance to matched system cash activity">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Treasury account
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={treasuryReconciliationForm.treasuryAccountId} onChange={(event) => setTreasuryReconciliationForm((current) => ({ ...current, treasuryAccountId: event.target.value }))}>
                  <option value="">Select treasury account</option>
                  {treasuryAccounts.filter((account) => account.active).map((account) => <option key={account.id} value={account.id}>{account.accountCode} · {account.accountName}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input type="date" label="Business date" value={treasuryReconciliationForm.businessDate} onChange={(event) => setTreasuryReconciliationForm((current) => ({ ...current, businessDate: event.target.value }))} />
                <Input type="number" step="0.000001" label="Statement balance" value={treasuryReconciliationForm.statementBalance} onChange={(event) => setTreasuryReconciliationForm((current) => ({ ...current, statementBalance: event.target.value }))} placeholder="0.00" />
              </div>
              <Input label="Notes" value={treasuryReconciliationForm.notes} onChange={(event) => setTreasuryReconciliationForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Bank statement or cash count note" />
              <Button className="w-full" icon="fact_check" loading={submitting} onClick={handleCreateReconciliation}>Create reconciliation</Button>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card padding="none" className="overflow-hidden" title="Treasury Accounts" subtitle="Cash and bank accounts available for reconciliation">
            <DataTable columns={treasuryAccountColumns} data={treasuryAccounts} loading={loading} emptyMessage="No treasury accounts created yet." />
          </Card>

          <Card padding="none" className="overflow-hidden" title="Treasury Reconciliations" subtitle="Statement-vs-system comparison across POS, AR receipts, and AP payments">
            <DataTable columns={treasuryReconciliationColumns} data={treasuryReconciliations} loading={loading} emptyMessage="No treasury reconciliations created yet." />
          </Card>
        </div>
    </AccountingPage>
  );
};

export default Treasury;
