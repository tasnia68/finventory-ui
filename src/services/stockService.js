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

export const getStockLevels = (params = {}) => {
    return unwrap(request(`/stocks${buildQuery(params)}`));
};

export const adjustStock = (adjustmentData) => {
    return unwrap(request('/stocks/adjust', {
        method: 'POST',
        body: adjustmentData,
    }));
};

export const getStockMovements = (params = {}) => {
    return unwrap(request(`/stocks/movements${buildQuery(params)}`));
};

export const searchStockItems = (query) => {
    if (!query) return Promise.resolve({ content: [] });
    return unwrap(request(`/stocks/query?q=${encodeURIComponent(query)}`));
};