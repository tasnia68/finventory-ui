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