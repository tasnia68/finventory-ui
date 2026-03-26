const STORAGE_KEY = 'logistra.plugins.frontend.v1';

const createLog = (overrides = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  pluginKey: 'shopify',
  pluginName: 'Shopify',
  direction: 'INBOUND',
  eventType: 'system.note',
  status: 'SUCCESS',
  message: 'Plugin workspace initialized.',
  retryable: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const defaultState = {
  plugins: [
    {
      key: 'shopify',
      name: 'Shopify',
      providerType: 'ECOMMERCE',
      enabled: false,
      health: 'NOT_CONFIGURED',
      lastSyncAt: null,
      installed: true,
      summary: 'Catalog, order, and inventory sync for Shopify storefronts.',
    },
    {
      key: 'coming-soon',
      name: 'More plugins soon',
      providerType: 'EXTENSIBLE',
      enabled: false,
      health: 'COMING_SOON',
      lastSyncAt: null,
      installed: false,
      summary: 'Amazon, WooCommerce, shipping, ERP, and marketplace connectors can land on the same module.',
    },
  ],
  shopify: {
    storeDomain: '',
    adminApiToken: '',
    webhookSecret: '',
    enabled: false,
    syncCatalog: true,
    syncOrders: true,
    syncInventory: true,
    health: 'NOT_CONFIGURED',
    lastSyncAt: null,
    lastWebhookAt: null,
  },
  logs: [
    createLog({
      eventType: 'system.bootstrap',
      message: 'Plugins frontend is active. Backend integration wiring is pending.',
    }),
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }
    return { ...clone(defaultState), ...JSON.parse(raw) };
  } catch (error) {
    console.error('Failed to load plugin workspace state:', error);
    return clone(defaultState);
  }
};

const persistState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return clone(state);
};

const syncPluginCard = (state) => {
  const next = clone(state);
  next.plugins = next.plugins.map((plugin) => plugin.key !== 'shopify'
    ? plugin
    : {
        ...plugin,
        enabled: next.shopify.enabled,
        health: next.shopify.health,
        lastSyncAt: next.shopify.lastSyncAt,
      });
  return next;
};

export const getPluginWorkspace = () => syncPluginCard(loadState());

export const saveShopifyConfiguration = (payload) => {
  const state = loadState();
  state.shopify = {
    ...state.shopify,
    ...payload,
    health: payload.storeDomain && payload.adminApiToken && payload.webhookSecret ? 'CONFIGURED' : 'NOT_CONFIGURED',
  };
  state.logs.unshift(createLog({
    eventType: 'shopify.config.saved',
    status: 'SUCCESS',
    direction: 'INTERNAL',
    message: 'Shopify configuration saved in the frontend workspace.',
  }));
  return persistState(syncPluginCard(state));
};

export const toggleShopifyPlugin = (enabled) => {
  const state = loadState();
  state.shopify.enabled = enabled;
  if (!enabled) {
    state.shopify.health = state.shopify.storeDomain ? 'CONFIGURED' : 'NOT_CONFIGURED';
  } else if (state.shopify.storeDomain && state.shopify.adminApiToken && state.shopify.webhookSecret) {
    state.shopify.health = 'CONNECTED';
  } else {
    state.shopify.health = 'MISSING_CREDENTIALS';
  }
  state.logs.unshift(createLog({
    eventType: enabled ? 'shopify.enabled' : 'shopify.disabled',
    status: enabled ? 'SUCCESS' : 'INFO',
    direction: 'INTERNAL',
    message: enabled ? 'Shopify plugin enabled.' : 'Shopify plugin disabled.',
  }));
  return persistState(syncPluginCard(state));
};

export const testShopifyConnection = () => {
  const state = loadState();
  const isConfigured = state.shopify.storeDomain && state.shopify.adminApiToken && state.shopify.webhookSecret;
  state.shopify.health = isConfigured ? 'CONNECTED' : 'MISSING_CREDENTIALS';
  state.logs.unshift(createLog({
    eventType: 'shopify.connection.test',
    status: isConfigured ? 'SUCCESS' : 'FAILED',
    direction: 'OUTBOUND',
    retryable: !isConfigured,
    message: isConfigured
      ? 'Shopify connection test passed in the frontend workspace.'
      : 'Shopify connection test failed because credentials are incomplete.',
  }));
  return persistState(syncPluginCard(state));
};

export const triggerShopifySync = (scope) => {
  const state = loadState();
  const isConfigured = state.shopify.health === 'CONNECTED' || state.shopify.health === 'CONFIGURED';
  const now = new Date().toISOString();
  const success = isConfigured && state.shopify.enabled;
  state.shopify.lastSyncAt = success ? now : state.shopify.lastSyncAt;
  state.logs.unshift(createLog({
    eventType: `shopify.sync.${scope}`,
    status: success ? 'SUCCESS' : 'FAILED',
    direction: 'OUTBOUND',
    retryable: !success,
    message: success
      ? `Shopify ${scope} sync recorded from the frontend workspace.`
      : `Shopify ${scope} sync failed because the plugin is not fully connected and enabled.`,
  }));
  return persistState(syncPluginCard(state));
};

export const simulateShopifyWebhook = () => {
  const state = loadState();
  const now = new Date().toISOString();
  const success = state.shopify.enabled;
  state.shopify.lastWebhookAt = now;
  state.logs.unshift(createLog({
    eventType: 'shopify.webhook.orders/create',
    status: success ? 'SUCCESS' : 'FAILED',
    direction: 'INBOUND',
    retryable: !success,
    createdAt: now,
    message: success
      ? 'Webhook event captured and queued for order ingestion.'
      : 'Webhook event received but plugin is disabled.',
  }));
  return persistState(syncPluginCard(state));
};

export const retryPluginLog = (logId) => {
  const state = loadState();
  state.logs = state.logs.map((entry) => entry.id !== logId
    ? entry
    : {
        ...entry,
        status: 'SUCCESS',
        retryable: false,
        message: `${entry.message} Retry completed successfully in the frontend workspace.`,
      });
  return persistState(syncPluginCard(state));
};
