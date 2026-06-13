import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card, DataTable, Input, Button } from '../../components/common';
import { downloadAccountingStatement, getBalanceSheet, getCashFlow, getProfitAndLoss, getTrialBalance } from '../../services/accountingService';
import { formatNumber, toList } from './shared';
import { AccountingPage } from './AccountingShell';

const accountLink = (row, label) => (
  <Link className="font-medium text-primary hover:underline" to={`/accounting/accounts/${row.accountId}`}>
    {label}
  </Link>
);

const trialBalanceColumns = [
  { key: 'accountCode', header: 'Code', render: (value, row) => accountLink(row, value) },
  { key: 'accountName', header: 'Account', render: (value, row) => accountLink(row, value) },
  { key: 'accountType', header: 'Type', render: (value) => <Badge variant="primary">{value}</Badge> },
  { key: 'totalDebits', header: 'Debits', render: (value) => formatNumber(value) },
  { key: 'totalCredits', header: 'Credits', render: (value) => formatNumber(value) },
  { key: 'balance', header: 'Balance', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
];

const statementColumns = [
  { key: 'accountCode', header: 'Code', render: (value, row) => accountLink(row, value) },
  { key: 'accountName', header: 'Account', render: (value, row) => accountLink(row, value) },
  { key: 'accountType', header: 'Type', render: (value) => <Badge variant="primary">{value}</Badge> },
  { key: 'amount', header: 'Amount', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
];

const cashFlowColumns = [
  { key: 'section', header: 'Section', render: (value) => <Badge variant="primary">{value}</Badge> },
  { key: 'label', header: 'Activity' },
  { key: 'amount', header: 'Cash Movement', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
];

const defaultCashFlowFilters = () => {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
};

const Statements = () => {
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [trialBalance, setTrialBalance] = useState([]);
  const [profitAndLoss, setProfitAndLoss] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [cashFlowFilters, setCashFlowFilters] = useState(defaultCashFlowFilters);
  const [appliedCashFlowFilters, setAppliedCashFlowFilters] = useState(defaultCashFlowFilters);

  const loadStatements = useCallback(async () => {
    try {
      setLoading(true);
      const [trialBalanceResponse, profitAndLossResponse, balanceSheetResponse, cashFlowResponse] = await Promise.all([
        getTrialBalance(),
        getProfitAndLoss(),
        getBalanceSheet(),
        getCashFlow(appliedCashFlowFilters),
      ]);
      setTrialBalance(toList(trialBalanceResponse));
      setProfitAndLoss(toList(profitAndLossResponse));
      setBalanceSheet(toList(balanceSheetResponse));
      setCashFlow(toList(cashFlowResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load accounting statements' });
    } finally {
      setLoading(false);
    }
  }, [appliedCashFlowFilters]);

  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

  const cashFlowTotal = useMemo(() => cashFlow.reduce((sum, row) => sum + Number(row.amount || 0), 0), [cashFlow]);
  const applyCashFlowFilters = () => {
    setAppliedCashFlowFilters(cashFlowFilters);
  };
  const handleExport = async (statement, format) => {
    try {
      const blob = await downloadAccountingStatement(statement, format);
      const filenames = {
        trialBalance: 'trial-balance',
        profitAndLoss: 'profit-and-loss',
        balanceSheet: 'balance-sheet',
      };
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filenames[statement]}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to export statement' });
    }
  };

  const exportActions = (statement) => (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" onClick={() => handleExport(statement, 'csv')}>CSV</Button>
      <Button size="sm" variant="secondary" onClick={() => handleExport(statement, 'xlsx')}>Excel</Button>
    </div>
  );

  return (
    <AccountingPage title="Statements" subtitle="Trial balance, profit and loss, and balance sheet reports.">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card padding="none" className="overflow-hidden" title="Trial Balance" subtitle="Posted-account balances grouped by chart account" action={exportActions('trialBalance')}>
          <DataTable columns={trialBalanceColumns} data={trialBalance} loading={loading} emptyMessage="No posted balances are available yet." />
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card padding="none" className="overflow-hidden" title="Profit and Loss" subtitle="Revenue and expense statement generated from posted ledger balances" action={exportActions('profitAndLoss')}>
            <DataTable columns={statementColumns} data={profitAndLoss} loading={loading} emptyMessage="No profit and loss balances are available yet." />
          </Card>

          <Card padding="none" className="overflow-hidden" title="Balance Sheet" subtitle="Assets, liabilities, and equity from the posted accounting ledger" action={exportActions('balanceSheet')}>
            <DataTable columns={statementColumns} data={balanceSheet} loading={loading} emptyMessage="No balance sheet balances are available yet." />
          </Card>
        </div>

        <Card title="Cash Flow" subtitle={`Direct-method cash movement from posted cash, bank, wallet, clearing, and deposit ledger accounts. Net movement: ${formatNumber(cashFlowTotal)}`}>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Input type="date" label="From" value={cashFlowFilters.from} onChange={(event) => setCashFlowFilters((current) => ({ ...current, from: event.target.value }))} />
            <Input type="date" label="To" value={cashFlowFilters.to} onChange={(event) => setCashFlowFilters((current) => ({ ...current, to: event.target.value }))} />
            <Button icon="search" loading={loading} onClick={applyCashFlowFilters}>Apply</Button>
          </div>
          <DataTable columns={cashFlowColumns} data={cashFlow} loading={loading} emptyMessage="No cash flow movements are available for this period." />
        </Card>
    </AccountingPage>
  );
};

export default Statements;
