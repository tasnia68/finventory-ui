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

export const createStockReservation = (payload) => {
    return unwrap(request('/stock-reservations', {
        method: 'POST',
        body: payload,
    }));
};

export const releaseStockReservation = (id) => {
    return unwrap(request(`/stock-reservations/${id}/release`, {
        method: 'PUT',
    }));
};

export const releaseReservationsByReference = (referenceId) => {
    return unwrap(request(`/stock-reservations/release-by-reference${buildQuery({ referenceId })}`, {
        method: 'PUT',
    }));
};

export const getStockReservations = (params = {}) => {
    return unwrap(request(`/stock-reservations${buildQuery(params)}`));
};

export const getATP = (params = {}) => {
    return unwrap(request(`/stock-reservations/atp${buildQuery(params)}`));
};