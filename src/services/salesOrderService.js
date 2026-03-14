import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getSalesOrders = (params = {}) => {
    const query = new URLSearchParams();
    if (params.customerId) query.set('customerId', params.customerId);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    if (params.soNumber) query.set('soNumber', params.soNumber);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 100));
    query.set('sortBy', params.sortBy || 'orderDate');
    query.set('sortDirection', params.sortDirection || 'desc');
    return unwrap(request(`/sales-orders?${query.toString()}`));
};

export const getSalesOrder = (id) => unwrap(request(`/sales-orders/${id}`));
export const createSalesOrder = (payload) => unwrap(request('/sales-orders', { method: 'POST', body: payload }));
export const updateSalesOrder = (id, payload) => unwrap(request(`/sales-orders/${id}`, { method: 'PUT', body: payload }));
export const updateSalesOrderStatus = (id, status) => unwrap(request(`/sales-orders/${id}/status?status=${encodeURIComponent(status)}`, { method: 'PATCH' }));