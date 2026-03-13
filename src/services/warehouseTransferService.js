import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const createWarehouseTransfer = (payload) => {
    return unwrap(request('/warehouse-transfers', {
        method: 'POST',
        body: payload,
    }));
};