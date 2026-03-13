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

export const createReplenishmentRule = (payload) => {
    return unwrap(request('/replenishment/rules', {
        method: 'POST',
        body: payload,
    }));
};

export const updateReplenishmentRule = (id, payload) => {
    return unwrap(request(`/replenishment/rules/${id}`, {
        method: 'PUT',
        body: payload,
    }));
};

export const deleteReplenishmentRule = (id) => {
    return request(`/replenishment/rules/${id}`, {
        method: 'DELETE',
    });
};

export const getReplenishmentRule = (id) => {
    return unwrap(request(`/replenishment/rules/${id}`));
};

export const getReplenishmentRules = (params = {}) => {
    return unwrap(request(`/replenishment/rules${buildQuery(params)}`));
};

export const calculateReplenishmentRule = (id) => {
    return unwrap(request(`/replenishment/rules/${id}/calculate`, {
        method: 'POST',
    }));
};

export const getReplenishmentSuggestions = (params = {}) => {
    return unwrap(request(`/replenishment/suggestions${buildQuery(params)}`));
};

export const getStockAlerts = (params = {}) => {
    return unwrap(request(`/stocks/alerts${buildQuery(params)}`));
};