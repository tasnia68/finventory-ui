import React, { useEffect, useState } from 'react';
import { Alert, Badge, Card, DataTable } from '../../components/common';
import { getBalanceSheet, getProfitAndLoss, getTrialBalance } from '../../services/accountingService';
import { formatNumber, toList } from './shared';

const trialBalanceColumns = [
  { key: 'accountCode', header: 'Code' },
  { key: 'accountName', header: 'Account' },
  { key: 'accountType', header: 'Type', render: (value) => <Badge variant="primary">{value}</Badge> },
  { key: 'totalDebits', header: 'Debits', render: (value) => formatNumber(value) },
  { key: 'totalCredits', header: 'Credits', render: (value) => formatNumber(value) },
  { key: 'balance', header: 'Balance', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
];

const statementColumns = [
  { key: 'accountCode', header: 'Code' },
  { key: 'accountName', header: 'Account' },
  { key: 'accountType', header: 'Type', render: (value) => <Badge variant="primary">{value}</Badge> },
  { key: 'amount', header: 'Amount', render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span> },
];

const Statements = () => {
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [trialBalance, setTrialBalance] = useState([]);
  const [profitAndLoss, setProfitAndLoss] = useState([]);
  const [balanceSheet, setBalanceSheet] = useState([]);

  const loadStatements = async () => {
    try {
      setLoading(true);
      const [trialBalanceResponse, profitAndLossResponse, balanceSheetResponse] = await Promise.all([
        getTrialBalance(),
        getProfitAndLoss(),
        getBalanceSheet(),
      ]);
      setTrialBalance(toList(trialBalanceResponse));
      setProfitAndLoss(toList(profitAndLossResponse));
      setBalanceSheet(toList(balanceSheetResponse));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load accounting statements' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatements();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <Card padding="none" className="overflow-hidden" title="Trial Balance" subtitle="Posted-account balances grouped by chart account">
          <DataTable columns={trialBalanceColumns} data={trialBalance} loading={loading} emptyMessage="No posted balances are available yet." />
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card padding="none" className="overflow-hidden" title="Profit and Loss" subtitle="Revenue and expense statement generated from posted ledger balances">
            <DataTable columns={statementColumns} data={profitAndLoss} loading={loading} emptyMessage="No profit and loss balances are available yet." />
          </Card>

          <Card padding="none" className="overflow-hidden" title="Balance Sheet" subtitle="Assets, liabilities, and equity from the posted accounting ledger">
            <DataTable columns={statementColumns} data={balanceSheet} loading={loading} emptyMessage="No balance sheet balances are available yet." />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Statements;
