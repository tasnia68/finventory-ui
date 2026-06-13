import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable, Input } from '../../components/common';
import { getAccountingAuditLog } from '../../services/accountingService';
import { AccountingPage } from './AccountingShell';
import { toList } from './shared';

const formatJson = (value) => {
  if (!value) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);
  const [alert, setAlert] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  const loadAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      setLogs(toList(await getAccountingAuditLog(limit)));
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to load audit log' });
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const selectedLog = useMemo(() => logs.find((log) => log.id === expandedLog) || null, [expandedLog, logs]);

  const columns = [
    {
      key: 'occurredAt',
      header: 'When',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      key: 'action',
      header: 'Action',
      render: (value) => <Badge variant="primary">{value}</Badge>,
    },
    {
      key: 'entityType',
      header: 'Entity',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.entityId || 'Batch operation'}</div>
        </div>
      ),
    },
    { key: 'userId', header: 'User', render: (value) => value || 'system' },
    {
      key: 'details',
      header: 'Details',
      render: (_, row) => (
        <Button size="sm" variant="secondary" onClick={() => setExpandedLog(row.id)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <AccountingPage title="Audit Log" subtitle="Accounting service mutations with request and result snapshots.">
      {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

      <Card
        padding="none"
        className="overflow-hidden"
        title="Accounting Audit Trail"
        subtitle="Create, post, reverse, payment, recurring, treasury, and attachment actions"
        action={(
          <div className="flex items-end gap-2">
            <Input
              type="number"
              label="Limit"
              min="1"
              max="500"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value || 100))}
            />
            <Button variant="secondary" loading={loading} onClick={loadAuditLog}>
              Refresh
            </Button>
          </div>
        )}
      >
        <DataTable columns={columns} data={logs} loading={loading} emptyMessage="No audit log entries yet." />
      </Card>

      {selectedLog ? (
        <Card
          title={`${selectedLog.action} · ${selectedLog.entityType}`}
          subtitle={selectedLog.entityId || 'Batch operation'}
          action={(
            <Button size="sm" variant="ghost" onClick={() => setExpandedLog(null)}>
              Close
            </Button>
          )}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Before</div>
              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{formatJson(selectedLog.beforeState)}</pre>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">After</div>
              <pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{formatJson(selectedLog.afterState)}</pre>
            </div>
          </div>
        </Card>
      ) : null}
    </AccountingPage>
  );
};

export default Audit;
