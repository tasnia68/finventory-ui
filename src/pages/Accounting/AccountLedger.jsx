import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import { getAccountLedger } from '../../services/accountingService';
import { formatNumber } from './shared';
import { AccountingPage, Stat } from './AccountingShell';

const today = new Date().toISOString().slice(0, 10);

const AccountLedger = () => {
  const { accountId } = useParams();
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: today });
  const [appliedFilters, setAppliedFilters] = useState({ from: '', to: today });
  const [page, setPage] = useState(0);

  const loadLedger = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAccountLedger(accountId, { ...appliedFilters, page, size: 100 });
      setLedger(response);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load account ledger' });
    } finally {
      setLoading(false);
    }
  }, [accountId, appliedFilters, page]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const title = ledger ? `${ledger.accountCode} · ${ledger.accountName}` : 'Account Ledger';
  const rows = useMemo(() => ledger?.lines || [], [ledger]);
  const totalLines = Number(ledger?.totalLines || 0);
  const pageSize = Number(ledger?.size || 100);
  const hasPrevious = page > 0;
  const hasNext = (page + 1) * pageSize < totalLines;
  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(0);
  };

  const columns = [
    {
      key: 'entryDate',
      header: 'Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
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
    {
      key: 'description',
      header: 'Description',
      render: (value, row) => value || row.memo || '-',
    },
    { key: 'debitAmount', header: 'Debit', render: (value) => formatNumber(value) },
    { key: 'creditAmount', header: 'Credit', render: (value) => formatNumber(value) },
    {
      key: 'runningBalance',
      header: 'Running Balance',
      render: (value) => <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(value)}</span>,
    },
  ];

  return (
    <AccountingPage
      title={title}
      subtitle="Posted journal lines for this chart account with opening, closing, and running balances."
      actions={
        <Link to="/accounting/accounts">
          <Button variant="secondary" icon="arrow_back">Accounts</Button>
        </Link>
      }
    >
      {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Stat label="Opening" value={formatNumber(ledger?.openingBalance || 0)} />
        <Stat label="Closing" value={formatNumber(ledger?.closingBalance || 0)} />
        <Stat label="Lines" value={rows.length} />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</div>
          <div className="mt-2"><Badge variant="primary">{ledger?.accountType || '-'}</Badge></div>
        </div>
      </div>

      <Card title="Filters" subtitle="Limit the ledger to a posting date range.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Input type="date" label="From" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          <Input type="date" label="To" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          <Button icon="search" loading={loading} onClick={applyFilters}>Apply</Button>
        </div>
      </Card>

      <Card
        padding="none"
        className="overflow-hidden"
        title="Ledger Lines"
        subtitle={`Every posted journal line for this account in date order · ${totalLines} total`}
      >
        <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No posted lines found for this account." />
        {totalLines > pageSize ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Page {page + 1}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={!hasPrevious || loading} onClick={() => setPage((current) => Math.max(current - 1, 0))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={!hasNext || loading} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </AccountingPage>
  );
};

export default AccountLedger;
