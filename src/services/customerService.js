import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getCustomers = (params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.status) query.set('status', params.status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return unwrap(request(`/customers${suffix}`));
};

export const createCustomer = (payload) => unwrap(request('/customers', { method: 'POST', body: payload }));
export const updateCustomer = (id, payload) => unwrap(request(`/customers/${id}`, { method: 'PUT', body: payload }));
export const deleteCustomer = (id) => request(`/customers/${id}`, { method: 'DELETE' });

export const getCustomerPriceLists = (customerId) => unwrap(request(`/customers/${customerId}/price-lists`));
export const createCustomerPriceList = (customerId, payload) => unwrap(request(`/customers/${customerId}/price-lists`, { method: 'POST', body: payload }));
export const updateCustomerPriceList = (customerId, priceListId, payload) => unwrap(request(`/customers/${customerId}/price-lists/${priceListId}`, { method: 'PUT', body: payload }));
export const deleteCustomerPriceList = (customerId, priceListId) => request(`/customers/${customerId}/price-lists/${priceListId}`, { method: 'DELETE' });

export const adjustCustomerCredit = (customerId, payload) => unwrap(request(`/customers/${customerId}/credit/adjust`, { method: 'POST', body: payload }));
export const getCustomerCreditTransactions = (customerId, params = {}) => {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    query.set('sortBy', params.sortBy || 'transactionDate');
    query.set('sortDirection', params.sortDirection || 'desc');
    return unwrap(request(`/customers/${customerId}/credit/transactions?${query.toString()}`));
};

export const getCustomerOrderHistory = (customerId, params = {}) => {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    query.set('sortBy', params.sortBy || 'orderDate');
    query.set('sortDirection', params.sortDirection || 'desc');
    return unwrap(request(`/customers/${customerId}/orders?${query.toString()}`));
};