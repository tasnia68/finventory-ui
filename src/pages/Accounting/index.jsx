import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, MetricCard } from '../../components/common';
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

  const recentEntries = useMemo(() => entries.slice(0, 8), [entries]);

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
    { key: 'totalDebits', header: 'Debits', render: (value) => formatNumber(value) },
    { key: 'totalCredits', header: 'Credits', render: (value) => formatNumber(value) },
  ];

  const quickLinks = [
    {
      title: 'Chart of Accounts',
      description: 'Create and review native ledger accounts for manual and system posting.',
      path: '/accounting/accounts',
      icon: 'account_tree',
    },
    {
      title: 'Journals',
      description: 'Register manual journals and review the journal catalog.',
      path: '/accounting/journals',
      icon: 'book_2',
    },
    {
      title: 'Journal Entries',
      description: 'Create manual journal entries, post pending events, and reverse entries.',
      path: '/accounting/entries',
      icon: 'edit_note',
    },
    {
      title: 'Payables',
      description: 'Create supplier invoices and record AP settlements.',
      path: '/accounting/payables',
      icon: 'request_quote',
    },
    {
      title: 'Receivables',
      description: 'Create customer invoices and record receipts.',
      path: '/accounting/receivables',
      icon: 'payments',
    },
    {
      title: 'Treasury',
      description: 'Manage treasury accounts and reconciliation runs.',
      path: '/accounting/treasury',
      icon: 'account_balance',
    },
    {
      title: 'Statements',
      description: 'Review trial balance, profit and loss, and balance sheet.',
      path: '/accounting/statements',
      icon: 'monitoring',
    },
    {
      title: 'Guide',
      description: 'Read the accounting module operating guide and user manual.',
      path: '/accounting/guide',
      icon: 'menu_book',
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
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_44%),radial-gradient(circle_at_85%_20%,_rgba(59,130,246,0.14),_transparent_28%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-900">
                Accounting
              </span>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Accounting is now split into focused workspaces.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Use this overview as the finance home page, then move into accounts, journals, entries,
                payables, receivables, treasury, or statements from the submenu.
              </p>
            </div>
            <div className="flex items-start">
              <div className="flex flex-wrap gap-3">
                <Link to="/accounting/guide">
                  <Button variant="secondary" icon="menu_book">
                    Open Guide
                  </Button>
                </Link>
                <Button icon="publish" loading={submitting} onClick={handlePostPending}>
                  Post Pending Events
                </Button>
              </div>
            </div>
          </div>
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Accounts" value={accounts.length} caption="Native chart accounts available for posting" icon="account_tree" tone="emerald" />
          <MetricCard title="Journals" value={journals.length} caption="System and manual journals configured" icon="book_2" tone="blue" />
          <MetricCard title="Posted Entries" value={metrics.postedEntries} caption="Posted journal entries across finance flows" icon="task_alt" tone="amber" />
          <MetricCard title="Net Income" value={formatNumber(metrics.netIncome)} caption="Revenue less expense from posted entries" icon="monitoring" tone="teal" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="AP Open" value={formatNumber(metrics.apOpen)} caption="Current unpaid supplier balances" icon="request_quote" tone="orange" />
          <MetricCard title="AR Open" value={formatNumber(metrics.arOpen)} caption="Current customer balances outstanding" icon="payments" tone="rose" />
          <MetricCard title="Treasury Variance" value={formatNumber(metrics.treasuryVariance)} caption="Open reconciliation variance" icon="account_balance" tone="orange" />
          <MetricCard title="Asset Balance" value={formatNumber(metrics.assets)} caption="Current posted asset position" icon="savings" tone="violet" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.path} to={item.path} className="block">
              <Card className="h-full transition-transform duration-200 hover:-translate-y-1" title={item.title} subtitle={item.description}>
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {item.icon}
                  </span>
                  <Button size="sm" variant="secondary">
                    Open
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Card
          padding="none"
          className="overflow-hidden"
          title="Recent Journal Entries"
          subtitle="Latest accounting entries posted or waiting for action"
        >
          <DataTable
            columns={recentEntryColumns}
            data={recentEntries}
            loading={loading}
            emptyMessage="No journal entries have been posted yet."
          />
        </Card>
      </div>
    </div>
  );
};

export default AccountingOverview;
