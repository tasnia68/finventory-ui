import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getTenants = () => unwrap(request('/super-admin/tenants'));

export const createTenant = (tenantData) => unwrap(request('/super-admin/tenants', {
    method: 'POST',
    body: tenantData,
}));

export const updateTenant = (tenantId, tenantData) => unwrap(request(`/super-admin/tenants/${tenantId}`, {
    method: 'PUT',
    body: tenantData,
}));

export const activateTenant = (tenantId) => unwrap(request(`/super-admin/tenants/${tenantId}/activate`, {
    method: 'POST',
}));

export const deactivateTenant = (tenantId) => unwrap(request(`/super-admin/tenants/${tenantId}/deactivate`, {
    method: 'POST',
}));

export const deleteTenant = (tenantId) => unwrap(request(`/super-admin/tenants/${tenantId}`, {
    method: 'DELETE',
}));

// --- Per-tenant dedicated database (gated by app.tenant.routing.enabled) ---
export const getTenantDatasource = (tenantId) =>
    unwrap(request(`/super-admin/tenants/${tenantId}/datasource`));

export const saveTenantDatasource = (tenantId, payload) =>
    unwrap(request(`/super-admin/tenants/${tenantId}/datasource`, { method: 'PUT', body: payload }));

export const testTenantDatasource = (tenantId, probe) =>
    unwrap(request(`/super-admin/tenants/${tenantId}/datasource/test`,
        { method: 'POST', body: probe || {} }));

export const migrateTenantDatasource = (tenantId) =>
    unwrap(request(`/super-admin/tenants/${tenantId}/datasource/migrate`, { method: 'POST' }));

export const provisionTenantDatasource = (tenantId) =>
    unwrap(request(`/super-admin/tenants/${tenantId}/datasource/provision`, { method: 'POST' }));
