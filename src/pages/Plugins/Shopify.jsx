import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Input } from '../../components/common';
import {
  getPluginWorkspace,
  saveShopifyConfiguration,
  testShopifyConnection,
  toggleShopifyPlugin,
  triggerShopifySync,
} from '../../services/pluginWorkbench';

const healthVariant = {
  CONNECTED: 'success',
  CONFIGURED: 'info',
  NOT_CONFIGURED: 'default',
  MISSING_CREDENTIALS: 'warning',
};

const signalTone = {
  CONNECTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  CONFIGURED: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
  NOT_CONFIGURED: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  MISSING_CREDENTIALS: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
};

const ShopifyPluginPage = () => {
  const [workspace, setWorkspace] = useState(getPluginWorkspace());
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState(getPluginWorkspace().shopify);

  useEffect(() => {
    const next = getPluginWorkspace();
    setWorkspace(next);
    setForm(next.shopify);
  }, []);

  const persist = (next) => {
    setWorkspace(next);
    setForm(next.shopify);
  };

  const handleSave = () => {
    const next = saveShopifyConfiguration({
      ...form,
      enabled: workspace.shopify.enabled,
      health: workspace.shopify.health,
      lastSyncAt: workspace.shopify.lastSyncAt,
      lastWebhookAt: workspace.shopify.lastWebhookAt,
    });
    persist(next);
    setAlert({ type: 'success', message: 'Shopify configuration saved.' });
  };

  const handleToggle = () => {
    const next = toggleShopifyPlugin(!workspace.shopify.enabled);
    persist(next);
    setAlert({ type: 'success', message: next.shopify.enabled ? 'Shopify enabled.' : 'Shopify disabled.' });
  };

  const handleTest = () => {
    const next = testShopifyConnection();
    persist(next);
    setAlert({
      type: next.shopify.health === 'CONNECTED' ? 'success' : 'error',
      message: next.shopify.health === 'CONNECTED' ? 'Connection test passed.' : 'Connection test failed. Complete all required fields first.',
    });
  };

  const handleSync = (scope) => {
    const next = triggerShopifySync(scope);
    persist(next);
    setAlert({ type: next.shopify.lastSyncAt ? 'success' : 'error', message: `Shopify ${scope} action recorded.` });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_34%),radial-gradient(circle_at_85%_0%,_rgba(16,185,129,0.16),_transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.82),rgba(248,250,252,0.24))]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                Shopify
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Tenant connection, sync controls, and webhook readiness.</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                This page is the Shopify operator console. It covers storefront credentials, plugin enablement,
                sync direction flags, and connection health in a frontend-only implementation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:min-w-[20rem]">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Health</div>
                <div className="mt-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${signalTone[workspace.shopify.health] || signalTone.NOT_CONFIGURED}`}>
                    {workspace.shopify.health}
                  </span>
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Plugin</div>
                <div className="mt-3 text-base font-bold text-slate-900 dark:text-white">{workspace.shopify.enabled ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          </div>
        </div>

        {alert ? <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card title="Connection settings" subtitle="Store domain and secret material for the Shopify tenant connection" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Store domain"
                value={form.storeDomain}
                onChange={(event) => setForm((current) => ({ ...current, storeDomain: event.target.value }))}
                placeholder="my-store.myshopify.com"
              />
              <Input
                label="Admin API token"
                value={form.adminApiToken}
                onChange={(event) => setForm((current) => ({ ...current, adminApiToken: event.target.value }))}
                placeholder="shpat_..."
              />
              <Input
                label="Webhook secret"
                value={form.webhookSecret}
                onChange={(event) => setForm((current) => ({ ...current, webhookSecret: event.target.value }))}
                placeholder="Webhook signing secret"
              />
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-950/30">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Sync switches</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { key: 'syncCatalog', label: 'Sync catalog' },
                { key: 'syncOrders', label: 'Sync orders' },
                { key: 'syncInventory', label: 'Push inventory' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form[item.key])}
                    onChange={(event) => setForm((current) => ({ ...current, [item.key]: event.target.checked }))}
                  />
                </label>
              ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button icon="save" onClick={handleSave}>Save config</Button>
              <Button variant="secondary" icon="published_with_changes" onClick={handleTest}>Test connection</Button>
              <Button variant="secondary" icon={workspace.shopify.enabled ? 'toggle_off' : 'toggle_on'} onClick={handleToggle}>
                {workspace.shopify.enabled ? 'Disable plugin' : 'Enable plugin'}
              </Button>
            </div>
          </Card>

          <Card title="Live state" subtitle="Current Shopify status for this frontend workspace" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-4">
              {[
                ['Last sync', workspace.shopify.lastSyncAt ? new Date(workspace.shopify.lastSyncAt).toLocaleString() : 'Never'],
                ['Last webhook', workspace.shopify.lastWebhookAt ? new Date(workspace.shopify.lastWebhookAt).toLocaleString() : 'Never'],
                ['Catalog sync', workspace.shopify.syncCatalog ? 'Enabled' : 'Disabled'],
                ['Order sync', workspace.shopify.syncOrders ? 'Enabled' : 'Disabled'],
                ['Inventory push', workspace.shopify.syncInventory ? 'Enabled' : 'Disabled'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card title="Catalog sync" subtitle="Frontend trigger for product and catalog exchange" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Use this to simulate pushing or reconciling catalog state before backend APIs exist.</p>
            <Button className="mt-5 w-full" onClick={() => handleSync('catalog')}>Run catalog sync</Button>
          </Card>
          <Card title="Order sync" subtitle="Frontend trigger for Shopify order ingestion" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Use this to simulate pulling new orders into the internal sales workflow boundary.</p>
            <Button className="mt-5 w-full" onClick={() => handleSync('orders')}>Run order sync</Button>
          </Card>
          <Card title="Inventory push" subtitle="Frontend trigger for availability and stock updates" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Use this to simulate outbound stock publication for the Shopify storefront.</p>
            <Button className="mt-5 w-full" onClick={() => handleSync('inventory')}>Run inventory push</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopifyPluginPage;
