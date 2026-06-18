import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Input } from '../../components/common';
import {
  enqueueShopifyRun,
  getShopifyConnection,
  listShopifyRuns,
  processShopifyRunPage,
  pushShopifyCatalog,
  pushShopifyInventory,
  resumeShopifyRun,
  saveShopifyConnection,
  startShopifyOAuth,
  startShopifyRun,
  testShopifyConnection,
} from '../../services/shopifyIntegrationService';

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
  const [connection, setConnection] = useState(null);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState({
    storeDomain: '',
    clientId: '',
    clientSecret: '',
    adminApiToken: '',
    webhookSecret: '',
    enabled: false,
    syncCatalog: true,
    syncOrders: true,
    syncInventory: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [catalogPushing, setCatalogPushing] = useState(false);
  const [inventoryPushing, setInventoryPushing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [incremental, setIncremental] = useState(true);
  const [background, setBackground] = useState(false);
  const [activeRun, setActiveRun] = useState(null);
  const [runningType, setRunningType] = useState(null);
  const [runLog, setRunLog] = useState([]);
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    let mounted = true;
    getShopifyConnection()
      .then((next) => {
        if (!mounted) return;
        setConnection(next);
        setForm({
          storeDomain: next.storeDomain || '',
          clientId: '',
          clientSecret: '',
          adminApiToken: '',
          webhookSecret: '',
          enabled: Boolean(next.enabled),
          syncCatalog: next.syncCatalog !== false,
          syncOrders: next.syncOrders !== false,
          syncInventory: next.syncInventory !== false,
        });
      })
      .catch((error) => setAlert({ type: 'error', message: error.message || 'Failed to load Shopify connection.' }))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const applyConnection = (next) => {
    setConnection(next);
    setForm((current) => ({
      ...current,
      storeDomain: next.storeDomain || current.storeDomain || '',
      clientId: '',
      clientSecret: '',
      adminApiToken: '',
      webhookSecret: '',
      enabled: Boolean(next.enabled),
      syncCatalog: next.syncCatalog !== false,
      syncOrders: next.syncOrders !== false,
      syncInventory: next.syncInventory !== false,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const next = await saveShopifyConnection(form);
      applyConnection(next);
      setAlert({ type: 'success', message: 'Shopify configuration saved to backend tenant settings.' });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to save Shopify configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    const nextEnabled = !form.enabled;
    const nextForm = { ...form, enabled: nextEnabled };
    setForm(nextForm);
    setSaving(true);
    setAlert(null);
    try {
      const next = await saveShopifyConnection(nextForm);
      applyConnection(next);
      setAlert({ type: 'success', message: nextEnabled ? 'Shopify enabled.' : 'Shopify disabled.' });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to update Shopify status.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setAlert(null);
    try {
      const next = await testShopifyConnection();
      applyConnection(next);
      setAlert({
        type: next.health === 'CONNECTED' ? 'success' : 'error',
        message: next.health === 'CONNECTED' ? 'Connection test passed.' : 'Connection test failed. Check the store domain and Admin API token.',
      });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleInstall = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const saved = await saveShopifyConnection(form);
      applyConnection(saved);
      const next = await startShopifyOAuth();
      applyConnection(next);
      if (next.installUrl) {
        window.location.assign(next.installUrl);
        return;
      }
      setAlert({ type: 'error', message: 'Shopify install URL could not be generated. Check store domain, client ID, and client secret.' });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Failed to start Shopify install.' });
    } finally {
      setSaving(false);
    }
  };

  const appendLog = (line) => setRunLog((prev) => [...prev.slice(-200), line]);

  const refreshRuns = async () => {
    try {
      setRuns(await listShopifyRuns());
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => {
    refreshRuns();
  }, []);

  const summarizeRun = (run) => {
    const r = run?.result || {};
    switch (run?.syncType) {
      case 'PRODUCTS':
        return `seen ${r.productsSeen || 0} · +${r.productsCreated || 0}/~${r.productsUpdated || 0} products · ${r.variantsCreated || 0} variants · ${r.imagesImported || 0} imgs`;
      case 'ORDERS':
        return `seen ${r.ordersSeen || 0} · imported ${r.ordersImported || 0} · dup ${r.ordersDuplicate || 0}`;
      case 'INVENTORY':
        return `stock levels ${r.stockLevelsApplied || 0}/${r.stockLevelsSeen || 0}`;
      case 'LOCATIONS':
        return `+${r.locationsCreated || 0}/~${r.locationsMatched || 0} of ${r.locationsSeen || 0}`;
      default:
        return '';
    }
  };

  // Drive a run page-by-page until it leaves RUNNING. Each page is one short request,
  // so thousands of products stream in without a single long-lived call timing out.
  const drivePages = async (run) => {
    let current = run;
    let guard = 0;
    while (current.status === 'RUNNING' && guard < 100000) {
      guard += 1;
      // eslint-disable-next-line no-await-in-loop
      current = await processShopifyRunPage(current.id);
      setActiveRun(current);
      appendLog(`page ${current.pagesProcessed}: ${summarizeRun(current)}`);
      if (current.status === 'FAILED') {
        appendLog(`FAILED: ${current.message || 'unknown error'} (resume from the runs list)`);
      }
    }
    return current;
  };

  // Background mode: the RabbitMQ worker drives the run server-side; we just poll the
  // journal for progress. The browser can be closed — the run continues regardless.
  const pollUntilDone = async (runId) => {
    let last = null;
    let guard = 0;
    while (guard < 100000) {
      guard += 1;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 2500));
      // eslint-disable-next-line no-await-in-loop
      const list = await listShopifyRuns();
      setRuns(list);
      const found = list.find((r) => r.id === runId);
      if (found) {
        setActiveRun(found);
        if (!last || found.pagesProcessed !== last.pagesProcessed || found.status !== last.status) {
          appendLog(`page ${found.pagesProcessed}: ${summarizeRun(found)} [${found.status}]`);
        }
        last = found;
        if (found.status !== 'RUNNING') {
          return found;
        }
      }
    }
    return last;
  };

  const driveRun = async (type) => {
    if (runningType) return;
    setRunningType(type);
    setAlert(null);
    setSyncResult(null);
    setRunLog([]);
    try {
      let run;
      if (background) {
        run = await enqueueShopifyRun(type, incremental);
        setActiveRun(run);
        appendLog(`Queued ${type} ${run.incremental ? '(incremental)' : '(full)'} — run ${(run.id || '').slice(0, 8)} -> worker`);
        if (run.status === 'RUNNING') {
          run = await pollUntilDone(run.id);
        }
      } else {
        run = await startShopifyRun(type, incremental);
        setActiveRun(run);
        appendLog(`Started ${type} ${run.incremental ? '(incremental)' : '(full)'} — run ${(run.id || '').slice(0, 8)}`);
        run = await drivePages(run);
      }
      setActiveRun(run);
      setSyncResult(run.result);
      await refreshRuns();
      const next = await getShopifyConnection();
      applyConnection(next);
      setAlert({
        type: run.status === 'COMPLETED' ? 'success' : (run.status === 'RUNNING' ? 'info' : 'error'),
        message: run.status === 'COMPLETED'
          ? `${type} sync complete in ${run.pagesProcessed} page(s).`
          : run.status === 'RUNNING'
            ? `${type} sync still running in background — safe to leave this page.`
            : `${type} sync failed: ${run.message || 'unknown error'}. Use Resume in the runs list to continue from where it stopped.`,
      });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || `${type} sync failed.` });
      await refreshRuns();
    } finally {
      setRunningType(null);
    }
  };

  const resumeRunLoop = async (run) => {
    if (runningType) return;
    setRunningType(run.syncType);
    setAlert(null);
    setRunLog([`Resuming ${run.syncType} run ${(run.id || '').slice(0, 8)} from cursor`]);
    try {
      let resumed = await resumeShopifyRun(run.id);
      setActiveRun(resumed);
      resumed = await drivePages(resumed);
      setActiveRun(resumed);
      setSyncResult(resumed.result);
      await refreshRuns();
      setAlert({
        type: resumed.status === 'COMPLETED' ? 'success' : 'error',
        message: resumed.status === 'COMPLETED'
          ? `${resumed.syncType} sync complete.`
          : `Still failing: ${resumed.message || 'unknown error'}`,
      });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Resume failed.' });
      await refreshRuns();
    } finally {
      setRunningType(null);
    }
  };

  const handleProductSync = () => driveRun('PRODUCTS');
  const handleOrderSync = () => driveRun('ORDERS');
  const handleLocationSync = () => driveRun('LOCATIONS');
  const handleInventorySync = () => driveRun('INVENTORY');

  const runJob = async (apiCall, setBusy, defaultMessage) => {
    setBusy(true);
    setAlert(null);
    setSyncResult(null);
    try {
      const result = await apiCall();
      setSyncResult(result);
      const next = await getShopifyConnection();
      applyConnection(next);
      setAlert({ type: result.success ? 'success' : 'error', message: result.message || defaultMessage });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || defaultMessage });
    } finally {
      setBusy(false);
    }
  };

  const handleCatalogPush = () => runJob(pushShopifyCatalog, setCatalogPushing, 'Shopify catalog push failed.');
  const handleInventoryPush = () => runJob(pushShopifyInventory, setInventoryPushing, 'Shopify inventory push failed.');

  const health = connection?.health || 'NOT_CONFIGURED';
  const canInstall = Boolean(form.storeDomain) && (Boolean(form.clientId) || Boolean(connection?.clientIdConfigured)) && (Boolean(form.clientSecret) || Boolean(connection?.clientSecretConfigured));

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-background-light p-8 dark:bg-background-dark">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-20 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Loading Shopify connection...
        </div>
      </div>
    );
  }

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
                sync direction flags, connection health, webhook setup, and product import for the current tenant.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:min-w-[20rem]">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Health</div>
                <div className="mt-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${signalTone[health] || signalTone.NOT_CONFIGURED}`}>
                    {health}
                  </span>
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Plugin</div>
                <div className="mt-3 text-base font-bold text-slate-900 dark:text-white">{form.enabled ? 'Enabled' : 'Disabled'}</div>
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
                label="Client ID"
                value={form.clientId}
                onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
                placeholder={connection?.clientIdConfigured ? 'Saved - enter only to replace' : 'Shopify app client ID'}
              />
              <Input
                label="Client secret"
                value={form.clientSecret}
                onChange={(event) => setForm((current) => ({ ...current, clientSecret: event.target.value }))}
                placeholder={connection?.clientSecretConfigured ? 'Saved - enter only to replace' : 'Shopify app client secret'}
              />
              <Input
                label="Admin API token"
                value={form.adminApiToken}
                onChange={(event) => setForm((current) => ({ ...current, adminApiToken: event.target.value }))}
                placeholder={connection?.adminApiTokenConfigured ? 'OAuth token saved - enter only to replace manually' : 'Generated after Shopify install'}
              />
              <Input
                label="Webhook secret"
                value={form.webhookSecret}
                onChange={(event) => setForm((current) => ({ ...current, webhookSecret: event.target.value }))}
                placeholder={connection?.webhookSecretConfigured ? 'Saved - enter only to replace' : 'Webhook signing secret'}
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
              <Button icon="save" onClick={handleSave} loading={saving}>Save config</Button>
              <Button variant="secondary" icon="open_in_new" onClick={handleInstall} loading={saving} disabled={!canInstall}>Install Shopify app</Button>
              <Button variant="secondary" icon="published_with_changes" onClick={handleTest} loading={testing}>Test connection</Button>
              <Button variant="secondary" icon={form.enabled ? 'toggle_off' : 'toggle_on'} onClick={handleToggle} loading={saving}>
                {form.enabled ? 'Disable plugin' : 'Enable plugin'}
              </Button>
            </div>
          </Card>

          <Card title="Live state" subtitle="Current Shopify status for this frontend workspace" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-4">
              {[
                ['Last sync', connection?.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : 'Never'],
                ['Last webhook', connection?.lastWebhookAt ? new Date(connection.lastWebhookAt).toLocaleString() : 'Never'],
                ['OAuth app', connection?.clientIdConfigured && connection?.clientSecretConfigured ? 'Configured' : 'Missing'],
                ['Access token', connection?.adminApiTokenConfigured ? 'Installed' : 'Not installed'],
                ['Catalog sync', form.syncCatalog ? 'Enabled' : 'Disabled'],
                ['Order sync', form.syncOrders ? 'Enabled' : 'Disabled'],
                ['Inventory push', form.syncInventory ? 'Enabled' : 'Disabled'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="How to connect Shopify" subtitle="One-time setup in Shopify Admin" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
            <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {[
                'Create the Shopify app in Shopify Dev Dashboard or Shopify CLI and copy its client ID and client secret.',
                'Set this callback URL in Shopify app configuration, then save the app settings in Shopify.',
                'Grant Admin API scopes: read_products and read_orders. Add read_inventory, write_inventory, and read_locations only when inventory push is enabled.',
                'Enter store domain, client ID, and client secret above, then click Install Shopify app.',
                'Copy the webhook signing secret and save it above.',
                'Create an orders/create webhook in Shopify using the callback URL shown here.',
                'Run Test connection, enable the plugin, then run Sync products.',
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white dark:border-slate-700">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">OAuth callback URL</div>
              <div className="mt-3 break-all rounded-xl bg-white/10 p-3 font-mono text-xs leading-5 text-slate-100">
                {connection?.oauthCallbackUrl || '/api/v1/integrations/shopify/oauth/callback'}
              </div>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admin API scopes</div>
              <div className="mt-3 rounded-xl bg-white/10 p-3 font-mono text-xs text-slate-100">{connection?.oauthScopes || 'read_products,read_orders'}</div>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Webhook URL</div>
              <div className="mt-3 break-all rounded-xl bg-white/10 p-3 font-mono text-xs leading-5 text-slate-100">
                {connection?.webhookUrl || '/api/webhooks/shopify/{tenantId}/orders'}
              </div>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Shopify event</div>
              <div className="mt-3 rounded-xl bg-white/10 p-3 font-mono text-xs text-slate-100">orders/create</div>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admin API</div>
              <div className="mt-3 rounded-xl bg-white/10 p-3 font-mono text-xs text-slate-100">GraphQL / 2024-10</div>
              <p className="mt-5 text-sm leading-6 text-slate-300">
                When a Shopify order is created, the backend verifies the HMAC signature, stores the payload as an inbound webhook event, and the operations team can materialize it into a sales order with SKU auto-mapping.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Sync mode</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Incremental pulls only products/orders changed since the last completed sync (Shopify updated_at). Turn off for a full re-pull. Each sync runs page-by-page and can be resumed from where it stopped.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={incremental} onChange={(e) => setIncremental(e.target.checked)} disabled={Boolean(runningType)} />
              Incremental (changed only)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={background} onChange={(e) => setBackground(e.target.checked)} disabled={Boolean(runningType)} />
              Run in background (queue worker)
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card title="Catalog sync" subtitle="Pull Shopify -> here" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pulls products, variants, options, images, vendor, type, tags, and status via GraphQL. Paginated 25/page, resumable.</p>
            <Button className="mt-5 w-full" onClick={handleProductSync} loading={runningType === 'PRODUCTS'} disabled={Boolean(runningType)}>Sync products now</Button>
          </Card>
          <Card title="Order sync" subtitle="Pull Shopify -> here" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pulls orders with customers and line items into inbound webhook events. Real-time orders also arrive via the orders/create webhook.</p>
            <Button className="mt-5 w-full" onClick={handleOrderSync} loading={runningType === 'ORDERS'} disabled={Boolean(runningType)}>Sync orders now</Button>
          </Card>
          <Card title="Locations sync" subtitle="Pull Shopify -> here" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pulls Shopify locations and maps them to local warehouses. Run before inventory sync.</p>
            <Button className="mt-5 w-full" onClick={handleLocationSync} loading={runningType === 'LOCATIONS'} disabled={Boolean(runningType)}>Sync locations now</Button>
          </Card>
          <Card title="Inventory sync" subtitle="Pull Shopify -> here" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pulls on-hand quantities per location/variant and reconciles local stock via stock movements (target - current = delta).</p>
            <Button className="mt-5 w-full" onClick={handleInventorySync} loading={runningType === 'INVENTORY'} disabled={Boolean(runningType)}>Sync inventory now</Button>
          </Card>
          <Card title="Push catalog" subtitle="Push here -> Shopify" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Creates Shopify products (title, description, handle, vendor, type, tags, status) plus variants (price, sku, barcode) for any published local product not yet pushed.</p>
            <Button className="mt-5 w-full" onClick={handleCatalogPush} loading={catalogPushing}>Push catalog now</Button>
          </Card>
          <Card title="Push inventory" subtitle="Push here -> Shopify" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pushes local on-hand quantities per warehouse to the mapped Shopify location via inventorySetOnHandQuantities.</p>
            <Button className="mt-5 w-full" onClick={handleInventoryPush} loading={inventoryPushing}>Push inventory now</Button>
          </Card>
        </div>

        {(activeRun || runLog.length > 0) ? (
          <Card title="Live sync progress" subtitle={activeRun ? `${activeRun.syncType} · ${activeRun.status} · page ${activeRun.pagesProcessed}` : 'Idle'} className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {activeRun ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className={`inline-flex rounded-full px-3 py-1 ring-1 ${signalTone[activeRun.status === 'COMPLETED' ? 'CONNECTED' : activeRun.status === 'FAILED' ? 'MISSING_CREDENTIALS' : 'CONFIGURED']}`}>{activeRun.status}</span>
                <span className="text-slate-500 dark:text-slate-400">{summarizeRun(activeRun)}</span>
              </div>
            ) : null}
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 dark:border-slate-700">
              {runLog.length === 0 ? <div className="text-slate-500">No log lines yet.</div> : runLog.map((line, i) => (
                <div key={i} className={line.startsWith('FAILED') ? 'text-red-400' : ''}>{line}</div>
              ))}
            </div>
          </Card>
        ) : null}

        {runs.length > 0 ? (
          <Card title="Sync runs" subtitle="Recent runs for this tenant — resume any that failed" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Pages</th>
                    <th className="py-2 pr-3">Result</th>
                    <th className="py-2 pr-3">Started</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                      <td className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-200">{run.syncType}{run.incremental ? ' ·inc' : ''}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${signalTone[run.status === 'COMPLETED' ? 'CONNECTED' : run.status === 'FAILED' ? 'MISSING_CREDENTIALS' : 'CONFIGURED']}`}>{run.status}</span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{run.pagesProcessed}</td>
                      <td className="py-2 pr-3 text-xs text-slate-500 dark:text-slate-400">
                        {summarizeRun(run)}
                        {run.message ? <div className="mt-1 text-red-500">{run.message}</div> : null}
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-500 dark:text-slate-400">{run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}</td>
                      <td className="py-2 pr-3">
                        {run.status === 'FAILED' ? (
                          <Button variant="secondary" onClick={() => resumeRunLoop(run)} loading={runningType === run.syncType} disabled={Boolean(runningType)}>Resume</Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {syncResult ? (
          <Card title="Last product sync" subtitle="Shopify import result for this tenant" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
              {[
                ['Products seen', syncResult.productsSeen],
                ['Products created', syncResult.productsCreated],
                ['Products updated', syncResult.productsUpdated],
                ['Variants created', syncResult.variantsCreated],
                ['Variants updated', syncResult.variantsUpdated],
                ['Categories created', syncResult.categoriesCreated],
                ['Images imported', syncResult.imagesImported],
                ['Orders seen', syncResult.ordersSeen],
                ['Orders imported', syncResult.ordersImported],
                ['Orders duplicate', syncResult.ordersDuplicate],
                ['Locations seen', syncResult.locationsSeen],
                ['Locations created', syncResult.locationsCreated],
                ['Locations matched', syncResult.locationsMatched],
                ['Stock levels seen', syncResult.stockLevelsSeen],
                ['Stock levels applied', syncResult.stockLevelsApplied],
                ['Products pushed', syncResult.productsPushed],
                ['Variants pushed', syncResult.variantsPushed],
                ['Inventory adjustments pushed', syncResult.inventoryAdjustmentsPushed],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value ?? 0}</div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default ShopifyPluginPage;
