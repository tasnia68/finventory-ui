import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable } from '../../components/common';
import { AccountingPage, Stat } from './AccountingShell';
import {
  getAccounts,
  getAccountsPayableInvoices,
  getAccountsReceivableInvoices,
  getBalanceSheet,
  getJournalEntries,
  getJournals,
  getProfitAndLoss,
  getTreasuryReconciliations,
  getTrialBalance,
  postPendingFinancialEvents,
} from '../../services/accountingService';
import { formatNumber, toList } from './shared';

const AccountingOverview = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState([]);
  const [profitAndLoss, setProfitAndLoss] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState([]);
  const [apInvoices, setApInvoices] = useState([]);
  const [arInvoices, setArInvoices] = useState([]);
  const [treasuryReconciliations, setTreasuryReconciliations] = useState([]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const [
        accountsResponse,
        journalsResponse,
        entriesResponse,
        trialBalanceResponse,
        profitAndLossResponse,
        balanceSheetResponse,
        apInvoicesResponse,
        arInvoicesResponse,
        treasuryReconciliationsResponse,
      ] = await Promise.all([
        getAccounts(),
        getJournals(),
        getJournalEntries(),
        getTrialBalance(),
        getProfitAndLoss(),
        getBalanceSheet(),
        getAccountsPayableInvoices(),
        getAccountsReceivableInvoices(),
        getTreasuryReconciliations(),
      ]);

      setAccounts(toList(accountsResponse));
      setJournals(toList(journalsResponse));
      setEntries(toList(entriesResponse));
      setTrialBalance(toList(trialBalanceResponse));
      setProfitAndLoss(toList(profitAndLossResponse));
      setBalanceSheet(toList(balanceSheetResponse));
      setApInvoices(toList(apInvoicesResponse));
      setArInvoices(toList(arInvoicesResponse));
      setTreasuryReconciliations(toList(treasuryReconciliationsResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load accounting overview' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const metrics = useMemo(() => {
    const postedEntries = entries.filter((entry) => entry.status === 'POSTED').length;
    const totalDebits = trialBalance.reduce((sum, row) => sum + Number(row.totalDebits || 0), 0);
    const totalCredits = trialBalance.reduce((sum, row) => sum + Number(row.totalCredits || 0), 0);
    const netIncome = profitAndLoss.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const apOpen = apInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
    const arOpen = arInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
    const treasuryVariance = treasuryReconciliations.reduce((sum, item) => sum + Number(item.differenceAmount || 0), 0);
    const assets = balanceSheet
      .filter((row) => row.accountType === 'ASSET')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return {
      postedEntries,
      totalDebits,
      totalCredits,
      netIncome,
      apOpen,
      arOpen,
      treasuryVariance,
      assets,
    };
  }, [apInvoices, arInvoices, balanceSheet, entries, profitAndLoss, treasuryReconciliations, trialBalance]);

  const recentEntries = useMemo(() => entries.slice(0, 25), [entries]);

  const recentEntryColumns = [
    {
      key: 'entryNumber',
      header: 'Entry',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {row.journalCode || 'UNASSIGNED'} · {row.sourceDocumentType || 'MANUAL'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <Badge variant={value === 'POSTED' ? 'success' : 'warning'}>{value}</Badge>,
    },
    { key: 'totalDebits', header: 'Debits', render: (value) => <span className="tabular-nums">{formatNumber(value)}</span> },
    { key: 'totalCredits', header: 'Credits', render: (value) => <span className="tabular-nums">{formatNumber(value)}</span> },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value) => <span className="text-xs text-slate-500">{value ? new Date(value).toLocaleString() : '—'}</span>,
    },
  ];

  const handlePostPending = async () => {
    try {
      setSubmitting(true);
      const posted = await postPendingFinancialEvents();
      setAlert({
        type: 'success',
        message: `Posted ${Array.isArray(posted) ? posted.length : 0} pending financial event(s).`,
      });
      await loadOverview();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to post pending financial events' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccountingPage
      title="Overview"
      subtitle="Posted ledger position across receivables, payables, treasury, and entries."
      actions={
        <Button icon="publish" loading={submitting} onClick={handlePostPending}>
          Post pending events
        </Button>
      }
    >
      {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Net Income" value={formatNumber(metrics.netIncome)} />
        <Stat label="AR Open" value={formatNumber(metrics.arOpen)} hint="Customer balances" />
        <Stat label="AP Open" value={formatNumber(metrics.apOpen)} hint="Supplier balances" />
        <Stat label="Asset Balance" value={formatNumber(metrics.assets)} />
        <Stat label="Treasury Var." value={formatNumber(metrics.treasuryVariance)} hint="Reconciliation diff" />
        <Stat label="Posted Entries" value={metrics.postedEntries} />
        <Stat label="Accounts" value={accounts.length} hint="Chart of accounts" />
        <Stat label="Journals" value={journals.length} />
      </div>

      <Card
        padding="none"
        className="overflow-hidden"
        title="Recent journal entries"
        subtitle="Most recent posted or pending ledger activity"
      >
        <DataTable
          columns={recentEntryColumns}
          data={recentEntries}
          loading={loading}
          emptyMessage="No journal entries have been posted yet."
        />
      </Card>
    </AccountingPage>
  );
};

export default AccountingOverview;
