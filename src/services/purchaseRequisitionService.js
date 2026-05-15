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

export const generatePurchaseRequisition = (payload) => {
    return unwrap(request('/purchase-requisitions/generate', {
        method: 'POST',
        body: payload,
    }));
};

export const getPurchaseRequisition = (id) => {
    return unwrap(request(`/purchase-requisitions/${id}`));
};

export const getPurchaseRequisitions = (params = {}) => {
    return unwrap(request(`/purchase-requisitions${buildQuery(params)}`));
};

export const getPurchaseRequisitionsByWarehouse = (warehouseId) => {
    return unwrap(request(`/purchase-requisitions/by-warehouse?warehouseId=${warehouseId}`));
};

export const convertRequisitionToPurchaseOrder = (id, payload) =>
    unwrap(request(`/purchase-requisitions/${id}/convert-to-po`, { method: 'POST', body: payload }));