import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Input } from '../../components/common';
import {
  getShopifyConnection,
  pushShopifyCatalog,
  pushShopifyInventory,
  saveShopifyConnection,
  startShopifyOAuth,
  syncShopifyInventory,
  syncShopifyLocations,
  syncShopifyOrders,
  syncShopifyProducts,
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
  const [syncing, setSyncing] = useState(false);
  const [orderSyncing, setOrderSyncing] = useState(false);
  const [locationSyncing, setLocationSyncing] = useState(false);
  const [inventorySyncing, setInventorySyncing] = useState(false);
  const [catalogPushing, setCatalogPushing] = useState(false);
  const [inventoryPushing, setInventoryPushing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

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

  const handleProductSync = async () => {
    setSyncing(true);
    setAlert(null);
    setSyncResult(null);
    try {
      const result = await syncShopifyProducts();
      setSyncResult(result);
      const next = await getShopifyConnection();
      applyConnection(next);
      setAlert({ type: result.success ? 'success' : 'error', message: result.message || 'Shopify sync finished.' });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Shopify product sync failed.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleOrderSync = async () => {
    setOrderSyncing(true);
    setAlert(null);
    setSyncResult(null);
    try {
      const result = await syncShopifyOrders();
      setSyncResult(result);
      const next = await getShopifyConnection();
      applyConnection(next);
      setAlert({ type: result.success ? 'success' : 'error', message: result.message || 'Shopify order sync finished.' });
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Shopify order sync failed.' });
    } finally {
      setOrderSyncing(false);
    }
  };

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

  const handleLocationSync = () => runJob(syncShopifyLocations, setLocationSyncing, 'Shopify location sync failed.');
  const handleInventorySync = () => runJob(syncShopifyInventory, setInventorySyncing, 'Shopify inventory sync failed.');
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card title="Catalog sync" subtitle="Pull Shopify -> here" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pulls products, variants, options, images, vendor, type, tags, and status via GraphQL.</p>
            <Button className="mt-5 w-full" onClick={handleProductSync} loading={syncing}>Sync products now</Button>
          </Card>
          <Card title="Order sync" subtitle="Pull Shopify -> here" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pulls orders with customers and line items into inbound webhook events. Real-time orders also arrive via the orders/create webhook.</p>
            <Button className="mt-5 w-full" onClick={handleOrderSync} loading={orderSyncing}>Sync orders now</Button>
          </Card>
          <Card title="Locations sync" subtitle="Pull Shopify -> here" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pulls Shopify locations and maps them to local warehouses. Run before inventory sync.</p>
            <Button className="mt-5 w-full" onClick={handleLocationSync} loading={locationSyncing}>Sync locations now</Button>
          </Card>
          <Card title="Inventory sync" subtitle="Pull Shopify -> here" className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Pulls on-hand quantities per location/variant and reconciles local stock via stock movements (target - current = delta).</p>
            <Button className="mt-5 w-full" onClick={handleInventorySync} loading={inventorySyncing}>Sync inventory now</Button>
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
