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

export const getBatches = (params = {}) => {
    return unwrap(request(`/batches${buildQuery(params)}`));
};

export const getBatch = (id) => {
    return unwrap(request(`/batches/${id}`));
};

export const getExpiringBatches = (days = 30) => {
    return unwrap(request(`/batches/expiring?days=${days}`));
};

export const getExpiredBatches = () => {
    return unwrap(request('/batches/expired'));
};

export const updateBatchExpiry = (id, payload) => {
    return unwrap(request(`/batches/${id}/expiry`, {
        method: 'PUT',
        body: payload,
    }));
};

export const getBatchHistory = (id) => {
    return unwrap(request(`/batches/${id}/history`));
};