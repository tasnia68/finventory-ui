import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getVirtualTryOnTenants = () => unwrap(request('/super-admin/virtual-try-on/tenants'));

export const updateVirtualTryOnTenant = (tenantId, payload) =>
    unwrap(request(`/super-admin/virtual-try-on/tenants/${tenantId}`, { method: 'PUT', body: payload }));

export const getVirtualTryOnApiKeyStatus = () => unwrap(request('/super-admin/virtual-try-on/api-key'));

export const setVirtualTryOnApiKey = (apiKey) =>
    unwrap(request('/super-admin/virtual-try-on/api-key', { method: 'PUT', body: { apiKey } }));

export const setVirtualTryOnModel = (model) =>
    unwrap(request('/super-admin/virtual-try-on/api-key', { method: 'PUT', body: { model } }));
