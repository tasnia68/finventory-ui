import { request } from './api';

const unwrap = async (promise) => {
  const response = await promise;
  return response?.data !== undefined ? response.data : response;
};

export const getStorefrontPublishVersions = () => unwrap(request('/storefront/publish/versions'));

export const publishStorefront = (payload = {}) => unwrap(request('/storefront/publish', {
  method: 'POST',
  body: payload,
}));

export const rollbackStorefrontVersion = (versionId, payload = {}) => unwrap(request(`/storefront/publish/${versionId}/rollback`, {
  method: 'POST',
  body: payload,
}));
