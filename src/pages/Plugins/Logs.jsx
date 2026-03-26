import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, DataTable } from '../../components/common';
import { getPluginWorkspace, retryPluginLog } from '../../services/pluginWorkbench';

const statusVariant = {
  SUCCESS: 'success',
  FAILED: 'warning',
  INFO: 'default',
};

const signalTone = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  FAILED: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  INFO: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

const PluginLogsPage = () => {
  const [workspace, setWorkspace] = useState(getPluginWorkspace());
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setWorkspace(getPluginWorkspace());
  }, []);

  const refresh = () => setWorkspace(getPluginWorkspace());

  const handleRetry = (logId) => {
    const next = retryPluginLog(logId);
    setWorkspace(next);
    setAlert({ type: 'success', message: 'Retry action recorded.' });
  };

  const logColumns = useMemo(() => [
    {
      key: 'pluginName',
      header: 'Plugin',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{row.eventType}</div>
        </div>
      ),
    },
    { key: 'direction', header: 'Direction' },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <Badge variant={statusVariant[value] || 'default'}>{value}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value) => new Date(value).toLocaleString(),
    },
    { key: 'message', header: 'Message' },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Button size="sm" variant="secondary" disabled={!row.retryable} onClick={() => handleRetry(row.id)}>
          Retry
        </Button>
      ),
    },
  ], []);

  const summary = {
    total: workspace.logs.length,
    failed: workspace.logs.filter((entry) => entry.status === 'FAILED').length,
    retryable: workspace.logs.filter((entry) => entry.retryable).length,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.2),_transparent_34%),radial-gradient(circle_at_85%_0%,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.82),rgba(248,250,252,0.24))]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white dark:bg-white dark:text-slate-900">
                Plugin logs
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Observe webhook events, sync attempts, and retryable failures.</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                This operator page is ready for backend plugin logs later. For now it captures frontend-recorded
                Shopify events so the layout and workflow are already in place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Operator feed
              </div>
              <Button variant="secondary" icon="sync" onClick={refresh}>Refresh logs</Button>
            </div>
          </div>
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Events', summary.total, 'Total plugin events recorded in the workspace.', signalTone.INFO],
            ['Failures', summary.failed, 'Events that currently need attention.', signalTone.FAILED],
            ['Retryable', summary.retryable, 'Failed events that can be retried from this page.', signalTone.SUCCESS],
          ].map(([title, value, caption, tone]) => (
            <div key={title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{title}</div>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{value}</div>
              <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{caption}</div>
              <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>{title} signal</div>
            </div>
          ))}
        </div>

        <Card padding="none" className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" title="Plugin activity log" subtitle="Recent sync and webhook activity across the frontend-only plugin module">
          <DataTable columns={logColumns} data={workspace.logs} loading={false} emptyMessage="No plugin activity has been recorded yet." />
        </Card>
      </div>
    </div>
  );
};

export default PluginLogsPage;
