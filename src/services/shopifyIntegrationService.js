import { request } from './api';

const unwrap = (promise) => promise.then((response) => response.data ?? response);

export const getShopifyConnection = () => unwrap(request('/integrations/shopify'));

export const saveShopifyConnection = (payload) => unwrap(request('/integrations/shopify', {
  method: 'PUT',
  body: payload,
}));

export const testShopifyConnection = () => unwrap(request('/integrations/shopify/test', {
  method: 'POST',
}));

export const startShopifyOAuth = () => unwrap(request('/integrations/shopify/oauth/start', {
  method: 'POST',
}));

export const syncShopifyProducts = () => unwrap(request('/integrations/shopify/sync/products', {
  method: 'POST',
}));

export const syncShopifyOrders = () => unwrap(request('/integrations/shopify/sync/orders', {
  method: 'POST',
}));

export const syncShopifyLocations = () => unwrap(request('/integrations/shopify/sync/locations', {
  method: 'POST',
}));

export const syncShopifyInventory = () => unwrap(request('/integrations/shopify/sync/inventory', {
  method: 'POST',
}));

export const pushShopifyCatalog = () => unwrap(request('/integrations/shopify/push/catalog', {
  method: 'POST',
}));

export const pushShopifyInventory = () => unwrap(request('/integrations/shopify/push/inventory', {
  method: 'POST',
}));

// Chunked, resumable sync runs (one page per call).
export const startShopifyRun = (type, incremental = false) => unwrap(request(
  `/integrations/shopify/runs?type=${encodeURIComponent(type)}&incremental=${incremental ? 'true' : 'false'}`,
  { method: 'POST' },
));

// Queue a run to be driven server-side by the RabbitMQ worker (browser can close).
export const enqueueShopifyRun = (type, incremental = false) => unwrap(request(
  `/integrations/shopify/runs/async?type=${encodeURIComponent(type)}&incremental=${incremental ? 'true' : 'false'}`,
  { method: 'POST' },
));

export const processShopifyRunPage = (runId) => unwrap(request(`/integrations/shopify/runs/${runId}/page`, {
  method: 'POST',
}));

export const resumeShopifyRun = (runId) => unwrap(request(`/integrations/shopify/runs/${runId}/resume`, {
  method: 'POST',
}));

export const listShopifyRuns = () => unwrap(request('/integrations/shopify/runs'));
