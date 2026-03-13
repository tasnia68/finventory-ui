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

export const getStockTransactions = (params = {}) => {
    return unwrap(request(`/stock-transactions${buildQuery(params)}`));
};

export const getStockTransaction = (id) => {
    return unwrap(request(`/stock-transactions/${id}`));
};

export const createStockTransaction = (transactionData) => {
    return unwrap(request('/stock-transactions', {
        method: 'POST',
        body: transactionData,
    }));
};

export const confirmStockTransaction = (id) => {
    return unwrap(request(`/stock-transactions/${id}/confirm`, {
        method: 'POST',
    }));
};

export const cancelStockTransaction = (id) => {
    return unwrap(request(`/stock-transactions/${id}/cancel`, {
        method: 'POST',
    }));
};

export const submitStockTransactionForApproval = (id) => {
    return unwrap(request(`/stock-transactions/${id}/submit-approval`, {
        method: 'POST',
    }));
};

export const approveStockTransaction = (id) => {
    return unwrap(request(`/stock-transactions/${id}/approve`, {
        method: 'POST',
    }));
};

export const rejectStockTransaction = (id) => {
    return unwrap(request(`/stock-transactions/${id}/reject`, {
        method: 'POST',
    }));
};

export const reverseStockTransaction = (id) => {
    return unwrap(request(`/stock-transactions/${id}/reverse`, {
        method: 'POST',
    }));
};