import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '../../components/common';
import { getPluginWorkspace, simulateShopifyWebhook, triggerShopifySync } from '../../services/pluginWorkbench';

const healthVariant = {
  CONNECTED: 'success',
  CONFIGURED: 'info',
  NOT_CONFIGURED: 'default',
  MISSING_CREDENTIALS: 'warning',
  COMING_SOON: 'default',
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : 'Never');

const signalTone = {
  CONNECTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  CONFIGURED: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
  NOT_CONFIGURED: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  MISSING_CREDENTIALS: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  COMING_SOON: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

const PluginsOverview = () => {
  const [workspace, setWorkspace] = useState(getPluginWorkspace());
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setWorkspace(getPluginWorkspace());
  }, []);

  const refresh = () => setWorkspace(getPluginWorkspace());

  const handleOutboundSync = (scope) => {
    const next = triggerShopifySync(scope);
    setWorkspace(next);
    setAlert({
      type: next.shopify.lastSyncAt ? 'success' : 'error',
      message: `Shopify ${scope} sync action recorded.`,
    });
  };

  const handleWebhookSimulation = () => {
    const next = simulateShopifyWebhook();
    setWorkspace(next);
    setAlert({ type: 'success', message: 'Shopify webhook event recorded in the plugin log.' });
  };

  const shopify = workspace.shopify;
  const installedPlugins = workspace.plugins.filter((plugin) => plugin.installed);
  const failedLogs = workspace.logs.filter((entry) => entry.status === 'FAILED').length;
  const retryableLogs = workspace.logs.filter((entry) => entry.retryable).length;

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.2),_transparent_34%),radial-gradient(circle_at_85%_0%,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.82),rgba(248,250,252,0.25))]" />
          <div className="relative grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_26rem]">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white dark:bg-white dark:text-slate-900">
                Plugins
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Connect storefronts and external systems from one module.</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  This frontend-first plugin workspace introduces the structure for Shopify and future integrations.
                  It includes plugin status, sync actions, webhook visibility, and operator surfaces without backend wiring yet.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/plugins/shopify">
                  <Button icon="storefront">Open Shopify</Button>
                </Link>
                <Link to="/plugins/logs">
                  <Button variant="secondary" icon="receipt_long">Open Logs</Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-700 dark:bg-slate-950/30">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Installed</div>
                  <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{installedPlugins.length}</div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Plugin surfaces ready to be operated from the current workspace.</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-700 dark:bg-slate-950/30">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Failures</div>
                  <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{failedLogs}</div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Integration events currently needing review or retry.</div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-5 dark:border-slate-700 dark:bg-slate-950/30">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Retry queue</div>
                  <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{retryableLogs}</div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Failed items already shaped for operator retry workflow.</div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-6 shadow-inner dark:border-slate-700 dark:bg-slate-950/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Shopify control</div>
                  <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">Fast operator actions</div>
                  <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Trigger the most common sync and webhook actions without leaving the overview.</div>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${signalTone[shopify.health] || signalTone.NOT_CONFIGURED}`}>
                  {shopify.health}
                </span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Plugin state</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{shopify.enabled ? 'Enabled and ready for sync.' : 'Disabled until explicitly enabled.'}</div>
                    </div>
                    <Badge variant={shopify.enabled ? 'success' : 'default'}>{shopify.enabled ? 'ENABLED' : 'DISABLED'}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[24px] bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Last sync</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(shopify.lastSyncAt)}</div>
                  </div>
                  <div className="rounded-[24px] bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Last webhook</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(shopify.lastWebhookAt)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={() => handleOutboundSync('catalog')}>Catalog sync</Button>
                  <Button variant="secondary" onClick={() => handleOutboundSync('inventory')}>Inventory push</Button>
                  <Button variant="secondary" onClick={() => handleOutboundSync('orders')}>Order pull</Button>
                  <Button variant="secondary" onClick={handleWebhookSimulation}>Webhook test</Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {workspace.plugins.map((plugin) => (
              <Card
                key={plugin.key}
                title={plugin.name}
                subtitle={plugin.summary}
                className="h-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Provider type</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{plugin.providerType}</div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${signalTone[plugin.health] || signalTone.NOT_CONFIGURED}`}>
                      {plugin.health}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Enabled</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{plugin.enabled ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Last sync</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDateTime(plugin.lastSyncAt)}</div>
                    </div>
                  </div>
                  {plugin.key === 'shopify' ? (
                    <Link to="/plugins/shopify">
                      <Button className="w-full" icon="arrow_forward">Manage Shopify</Button>
                    </Link>
                  ) : (
                    <Button className="w-full" variant="secondary" disabled>Coming soon</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Card title="Operator notes" subtitle="Current boundaries of the frontend-only plugin workspace" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>Shopify is the first modeled plugin. Configuration, enablement, sync actions, and logs are available in the UI.</p>
              <p>State is currently stored in browser local storage so teams can validate layout and workflow before backend APIs land.</p>
              <p>Future backend work can replace the local storage service with real tenant-scoped plugin APIs without changing the overall module structure.</p>
              <Button variant="secondary" onClick={refresh}>Refresh workspace</Button>
            </div>
          </Card>
        </div>

        <Card title="Ready next" subtitle="Planned backend surfaces this frontend is prepared to consume" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              'Tenant-scoped plugin connection records',
              'Webhook event log and retry queue',
              'Shopify catalog, order, and stock sync endpoints',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PluginsOverview;
