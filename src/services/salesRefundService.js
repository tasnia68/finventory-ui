import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

const buildQuery = (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, value);
        }
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};

export const getSalesRefunds = (params = {}) => unwrap(request(`/sales-refunds${buildQuery({
    salesOrderId: params.salesOrderId,
    customerId: params.customerId,
    status: params.status,
    refundNumber: params.refundNumber,
    page: params.page ?? 0,
    size: params.size ?? 100,
    sortBy: params.sortBy || 'requestedAt',
    sortDirection: params.sortDirection || 'desc',
})}`));

export const getSalesRefund = (id) => unwrap(request(`/sales-refunds/${id}`));
export const createSalesRefund = (payload) => unwrap(request('/sales-refunds', { method: 'POST', body: payload }));
export const approveSalesRefund = (id, payload = {}) => unwrap(request(`/sales-refunds/${id}/approve`, { method: 'PATCH', body: payload }));
export const rejectSalesRefund = (id, payload = {}) => unwrap(request(`/sales-refunds/${id}/reject`, { method: 'PATCH', body: payload }));
export const completeSalesRefund = (id, payload = {}) => unwrap(request(`/sales-refunds/${id}/complete`, { method: 'PATCH', body: payload }));
export const cancelSalesRefund = (id, payload = {}) => unwrap(request(`/sales-refunds/${id}/cancel`, { method: 'PATCH', body: payload }));
export const generateRefundCreditNote = (id) => unwrap(request(`/sales-refunds/${id}/credit-note`, { method: 'POST' }));

export const getRmas = (params = {}) => unwrap(request(`/rmas${buildQuery({
    salesOrderId: params.salesOrderId,
    rmaNumber: params.rmaNumber,
    page: params.page ?? 0,
    size: params.size ?? 100,
    sortBy: params.sortBy || 'requestedAt',
    sortDirection: params.sortDirection || 'desc',
})}`));

export const getStorageLocations = (warehouseId) => unwrap(request(`/storage-locations?warehouseId=${encodeURIComponent(warehouseId)}`));

export const getCustomerStoreCreditTransactions = (customerId, params = {}) => unwrap(request(`/customers/${customerId}/store-credit/transactions${buildQuery({
    page: params.page ?? 0,
    size: params.size ?? 20,
    sortBy: params.sortBy || 'transactionDate',
    sortDirection: params.sortDirection || 'desc',
})}`));