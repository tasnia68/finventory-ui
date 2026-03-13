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

export const getSerialNumbers = (params = {}) => {
    return unwrap(request(`/serial-numbers${buildQuery(params)}`));
};

export const getSerialHistory = (serial) => {
    return unwrap(request(`/serial-numbers/${serial}/history`));
};

export const updateSerialWarranty = (id, payload) => {
    return unwrap(request(`/serial-numbers/${id}/warranty`, {
        method: 'PUT',
        body: payload,
    }));
};