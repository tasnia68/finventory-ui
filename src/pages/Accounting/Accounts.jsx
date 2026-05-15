import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import { createAccount, getAccounts } from '../../services/accountingService';
import { toList } from './shared';
import { AccountingPage } from './AccountingShell';

const accountColumns = [
  { key: 'accountCode', header: 'Code', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{value}</span> },
  { key: 'accountName', header: 'Account' },
  { key: 'accountType', header: 'Type', render: (value) => <Badge variant="primary">{value}</Badge> },
  { key: 'allowManualPosting', header: 'Manual', render: (value) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Allowed' : 'System'}</Badge> },
  { key: 'active', header: 'State', render: (value) => <Badge variant={value ? 'success' : 'default'}>{value ? 'Active' : 'Inactive'}</Badge> },
];

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [accountForm, setAccountForm] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'ASSET',
    description: '',
  });

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await getAccounts();
      setAccounts(toList(response));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load chart of accounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreateAccount = async () => {
    try {
      setSubmitting(true);
      await createAccount(accountForm);
      setAccountForm({ accountCode: '', accountName: '', accountType: 'ASSET', description: '' });
      setAlert({ type: 'success', message: 'Account created successfully.' });
      await loadAccounts();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to create account' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccountingPage title="Chart of Accounts" subtitle="Native chart accounts used for journal posting and trial balance reporting.">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <Card title="Create Account" subtitle="Add a native chart-of-accounts record for manual or future posting flows">
            <div className="space-y-3">
              <Input label="Account code" value={accountForm.accountCode} onChange={(event) => setAccountForm((current) => ({ ...current, accountCode: event.target.value.toUpperCase() }))} placeholder="AR-1000" />
              <Input label="Account name" value={accountForm.accountName} onChange={(event) => setAccountForm((current) => ({ ...current, accountName: event.target.value }))} placeholder="Accounts Receivable" />
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Account type
                <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" value={accountForm.accountType} onChange={(event) => setAccountForm((current) => ({ ...current, accountType: event.target.value }))}>
                  {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <Input label="Description" value={accountForm.description} onChange={(event) => setAccountForm((current) => ({ ...current, description: event.target.value }))} placeholder="Optional account description" />
              <Button className="w-full" icon="add" loading={submitting} onClick={handleCreateAccount}>
                Create account
              </Button>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden" title="Chart of Accounts" subtitle="Native account register used for journal posting and trial balance reporting">
            <DataTable columns={accountColumns} data={accounts} loading={loading} emptyMessage="No chart of accounts records created yet." />
          </Card>
        </div>
    </AccountingPage>
  );
};

export default Accounts;
