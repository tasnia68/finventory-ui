import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

const buildQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.append(key, value);
        }
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};

export const getPurchaseOrders = (params = {}) => unwrap(request(`/purchase-orders${buildQuery(params)}`));
export const getPurchaseOrder = (id) => unwrap(request(`/purchase-orders/${id}`));
export const createPurchaseOrder = (payload) => unwrap(request('/purchase-orders', { method: 'POST', body: payload }));
export const updatePurchaseOrder = (id, payload) => unwrap(request(`/purchase-orders/${id}`, { method: 'PUT', body: payload }));
export const updatePurchaseOrderStatus = (id, status) => unwrap(request(`/purchase-orders/${id}/status?status=${encodeURIComponent(status)}`, { method: 'PATCH' }));