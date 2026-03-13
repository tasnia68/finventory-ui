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

export const createCycleCount = (payload) => {
    return unwrap(request('/cycle-counts', {
        method: 'POST',
        body: payload,
    }));
};

export const scheduleCycleCount = (id) => {
    return unwrap(request(`/cycle-counts/${id}/schedule`, {
        method: 'POST',
    }));
};

export const startCycleCount = (id) => {
    return unwrap(request(`/cycle-counts/${id}/start`, {
        method: 'POST',
    }));
};

export const finishCycleCount = (id) => {
    return unwrap(request(`/cycle-counts/${id}/finish`, {
        method: 'POST',
    }));
};

export const approveCycleCount = (id) => {
    return unwrap(request(`/cycle-counts/${id}/approve`, {
        method: 'POST',
    }));
};

export const getCycleCounts = (params = {}) => {
    return unwrap(request(`/cycle-counts${buildQuery(params)}`));
};

export const getCycleCount = (id) => {
    return unwrap(request(`/cycle-counts/${id}`));
};

export const getCycleCountItems = (id) => {
    return unwrap(request(`/cycle-counts/${id}/items`));
};

export const submitCycleCountEntries = (id, payload) => {
    return unwrap(request(`/cycle-counts/${id}/entries`, {
        method: 'POST',
        body: payload,
    }));
};