import { request } from './api';

const unwrap = async (promise) => {
    const response = await promise;
    return response.data !== undefined ? response.data : response;
};

export const getWarehouses = () => {
    return unwrap(request('/warehouses'));
};

export const getWarehouse = (id) => {
    return unwrap(request(`/warehouses/${id}`));
};

export const createWarehouse = (warehouseData) => {
    return unwrap(request('/warehouses', {
        method: 'POST',
        body: warehouseData,
    }));
};

export const updateWarehouse = (id, warehouseData) => {
    return unwrap(request(`/warehouses/${id}`, {
        method: 'PUT',
        body: warehouseData,
    }));
};

export const deleteWarehouse = (id) => {
    return request(`/warehouses/${id}`, {
        method: 'DELETE',
    });
};